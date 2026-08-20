import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import {
  formatLocationCoordinates,
  locationAccessibilityLabel,
  locationPlaceTitle,
} from "@/services/location/location";
import { Sheet } from "@/shared/components/Sheet";
import { ThemedText } from "@/shared/components/ThemedText";
import type { EntryLocation } from "@/shared/types";
import { FONT_SIZE, metrics, press, radius, space, useTheme } from "@/theme";

import { chip } from "../styles/ChipStyles";

interface LocationBadgeProps {
  location?: EntryLocation | null;
  on?: boolean;
  loading?: boolean;
  failed?: boolean;
  onPress?: () => void;
  onRefresh?: () => Promise<void> | void;
  onRemove?: () => void;
  readOnly?: boolean;
}

type BadgeState = "idle" | "loading" | "ready" | "failed";

function getBadgeState(
  on?: boolean,
  loading?: boolean,
  failed?: boolean,
  location?: EntryLocation | null,
  readOnly?: boolean
): BadgeState {
  if (readOnly) return location ? "ready" : "idle";
  if (loading) return "loading";
  if (on && location) return "ready";
  if (failed) return "failed";
  return "idle";
}

export function LocationBadge({
  location,
  on,
  loading,
  failed,
  onPress,
  onRefresh,
  onRemove,
  readOnly = false,
}: LocationBadgeProps) {
  const { colors } = useTheme().theme;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const state = getBadgeState(on, loading, failed, location, readOnly);

  const accessibility =
    state === "ready" && location
      ? locationAccessibilityLabel(location)
      : state === "loading"
        ? "…"
        : undefined;

  const handlePress = () => {
    if (state === "ready") {
      setSheetOpen(true);
      return;
    }
    onPress?.();
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = () => {
    setSheetOpen(false);
    onRemove?.();
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
        <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} placement="bottom">
          <View style={styles.sheetHeader}>
            <ThemedText weight="semibold" style={[styles.sheetTitle, { color: colors.text }]}>
              Location
            </ThemedText>
            <Pressable
              onPress={() => setSheetOpen(false)}
              hitSlop={space.sm}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.surfaceMuted },
                pressed && press,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close location details"
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View
            style={[
              styles.locationCard,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
            ]}
          >
            {refreshing ? (
              <View style={styles.refreshingWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
                <ThemedText style={[styles.refreshingText, { color: colors.textSecondary }]}>
                  Updating location…
                </ThemedText>
              </View>
            ) : (
              <>
                <ThemedText weight="medium" style={[styles.placeName, { color: colors.text }]}>
                  {locationPlaceTitle(location)}
                </ThemedText>
                <ThemedText style={[styles.coords, { color: colors.textSecondary }]}>
                  {formatLocationCoordinates(location)}
                </ThemedText>
              </>
            )}
          </View>

          {!readOnly ? (
            <View style={styles.actionsRow}>
              {onRefresh ? (
                <Pressable
                  onPress={handleRefresh}
                  disabled={refreshing}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.surfaceMuted },
                    pressed && press,
                    refreshing && { opacity: 0.5 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh current location"
                >
                  <Feather name="refresh-cw" size={16} color={colors.text} />
                  <ThemedText
                    weight="medium"
                    style={[styles.actionBtnText, { color: colors.text }]}
                  >
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </ThemedText>
                </Pressable>
              ) : null}

              {onRemove ? (
                <Pressable
                  onPress={handleRemove}
                  disabled={refreshing}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.surfaceMuted },
                    pressed && press,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Remove location from entry"
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                  <ThemedText
                    weight="medium"
                    style={[styles.actionBtnText, { color: colors.destructive }]}
                  >
                    Remove
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    opacity: 0.85,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.xl,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  locationCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  placeName: {
    fontSize: FONT_SIZE.lg,
    lineHeight: 22,
  },
  coords: {
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
    marginTop: space.xs,
    letterSpacing: 0.2,
  },
  refreshingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
  },
  refreshingText: {
    fontSize: FONT_SIZE.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: space.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs + 2,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.sm,
  },
});
