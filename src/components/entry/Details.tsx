import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { Entry } from "@/types/entry";
import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { FONT_SIZE } from "@/theme/typography";
import { press } from "@/theme/motion";
import {
  formatDateTime,
  formatDurationMs,
  typeLabel,
} from "@/lib";
import { LocationDetail, Sheet, ThemedText } from "@/components/core/ui";

interface DetailsProps {
  entry: Entry;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
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

interface ActionIconProps {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  color: string;
  backgroundColor: string;
}

function ActionIcon({ icon, label, onPress, color, backgroundColor }: ActionIconProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.sm}
      style={({ pressed }) => [styles.actionBtn, { backgroundColor }, pressed && press]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Feather name={icon} size={metrics.iconMd} color={color} />
      <ThemedText style={[styles.actionLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

export function Details({
  entry,
  visible,
  onClose,
  onEdit,
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

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
        Entry details
      </ThemedText>

      <View style={[styles.card, { borderColor: colors.separator }]}>
        <DetailRow label="Created" value={formatDateTime(entry.createdAt)} />
        <DetailRow label="Updated" value={formatDateTime(entry.updatedAt)} />
        <DetailRow label="Type" value={typeLabel(entry.type)} />
        {entry.type === "audio" && entry.durationMs ? (
          <DetailRow label="Length" value={formatDurationMs(entry.durationMs)} />
        ) : null}
        <LocationDetail location={entry.location} labeled />
      </View>

      <View style={styles.actions}>
        <ActionIcon
          icon="edit-2"
          label="Edit"
          onPress={handleEdit}
          color={colors.text}
          backgroundColor={colors.surfaceMuted}
        />
        <ActionIcon
          icon="trash-2"
          label="Delete"
          onPress={confirmDelete}
          color={colors.destructive}
          backgroundColor={colors.surfaceMuted}
        />
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
    marginBottom: space.lg,
  },
  row: {
    paddingVertical: space.sm,
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
    flexDirection: "row",
    justifyContent: "center",
    gap: space.lg,
    paddingTop: space.xs,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: metrics.fabSize + space.sm,
    height: metrics.fabSize + space.sm,
    borderRadius: radius.md,
    gap: space.xs,
  },
  actionLabel: {
    fontSize: FONT_SIZE.xs,
  },
});
