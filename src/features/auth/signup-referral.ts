import { secureStorage } from "@/services/storage/secure-storage";

const KEY = "acvel.signup.codigo-licenciado";

/**
 * Live ACVEL API: a representative's first access (`POST /v1/sublicenciados/bootstrap-me`) must send the
 * licenciado code used at signup. The code is kept only until that call succeeds. It is an input the
 * backend validates, never an identity: role, tenant and user always come from the Firebase token.
 */
export const signupReferral = {
  save: (codigo: string) => secureStorage.set(KEY, codigo.trim().toUpperCase()),
  read: () => secureStorage.get(KEY),
  clear: () => secureStorage.remove(KEY)
};
