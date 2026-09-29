import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { spacing } from "@/theme/tokens";

type MetricCardProps = {
  label: string;
  value: string | null;
  caption?: string;
  loading?: boolean;
  onPress?: () => void;
};

/** KPI tile. `value: null` renders "—" (the API never invents numbers). Tap opens the list behind it. */
export function MetricCard({ label, value, caption, loading = false, onPress }: MetricCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${label}: ${value ?? "indisponível"}`} style={{ flex: 1, minWidth: 140 }}>
      <View style={{ gap: spacing.xxs }}>
        <AppText variant="overline" tone="muted">
          {label}
        </AppText>
        {loading ? (
          <Skeleton width="70%" height={28} />
        ) : (
          <AppText variant="title1" style={{ fontVariant: ["tabular-nums"] }}>
            {value ?? "—"}
          </AppText>
        )}
        {caption ? (
          <AppText variant="caption" tone="muted">
            {caption}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
