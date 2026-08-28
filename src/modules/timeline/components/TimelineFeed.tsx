import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { EntryRow } from "@/modules/entry";
import { ThemedText } from "@/shared/components/ThemedText";
import type { Entry } from "@/shared/types";
import { isSameDay } from "@/shared/utils/dates";
import { radius, space, typography, useTheme } from "@/theme";
import type { TimelineItem } from "../types";
import { toTimelineItems } from "../utils/TimelineTransform";
import { TimelineRail } from "./TimelineRail";

interface TimelineProps {
  entries: Entry[];
  showDates?: boolean;
  paddingTop?: number;
  bottomInset: number;
  emptyTitle: string;
  emptyBody: string;
  animateFirst?: boolean;
  onOpenDay?: (dayTs: number) => void;
  onEndReached?: () => void;
}

const SCROLL_TOP_THRESHOLD = 400;

export function TimelineFeed({
  entries,
  showDates = false,
  paddingTop = 0,
  bottomInset,
  emptyTitle,
  emptyBody,
  animateFirst = false,
  onOpenDay,
  onEndReached,
}: TimelineProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const listRef = useRef<FlatList<TimelineItem>>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const showScrollTopRef = useRef(false);
  const anim = useRef(new Animated.Value(0)).current;

  const items = useMemo(() => toTimelineItems(entries, showDates), [entries, showDates]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const shouldShow = y > SCROLL_TOP_THRESHOLD;
    if (shouldShow !== showScrollTopRef.current) {
      showScrollTopRef.current = shouldShow;
      setShowScrollTop(shouldShow);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: showScrollTop ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: showScrollTop ? 1 : 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showScrollTop, anim]);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  if (!items.length) {
    return (
      <View style={[styles.empty, { paddingTop, paddingBottom: bottomInset }]}>
        <ThemedText weight="semibold" style={[typography.emptyTitle, { color: colors.text }]}>
          {emptyTitle}
        </ThemedText>
        <ThemedText style={[typography.emptyBody, { color: colors.textSecondary }]}>
          {emptyBody}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={items}
        keyExtractor={(item) => item.entry.id}
        renderItem={({ item, index }) => (
          <View>
            {item.showMonth && item.monthLabel ? (
              <View style={styles.monthHeaderRow}>
                <View
                  style={[
                    styles.monthPill,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <ThemedText
                    weight="semibold"
                    style={[styles.monthLabel, { color: colors.textSecondary }]}
                  >
                    {item.monthLabel}
                  </ThemedText>
                </View>
                <View style={[styles.monthLine, { backgroundColor: colors.separator }]} />
              </View>
            ) : null}
            <TimelineRail
              dayTs={item.dayTs}
              showDate={item.showDate}
              isFirst={index === 0}
              isLast={item.isLast}
              onMarkerPress={onOpenDay ? () => onOpenDay(item.dayTs) : undefined}
            >
              <EntryRow
                entry={item.entry}
                animate={animateFirst && index === 0 && isSameDay(item.entry.createdAt, Date.now())}
              />
            </TimelineRail>
          </View>
        )}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.7}
      />

      <Animated.View
        pointerEvents={showScrollTop ? "auto" : "none"}
        style={[
          styles.scrollTopWrap,
          {
            bottom: bottomInset + space.xs,
            opacity: anim,
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
              {
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={scrollToTop}
          style={({ pressed }) => [
            styles.scrollTopBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
            },
            pressed && styles.scrollTopPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to top"
        >
          <Feather name="arrow-up" size={13} color={colors.textSecondary} />
          <ThemedText
            weight="medium"
            style={[styles.scrollTopText, { color: colors.textSecondary }]}
          >
            Back to top
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingLeft: space.lg,
    paddingRight: space.xxl,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
    gap: space.xs + 2,
  },
  scrollTopWrap: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 20,
  },
  scrollTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollTopPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  scrollTopText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  monthPill: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  monthLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },
});
