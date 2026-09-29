import { isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

/** Inventory TR1–TR6 (business service, camelCase, not in Swagger). Certificates: no endpoint yet. */
export type CourseStatus = "nao_iniciado" | "em_andamento" | "concluido";

export type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  totalLessons: number;
  durationMinutes: number;
  thumbnailUrl?: string | null;
  completedLessons: number;
  /** Progress percentage as computed by the backend. */
  percent: number;
  status: CourseStatus;
};

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  order: number;
  videoUrl?: string | null;
  materials: { label: string; href: string }[];
  status: string;
};

export type TrainingSummary = {
  coursesCompleted: number;
  coursesInProgress: number;
  studiedHours: number;
  currentLevel: string;
  byCourse: { courseId: string; courseTitle: string; percent: number }[];
};

export async function listCourses(api: ApiClient): Promise<Course[]> {
  const body = await api.get<unknown>("/v1/training/courses");
  return Array.isArray(body) ? (body as Course[]) : [];
}

export async function getCourse(api: ApiClient, courseId: string): Promise<{ course: Course; status: CourseStatus } | null> {
  try {
    return (await api.get<{ course: Course; status: CourseStatus } | null>(`/v1/training/courses/${encodeURIComponent(courseId)}`)) ?? null;
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    throw error;
  }
}

export async function listLessons(api: ApiClient, courseId: string): Promise<Lesson[]> {
  const body = await api.get<unknown>(`/v1/training/courses/${encodeURIComponent(courseId)}/lessons`);
  return Array.isArray(body) ? [...(body as Lesson[])].sort((a, b) => a.order - b.order) : [];
}

export function completeLesson(api: ApiClient, courseId: string, lessonId: string): Promise<unknown> {
  return api.post(`/v1/training/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/complete`);
}

export function getTrainingSummary(api: ApiClient): Promise<TrainingSummary> {
  return api.get<TrainingSummary>("/v1/training/summary");
}
