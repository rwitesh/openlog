import { Alert, Pressable, StyleSheet, View } from "react-native";

import type { Entry } from "@/types/entry";
import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import {
  entryTypeLabel,
  formatDurationMs,
  formatEntryDateTime,
  formatEntryTime,
} from "@/lib";
import { BottomSheet, ThemedText } from "@/components/core";

interface EntryDetailsModalProps {
  entry: Entry;
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.value, { color: theme.colors.text }]}>{value}</ThemedText>
    </View>
  );
}

export function EntryDetailsModal({
  entry,
  visible,
  onClose,
  onDelete,
}: EntryDetailsModalProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const confirmDelete = () => {
    Alert.alert("Delete this entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onClose();
          onDelete();
        },
      },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
        Entry details
      </ThemedText>

      <View style={[styles.card, { borderColor: colors.separator }]}>
        <DetailRow label="Written" value={formatEntryDateTime(entry.createdAt)} />
        <DetailRow label="Time" value={formatEntryTime(entry.createdAt)} />
        <DetailRow label="Type" value={entryTypeLabel(entry.type)} />
        {entry.type === "audio" && entry.durationMs ? (
          <DetailRow label="Length" value={formatDurationMs(entry.durationMs)} />
        ) : null}
      </View>

      <Pressable
        onPress={onClose}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.surfaceMuted },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText weight="medium" style={{ color: colors.text }}>
          Close
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={confirmDelete}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <ThemedText weight="medium" style={{ color: colors.destructive }}>
          Delete entry
        </ThemedText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    marginBottom: space.lg,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    marginBottom: space.lg,
    gap: space.xs,
  },
  row: {
    paddingVertical: space.md,
  },
  label: {
    fontSize: 12,
    marginBottom: space.xs,
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 15,
    lineHeight: 21,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
  pressed: {
    opacity: 0.65,
  },
});
