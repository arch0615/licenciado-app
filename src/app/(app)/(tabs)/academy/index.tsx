import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { CourseList } from "@/features/academy/components/AcademyViews";
import { useCourses } from "@/features/academy/useAcademy";

/** S29–S31 — Academy (tab for representatives; licenciados reach it from Mais). */
export default function AcademyScreen() {
  const courses = useCourses();
  return (
    <Screen onRefresh={() => void courses.refetch()} refreshing={courses.isRefetching}>
      <ScreenHeader title="Academy" showNotifications />
      <CourseList courseRoute="/course/[courseId]" />
    </Screen>
  );
}
