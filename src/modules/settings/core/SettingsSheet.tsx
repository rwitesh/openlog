import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Optional trailing header control (e.g. a Reset affordance). */
  headerRight?: ReactNode;
  children: ReactNode;
}

/**
 * The single shared bottom sheet for all settings editors — one instance is
 * mounted on the Settings screen, and rows swap its title and content.
 */
export function SettingsSheet({
  visible,
  onClose,
  title,
  subtitle,
  headerRight,
  children,
}: SettingsSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;

  const isIOS = Platform.OS === "ios";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isIOS ? "pageSheet" : "overFullScreen"}
      transparent={!isIOS}
      onRequestClose={onClose}
      onDismiss={isIOS ? onClose : undefined}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.overlay, !isIOS && styles.backdrop]}
      >
        {!isIOS ? (
          <Pressable
            style={styles.backdropPressable}
            onPress={onClose}
            accessibilityLabel="Close sheet"
          />
        ) : null}

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.separator,
              paddingBottom: Math.max(insets.bottom, space.md),
            },
            !isIOS && styles.nonIosSheet,
          ]}
        >
          {/* Drag Handle Indicator */}
          <View style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: colors.separator }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.separator }]}>
            <View style={styles.headerTitleWrap}>
              <ThemedText weight="semibold" style={[styles.headerTitle, { color: colors.text }]}>
                {title}
              </ThemedText>
              {subtitle ? (
                <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {subtitle}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              {headerRight}
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: colors.surfaceMuted },
                  pressed && press,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Close ${title}`}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    flex: 1,
  },
  nonIosSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: space.xs + 2,
    paddingBottom: space.xs,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space.md,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
});
