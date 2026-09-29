import { useMutation, useQuery } from "@tanstack/react-query";

import { api, authGateway } from "@/services/runtime";

import { registerLicenciado, registerSublicenciado, validateInvitation, type RegisterInput } from "./auth.service";

/**
 * Registration: the backend creates the Firebase user, then the app signs in with the same
 * credentials. The SessionProvider picks the new identity up and routes by /v1/auth/me.
 */
export function useRegisterLicenciado() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await registerLicenciado(api, input);
      await authGateway.signIn(input.email, input.password);
    }
  });
}

export function useRegisterSublicenciado() {
  return useMutation({
    mutationFn: async (input: RegisterInput & { convite: string }) => {
      await registerSublicenciado(api, input);
      await authGateway.signIn(input.email, input.password);
    }
  });
}

/** `POST /v1/convites/validar` — public, keyed by token (no user yet). */
export function useInvitationValidation(token: string | undefined) {
  return useQuery({
    queryKey: ["public", "invitation", token ?? ""],
    queryFn: () => validateInvitation(api, token ?? ""),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false
  });
}

export function usePasswordReset() {
  return useMutation({ mutationFn: (email: string) => authGateway.sendPasswordReset(email) });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authGateway.changePassword(currentPassword, newPassword)
  });
}
