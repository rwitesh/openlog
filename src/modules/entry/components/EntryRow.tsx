import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextLayoutEventData,
  View,
} from "react-native";
import type { RootStackParamList } from "@/navigation/types";
import { locationPlaceTitle } from "@/services/location/location";
import { ThemedText } from "@/shared/components/ThemedText";
import type { Entry } from "@/shared/types";
import { formatTime } from "@/shared/utils/dates";
import { press, radius, space, typography, useEntryPreferences, useTheme } from "@/theme";
import { useEntries } from "../store/EntryStore";
import { AudioPlayer } from "./AudioPlayer";
import { EntryDetailsModal } from "./EntryDetailsModal";
import { EntryMenuButton } from "./EntryMenuButton";
import { ImageViewerModal } from "./ImageViewerModal";

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
  const translateY = useRef(
    new Animated.Value(animate && motion.level !== "reduced" ? 10 : 0)
  ).current;
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

  const [isTruncated, setIsTruncated] = useState(() => {
    if (!bodyText) return false;
    return bodyText.length > 300 || bodyText.split("\n").length > 6;
  });

  const handleTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (!bodyText) return;
      const lines = e.nativeEvent.lines;
      if (lines.length > 6) {
        setIsTruncated(true);
        return;
      }
      const renderedChars = lines.reduce((acc, l) => acc + l.text.length, 0);
      if (bodyText.trim().length > renderedChars + 2) {
        setIsTruncated(true);
      }
    },
    [bodyText]
  );

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

  const { showTimestamp, showLocation, timelineDensity } = useEntryPreferences();
  const isCompact = timelineDensity === "compact";
  const showTime = showTimestamp;
  const showLoc = showLocation && Boolean(locationName);

  return (
    <>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <View style={[styles.headerRow, isCompact && styles.headerRowCompact]}>
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
              <ThemedText style={[styles.metaDot, { color: colors.textTertiary }]}>·</ThemedText>
            ) : null}
            {showLoc ? (
              <View style={styles.locRow}>
                <Feather name="map-pin" size={10} color={colors.textTertiary} />
                <ThemedText
                  style={[styles.locationText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {locationName}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
          <EntryMenuButton onPress={() => setDetailsOpen(true)} />
        </View>

        {hasText ? (
          <Pressable onPress={handleView} hitSlop={space.xs}>
            <ThemedText
              numberOfLines={6}
              ellipsizeMode="tail"
              onTextLayout={handleTextLayout}
              style={[theme.typography.entryText, { color: colors.text }]}
            >
              {bodyText}
            </ThemedText>
            {isTruncated ? (
              <ThemedText weight="medium" style={[styles.readMore, { color: colors.accent }]}>
                Read more
              </ThemedText>
            ) : null}
          </Pressable>
        ) : null}

        {hasImages ? (
          images.length === 1 ? (
            <Pressable
              onPress={() => openImage(0)}
              style={({ pressed }) => [
                styles.singleImageWrap,
                { borderColor: colors.separator },
                hasText
                  ? isCompact
                    ? styles.imageAfterTextCompact
                    : styles.imageAfterText
                  : undefined,
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
                hasText
                  ? isCompact
                    ? styles.imageAfterTextCompact
                    : styles.imageAfterText
                  : undefined,
              ]}
            >
              {images.map((uri, index) => (
                <Pressable
                  key={uri}
                  onPress={() => openImage(index)}
                  style={({ pressed }) => [
                    styles.thumbnailWrap,
                    { borderColor: colors.separator },
                    pressed && press,
                  ]}
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
          <View
            style={[
              styles.audioList,
              hasText || hasImages
                ? isCompact
                  ? styles.audioAfterContentCompact
                  : styles.audioAfterContent
                : undefined,
            ]}
          >
            {audios.map((uri) => (
              <AudioPlayer key={uri} uri={uri} />
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
  headerRowCompact: {
    marginBottom: 2,
    minHeight: 20,
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
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 1,
  },
  locationText: {
    fontSize: typography.timestamp.fontSize,
    lineHeight: typography.timestamp.lineHeight,
    letterSpacing: typography.timestamp.letterSpacing,
  },
  imageAfterText: {
    marginTop: space.md,
  },
  imageAfterTextCompact: {
    marginTop: space.xs + 2,
  },
  audioAfterContent: {
    marginTop: space.md,
  },
  audioAfterContentCompact: {
    marginTop: space.xs + 2,
  },
  audioList: {
    gap: space.xs,
  },
  singleImageWrap: {
    width: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: {
    width: 172,
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
  readMore: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: space.xs,
  },
});
