import { useRef } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "@/shared/components/ThemedText";
import { space, typography, useTheme } from "@/theme";

const ITEM_HEIGHT = 40;
const VISIBLE = 5;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE / 2);

interface WheelProps<T> {
  items: readonly T[];
  selected: T;
  label: (item: T) => string;
  onSelect: (item: T) => void;
}

export function Wheel<T>({ items, selected, label, onSelect }: WheelProps<T>) {
  const { colors } = useTheme().theme;
  const listRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, items.indexOf(selected));

  const snapToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onSelect(items[clamped]!);
    listRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    snapToIndex(index);
  };

  return (
    <View style={styles.wrap}>
      <View
        pointerEvents="none"
        style={[styles.highlight, { backgroundColor: colors.surfaceMuted }]}
      />
      <ScrollView
        ref={listRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PAD }}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
      >
        {items.map((item, index) => {
          const active = item === selected;
          return (
            <Pressable
              key={`${label(item)}-${index}`}
              onPress={() => snapToIndex(index)}
              style={styles.item}
            >
              <ThemedText
                weight={active ? "semibold" : "regular"}
                style={[
                  typography.settingLabel,
                  { color: active ? colors.text : colors.textSecondary },
                ]}
              >
                {label(item)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: ITEM_HEIGHT * VISIBLE,
    flex: 1,
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    left: space.xs,
    right: space.xs,
    top: PAD,
    height: ITEM_HEIGHT,
    borderRadius: space.sm,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});
