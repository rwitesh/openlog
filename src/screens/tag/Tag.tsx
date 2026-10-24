import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeMutations, TagEditor, useTimelineEntries } from "@/modules/entry";
import { tagColors } from "@/modules/entry/utils/TagColors";
import { AddEntryFab, FAB_CLEARANCE, TimelineFeed } from "@/modules/timeline";
import type { RootStackParamList } from "@/navigation/types";
import { getTag } from "@/services/db/tags";
import { ScreenHeader, Sheet, ThemedText } from "@/shared/components";
import type { Tag } from "@/shared/types";
import { startOfDay } from "@/shared/utils/dates";
import { reportError } from "@/shared/utils/devLog";
import { metrics, press, space, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Tag">;

/** The timeline narrowed to one tag, with that tag's rename, recolor, and delete. */
export function TagTimelineScreen({ route, navigation }: Props) {
  const { tagId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { entries, isLoading, loadMore } = useTimelineEntries({ tagId });
  const [tag, setTag] = useState<Tag | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  // Each opening starts a fresh edit session, so cancelled changes never linger.
  const [editSession, setEditSession] = useState(0);

  // Tag edits from any surface notify a store reload, so the title follows them.
  useEffect(() => {
    let active = true;
    const load = () => {
      getTag(tagId)
        .then((next) => {
          if (active) setTag(next);
        })
        .catch((error) => {
          reportError("tags:load", error);
          if (active) Alert.alert("Couldn't load tag", "Go back and try again.");
        });
    };
    load();
    const unsubscribe = subscribeMutations((mutation) => {
      if (mutation.type === "reload" || mutation.type === "clear") load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [tagId]);

  // The tag was deleted here or elsewhere; its lens has nothing left to show.
  useEffect(() => {
    if (tag === null) navigation.goBack();
  }, [tag, navigation]);

  const editButton = tag ? (
    <Pressable
      onPress={() => {
        setEditSession((session) => session + 1);
        setEditing(true);
      }}
      hitSlop={space.md}
      style={({ pressed }) => pressed && press}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${tag.name} tag`}
    >
      <Feather name="edit-2" size={metrics.iconMd} color={colors.textSecondary} />
    </Pressable>
  ) : undefined;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={tag?.name ?? ""}
        icon={
          tag ? (
            <Feather
              name="tag"
              size={metrics.iconSm}
              color={tagColors(tag.colorId, isDark).foreground}
            />
          ) : undefined
        }
        onBack={() => navigation.goBack()}
        right={editButton}
      />

      {/* Until the first page arrives, an empty feed would wrongly read as "nothing tagged". */}
      {tag && (entries.length > 0 || !isLoading) ? (
        <TimelineFeed
          entries={entries}
          showDates
          activeTagId={tagId}
          paddingTop={space.sm}
          bottomInset={FAB_CLEARANCE + insets.bottom}
          emptyTitle="Nothing tagged yet"
          emptyBody={`Tap + to add an entry tagged “${tag.name}”.`}
          onOpenDay={(ts) => navigation.push("Day", { dayTs: startOfDay(ts) })}
          onEndReached={loadMore}
        />
      ) : (
        <View style={styles.flex} />
      )}

      <AddEntryFab onPress={() => navigation.navigate("Compose", { initialTagId: tagId })} />

      {tag ? (
        <Sheet visible={editing} onClose={() => setEditing(false)} keyboardBehavior="dock">
          <ThemedText weight="semibold" style={[styles.sheetTitle, { color: colors.text }]}>
            Edit tag
          </ThemedText>
          <TagEditor
            key={editSession}
            tag={tag}
            onSaved={() => setEditing(false)}
            onDeleted={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheetTitle: { fontSize: 17, lineHeight: 24, marginBottom: space.md },
});
