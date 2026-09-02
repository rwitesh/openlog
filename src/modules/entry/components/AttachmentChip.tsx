import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";
import { formatAttachmentSize, openAttachment } from "@/services/media";
import { ThemedText } from "@/shared/components/ThemedText";
import type { Attachment } from "@/shared/types";
import { metrics, press, radius, space, useTheme } from "@/theme";

type IconName = ComponentProps<typeof Feather>["name"];

/** Maps an attachment's mime type or extension to a quiet glyph; never saturated color. */
function attachmentIcon(attachment: Attachment): IconName {
  const mime = attachment.mime?.toLowerCase() ?? "";
  const ext = attachment.name.toLowerCase().split(".").pop() ?? "";

  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return "video";
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "flac"].includes(ext))
    return "music";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("text") ||
    ["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext)
  )
    return "file-text";
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    ["xls", "xlsx", "csv", "numbers"].includes(ext)
  )
    return "grid";
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  )
    return "archive";
  return "file";
}

interface AttachmentChipProps {
  attachment: Attachment;
  /** When provided, shows a trailing remove control; tapping the chip itself still opens the file. */
  onRemove?: () => void;
}

/** Quiet row chip for a kept document; tapping opens it via the system share sheet. */
export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const { colors } = useTheme().theme;
  const size = formatAttachmentSize(attachment.size);

  return (
    <Pressable
      onPress={() => void openAttachment(attachment)}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: colors.surface, borderColor: colors.separator },
        pressed && press,
      ]}
      accessibilityLabel={`Open file ${attachment.name}`}
      accessibilityRole="button"
    >
      <Feather
        name={attachmentIcon(attachment)}
        size={metrics.iconSm}
        color={colors.textTertiary}
      />
      <ThemedText
        weight="medium"
        numberOfLines={1}
        style={[styles.name, { color: colors.textSecondary }]}
      >
        {attachment.name}
      </ThemedText>
      {size ? (
        <ThemedText style={[styles.size, { color: colors.textTertiary }]}>{size}</ThemedText>
      ) : null}
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.removeBtn, pressed && press]}
          accessibilityLabel={`Remove ${attachment.name}`}
          accessibilityRole="button"
        >
          <Feather name="x" size={metrics.iconXs} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  size: {
    fontSize: 12,
    lineHeight: 16,
  },
  removeBtn: {
    padding: space.xs,
  },
});
