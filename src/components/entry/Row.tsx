import { memo, useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { Entry } from "@/types/entry";
import { useEntries } from "@/hooks/useEntries";
import { useTheme } from "@/hooks/useTheme";
import { motion } from "@/theme/motion";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { typography } from "@/theme/typography";
import { formatTime } from "@/lib";
import { AudioPlayer } from "@/components/core/audio";
import { ThemedText } from "@/components/core/ui";
import { Details } from "./Details";
import { ImageViewer } from "./ImageViewer";
import { MenuButton } from "./MenuButton";

interface RowProps {
  entry: Entry;
  animate?: boolean;
}

function RowBase({ entry, animate }: RowProps) {
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
        <View style={styles.headerRow}>
          <ThemedText style={[typography.timestamp, { color: colors.textTertiary }]}>
            {formatTime(entry.createdAt)}
          </ThemedText>
          <MenuButton onPress={() => setDetailsOpen(true)} />
        </View>

        {hasText ? (
          <ThemedText style={[typography.entryText, { color: colors.text }]}>
            {entry.text}
          </ThemedText>
        ) : null}

        {hasImage ? (
          <Pressable
            onPress={() => setImageViewerOpen(true)}
            style={hasText ? styles.imageAfterText : undefined}
          >
            <Image
              source={{ uri: entry.uri }}
              style={[styles.image, { backgroundColor: colors.surfaceMuted }]}
              contentFit="cover"
              transition={motion.normal}
              recyclingKey={entry.id}
              accessibilityLabel="Image"
            />
          </Pressable>
        ) : null}

        {hasAudio && entry.uri ? (
          <View style={hasText || hasImage ? styles.audioAfterContent : undefined}>
            <AudioPlayer uri={entry.uri} durationMs={entry.durationMs} />
          </View>
        ) : null}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  imageAfterText: {
    marginTop: space.md,
  },
  audioAfterContent: {
    marginTop: space.md,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
});
