import { memo, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { Entry } from "@/types/entry";
import { useEntries } from "@/hooks/useEntries";
import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatEntryTime } from "@/lib";
import { AudioPlayer, ThemedText } from "@/components/core";
import { EntryDetailsModal } from "./EntryDetailsModal";
import { EntryImageViewer } from "./EntryImageViewer";
import { EntryMenuButton } from "./EntryMenuButton";
import { TimelineRail } from "./TimelineRail";

interface EntryRowProps {
  entry: Entry;
  isLast: boolean;
  animate?: boolean;
}

function EntryRowBase({ entry, isLast, animate }: EntryRowProps) {
  const { theme } = useTheme();
  const { removeEntry } = useEntries();
  const { colors } = theme;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  useEffect(() => {
    if (!animate) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animate, opacity]);

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
      <Animated.View style={{ opacity }}>
        <TimelineRail isLast={isLast}>
          <View style={styles.headerRow}>
            <ThemedText style={[typography.timestamp, { color: colors.textTertiary }]}>
              {formatEntryTime(entry.createdAt)}
            </ThemedText>
            <EntryMenuButton onPress={() => setDetailsOpen(true)} />
          </View>

          {hasText ? (
            <ThemedText
              weight="regular"
              style={[typography.entryText, styles.text, { color: colors.text }]}
            >
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
                transition={200}
                recyclingKey={entry.id}
                accessibilityLabel="Entry image"
              />
            </Pressable>
          ) : null}

          {hasAudio && entry.uri ? (
            <AudioPlayer uri={entry.uri} durationMs={entry.durationMs} />
          ) : null}
        </TimelineRail>
      </Animated.View>

      {hasImage && entry.uri ? (
        <EntryImageViewer
          uri={entry.uri}
          visible={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      ) : null}

      <EntryDetailsModal
        entry={entry}
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onDelete={handleDelete}
      />
    </>
  );
}

export const EntryRow = memo(EntryRowBase);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  text: {
    marginTop: space.xs,
  },
  imageOnly: {
    marginTop: space.sm,
  },
  imageAfterText: {
    marginTop: space.lg,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: space.md,
  },
});
