import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  type StyleProp,
  StyleSheet,
  type TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space } from "@/theme";

interface KeyboardState {
  visible: boolean;
  offset: number;
}

interface SlotProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
const SYNC_DELAYS_MS = [50, 150, 350] as const;

const KeyboardCtx = createContext<KeyboardState | null>(null);

function keyboardOffset(frame: { height: number; screenY: number }) {
  const overlap =
    Platform.OS === "android"
      ? Math.max(Math.max(0, Dimensions.get("screen").height - frame.screenY), frame.height) +
        space.sm
      : Math.max(frame.height, Math.max(0, Dimensions.get("window").height - frame.screenY));

  if (Platform.OS === "android") {
    const gap = Dimensions.get("window").height - frame.screenY;
    if (gap < overlap * 0.5) return 0;
  }

  return overlap;
}

function attachKeyboard(onChange: (state: KeyboardState) => void) {
  const show = (frame: { height: number; screenY: number }) =>
    onChange({ visible: true, offset: keyboardOffset(frame) });
  const hide = () => onChange({ visible: false, offset: 0 });

  const sync = () => {
    const metrics = Keyboard.metrics();
    if (metrics && metrics.height > 0) {
      show(metrics);
      return true;
    }
    return false;
  };

  const showSub = Keyboard.addListener(showEvent, (e) => show(e.endCoordinates));
  const hideSub = Keyboard.addListener(hideEvent, hide);
  const timers = sync() ? [] : SYNC_DELAYS_MS.map((ms) => setTimeout(sync, ms));

  return () => {
    showSub.remove();
    hideSub.remove();
    timers.forEach(clearTimeout);
  };
}

function useKeyboard() {
  const value = useContext(KeyboardCtx);
  if (!value) throw new Error("Layout requires app root wrapper");
  return value;
}

function Root({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KeyboardState>({ visible: false, offset: 0 });

  useEffect(() => attachKeyboard(setState), []);

  const value = useMemo(() => state, [state]);

  return (
    <KeyboardCtx.Provider value={value}>
      <View style={styles.root}>{children}</View>
    </KeyboardCtx.Provider>
  );
}

function ScreenRoot({ children, style }: SlotProps) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

function Body({ children, style }: SlotProps) {
  const { offset } = useKeyboard();
  return <View style={[styles.body, style, { paddingBottom: offset }]}>{children}</View>;
}

function Main({ children, style }: SlotProps) {
  return <View style={[styles.main, style]}>{children}</View>;
}

function Footer({ children, style }: SlotProps) {
  const insets = useSafeAreaInsets();
  const { visible } = useKeyboard();

  return (
    <View style={[styles.footer, style, { paddingBottom: visible ? 0 : insets.bottom + space.md }]}>
      {children}
    </View>
  );
}

const Screen = Object.assign(ScreenRoot, { Body, Main, Footer });

export const Layout = Object.assign(Root, { Screen });

export function useKeepFocus(inputRef: RefObject<TextInput | null>) {
  return useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
  main: { flex: 1, minHeight: 0 },
  footer: {},
});
