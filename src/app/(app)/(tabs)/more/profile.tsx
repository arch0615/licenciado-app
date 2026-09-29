import { Stack } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { ProfileDetails } from "@/features/profile/components/ProfileDetails";
import { useProfile } from "@/features/profile/useProfile";

/** S36 — Meus dados. */
export default function ProfileScreen() {
  const profile = useProfile();
  return (
    <Screen onRefresh={() => void profile.refetch()} refreshing={profile.isRefetching}>
      <Stack.Screen options={{ title: "Meus dados" }} />
      <ProfileDetails />
    </Screen>
  );
}
