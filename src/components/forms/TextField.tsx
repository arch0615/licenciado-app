import { forwardRef, useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { AlertCircle, Eye, EyeOff } from "lucide-react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { fontFamily, radius, spacing } from "@/theme/tokens";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  helper?: string;
  /** Adds an eye toggle and secure entry. */
  password?: boolean;
};

/**
 * FormInput foundation: visible label, helper/error below the field, accessible error
 * announcement, focus border. Masks and react-hook-form bindings are layered on top by features.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, helper, password = false, style, onFocus, onBlur, ...rest },
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.ring : colors.border;

  return (
    <View style={{ gap: spacing.xxs }}>
      <AppText variant="calloutStrong">{label}</AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 52,
          borderRadius: radius.md,
          borderWidth: focused || error ? 2 : 1,
          borderColor,
          backgroundColor: colors.card,
          paddingHorizontal: spacing.sm
        }}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={password && !visible}
          style={[{ flex: 1, fontFamily: fontFamily.regular, fontSize: 16, color: colors.foreground, paddingVertical: 12 }, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
            hitSlop={12}
            onPress={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff size={20} color={colors.mutedForeground} /> : <Eye size={20} color={colors.mutedForeground} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
          <AlertCircle size={14} color={colors.danger} />
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});
