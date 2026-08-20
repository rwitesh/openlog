import {
  DataSection,
  PrivacySection,
  SettingsGroup,
  SettingsScreenScroll,
} from "@/modules/settings";

/**
 * Privacy & data category screen — everything about trust: the biometric
 * app lock under SECURITY, destructive storage controls under STORAGE.
 * Future export/backup controls live beside them.
 */
export function PrivacySettingsScreen() {
  return (
    <SettingsScreenScroll>
      <SettingsGroup label="SECURITY">
        <PrivacySection />
      </SettingsGroup>

      <SettingsGroup label="STORAGE">
        <DataSection />
      </SettingsGroup>
    </SettingsScreenScroll>
  );
}
