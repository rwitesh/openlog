import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { clockParts, withClock } from "@/lib";
import { Sheet, ThemedText } from "../ui";
import { Wheel } from "./Wheel";

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = [false, true] as const;

interface TimePickerProps {
  visible: boolean;
  value: number;
  onChange: (ts: number) => void;
  onClose: () => void;
}

export function TimePicker({ visible, value, onChange, onClose }: TimePickerProps) {
  const { colors } = useTheme().theme;
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const parts = clockParts(value);
    setHour(parts.hour);
    setMinute(parts.minute);
    setPm(parts.pm);
  }, [visible, value]);

  const confirm = () => {
    onChange(withClock(value, hour, minute, pm));
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} placement="center">
      <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
        Time
      </ThemedText>

      <View style={styles.wheels}>
        <Wheel
          items={HOURS}
          selected={hour}
          label={(h) => String(h)}
          onSelect={setHour}
        />
        <ThemedText style={[styles.colon, { color: colors.textSecondary }]}>:</ThemedText>
        <Wheel
          items={MINUTES}
          selected={minute}
          label={(m) => m.toString().padStart(2, "0")}
          onSelect={setMinute}
        />
        <Wheel
          items={PERIODS}
          selected={pm}
          label={(p) => (p ? "PM" : "AM")}
          onSelect={setPm}
        />
      </View>

      <Pressable
        onPress={confirm}
        style={({ pressed }) => [
          styles.doneBtn,
          { backgroundColor: colors.marker },
          pressed && press,
        ]}
        accessibilityLabel="Set time"
        accessibilityRole="button"
      >
        <ThemedText weight="medium" style={{ color: colors.background }}>
          Done
        </ThemedText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.headerDate.fontSize,
    lineHeight: typography.headerDate.lineHeight,
    marginBottom: space.md,
    textAlign: "center",
  },
  wheels: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginBottom: space.sm,
  },
  colon: {
    fontSize: typography.headerDate.fontSize,
    lineHeight: typography.headerDate.lineHeight,
    marginBottom: space.xs,
  },
  doneBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: space.md,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
});
