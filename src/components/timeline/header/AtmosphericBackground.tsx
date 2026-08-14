import { type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { CloudLayer } from "./CloudLayer";
import { headerGradient, screenGradient } from "./gradient";

interface AtmosphericBackgroundProps {
  mode: "light" | "dark";
  background: string;
  variant?: "header" | "screen";
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function AtmosphericBackground({
  mode,
  background,
  variant = "header",
  style,
  children,
}: AtmosphericBackgroundProps) {
  const gradient = variant === "header" ? headerGradient(mode, background) : screenGradient(mode, background);

  return (
    <LinearGradient {...gradient} style={style}>
      {variant === "header" ? <CloudLayer dark={mode === "dark"} /> : null}
      {children}
    </LinearGradient>
  );
}
