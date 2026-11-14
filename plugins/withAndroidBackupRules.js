const fs = require("node:fs");
const path = require("node:path");
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");

// An include element limits Auto Backup to the named items, so the sharedpref include is what
// keeps the database, media, and drafts out. Do not add an exclude for a domain that the rules
// do not include: Android Lint fails the release build with FullBackupContent.
const BACKUP_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <include domain="sharedpref" path="."/>
  <exclude domain="sharedpref" path="SecureStore"/>
</full-backup-content>
`;

const EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <include domain="sharedpref" path="."/>
    <exclude domain="sharedpref" path="SecureStore"/>
  </cloud-backup>
  <device-transfer>
    <include domain="sharedpref" path="."/>
    <exclude domain="sharedpref" path="SecureStore"/>
  </device-transfer>
</data-extraction-rules>
`;

const RULE_FILES = {
  "openlog_backup_rules.xml": BACKUP_RULES_XML,
  "openlog_data_extraction_rules.xml": EXTRACTION_RULES_XML,
};

/**
 * Pins the app's Auto Backup rules. expo-secure-store runs with configureAndroidBackup off, so
 * this plugin is the only writer of the backup attributes and no other plugin can widen them.
 */
const withAndroidBackupRules = (config) => {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const xmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      await fs.promises.mkdir(xmlDir, { recursive: true });
      for (const [name, contents] of Object.entries(RULE_FILES)) {
        await fs.promises.writeFile(path.join(xmlDir, name), contents);
      }
      return modConfig;
    },
  ]);

  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    application.$["android:fullBackupContent"] = "@xml/openlog_backup_rules";
    application.$["android:dataExtractionRules"] = "@xml/openlog_data_extraction_rules";
    return modConfig;
  });
};

module.exports = createRunOncePlugin(
  withAndroidBackupRules,
  "openlog-android-backup-rules",
  "1.0.0"
);
