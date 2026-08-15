import { type RefObject } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";

import { useTheme, useWritingPreferences } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";

interface EditorProps {
  inputRef: RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
}

export function ComposeEditor({ inputRef, value, onChangeText }: EditorProps) {
  const { theme } = useTheme();
  const { editorTextSize } = useWritingPreferences();
  const { colors, typography } = theme;

  const editorStyle =
    editorTextSize === "large"
      ? {
          fontFamily: typography.composerText.fontFamily,
          fontSize: 20,
          lineHeight: 30,
          letterSpacing: 0.05,
        }
      : typography.composerText;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Write something…"
        placeholderTextColor={colors.textTertiary}
        multiline
        scrollEnabled={false}
        maxLength={2000}
        autoFocus
        blurOnSubmit={false}
        textAlignVertical="top"
        style={[styles.input, editorStyle, { color: colors.text }]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  input: {
    minHeight: 80,
    paddingTop: space.sm,
    paddingHorizontal: space.xxl,
  },
});
