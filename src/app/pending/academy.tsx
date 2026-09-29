import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { CourseList } from "@/features/academy/components/AcademyViews";

/** S29 (pre-approval subset — the backend decides which courses are available before approval). */
export default function PendingAcademyScreen() {
  return (
    <Screen>
      <ScreenHeader title="Academy" subtitle="Treinamentos básicos" />
      <CourseList courseRoute="/pending/course/[courseId]" />
    </Screen>
  );
}
