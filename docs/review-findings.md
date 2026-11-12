# Review Findings

Open items from the codebase review of 2026-10-14 (v1.3.10). Re-checked on 2026-11-12. P1-2, P1-3, P2-2 to P2-6, P3-1, P3-2 and P3-4 were fixed in PRs #10, #11 and #12 and removed. IDs are kept from the original review.

| ID | Priority | Area | Finding |
| --- | --- | --- | --- |
| P3-3 | P3 | Privacy | `android:allowBackup` is left at the platform default |
| P3-5 | P3 | Privacy | The privacy policy doesn't mention reverse geocoding |

## P3

### P3-3. `android:allowBackup` is left at the platform default

`app.json` doesn't set it. The resolved manifest has `allowBackup="true"`, with backup rules from the `expo-secure-store` plugin that include only shared preferences, so `app.db` and `media/` are not backed up today. That depends on no other plugin adding backup rules: if one does, `expo-secure-store` skips its own rules and full Auto Backup returns. Decide deliberately: disable it, add the app's own rules that exclude the database and files, or document the current behaviour. The trade-off is written up in PR #12.

### P3-5. The privacy policy doesn't mention reverse geocoding

Adding a location calls `Location.reverseGeocodeAsync` ([src/services/location/location.ts](../src/services/location/location.ts)), which sends the coordinates to the platform geocoder (Google on Android, Apple on iOS). [webpage/privacy-policy.html](../webpage/privacy-policy.html) says the app works offline and doesn't mention this request.

## Not verified on a device

These fixes passed Node tests and review but need a device check on Android and iOS:

- Backup export, import and inspection keep the UI responsive, show progress and respond to Cancel (P1-2).
- The database error screen in light and dark themes (P3-2).
- Photos picked as HEIC on iOS keep their extension and share correctly (P3-1).
- jsDelivr serves the pinned font TTF URLs (P3-4).
