import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { spacing } from "@/theme/tokens";

type LinkQrCardProps = { link: string; caption?: string; onShare: () => void };

/** Portal QR + copy link block (clients signup link, representative invite). The QR is generated on device. */
export function LinkQrCard({ link, caption, onShare }: LinkQrCardProps) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <View style={{ gap: spacing.md, alignItems: "center" }}>
        {/* White quiet zone so the code scans on dark theme too. */}
        <View style={{ padding: spacing.sm, backgroundColor: "#FFFFFF", borderRadius: 8 }} accessibilityLabel="QR Code do link de cadastro">
          <QRCode value={link} size={200} backgroundColor="#FFFFFF" color="#0C1322" />
        </View>
        {caption ? (
          <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
            {caption}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted" selectable numberOfLines={2} style={{ textAlign: "center" }}>
          {link}
        </AppText>
        <View style={{ gap: spacing.sm, alignSelf: "stretch" }}>
          <Button
            label={copied ? "Link copiado" : "Copiar link"}
            variant="outline"
            fullWidth
            onPress={() => {
              void Clipboard.setStringAsync(link).then(() => setCopied(true));
            }}
          />
          <Button label="Compartilhar link" size="lg" fullWidth onPress={onShare} />
        </View>
      </View>
    </Card>
  );
}
