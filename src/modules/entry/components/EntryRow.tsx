import { memo, useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Entry } from "@/shared/types";
import type { RootStackParamList } from "@/navigation/types";
import { useEntries } from "../store/EntryStore";
import { useEntryPreferences, useTheme } from "@/theme";
import { press } from "@/theme/motion";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { typography } from "@/theme/typography";
import { formatTime } from "@/shared/utils/dates";
import { locationPlaceTitle } from "@/services/location/location";
import { AudioPlayer } from "./AudioPlayer";
import { ThemedText } from "@/shared/components/ThemedText";
import { EntryDetailsModal } from "./EntryDetailsModal";
import { ImageViewerModal } from "./ImageViewerModal";
import { EntryMenuButton } from "./EntryMenuButton";

interface EntryRowProps {
  entry: Entry;
  animate?: boolean;
}

function EntryRowBase({ entry, animate }: EntryRowProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { removeEntry, removeImage } = useEntries();
  const { colors, motion } = theme;
  const opacity = useRef(new Animated.Value(animate && motion.level !== "reduced" ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animate && motion.level !== "reduced" ? 10 : 0)).current;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  useEffect(() => {
    if (!animate || motion.level === "reduced") {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
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
  }, [animate, opacity, translateY, motion]);

  const handleView = () => {
    navigation.navigate("Compose", { entryId: entry.id, mode: "view" });
  };

  const handleEdit = () => {
    navigation.navigate("Compose", { entryId: entry.id, mode: "edit" });
  };

  const handleDelete = () => {
    removeEntry(entry.id).catch(() => {
      Alert.alert("Could not delete", "Please try again.");
    });
  };

  const bodyText = entry.text?.trim() ? entry.text : undefined;
  const images = entry.images ?? [];
  const audios = entry.audios ?? [];
  const hasImages = images.length > 0;
  const hasAudio = audios.length > 0;
  const hasText = Boolean(bodyText);
  const locationName = entry.location ? locationPlaceTitle(entry.location) : undefined;

  const openImage = (index: number) => {
    setImageViewerIndex(index);
    setImageViewerOpen(true);
  };

  const handleDeleteImage = (index: number) => {
    removeImage(entry.id, index)
      .then((updated) => {
        if (!updated || updated.images.length === 0) {
          setImageViewerOpen(false);
        } else if (index >= updated.images.length) {
          setImageViewerIndex(updated.images.length - 1);
        }
      })
      .catch(() => {
        Alert.alert("Could not delete", "Please try again.");
      });
  };

  const { showTimestamp, showLocation } = useEntryPreferences();
  const showTime = showTimestamp;
  const showLoc = showLocation && Boolean(locationName);

  return (
    <>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleView} style={styles.meta} hitSlop={space.xs}>
            {showTime ? (
              <ThemedText
                weight="medium"
                style={[styles.metaText, { color: colors.textSecondary }]}
              >
                {formatTime(entry.createdAt)}
              </ThemedText>
            ) : null}
            {showTime && showLoc ? (
              <ThemedText style={[styles.metaDot, { color: colors.textTertiary }]}>
                ·
              </ThemedText>
            ) : null}
            {showLoc ? (
              <ThemedText
                style={[styles.locationText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {locationName}
              </ThemedText>
            ) : null}
          </Pressable>
          <EntryMenuButton onPress={() => setDetailsOpen(true)} />
        </View>

        {hasText ? (
          <Pressable onPress={handleView} hitSlop={space.xs}>
            <ThemedText style={[theme.typography.entryText, { color: colors.text }]}>
              {bodyText}
            </ThemedText>
          </Pressable>
        ) : null}

        {hasImages ? (
          images.length === 1 ? (
            <Pressable
              onPress={() => openImage(0)}
              style={({ pressed }) => [
                styles.singleImageWrap,
                hasText ? styles.imageAfterText : undefined,
                pressed && press,
              ]}
            >
              <Image
                source={{ uri: images[0] }}
                style={[styles.singleImage, { backgroundColor: colors.surfaceMuted }]}
                contentFit="cover"
                transition={motion.normal}
                recyclingKey={`${entry.id}-0`}
                accessibilityLabel="Entry photo"
              />
            </Pressable>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.imageRow,
                hasText ? styles.imageAfterText : undefined,
              ]}
            >
              {images.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  onPress={() => openImage(index)}
                  style={({ pressed }) => [styles.thumbnailWrap, pressed && press]}
                >
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
          )
        ) : null}

        {hasAudio ? (
          <View style={[styles.audioList, hasText || hasImages ? styles.audioAfterContent : undefined]}>
            {audios.map((uri, index) => (
              <AudioPlayer key={`${uri}-${index}`} uri={uri} />
            ))}
          </View>
        ) : null}
      </Animated.View>

      {hasImages ? (
        <ImageViewerModal
          uris={images}
          initialIndex={imageViewerIndex}
          visible={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          onDelete={handleDeleteImage}
        />
      ) : null}

      <EntryDetailsModal
        entry={entry}
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onEdit={handleEdit}
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
    marginBottom: space.xs + 2,
    minHeight: 28,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: space.sm,
    gap: space.xs + 2,
  },
  metaText: {
    fontSize: typography.timestamp.fontSize,
    lineHeight: typography.timestamp.lineHeight,
    letterSpacing: typography.timestamp.letterSpacing,
  },
  metaDot: {
    fontSize: typography.timestamp.fontSize,
    lineHeight: typography.timestamp.lineHeight,
  },
  locationText: {
    fontSize: typography.timestamp.fontSize,
    lineHeight: typography.timestamp.lineHeight,
    flexShrink: 1,
  },
  imageAfterText: {
    marginTop: space.md,
  },
  audioAfterContent: {
    marginTop: space.md,
  },
  audioList: {
    gap: space.xs,
  },
  singleImageWrap: {
    width: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
  },
  singleImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
  },
  imageRow: {
    flexDirection: "row",
    gap: space.sm,
  },
  thumbnailWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  thumbnail: {
    width: 172,
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
});
