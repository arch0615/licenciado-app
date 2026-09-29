import { Stack, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { CourseDetail } from "@/features/academy/components/AcademyViews";

/** S30 — Curso (approved area). */
export default function CourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Curso" }} />
      <CourseDetail courseId={courseId} />
    </Screen>
  );
}
