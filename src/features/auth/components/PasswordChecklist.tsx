import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { spacing } from "@/theme/tokens";

import { PASSWORD_RULES } from "../password-policy";

/** Checklist stays neutral until the user starts typing (docs/mobile-forms.md §2.2). */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <View style={{ gap: spacing.xxs }} accessibilityLabel="Requisitos da senha">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        const tone = value.length === 0 ? "muted" : ok ? "success" : "danger";
        return (
          <AppText key={rule.id} variant="caption" tone={tone}>
            {ok ? "✓" : "•"} {rule.label}
          </AppText>
        );
      })}
    </View>
  );
}
