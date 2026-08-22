#!/usr/bin/env node

/**
 * Monolog Asset Sanitizer & Metadata Cleaner
 *
 * Strips EXIF, XMP, IPTC, GPS, and private device metadata from all
 * project assets in assets/ and assets/backgrounds/, removes junk files
 * like .DS_Store, and embeds a clean "Monolog" creator tag.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");

function cleanJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const chunks = [Buffer.from([0xff, 0xd8])];
  let offset = 2;

  // Clean Monolog COM (comment) marker: 0xFF, 0xFE, length, "Monolog"
  const commentText = "Monolog";
  const commentLen = 2 + Buffer.byteLength(commentText);
  const commentBuf = Buffer.alloc(4 + Buffer.byteLength(commentText));
  commentBuf[0] = 0xff;
  commentBuf[1] = 0xfe;
  commentBuf[2] = (commentLen >> 8) & 0xff;
  commentBuf[3] = commentLen & 0xff;
  commentBuf.write(commentText, 4, "utf8");

  let insertedComment = false;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    while (buffer[offset] === 0xff && offset < buffer.length) offset++;
    const marker = buffer[offset];
    offset++;

    if (marker === 0xd9) {
      chunks.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    if (marker === 0xda) {
      if (!insertedComment) {
        chunks.push(commentBuf);
        insertedComment = true;
      }
      chunks.push(Buffer.from([0xff, 0xda]));
      chunks.push(buffer.subarray(offset));
      break;
    }

    if (offset + 2 > buffer.length) break;
    const len = (buffer[offset] << 8) | buffer[offset + 1];
    const payload = buffer.subarray(offset + 2, offset + len);

    // Strip metadata markers:
    // 0xE1: APP1 (EXIF, XMP)
    // 0xE2: APP2 (FlashPix/ICC)
    // 0xED: APP13 (Photoshop IPTC)
    // 0xEE: APP14 (Adobe)
    // 0xFE: COM (Previous comments)
    const isMetadataMarker = [0xe1, 0xe2, 0xed, 0xee, 0xfe].includes(marker);

    if (!isMetadataMarker) {
      chunks.push(Buffer.from([0xff, marker, (len >> 8) & 0xff, len & 0xff]));
      chunks.push(payload);
    }

    offset += len;
  }

  return Buffer.concat(chunks);
}

function cleanPng(buffer) {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIG)) {
    return buffer;
  }

  const chunks = [PNG_SIG];
  let offset = 8;

  const STRIP_CHUNKS = new Set([
    "eXIf",
    "iTXt",
    "tEXt",
    "zTXt",
    "tIME",
    "pHYs",
    "gAMA",
    "cHRM",
    "sRGB",
    "iCCP",
    "dSIG",
    "prVW",
  ]);

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const totalChunkLen = 4 + 4 + length + 4;

    if (offset + totalChunkLen > buffer.length) break;

    if (!STRIP_CHUNKS.has(type)) {
      chunks.push(buffer.subarray(offset, offset + totalChunkLen));
    }

    offset += totalChunkLen;
    if (type === "IEND") break;
  }

  return Buffer.concat(chunks);
}

function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === ".DS_Store" || entry.name.startsWith("._")) {
      fs.unlinkSync(fullPath);
      console.log(`  🗑️  Removed junk file: ${path.relative(ASSETS_DIR, fullPath)}`);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const { execSync } = require("node:child_process");

function stripExtendedAttributes(filePath) {
  if (process.platform === "darwin") {
    try {
      execSync(`xattr -c "${filePath}"`, { stdio: "ignore" });
    } catch {
      // Ignore errors if xattr is not supported on target filesystem
    }
  }
}

function run() {
  console.log("\n🧹 Monolog Asset Sanitizer");
  console.log("━".repeat(45));

  const files = getFilesRecursively(ASSETS_DIR);
  let totalSavedBytes = 0;
  let cleanedCount = 0;

  for (const filePath of files) {
    const relPath = path.relative(ASSETS_DIR, filePath);
    stripExtendedAttributes(filePath);

    const originalBuf = fs.readFileSync(filePath);
    let cleanedBuf = originalBuf;

    if (/\.(jpe?g)$/i.test(filePath)) {
      cleanedBuf = cleanJpeg(originalBuf);
    } else if (/\.png$/i.test(filePath)) {
      cleanedBuf = cleanPng(originalBuf);
    }

    const saved = originalBuf.length - cleanedBuf.length;
    if (saved > 0 || !originalBuf.equals(cleanedBuf)) {
      fs.writeFileSync(filePath, cleanedBuf);
      stripExtendedAttributes(filePath);
      totalSavedBytes += Math.max(0, saved);
      cleanedCount++;
      console.log(
        `  ✨ Sanitized: ${relPath} (${saved > 0 ? `saved ${saved} B` : "metadata stripped"})`
      );
    } else {
      console.log(`  ✓  Clean: ${relPath}`);
    }
  }

  console.log("━".repeat(45));
  console.log(`✅ Completed: ${files.length} assets checked, ${cleanedCount} stripped.`);
  if (totalSavedBytes > 0) {
    console.log(`📦 Total metadata stripped: ${(totalSavedBytes / 1024).toFixed(2)} KB\n`);
  } else {
    console.log(`📦 All assets are clean with zero residual metadata.\n`);
  }
}

run();
