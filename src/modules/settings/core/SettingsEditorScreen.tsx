import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space, useTheme } from "@/theme";

/**
 * Layout for editor screens: a live preview pinned above a scrollable
 * editor body, so changes stay visible while scrolling long controls.
 */
export function SettingsEditorScreen({
  preview,
  children,
}: {
  preview?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {preview ? <View style={styles.preview}>{preview}</View> : null}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.xxxl,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  preview: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
});
