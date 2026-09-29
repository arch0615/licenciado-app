import { fireEvent, render, screen } from "@testing-library/react-native";

import { MetricCard } from "@/components/cards/MetricCard";
import { ErrorState } from "@/components/states/States";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/services/api/errors";
import { ThemeProvider } from "@/theme/ThemeProvider";

jest.mock("@/services/storage/secure-storage", () => ({
  secureStorage: { get: async () => null, set: async () => undefined, remove: async () => undefined }
}));

// @testing-library/react-native v14 renders asynchronously (React 19): await render / events.
const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe("shared components", () => {
  it("Button calls onPress and ignores presses while loading", async () => {
    const onPress = jest.fn();
    const { rerender } = await wrap(<Button label="Enviar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(
      <ThemeProvider>
        <Button label="Enviar" onPress={onPress} loading />
      </ThemeProvider>
    );
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("MetricCard shows a dash instead of an invented value", async () => {
    await wrap(<MetricCard label="Clientes" value={null} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("Badge renders the human label", async () => {
    await wrap(<Badge label="Em análise" tone="info" />);
    expect(screen.getByText("Em análise")).toBeTruthy();
  });

  it("ErrorState always offers a retry with a safe message", async () => {
    const onRetry = jest.fn();
    await wrap(<ErrorState error={new ApiError({ status: 503, code: "X", message: "Serviço indisponível." })} onRetry={onRetry} />);
    expect(screen.getByText("Serviço indisponível.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Tentar novamente"));
    expect(onRetry).toHaveBeenCalled();
  });
});
