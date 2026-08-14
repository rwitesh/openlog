import { type RefObject } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";

interface EditorProps {
  inputRef: RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
}

export function Editor({ inputRef, value, onChangeText }: EditorProps) {
  const { colors } = useTheme().theme;

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
        style={[styles.input, typography.composerText, { color: colors.text }]}
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
