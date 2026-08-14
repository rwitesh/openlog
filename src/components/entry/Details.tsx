import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { Entry } from "@/types/entry";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { FONT_SIZE } from "@/theme/typography";
import { press } from "@/theme/motion";
import { formatDateTime, formatDurationMs, formatLocationCoordinates, formatLocationLabel, typeLabel } from "@/lib";
import { Sheet, ThemedText } from "@/components/core/ui";

interface DetailsProps {
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

export function Details({
  entry,
  visible,
  onClose,
  onDelete,
}: DetailsProps) {
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
    <Sheet visible={visible} onClose={onClose}>
      <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
        Entry details
      </ThemedText>

      <View style={[styles.card, { borderColor: colors.separator }]}>
        <DetailRow label="Written" value={formatDateTime(entry.createdAt)} />
        <DetailRow label="Type" value={typeLabel(entry.type)} />
        {entry.type === "audio" && entry.durationMs ? (
          <DetailRow label="Length" value={formatDurationMs(entry.durationMs)} />
        ) : null}
        {entry.location ? (
          <View style={styles.locationBlock}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            <View style={styles.locationText}>
              <ThemedText style={[styles.value, { color: colors.text }]}>
                {formatLocationLabel(entry.location)}
              </ThemedText>
              <ThemedText style={[styles.coords, { color: colors.textSecondary }]}>
                {formatLocationCoordinates(entry.location)}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.surfaceMuted },
            pressed && press,
          ]}
        >
          <ThemedText weight="medium" style={{ color: colors.text }}>
            Close
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => [styles.button, pressed && press]}
        >
          <ThemedText weight="medium" style={{ color: colors.destructive }}>
            Delete entry
          </ThemedText>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FONT_SIZE.xl,
    marginBottom: space.md,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    marginBottom: space.md,
  },
  row: {
    paddingVertical: space.sm,
  },
  locationBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    paddingVertical: space.sm,
  },
  locationText: {
    flex: 1,
    gap: 2,
  },
  coords: {
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  value: {
    fontSize: FONT_SIZE.lg,
    lineHeight: 20,
  },
  actions: {
    gap: space.xs,
    paddingTop: space.xs,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
});
