import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space, useTheme } from "@/theme";

/** Shared scroll scaffold for list-style settings screens (hub, categories). */
export function SettingsScreenScroll({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{
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
});
