import { Screen } from "@/components/ui/Screen";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { useRegisterLicenciado } from "@/features/auth/useAuthActions";

/**
 * S04 — Cadastro Licenciado: POST /v1/auth/register-licenciado, then Firebase sign-in.
 * The root layout routes the new account (NO_RECORD → pending area / onboarding).
 */
export default function RegisterScreen() {
  const register = useRegisterLicenciado();
  return (
    <Screen edges={["bottom", "left", "right"]}>
      <RegisterForm
        submitLabel="Criar conta"
        submitting={register.isPending}
        error={register.error}
        onSubmit={(values) => register.mutate(values)}
      />
    </Screen>
  );
}
