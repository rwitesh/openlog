import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { DraftPreview } from "@/components/core";

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

export function Attachments({
  imageUris,
  onRemoveImage,
  audioUri,
  audioDurationMs = 0,
  audioLevels,
  onRemoveAudio,
  readOnly = false,
}: AttachmentsProps) {
  const { colors } = useTheme().theme;
  const hasImages = imageUris.length > 0;
  const hasAudio = Boolean(audioUri);

  if (!hasImages && !hasAudio) return null;

  return (
    <View style={styles.wrap}>
      {hasImages ? (
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
              {!readOnly ? (
                <Pressable
                  onPress={() => onRemoveImage(index)}
                  hitSlop={space.sm}
                  style={[styles.removeBadge, { backgroundColor: colors.surface }]}
                  accessibilityLabel="Remove image"
                >
                  <Feather name="x" size={metrics.iconXs} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {hasAudio ? (
        <DraftPreview
          uri={audioUri!}
          durationMs={audioDurationMs}
          levels={audioLevels}
          onRemove={readOnly ? undefined : onRemoveAudio}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
    marginTop: space.md,
    paddingHorizontal: space.xxl,
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
});
