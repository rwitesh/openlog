import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextInput,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space } from "@/theme/spacing";

interface SlotProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface KeyboardState {
  lift: Animated.Value;
  visible: boolean;
}

const KeyboardContext = createContext<KeyboardState | null>(null);

const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

function overlap(endCoordinates: { height: number; screenY: number }) {
  if (Platform.OS === "android") {
    const screenHeight = Dimensions.get("screen").height;
    const fromScreenY = Math.max(0, screenHeight - endCoordinates.screenY);
    return Math.max(fromScreenY, endCoordinates.height) + space.sm;
  }

  const windowHeight = Dimensions.get("window").height;
  return Math.max(
    endCoordinates.height,
    Math.max(0, windowHeight - endCoordinates.screenY),
  );
}

function useKeyboardState() {
  const context = useContext(KeyboardContext);
  if (!context) throw new Error("Use inside KeyboardLayout");
  return context;
}

function Provider({ children }: { children: ReactNode }) {
  const lift = useMemo(() => new Animated.Value(0), []);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const animate = (toValue: number, duration?: number) => {
      Animated.timing(lift, {
        toValue,
        duration: duration || 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const show = Keyboard.addListener(showEvent, (e) => {
      setVisible(true);
      animate(overlap(e.endCoordinates), e.duration);
    });
    const hide = Keyboard.addListener(hideEvent, (e) => {
      setVisible(false);
      animate(0, e.duration);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [lift]);

  const value = useMemo(() => ({ lift, visible }), [lift, visible]);

  return (
    <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>
  );
}

function Root({ children, style }: SlotProps) {
  return (
    <Provider>
      <ScrollView
        style={[styles.root, style]}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Provider>
  );
}

function Main({ children, style }: SlotProps) {
  return <View style={[styles.main, style]}>{children}</View>;
}

function Avoiding({ children, style }: SlotProps) {
  const { lift } = useKeyboardState();

  return (
    <Animated.View style={{ marginBottom: lift }}>
      <View style={style}>{children}</View>
    </Animated.View>
  );
}

function Footer({ children, style }: SlotProps) {
  const insets = useSafeAreaInsets();
  const { visible } = useKeyboardState();

  return (
    <View
      style={[
        styles.footer,
        style,
        { paddingBottom: visible ? 0 : insets.bottom + space.md },
      ]}
    >
      {children}
    </View>
  );
}

export const KeyboardLayout = Object.assign(Root, { Main, Avoiding, Footer });

export function useKeepKeyboard(inputRef: RefObject<TextInput | null>) {
  return useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  main: { flex: 1, minHeight: 0 },
  footer: {},
});
