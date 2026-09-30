import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useAuthenticatedContext, useSession } from "@/features/auth/SessionProvider";
import { signupReferral } from "@/features/auth/signup-referral";
import {
  listDocuments,
  uploadDocument,
  type DocumentOwner,
  type DocumentType,
  type PickedFile
} from "@/features/documents/document.service";
import { bootstrapMe } from "@/features/profile/profile.service";
import { newIdempotencyKey } from "@/services/api/client";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import { getOnboarding, saveDocumentsStep, startOnboarding, submitOnboarding } from "./onboarding.service";

export function useOnboarding() {
  const uid = useUserId();
  const { me } = useAuthenticatedContext();
  return useQuery({
    queryKey: queryKeys.user(uid, "onboarding"),
    queryFn: () => getOnboarding(api, me),
    enabled: me.approvalStatus !== "NO_RECORD"
  });
}

/** First access: create the business record (Swagger bootstrap-me), then start the onboarding. */
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
        return null; // /v1/auth/me now carries the new id; the status screen starts the flow next.
      }
      return startOnboarding(api, me);
    },
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

/** The caller's own documents (owner resolved from /v1/auth/me). */
function useOwner(): DocumentOwner | null {
  const { me } = useAuthenticatedContext();
  if (me.tipoUsuarioResolvido === "SUBLICENCIADO" && me.sublicenciadoId) {
    return { proprietario_tipo: "SUBLICENCIADO", sublicenciado_id: me.sublicenciadoId };
  }
  if (me.tipoUsuarioResolvido === "LICENCIADO" && me.licenciadoId) {
    return { proprietario_tipo: "LICENCIADO", licenciado_id: me.licenciadoId };
  }
  return null;
}

export function useMyDocuments() {
  const uid = useUserId();
  const owner = useOwner();
  return useQuery({
    queryKey: queryKeys.user(uid, "documents", "mine"),
    queryFn: () => listDocuments(api, owner!),
    enabled: owner !== null
  });
}

/** Upload + link the document to the onboarding documents step. */
export function useUploadMyDocument() {
  const uid = useUserId();
  const owner = useOwner();
  const { me } = useAuthenticatedContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tipo: DocumentType; file: PickedFile; replaceDocumentId?: string }) => {
      if (!owner) throw new Error("Cadastro não iniciado.");
      const uploaded = await uploadDocument(api, owner, input.tipo, input.file, { replaceDocumentId: input.replaceDocumentId });
      const all = await listDocuments(api, owner);
      await saveDocumentsStep(api, me, all.map((doc) => doc.id));
      return uploaded;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "documents") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "onboarding") });
    }
  });
}
