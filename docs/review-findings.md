# Review Findings

This file lists the open items from the codebase review of 2026-10-14 (v1.3.10). The last check was on 2026-11-12.

PRs #10, #11, and #12 fixed P1-2, P1-3, P2-2 to P2-6, P3-1, P3-2, and P3-4. Those items are not in this file. The IDs come from the original review. P3-5 is new. The review of those PRs found it.

| ID | Priority | Area | Finding |
| --- | --- | --- | --- |
| P3-5 | P3 | Privacy | The privacy policy does not mention reverse geocoding |

## P3

### P3-5. The privacy policy does not mention reverse geocoding

When a person adds a location, the app calls `Location.reverseGeocodeAsync` in [src/services/location/location.ts](../src/services/location/location.ts). This call sends the coordinates to the platform geocoder (Google on Android, Apple on iOS).

[webpage/privacy-policy.html](../webpage/privacy-policy.html) says that the app works offline. It does not mention this request. Add a sentence about it.

## Not verified on a device

These fixes passed the Node tests and the review. Test them on Android and iOS:

- During backup export, import, and inspection, the UI stays responsive, shows progress, and obeys Cancel (P1-2).
- The database error screen is correct in the light theme and the dark theme (P3-2).
- A HEIC photo from the iOS picker keeps its extension, and the share sheet gets the correct file type (P3-1).
- jsDelivr serves the pinned font files (P3-4).
- A restore can run while an entry is open in the editor. Saving then refuses media that the restore removed, and the alert says what to do (P3-6).
