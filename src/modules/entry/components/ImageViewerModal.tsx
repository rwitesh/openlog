import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLocked } from "@/services/auth";
import { shareImage } from "@/services/media/share";
import { ThemedText } from "@/shared/components/ThemedText";
import { metrics, space } from "@/theme";

interface ImageViewerModalProps {
  uris: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
  onDelete?: (index: number) => void;
}

const CHROME = "#FBFAF6";
const DELETE = "#F4B4B4";

export function ImageViewerModal({
  uris,
  initialIndex = 0,
  visible,
  onClose,
  onDelete,
}: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  const appLocked = useAppLocked();
  const { width: pageWidth } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [prevVisible, setPrevVisible] = useState(visible);
  const listRef = useRef<FlatList<string>>(null);
  const lastPageWidth = useRef(pageWidth);

  // Reset to the tapped photo only when the caller opens the viewer. App lock
  // hides and re-shows the modal; that must return to the photo being viewed.
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setIndex(initialIndex);
  }

  useEffect(() => {
    if (!visible) return;
    if (uris.length === 0) {
      onClose();
      return;
    }
    if (index >= uris.length) {
      setIndex(uris.length - 1);
    }
  }, [uris, visible, index, onClose]);

  // Pages are one window wide, so a rotation leaves the list between two pages. Return to
  // the photo being viewed instead.
  useEffect(() => {
    if (lastPageWidth.current === pageWidth || uris.length === 0) return;
    lastPageWidth.current = pageWidth;
    listRef.current?.scrollToIndex({ index, animated: false });
  }, [pageWidth, index, uris.length]);

  const handleShow = () => {
    if (index > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: false });
      });
    }
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setIndex(nextIndex);
  };

  const handleShare = () => {
    const uri = uris[index];
    if (uri) shareImage(uri);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert("Delete this photo?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(index),
      },
    ]);
  };

  return (
    <Modal
      visible={visible && !appLocked}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <View style={[styles.screen, { backgroundColor: "rgba(0,0,0,0.92)" }]}>
        <FlatList
          ref={listRef}
          data={uris}
          keyExtractor={(uri, itemIndex) => `${uri}-${itemIndex}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index > 0 ? index : undefined}
          extraData={pageWidth}
          getItemLayout={(_, itemIndex) => ({
            length: pageWidth,
            offset: pageWidth * itemIndex,
            index: itemIndex,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.page, { width: pageWidth }]}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
                accessibilityLabel="Full size entry image"
              />
            </View>
          )}
        />

        {onDelete ? (
          <Pressable
            onPress={handleDelete}
            hitSlop={space.md}
            style={[styles.iconBtn, { bottom: insets.bottom + space.lg, left: space.lg }]}
            accessibilityLabel="Delete photo"
            accessibilityRole="button"
          >
            <Feather name="trash-2" size={metrics.iconMd} color={DELETE} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleShare}
          hitSlop={space.md}
          style={[styles.iconBtn, { bottom: insets.bottom + space.lg, right: space.lg }]}
          accessibilityLabel="Share photo"
          accessibilityRole="button"
        >
          <Feather name="share" size={metrics.iconMd} color={CHROME} />
        </Pressable>

        <Pressable
          onPress={onClose}
          hitSlop={space.md}
          style={[styles.iconBtn, { top: insets.top + space.sm, right: space.lg }]}
          accessibilityLabel="Close image"
          accessibilityRole="button"
        >
          <Feather name="x" size={metrics.iconMd} color={CHROME} />
        </Pressable>

        {uris.length > 1 ? (
          <ThemedText style={[styles.counter, { top: insets.top + space.sm, color: CHROME }]}>
            {index + 1} / {uris.length}
          </ThemedText>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
  },
  iconBtn: {
    position: "absolute",
    zIndex: 10,
    width: metrics.btnMd,
    height: metrics.btnMd,
    borderRadius: metrics.btnMd / 2,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
  },
  page: {
    height: "100%",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
