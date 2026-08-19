import { Alert } from "react-native";

/**
 * Shared confirmation for irreversible actions. Every destructive flow
 * (reset, delete, future export-overwrites) goes through this one helper so
 * wording and button styling stay consistent.
 */
export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => Promise<void>
) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: () => void onConfirm() },
  ]);
}
