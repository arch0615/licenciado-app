import { Stack } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { CourseList } from "@/features/academy/components/AcademyViews";

/** S29 — Academy for licenciados (reached from Mais). */
export default function CoursesScreen() {
  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Academy" }} />
      <CourseList courseRoute="/course/[courseId]" />
    </Screen>
  );
}
