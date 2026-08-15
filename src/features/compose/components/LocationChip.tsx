import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Popover } from "@/shared/components/Popover";
import { LocationDetail } from "@/features/entry/components/LocationDetail";
import { locationAccessibilityLabel } from "@/services/location/location";
import { press } from "@/theme/motion";
import { metrics, space } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import type { EntryLocation } from "@/shared/types";

import { chip } from "../styles/chipStyles";

interface LocationChipProps {
  location?: EntryLocation | null;
  on?: boolean;
  loading?: boolean;
  failed?: boolean;
  onPress?: () => void;
  readOnly?: boolean;
}

type ChipState = "idle" | "loading" | "ready" | "failed";

function chipState(
  on?: boolean,
  loading?: boolean,
  failed?: boolean,
  location?: EntryLocation | null,
  readOnly?: boolean
): ChipState {
  if (readOnly) return location ? "ready" : "idle";
  if (loading) return "loading";
  if (on && location) return "ready";
  if (failed) return "failed";
  return "idle";
}

export function LocationChip({
  location,
  on,
  loading,
  failed,
  onPress,
  readOnly = false,
}: LocationChipProps) {
  const { colors } = useTheme().theme;
  const [detailOpen, setDetailOpen] = useState(false);
  const state = chipState(on, loading, failed, location, readOnly);

  useEffect(() => {
    if (state !== "ready") setDetailOpen(false);
  }, [state]);

  const accessibility =
    state === "ready" && location
      ? locationAccessibilityLabel(location)
      : state === "loading"
        ? "…"
        : undefined;

  const handlePress = () => {
    if (state === "ready") {
      setDetailOpen(true);
      return;
    }
    onPress?.();
  };

  const handleRemove = () => {
    setDetailOpen(false);
    onPress?.();
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          chip.base,
          { backgroundColor: colors.surfaceMuted },
          state === "loading" && styles.loading,
          pressed && press,
        ]}
        accessibilityLabel={accessibility}
        accessibilityRole="button"
      >
        <Feather name="map-pin" size={metrics.iconSm} color={colors.text} />
        {state === "loading" ? (
          <View style={chip.iconSlot}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : null}
        {state === "ready" ? (
          <View style={chip.iconSlot}>
            <Feather name="check" size={metrics.iconSm} color={colors.success} />
          </View>
        ) : null}
        {state === "failed" ? (
          <View style={chip.iconSlot}>
            <Feather name="x" size={metrics.iconSm} color={colors.destructive} />
          </View>
        ) : null}
      </Pressable>

      {location ? (
        <Popover visible={detailOpen} onClose={() => setDetailOpen(false)}>
          <View style={styles.detailBody}>
            <LocationDetail location={location} />
          </View>

          <View style={styles.detailActions}>
            <Pressable
              onPress={() => setDetailOpen(false)}
              hitSlop={space.sm}
              style={({ pressed }) => [styles.iconBtn, pressed && press]}
              accessibilityRole="button"
            >
              <Feather name="x" size={metrics.iconMd} color={colors.textSecondary} />
            </Pressable>

            {!readOnly && onPress ? (
              <Pressable
                onPress={handleRemove}
                hitSlop={space.sm}
                style={({ pressed }) => [styles.iconBtn, pressed && press]}
                accessibilityRole="button"
              >
                <Feather name="trash-2" size={metrics.iconMd} color={colors.destructive} />
              </Pressable>
            ) : null}
          </View>
        </Popover>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    opacity: 0.85,
  },
  detailBody: {
    marginBottom: space.md,
  },
  detailActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: space.md,
  },
  iconBtn: {
    padding: space.xs,
  },
});
