/**
 * Push notifications — preparation only.
 *
 * Firebase Cloud Messaging needs (1) a native module (`expo-notifications` or
 * `@react-native-firebase/messaging`, i.e. a development build) and (2) a backend endpoint to register
 * device tokens. Neither the licenciado-api Swagger nor the legacy inventory has (2)
 * (mobile-backend-requirements: `POST /v1/devices` / `DELETE /v1/devices/{id}` proposed).
 *
 * Contract the app will implement once the endpoint exists:
 *   - after sign-in and approval: request permission, get the FCM token, register it;
 *   - on sign-out: unregister the token BEFORE Firebase sign-out (needs the ID token);
 *   - notification taps open `actionHref` only if it is a relative in-app path (see isSafeInAppPath).
 */
export type PushRegistration = { deviceToken: string; platform: "ios" | "android" };

export interface PushRegistrar {
  register(): Promise<PushRegistration | null>;
  unregister(): Promise<void>;
}

/** Active implementation until the backend endpoint exists: does nothing, never throws. */
export const pushRegistrar: PushRegistrar = {
  async register() {
    return null;
  },
  async unregister() {}
};

/** Only relative in-app paths are navigable from notifications (no external or scheme URLs). */
export function isSafeInAppPath(href: string | null | undefined): href is string {
  return typeof href === "string" && /^\/[A-Za-z0-9/_\-?=&.%]*$/.test(href) && !href.startsWith("//");
}
