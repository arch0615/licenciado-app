import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard";

/** Portal /onboarding — cadastro do licenciado / do representante (pending area). */
export default function PendingOnboardingScreen() {
  const { role } = useAuthenticatedContext();
  return (
    <Screen>
      <ScreenHeader title={role === "SUBLICENCIADO" ? "Cadastro do representante" : "Cadastro do licenciado"} />
      <OnboardingWizard />
    </Screen>
  );
}
