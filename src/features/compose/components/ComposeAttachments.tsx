import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { AudioDraftPreview } from "./AudioDraftPreview";
import { ImageViewerModal } from "@/features/entry/components/ImageViewerModal";

export const MAX_IMAGES = 10;
const PREVIEW_SIZE = 80;

interface AttachmentsProps {
  imageUris: string[];
  onRemoveImage: (index: number) => void;
  audioUri?: string;
  audioDurationMs?: number;
  audioLevels?: number[];
  onRemoveAudio: () => void;
  readOnly?: boolean;
}

export function ComposeAttachments({
  imageUris,
  onRemoveImage,
  audioUri,
  audioDurationMs = 0,
  audioLevels,
  onRemoveAudio,
  readOnly = false,
}: AttachmentsProps) {
  const { colors } = useTheme().theme;
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const hasImages = imageUris.length > 0;
  const hasAudio = Boolean(audioUri);

  if (!hasImages && !hasAudio) return null;

  const openImage = (index: number) => {
    setImageViewerIndex(index);
    setImageViewerOpen(true);
  };

  return (
    <>
      <View style={[styles.wrap, readOnly && styles.readOnlyWrap]}>
        {hasImages ? (
          readOnly ? (
            imageUris.length === 1 ? (
              <Pressable
                onPress={() => openImage(0)}
                style={({ pressed }) => [styles.singleImageWrap, pressed && press]}
              >
                <Image
                  source={{ uri: imageUris[0] }}
                  style={[styles.singleImage, { backgroundColor: colors.surfaceMuted }]}
                  contentFit="cover"
                  accessibilityLabel="Entry photo"
                />
              </Pressable>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.detailImageStrip}
                contentContainerStyle={styles.detailImageRow}
                keyboardShouldPersistTaps="handled"
              >
                {imageUris.map((uri, index) => (
                  <Pressable
                    key={`${uri}-${index}`}
                    onPress={() => openImage(index)}
                    style={({ pressed }) => [styles.detailThumbnailWrap, pressed && press]}
                  >
                    <Image
                      source={{ uri }}
                      style={[
                        styles.detailThumbnail,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                      contentFit="cover"
                      accessibilityLabel={`Image ${index + 1} of ${imageUris.length}`}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageStrip}
              contentContainerStyle={styles.imageRow}
              keyboardShouldPersistTaps="handled"
            >
              {imageUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.previewRow}>
                  <Image source={{ uri }} style={styles.preview} contentFit="cover" />
                  <Pressable
                    onPress={() => onRemoveImage(index)}
                    hitSlop={space.sm}
                    style={[styles.removeBadge, { backgroundColor: colors.surface }]}
                    accessibilityLabel="Remove image"
                  >
                    <Feather name="x" size={metrics.iconXs} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )
        ) : null}

        {hasAudio ? (
          <AudioDraftPreview
            uri={audioUri!}
            durationMs={audioDurationMs}
            levels={audioLevels}
            onRemove={readOnly ? undefined : onRemoveAudio}
          />
        ) : null}
      </View>

      {hasImages ? (
        <ImageViewerModal
          uris={imageUris}
          initialIndex={imageViewerIndex}
          visible={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
    marginTop: space.md,
    paddingHorizontal: space.xxl,
  },
  readOnlyWrap: {
    paddingBottom: space.xl,
    gap: space.md,
  },
  imageStrip: {
    height: PREVIEW_SIZE,
  },
  imageRow: {
    gap: space.sm,
    alignItems: "center",
  },
  previewRow: {
    position: "relative",
  },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: radius.md,
  },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
  detailImageStrip: {
    width: "100%",
  },
  detailImageRow: {
    gap: space.sm,
    alignItems: "center",
  },
  detailThumbnailWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  detailThumbnail: {
    width: 220,
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
});
