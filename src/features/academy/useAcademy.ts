import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import { completeLesson, getCourse, getTrainingSummary, listCourses, listLessons } from "./academy.service";

export function useCourses() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "academy", "courses"), queryFn: () => listCourses(api) });
}

export function useTrainingSummary() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "academy", "summary"), queryFn: () => getTrainingSummary(api) });
}

export function useCourse(courseId: string) {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "academy", "course", courseId), queryFn: () => getCourse(api, courseId) });
}

export function useLessons(courseId: string) {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "academy", "lessons", courseId), queryFn: () => listLessons(api, courseId) });
}

/** Progress is recalculated by the backend; the app just refetches it. */
export function useCompleteLesson(courseId: string) {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => completeLesson(api, courseId, lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "academy") })
  });
}
