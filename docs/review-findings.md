# Review Findings

This file lists the open items from the codebase review of 2026-10-14 (v1.3.10). The last check was on 2026-11-12.

PRs #10, #11, and #12 fixed P1-2, P1-3, P2-2 to P2-6, P3-1, P3-2, and P3-4. Those items are not in this file. The IDs come from the original review. P3-5 and P3-6 are new. The review of those PRs found them.

| ID | Priority | Area | Finding |
| --- | --- | --- | --- |
| P3-5 | P3 | Privacy | The privacy policy does not mention reverse geocoding |
| P3-6 | P3 | Media / backup | An edit can keep a reference to media that a restore removed |

## P3

### P3-5. The privacy policy does not mention reverse geocoding

When a person adds a location, the app calls `Location.reverseGeocodeAsync` in [src/services/location/location.ts](../src/services/location/location.ts). This call sends the coordinates to the platform geocoder (Google on Android, Apple on iOS).

[webpage/privacy-policy.html](../webpage/privacy-policy.html) says that the app works offline. It does not mention this request. Add a sentence about it.

### P3-6. An edit can keep a reference to media that a restore removed

**Where:** `assertCopiedMediaPresent` in [src/services/media/storage.ts](../src/services/media/storage.ts) and `patchEntry` in [src/modules/entry/store/EntryStore.ts](../src/modules/entry/store/EntryStore.ts).

`assertCopiedMediaPresent` examines only the files that the current save copied. It does not examine media that the entry had before the edit.

The problem occurs in this sequence:

1. A person opens an entry that has a photo.
2. A restore of an older backup removes that photo.
3. The person saves the edit.

Then the saved entry refers to a file that does not exist. This problem existed before PR #10.

**Fix:** After the restore gate opens, make sure that each media file of the entry exists. If a file does not exist, reject the save.

## Not verified on a device

These fixes passed the Node tests and the review. Test them on Android and iOS:

- During backup export, import, and inspection, the UI stays responsive, shows progress, and obeys Cancel (P1-2).
- The database error screen is correct in the light theme and the dark theme (P3-2).
- A HEIC photo from the iOS picker keeps its extension, and the share sheet gets the correct file type (P3-1).
- jsDelivr serves the pinned font files (P3-4).
