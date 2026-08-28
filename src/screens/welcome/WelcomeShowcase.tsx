import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TimelineRail } from "@/modules/timeline/components/TimelineRail";
import { AudioWaveform } from "@/shared/components";
import { ThemedText } from "@/shared/components/ThemedText";
import {
  metrics,
  press,
  radius,
  space,
  type ThemeColors,
  typography,
  useEntryPreferences,
  useTheme,
} from "@/theme";

const CTA_BLUE = "#3663E9";

// Predictable timestamps for the preview: 28th and 14th of August 2026.
const TS_DAY_28 = 1787875200000;
const TS_DAY_14 = 1786665600000;

const SHOWCASE_SLIDES = [
  {
    key: "capture",
    title: "Capture life as it happens",
    subtitle:
      "Notes, moments, plans, goals, to-dos, photos, or voice notes. A home for whatever is on your mind.",
  },
  {
    key: "timeline",
    title: "An unbroken timeline",
    subtitle:
      "Your moments connect along a living thread. Days flow together naturally, at your own rhythm.",
  },
  {
    key: "privacy",
    title: "A calm, private space",
    subtitle:
      "Your writing stays on your device. Never shared, never sold, and always in your control.",
  },
] as const;

function BlinkingCursor({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 480, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.cursor, { backgroundColor: color, opacity }]} />;
}

