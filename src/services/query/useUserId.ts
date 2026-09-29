import { useSession } from "@/features/auth/SessionProvider";

/**
 * Signed-in user id for cache keys (`queryKeys.user(uid, ...)`). It only partitions the local
 * cache per account; it is never sent to the backend, which identifies the caller by the token.
 */
export function useUserId(): string {
  const { identity } = useSession();
  return identity?.uid ?? "anonymous";
}
