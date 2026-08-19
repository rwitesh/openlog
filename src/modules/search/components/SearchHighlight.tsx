import { memo, useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { useTheme } from "@/theme";
import { fontFamily } from "@/theme/typography";
import { splitSnippet } from "../utils/highlight";

interface SearchHighlightProps {
  snippet: string;
  /** "body" matches entry text; "meta" matches the timestamp/location line. */
  variant?: "body" | "meta";
  numberOfLines?: number;
}

/** Renders an FTS snippet with match ranges emphasised in the accent color. */
export const SearchHighlight = memo(function SearchHighlight({
  snippet,
  variant = "body",
  numberOfLines,
}: SearchHighlightProps) {
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const segments = useMemo(() => splitSnippet(snippet), [snippet]);
  if (!segments.length) return null;

  const base = variant === "body" ? typography.entryText : typography.timestamp;

  return (
    <Text numberOfLines={numberOfLines} style={[base, { color: colors.text }]}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <Text
            key={index}
            style={[
              base,
              {
                color: colors.accent,
                fontFamily: fontFamily("semibold", theme.fontFamily),
                letterSpacing: 0,
              },
            ]}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={index} style={[base, styles.inherit]}>
            {segment.text}
          </Text>
        )
      )}
    </Text>
  );
});

const styles = StyleSheet.create({
  inherit: {
    flexShrink: 1,
  },
});