function CaptureGraphic({ colors }: { colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.cardGraphic,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
      ]}
    >
      <View style={styles.cardGraphicHeader}>
        <ThemedText weight="medium" style={[typography.caption, { color: colors.textSecondary }]}>
          Today · 10:42 PM
        </ThemedText>
        <View style={styles.quietLocLockup}>
          <Feather name="map-pin" size={11} color={colors.textTertiary} />
          <ThemedText style={[typography.caption, { color: colors.textSecondary }]}>
            Tokyo
          </ThemedText>
        </View>
      </View>

      <View style={styles.cardGraphicBody}>
        <ThemedText style={[typography.entryText, { color: colors.text }]}>
          Rain smells crazy tonight
        </ThemedText>
        <BlinkingCursor color={colors.accent} />
      </View>

      <View style={styles.chipsRow}>
        <View
          style={[
            styles.audioPill,
            { backgroundColor: colors.surface, borderColor: colors.separator },
          ]}
        >
          <View style={[styles.audioMicCircle, { backgroundColor: colors.marker }]}>
            <Feather name="mic" size={10} color="#FFFFFF" />
          </View>
          <View style={styles.audioWaveWrap}>
            <AudioWaveform seed="showcase-audio" progress={0.52} height={16} />
          </View>
          <ThemedText style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
            0:14
          </ThemedText>
        </View>

        <View
          style={[
            styles.photoPill,
            { backgroundColor: colors.surface, borderColor: colors.separator },
          ]}
        >
          <Feather name="image" size={11} color={colors.textSecondary} />
          <ThemedText
            weight="medium"
            style={[styles.photoPillText, { color: colors.textSecondary }]}
          >
            coffee.jpg
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function TimelineGraphic({ colors }: { colors: ThemeColors }) {
  const { timelineDensity } = useEntryPreferences();
  const isCompact = timelineDensity === "compact";

  return (
    <View
      style={[
        styles.realTimelineBox,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
      ]}
    >
      <TimelineRail dayTs={TS_DAY_28} showDate isFirst={false} isLast={false}>
        <View style={[styles.timelineEntryRow, isCompact && styles.timelineEntryRowCompact]}>
          <View style={styles.timelineMeta}>
            <ThemedText
              weight="medium"
              style={[styles.timelineMetaText, { color: colors.textSecondary }]}
            >
              10:15 AM
            </ThemedText>
            <ThemedText style={[styles.timelineMetaDot, { color: colors.textTertiary }]}>
              ·
            </ThemedText>
            <View style={styles.quietLocLockup}>
              <Feather name="map-pin" size={10} color={colors.textTertiary} />
              <ThemedText
                weight="medium"
                style={[styles.timelineMetaText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                Tokyo
              </ThemedText>
            </View>
          </View>
          <Feather name="more-vertical" size={15} color={colors.textTertiary} />
        </View>
        <ThemedText style={[typography.entryText, { color: colors.text }]} numberOfLines={1}>
          Morning coffee on the balcony.
        </ThemedText>
      </TimelineRail>

      <TimelineRail dayTs={TS_DAY_14} showDate isFirst={false} isLast>
        <View style={[styles.timelineEntryRow, isCompact && styles.timelineEntryRowCompact]}>
          <View style={styles.timelineMeta}>
            <ThemedText
              weight="medium"
              style={[styles.timelineMetaText, { color: colors.textSecondary }]}
            >
              09:30 PM
            </ThemedText>
            <ThemedText style={[styles.timelineMetaDot, { color: colors.textTertiary }]}>
              ·
            </ThemedText>
            <View style={styles.quietLocLockup}>
              <Feather name="map-pin" size={10} color={colors.textTertiary} />
              <ThemedText
                weight="medium"
                style={[styles.timelineMetaText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                Kyoto
              </ThemedText>
            </View>
          </View>
          <Feather name="more-vertical" size={15} color={colors.textTertiary} />
        </View>
        <ThemedText style={[typography.entryText, { color: colors.text }]} numberOfLines={1}>
          Quiet walk past wooden tea houses.
        </ThemedText>
      </TimelineRail>
    </View>
  );
}

function PrivacyGraphic({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.privacyGraphicWrap}>
      <View
        style={[
          styles.shieldCircle,
          {
            backgroundColor: `${colors.accent}18`,
            borderColor: `${colors.accent}40`,
          },
        ]}
      >
        <Feather name="shield" size={32} color={colors.accent} />
      </View>

      <View style={styles.privacyBadgesCol}>
        <View
          style={[
            styles.privacyBadge,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
          ]}
        >
          <View style={[styles.badgeIconBox, { backgroundColor: "#3B82F618" }]}>
            <Feather name="smartphone" size={14} color="#3B82F6" />
          </View>
          <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
            Local first & offline
          </ThemedText>
        </View>

        <View
          style={[
            styles.privacyBadge,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
          ]}
        >
          <View style={[styles.badgeIconBox, { backgroundColor: "#8B5CF618" }]}>
            <Feather name="lock" size={14} color="#8B5CF6" />
          </View>
          <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
            Private by default
          </ThemedText>
        </View>

        <View
          style={[
            styles.privacyBadge,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
          ]}
        >
          <View style={[styles.badgeIconBox, { backgroundColor: "#10B98118" }]}>
            <Feather name="download" size={14} color="#10B981" />
          </View>
          <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
            Export & backup anytime
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

interface WelcomeShowcaseProps {
  onFinish: () => void;
}

export function WelcomeShowcase({ onFinish }: WelcomeShowcaseProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeSlide, setActiveSlide] = useState(0);

  const handleSlideScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
  });

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveSlide(nextIndex);
  };

  const handleNextPress = () => {
    if (activeSlide < SHOWCASE_SLIDES.length - 1) {
      const next = activeSlide + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setActiveSlide(next);
    } else {
      onFinish();
    }
  };

  const handleBackPress = () => {
    if (activeSlide > 0) {
      const prev = activeSlide - 1;
      scrollRef.current?.scrollTo({ x: prev * width, animated: true });
      setActiveSlide(prev);
    }
  };

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.xl,
        },
      ]}
    >
      <View style={styles.showcaseTopBar}>
        <ThemedText weight="semibold" style={[styles.showcaseBrand, { color: colors.text }]}>
          OpenLog
        </ThemedText>
        <Pressable
          onPress={onFinish}
          hitSlop={space.md}
          style={({ pressed }) => [styles.skipTopBtn, pressed && press]}
          accessibilityRole="button"
          accessibilityLabel="Skip intro"
        >
          <ThemedText style={[typography.settingLabel, { color: colors.textSecondary }]}>
            Skip
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleSlideScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.showcaseScroll}
      >
        {SHOWCASE_SLIDES.map((slide, index) => (
          <View key={slide.key} style={[styles.slidePage, { width }]}>
            <View style={styles.graphicSlot}>
              {index === 0 ? (
                <CaptureGraphic colors={colors} />
              ) : index === 1 ? (
                <TimelineGraphic colors={colors} />
              ) : (
                <PrivacyGraphic colors={colors} />
              )}
            </View>

            <View style={styles.slideTextBlock}>
              <ThemedText
                weight="semibold"
                style={[typography.headerGreeting, styles.slideTitle, { color: colors.text }]}
              >
                {slide.title}
              </ThemedText>
              <ThemedText
                style={[
                  typography.headerSubtitle,
                  styles.slideSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {slide.subtitle}
              </ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.showcaseBottomBar}>
        <View style={styles.bottomNavRow}>
          {activeSlide > 0 ? (
            <Pressable
              onPress={handleBackPress}
              hitSlop={space.md}
              style={({ pressed }) => [
                styles.navBackBtn,
                { borderColor: colors.separator, backgroundColor: colors.surfaceMuted },
                pressed && press,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
            >
              <Feather name="arrow-left" size={18} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.navBackPlaceholder} />
          )}

          <View style={styles.dotsRow}>
            {SHOWCASE_SLIDES.map((slide, idx) => {
              const dotWidth = scrollX.interpolate({
                inputRange: [(idx - 1) * width, idx * width, (idx + 1) * width],
                outputRange: [6, 20, 6],
                extrapolate: "clamp",
              });
              const dotOpacity = scrollX.interpolate({
                inputRange: [(idx - 1) * width, idx * width, (idx + 1) * width],
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={slide.key}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: colors.text,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Pressable
            onPress={handleNextPress}
            hitSlop={space.sm}
            style={({ pressed }) => [
              styles.navForwardBtn,
              activeSlide === SHOWCASE_SLIDES.length - 1 && styles.navGetStartedBtn,
              { backgroundColor: CTA_BLUE },
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              activeSlide === SHOWCASE_SLIDES.length - 1 ? "Get Started" : "Next slide"
            }
          >
            <ThemedText weight="medium" style={[typography.settingLabel, { color: "#FFFFFF" }]}>
              {activeSlide === SHOWCASE_SLIDES.length - 1 ? "Get Started" : "Next"}
            </ThemedText>
            <Feather
              name={activeSlide === SHOWCASE_SLIDES.length - 1 ? "check" : "arrow-right"}
              size={15}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  showcaseTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xxl,
    marginBottom: space.sm,
  },
  showcaseBrand: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  skipTopBtn: {
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
  showcaseScroll: {
    flex: 1,
  },
  slidePage: {
    flex: 1,
    paddingHorizontal: space.xxl,
    justifyContent: "center",
  },
  graphicSlot: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: space.xxl,
  },
  slideTextBlock: {
    gap: space.sm,
  },
  slideTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  slideSubtitle: {
    lineHeight: 22,
  },
  showcaseBottomBar: {
    paddingHorizontal: space.xxl,
  },
  bottomNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: metrics.btnMd + 8,
  },
  navBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  navBackPlaceholder: {
    width: 44,
    height: 44,
  },
  navForwardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    height: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
  },
  navGetStartedBtn: {
    paddingHorizontal: space.xl,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs + 2,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  cursor: {
    width: 2,
    height: 18,
    marginLeft: 2,
    borderRadius: 1,
  },
  cardGraphic: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.md,
  },
  cardGraphicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quietLocLockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardGraphicBody: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    flexWrap: "wrap",
  },
  audioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    paddingLeft: 4,
    paddingRight: space.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  audioMicCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  audioWaveWrap: {
    width: 90,
  },
  photoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  photoPillText: {
    fontSize: 11,
    lineHeight: 13,
  },
  realTimelineBox: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
  },
  timelineEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.xs,
  },
  timelineEntryRowCompact: {
    marginBottom: 2,
  },
  timelineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  timelineMetaText: {
    fontSize: 12,
    lineHeight: 14,
  },
  timelineMetaDot: {
    fontSize: 12,
    lineHeight: 14,
  },
  privacyGraphicWrap: {
    width: "100%",
    alignItems: "center",
    gap: space.lg,
  },
  shieldCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyBadgesCol: {
    width: "100%",
    gap: space.sm,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
