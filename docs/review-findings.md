# Review Findings

This file lists the open items from the codebase review of 2026-10-14 (v1.3.10). The last check was on 2026-11-14.

PRs #10, #11, #12, #15, and #16 closed P1-2, P1-3, P2-2 to P2-6, P3-1 to P3-6. No item from that review is open.

The privacy audit in [privacy-audit.md](./privacy-audit.md) lists separate findings that are still open. F4 holds the one remaining question about this review: the app sends coordinates to the Android geocoding service, and the repository does not confirm the provider behind it.

## Not verified on a device

These fixes passed the Node tests and the review. Test them on Android and iOS:

- During backup export, import, and inspection, the UI stays responsive, shows progress, and obeys Cancel (P1-2).
- The database error screen is correct in the light theme and the dark theme (P3-2).
- A HEIC photo from the iOS picker keeps its extension, and the share sheet gets the correct file type (P3-1).
- jsDelivr serves the pinned font files (P3-4).
- A restore can run while an entry is open in the editor. Saving then refuses media that the restore removed, and the alert says what to do (P3-6).
- Android Auto Backup keeps the database, media, and drafts out of the archive. It backs up shared preferences only (P3-3).
