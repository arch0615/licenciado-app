import { Pressable, ScrollView } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/tokens";

import { AppText } from "./AppText";

type ChipProps = { label: string; selected: boolean; onPress: () => void };

export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 36,
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.card
      }}
    >
      <AppText variant="calloutStrong" style={{ color: selected ? colors.primaryForeground : colors.foreground }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Horizontal single-choice chip row (status quick filters, segments). */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    // ScrollView defaults to flexGrow/flexShrink 1: inside a fixed-height column (e.g. Clientes) the row would
    // stretch into the free space or be squeezed. A chip row always takes just its content height.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ gap: spacing.xs, alignItems: "center" }}
    >
      {options.map((option) => (
        <Chip key={option.value} label={option.label} selected={option.value === value} onPress={() => onChange(option.value)} />
      ))}
    </ScrollView>
  );
}
