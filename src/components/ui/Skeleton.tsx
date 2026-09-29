import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, type DimensionValue } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

type SkeletonProps = { width?: DimensionValue; height?: number; rounded?: number };

/** Shimmer placeholder shaped like the final content. Respects "reduce motion". */
export function Skeleton({ width = "100%", height = 16, rounded = radius.sm }: SkeletonProps) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true })
        ])
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: rounded, backgroundColor: colors.muted, opacity }}
    />
  );
}
