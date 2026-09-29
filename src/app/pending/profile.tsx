import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { AccountSection } from "@/features/profile/AccountSection";

/** S36 (pre-approval subset). */
export default function PendingProfileScreen() {
  const { me } = useAuthenticatedContext();
  return (
    <Screen>
      <ScreenHeader title="Perfil" />
      <AccountSection me={me} />
    </Screen>
  );
}
