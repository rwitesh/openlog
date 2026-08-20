import {
  ProfileSection,
  SettingsGroup,
  SettingsScreenScroll,
} from "@/modules/settings";

/**
 * Profile category screen — the journal owner's identity. Future identity
 * fields (avatar, signature) render as siblings inside the group.
 */
export function ProfileSettingsScreen() {
  return (
    <SettingsScreenScroll>
      <SettingsGroup label="IDENTITY">
        <ProfileSection />
      </SettingsGroup>
    </SettingsScreenScroll>
  );
}
