import { memo, useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { Entry } from "@/types/entry";
import { useEntries } from "@/entries";
import { useTheme } from "@/theme/ThemeProvider";
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

const THUMB_WIDTH = Math.round(Dimensions.get("window").width * 0.58);

function RowBase({ entry, animate }: RowProps) {
  const { theme } = useTheme();
  const { removeEntry, removeImage } = useEntries();
  const { colors } = theme;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animate ? 10 : 0)).current;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

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

  const bodyText =
    entry.type === "text" ? entry.text : entry.text?.trim() ? entry.text : undefined;
  const images = entry.type === "image" ? entry.uris : [];
  const hasImages = images.length > 0;
  const hasAudio = entry.type === "audio";
  const hasText = Boolean(bodyText);

  const openImage = (index: number) => {
    setImageViewerIndex(index);
    setImageViewerOpen(true);
  };

  const handleDeleteImage = (index: number) => {
    removeImage(entry.id, index)
      .then((updated) => {
        if (!updated || updated.type !== "image" || updated.uris.length === 0) {
          setImageViewerOpen(false);
        } else if (index >= updated.uris.length) {
          setImageViewerIndex(updated.uris.length - 1);
        }
      })
      .catch(() => {
        Alert.alert("Could not delete", "Please try again.");
      });
  };

  return (
    <>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <View style={styles.headerRow}>
          <View style={[styles.timeBadge, { backgroundColor: colors.surfaceMuted }]}>
            <ThemedText style={[typography.timestamp, { color: colors.textSecondary }]}>
              {formatTime(entry.createdAt)}
            </ThemedText>
          </View>
          <MenuButton onPress={() => setDetailsOpen(true)} />
        </View>

        {hasText ? (
          <ThemedText style={[typography.entryText, { color: colors.text }]}>
            {bodyText}
          </ThemedText>
        ) : null}

        {hasImages ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.imageRow,
              hasText ? styles.imageAfterText : undefined,
            ]}
          >
            {images.map((uri, index) => (
              <Pressable key={`${uri}-${index}`} onPress={() => openImage(index)}>
                <Image
                  source={{ uri }}
                  style={[styles.thumbnail, { backgroundColor: colors.surfaceMuted }]}
                  contentFit="cover"
                  transition={motion.normal}
                  recyclingKey={`${entry.id}-${index}`}
                  accessibilityLabel={`Image ${index + 1} of ${images.length}`}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {hasAudio ? (
          <View style={hasText || hasImages ? styles.audioAfterContent : undefined}>
            <AudioPlayer uri={entry.uri} durationMs={entry.durationMs} />
          </View>
        ) : null}
      </Animated.View>

      {hasImages ? (
        <ImageViewer
          uris={images}
          initialIndex={imageViewerIndex}
          visible={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          onDelete={handleDeleteImage}
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
  timeBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  imageAfterText: {
    marginTop: space.md,
  },
  audioAfterContent: {
    marginTop: space.md,
  },
  imageRow: {
    flexDirection: "row",
    gap: space.sm,
  },
  thumbnail: {
    width: THUMB_WIDTH,
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
});
