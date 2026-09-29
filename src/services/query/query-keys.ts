/**
 * Query key factory. Every key that holds user or tenant data starts with the signed-in user id,
 * so cached data can never leak between accounts on the same device (a defect found in the web app,
 * whose dashboard cache was not keyed by user). The whole cache is also cleared on sign-out.
 *
 * Usage in features:  queryKeys.user(uid, "clients", "list", filters)
 */
export const queryKeys = {
  app: {
    status: () => ["app", "status"] as const
  },
  auth: {
    me: (uid: string | null) => ["user", uid ?? "anonymous", "auth", "me"] as const
  },
  user: (uid: string, ...parts: readonly unknown[]) => ["user", uid, ...parts] as const
};
