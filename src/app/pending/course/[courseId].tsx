import { useLocalSearchParams } from "expo-router";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { CourseDetail } from "@/features/academy/components/AcademyViews";

export default function PendingCourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return (
    <Screen>
      <ScreenHeader title="Curso" />
      <CourseDetail courseId={courseId} />
    </Screen>
  );
}
