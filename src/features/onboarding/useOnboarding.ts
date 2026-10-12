import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useAuthenticatedContext, useSession } from "@/features/auth/SessionProvider";
import { signupReferral } from "@/features/auth/signup-referral";
import type { AuthMe } from "@/features/auth/types";
import { listDocuments } from "@/features/documents/document.service";
import { useOwnDocumentOwner } from "@/features/documents/useDocuments";
import { bootstrapMe } from "@/features/profile/profile.service";
import { newIdempotencyKey } from "@/services/api/client";
import type { ApiClient } from "@/services/api/types";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  getOnboarding,
  saveBankData,
  saveCompanyCheck,
  saveDocumentsStep,
  saveLoginCheck,
  savePersonalData,
  saveProfessionalData,
  saveTerms,
  startOnboarding,
  submitOnboarding,
  validateUniqueness,
  type BankDataStep,
  type PersonalDataStep,
  type ProfessionalDataStep,
  type TermsStep
} from "./onboarding.service";

export function useOnboarding() {
  const uid = useUserId();
  const { me } = useAuthenticatedContext();
  return useQuery({
    queryKey: queryKeys.user(uid, "onboarding"),
    queryFn: () => getOnboarding(api, me),
    enabled: me.approvalStatus !== "NO_RECORD"
  });
}

/**
 * Portal first access: create the business record (bootstrap-me; a representative sends the code used at
 * signup), then start the onboarding (`iniciar*`). Mobile runs it from an explicit "Iniciar cadastro".
 */
export function useStartOnboarding() {
  const uid = useUserId();
  const { me, role } = useAuthenticatedContext();
  const { refresh } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (me.approvalStatus === "NO_RECORD") {
        await bootstrapMe(api, role, role === "SUBLICENCIADO" ? await signupReferral.read() : null);
        await signupReferral.clear();
        await refresh();
        return null; // /v1/auth/me now carries the new id; the next tap starts the onboarding steps.
      }
      return startOnboarding(api, me);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "onboarding") })
  });
}

export type OnboardingStepInput =
  | { step: "personal"; data: PersonalDataStep }
  | { step: "professional"; data: ProfessionalDataStep }
  | { step: "bank"; data: BankDataStep }
  | { step: "terms"; data: TermsStep }
  | { step: "company"; codigoLicenciado: string }
  | { step: "login"; email: string }
  | { step: "documents" };

async function saveStep(client: ApiClient, me: AuthMe, input: OnboardingStepInput, documentIds: () => Promise<string[]>) {
  switch (input.step) {
    case "personal": {
      const unique = await validateUniqueness(client, me, { cpf: input.data.cpf, email: input.data.email, phone: input.data.phone });
      const taken = [unique.cpfUnique === false && "CPF", unique.phoneUnique === false && "telefone", unique.emailUnique === false && "e-mail"].filter(Boolean);
      if (taken.length > 0) throw new Error(`${taken.join(", ")} já cadastrado.`);
      return savePersonalData(client, me, input.data);
    }
    case "professional":
      return saveProfessionalData(client, me, input.data);
    case "bank":
      return saveBankData(client, me, input.data);
    case "terms":
      return saveTerms(client, me, input.data);
    case "company":
      return saveCompanyCheck(client, me, input.codigoLicenciado);
    case "login":
      return saveLoginCheck(client, me, input.email);
    case "documents":
      return saveDocumentsStep(client, me, await documentIds());
  }
}

/** Saves one wizard step (autosave per step, as in the portal). */
export function useSaveOnboardingStep() {
  const uid = useUserId();
  const { me } = useAuthenticatedContext();
  const owner = useOwnDocumentOwner();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardingStepInput) =>
      saveStep(api, me, input, async () => (owner ? (await listDocuments(api, owner)).map((doc) => doc.id) : [])),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "onboarding") })
  });
}

export function useSubmitOnboarding() {
  const uid = useUserId();
  const { me } = useAuthenticatedContext();
  const { refresh } = useSession();
  const queryClient = useQueryClient();
  const key = useRef(newIdempotencyKey("submit"));
  return useMutation({
    mutationFn: () => submitOnboarding(api, me, key.current),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "onboarding") });
      await refresh();
    }
  });
}
