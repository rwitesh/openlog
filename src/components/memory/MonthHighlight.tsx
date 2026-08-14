import { memo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { HighlightMoment } from "@/lib";
import { formatTime, locationPlaceTitle } from "@/lib";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { AudioPlayer } from "@/components/core/audio";
import { ThemedText } from "@/components/core/ui";
import { ImageViewer } from "@/components/entry";

interface MonthHighlightProps {
  highlight: HighlightMoment;
  onPressDay?: (dayTs: number) => void;
}

function MonthHighlightBase({ highlight, onPressDay }: MonthHighlightProps) {
  const { theme } = useTheme();
  const { colors, motion } = theme;

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const { entry, dateLabel, dayTs } = highlight;
  const images = entry.type === "image" ? entry.uris : [];
  const bodyText = entry.type === "text" ? entry.text : entry.text?.trim() ? entry.text : undefined;
  const locationName = entry.location ? locationPlaceTitle(entry.location) : undefined;
  const timeText = formatTime(entry.createdAt);

  const openImage = (index: number) => {
    setImageViewerIndex(index);
    setImageViewerOpen(true);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPressDay ? () => onPressDay(dayTs) : undefined}
        disabled={!onPressDay}
        hitSlop={space.xs}
        style={({ pressed }) => [styles.headerRow, pressed && onPressDay && press]}
      >
        <ThemedText
          weight="semibold"
          style={[styles.dateLabel, { color: colors.textSecondary }]}
        >
          {dateLabel}
        </ThemedText>
        <ThemedText style={[styles.highlightTag, { color: colors.accent }]}>
          Highlighted moment
        </ThemedText>
      </Pressable>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.separator,
          },
        ]}
      >
        {images.length === 1 ? (
          <Pressable
            onPress={() => openImage(0)}
            style={({ pressed }) => [styles.singleImageWrap, pressed && press]}
          >
            <Image
              source={{ uri: images[0] }}
              style={[styles.singleImage, { backgroundColor: colors.surfaceMuted }]}
              contentFit="cover"
              transition={motion.normal}
              accessibilityLabel="Highlight photo"
            />
          </Pressable>
        ) : images.length === 2 ? (
          <View style={styles.pairRow}>
            {images.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                onPress={() => openImage(index)}
                style={({ pressed }) => [styles.pairItem, pressed && press]}
              >
                <Image
                  source={{ uri }}
                  style={[styles.pairImage, { backgroundColor: colors.surfaceMuted }]}
                  contentFit="cover"
                  transition={motion.normal}
                  accessibilityLabel={`Highlight photo ${index + 1}`}
                />
              </Pressable>
            ))}
          </View>
        ) : images.length >= 3 ? (
          <View style={styles.multiGrid}>
            <Pressable
              onPress={() => openImage(0)}
              style={({ pressed }) => [styles.leadImageWrap, pressed && press]}
            >
              <Image
                source={{ uri: images[0] }}
                style={[styles.leadImage, { backgroundColor: colors.surfaceMuted }]}
                contentFit="cover"
                transition={motion.normal}
                accessibilityLabel="Lead highlight photo"
              />
            </Pressable>
            <View style={styles.pairRow}>
              {images.slice(1, 3).map((uri, index) => (
                <Pressable
                  key={`${uri}-${index + 1}`}
                  onPress={() => openImage(index + 1)}
                  style={({ pressed }) => [styles.pairItem, pressed && press]}
                >
                  <Image
                    source={{ uri }}
                    style={[styles.pairImage, { backgroundColor: colors.surfaceMuted }]}
                    contentFit="cover"
                    transition={motion.normal}
                    accessibilityLabel={`Companion photo ${index + 2}`}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {bodyText ? (
          <ThemedText
            style={[
              theme.typography.entryText,
              styles.quoteText,
              { color: colors.text },
              images.length > 0 && styles.textAfterMedia,
            ]}
          >
            {bodyText}
          </ThemedText>
        ) : null}

        {entry.type === "audio" ? (
          <View style={styles.audioWrap}>
            <AudioPlayer uri={entry.uri} durationMs={entry.durationMs} />
          </View>
        ) : null}

        <View style={styles.footerMeta}>
          <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
            {timeText}
            {locationName ? ` · ${locationName}` : ""}
          </ThemedText>
        </View>
      </View>

      {images.length > 0 ? (
        <ImageViewer
          uris={images}
          initialIndex={imageViewerIndex}
          visible={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      ) : null}
    </View>
  );
}

export const MonthHighlight = memo(MonthHighlightBase);

const styles = StyleSheet.create({
  container: {
    marginBottom: space.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  dateLabel: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  highlightTag: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
    overflow: "hidden",
  },
  singleImageWrap: {
    width: "100%",
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  singleImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: radius.sm,
  },
  pairRow: {
    flexDirection: "row",
    gap: space.sm,
    width: "100%",
  },
  pairItem: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  pairImage: {
    width: "100%",
    aspectRatio: 1.2,
    borderRadius: radius.sm,
  },
  multiGrid: {
    gap: space.sm,
    width: "100%",
  },
  leadImageWrap: {
    width: "100%",
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  leadImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: space.xs,
  },
  textAfterMedia: {
    marginTop: space.md,
  },
  audioWrap: {
    marginTop: space.sm,
  },
  footerMeta: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  metaText: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
});
