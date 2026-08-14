import { memo, useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { Entry } from "@/types/entry";
import { useEntries } from "@/hooks/useEntries";
import { useTheme } from "@/hooks/useTheme";
import { motion } from "@/theme/motion";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatTime } from "@/lib";
import { AudioPlayer, ThemedText } from "@/components/core";
import { Details } from "./Details";
import { ImageViewer } from "./ImageViewer";
import { MenuButton } from "./MenuButton";
import { TimelineRail } from "./TimelineRail";

interface RowProps {
  entry: Entry;
  isFirst: boolean;
  isLast: boolean;
  animate?: boolean;
}

function RowBase({ entry, isFirst, isLast, animate }: RowProps) {
  const { theme } = useTheme();
  const { removeEntry } = useEntries();
  const { colors } = theme;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animate ? 10 : 0)).current;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.slow,
        easing: motion.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.slow,
        easing: motion.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animate, opacity, translateY]);

  const handleDelete = () => {
    removeEntry(entry.id).catch(() => {
      Alert.alert("Could not delete", "Please try again.");
    });
  };

  const hasImage = entry.type === "image" && Boolean(entry.uri);
  const hasAudio = entry.type === "audio" && Boolean(entry.uri);
  const hasText = Boolean(entry.text?.trim());

  return (
    <>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <TimelineRail isFirst={isFirst} isLast={isLast}>
          {hasText ? (
            <ThemedText style={[typography.entryText, { color: colors.text }]}>
              {entry.text}
            </ThemedText>
          ) : null}

          {hasImage ? (
            <Pressable
              onPress={() => setImageViewerOpen(true)}
              style={hasText ? styles.imageAfterText : styles.imageOnly}
            >
              <Image
                source={{ uri: entry.uri }}
                style={[styles.image, { backgroundColor: colors.surfaceMuted }]}
                contentFit="cover"
                transition={280}
                recyclingKey={entry.id}
                accessibilityLabel="Image"
              />
            </Pressable>
          ) : null}

          {hasAudio && entry.uri ? (
            <AudioPlayer uri={entry.uri} durationMs={entry.durationMs} />
          ) : null}

          <View style={styles.footerRow}>
            <ThemedText style={[typography.timestamp, { color: colors.textTertiary }]}>
              {formatTime(entry.createdAt)}
            </ThemedText>
            <MenuButton onPress={() => setDetailsOpen(true)} />
          </View>
        </TimelineRail>
      </Animated.View>

      {hasImage && entry.uri ? (
        <ImageViewer
          uri={entry.uri}
          visible={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      ) : null}

      <Details
        entry={entry}
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onDelete={handleDelete}
      />
    </>
  );
}

export const Row = memo(RowBase);

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.sm,
  },
  imageOnly: {
    marginTop: 0,
  },
  imageAfterText: {
    marginTop: space.md,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: space.md,
  },
});
