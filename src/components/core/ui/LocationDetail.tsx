import { StyleSheet, View } from "react-native";

import {
  LOCATION_UNAVAILABLE,
  formatLocationCoordinates,
  locationAccessibilityLabel,
  locationPlaceTitle,
} from "@/lib";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { FONT_SIZE } from "@/theme/typography";
import type { EntryLocation } from "@/types/entry";

import { ThemedText } from "./ThemedText";

interface LocationDetailProps {
  location?: EntryLocation | null;
  /** Shows the "Location" field label above the value. */
  labeled?: boolean;
}

export function LocationDetail({ location, labeled = false }: LocationDetailProps) {
  const { colors } = useTheme().theme;

  return (
    <View style={labeled ? styles.row : undefined}>
      {labeled ? (
        <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
          Location
        </ThemedText>
      ) : null}

      {!location ? (
        <ThemedText style={[styles.title, { color: colors.text }]}>
          {LOCATION_UNAVAILABLE}
        </ThemedText>
      ) : (
        <>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            {locationPlaceTitle(location)}
          </ThemedText>
          <ThemedText style={[styles.coords, { color: colors.textSecondary }]}>
            {formatLocationCoordinates(location)}
          </ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: space.sm,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    lineHeight: 20,
  },
  coords: {
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
