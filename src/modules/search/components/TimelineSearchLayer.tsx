import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTagSummaries } from "@/services/db/tags";
import type { TagSummary } from "@/shared/types";
import { reportError } from "@/shared/utils/devLog";
import { space, useTheme } from "@/theme";
import { useEntrySearch } from "../hooks/useEntrySearch";
import { SearchBar } from "./SearchBar";
import { SearchResultsFeed } from "./SearchResultsFeed";

interface TimelineSearchLayerProps {
  onClose: () => void;
  onOpenEntry: (entryId: string) => void;
  onOpenTag: (tagId: string) => void;
}

/**
 * Full-screen search surface over the timeline: search bar on top, ranked
 * matches with highlighted snippets below, and every tag one tap away before
 * typing. Mounted only while active, so every session starts fresh.
 */
export function TimelineSearchLayer({ onClose, onOpenEntry, onOpenTag }: TimelineSearchLayerProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { motion, colors } = theme;
  const { query, setQuery, results, searching } = useEntrySearch();
  const [tags, setTags] = useState<TagSummary[]>([]);

  useEffect(() => {
    let active = true;
    getTagSummaries()
      .then((next) => {
        if (active) setTags(next);
      })
      .catch((error) => reportError("search:tagSummaries", error));
    return () => {
      active = false;
    };
  }, []);

  const opacity = useRef(new Animated.Value(motion.level === "reduced" ? 1 : 0)).current;

  useEffect(() => {
    if (motion.level === "reduced") return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.fast,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [opacity, motion]);

  // Android hardware back exits search instead of leaving the timeline.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  return (
    <Animated.View style={[styles.layer, { backgroundColor: colors.background, opacity }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + space.md,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <SearchBar value={query} onChange={setQuery} onCancel={onClose} />
      </View>

      <SearchResultsFeed
        results={results}
        query={query}
        tags={tags}
        searching={searching}
        paddingTop={space.lg}
        bottomInset={insets.bottom}
        onOpenEntry={onOpenEntry}
        onOpenTag={onOpenTag}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
