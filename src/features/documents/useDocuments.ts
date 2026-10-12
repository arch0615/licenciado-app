import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth/SessionProvider";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  getDocumentViewUrl,
  listDocuments,
  uploadDocument,
  type DocumentOwner,
  type DocumentType,
  type PickedFile
} from "./document.service";

/** The caller's own owner (licenciado or representative), resolved from /v1/auth/me. */
export function useOwnDocumentOwner(): DocumentOwner | null {
  const { state } = useSession();
  if (state.kind !== "approved" && state.kind !== "pending") return null;
  const { me } = state;
  if (me.tipoUsuarioResolvido === "SUBLICENCIADO" && me.sublicenciadoId) {
    return { proprietario_tipo: "SUBLICENCIADO", sublicenciado_id: me.sublicenciadoId };
  }
  if (me.tipoUsuarioResolvido === "LICENCIADO" && me.licenciadoId) {
    return { proprietario_tipo: "LICENCIADO", licenciado_id: me.licenciadoId };
  }
  return null;
}

/** Portal /perfil "Documentos enviados" (and the onboarding document step). */
export function useOwnDocuments() {
  const uid = useUserId();
  const owner = useOwnDocumentOwner();
  return useQuery({
    queryKey: queryKeys.user(uid, "documents", "mine"),
    queryFn: () => listDocuments(api, owner!),
    enabled: owner !== null
  });
}

/** Portal /clientes/[id]?tab=documentos. The client id comes from a client the backend already returned. */
export function useClientDocuments(clientId: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "documents", "client", clientId),
    queryFn: () => listDocuments(api, { proprietario_tipo: "CONSUMIDOR", consumidor_id: clientId })
  });
}

/** Fresh view/download URL on demand (signed URLs expire quickly, so they are not cached). GET only. */
export function useDocumentViewUrl() {
  return useMutation({ mutationFn: (documentId: string) => getDocumentViewUrl(api, documentId) });
}

/** Upload (or re-send a rejected) own document — portal onboarding / "Reenviar documento". */
export function useUploadOwnDocument() {
  const uid = useUserId();
  const owner = useOwnDocumentOwner();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tipo: DocumentType; file: PickedFile; replaceDocumentId?: string }) => {
      if (!owner) throw new Error("Cadastro não iniciado.");
      return uploadDocument(api, owner, input.tipo, input.file, { replaceDocumentId: input.replaceDocumentId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "documents") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "onboarding") });
    }
  });
}
