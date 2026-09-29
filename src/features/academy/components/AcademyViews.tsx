import * as Linking from "expo-linking";
import { router } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

import type { CourseStatus } from "../academy.service";
import { useCompleteLesson, useCourse, useCourses, useLessons, useTrainingSummary } from "../useAcademy";

/** Route of the course detail in the hosting area. */
export type CourseRoute = "/course/[courseId]" | "/pending/course/[courseId]";

const STATUS: Record<CourseStatus, { label: string; tone: "neutral" | "highlight" | "success" }> = {
  nao_iniciado: { label: "Não iniciado", tone: "neutral" },
  em_andamento: { label: "Em andamento", tone: "highlight" },
  concluido: { label: "Concluído", tone: "success" }
};

const isHttps = (url: string | null | undefined): url is string => typeof url === "string" && url.startsWith("https://");

export function CourseList({ courseRoute }: { courseRoute: CourseRoute }) {
  const courses = useCourses();
  const summary = useTrainingSummary();
  return (
    <View style={{ gap: spacing.md }}>
      {summary.data ? (
        <Card variant="hero">
          <AppText variant="overline" tone="muted">
            Seu progresso
          </AppText>
          <AppText variant="bodyStrong">
            {summary.data.coursesCompleted} concluído(s) · {summary.data.coursesInProgress} em andamento
          </AppText>
          <AppText variant="caption" tone="muted">
            Nível: {summary.data.currentLevel}
          </AppText>
        </Card>
      ) : null}
      <QueryState
        query={courses}
        isEmpty={(list) => list.length === 0}
        empty={<AppText tone="muted">Nenhum curso disponível no momento.</AppText>}
      >
        {(list) => (
          <Card>
            {list.map((course) => (
              <ListRow
                key={course.id}
                title={course.title}
                subtitle={`${course.completedLessons}/${course.totalLessons} aulas · ${course.percent}%`}
                right={<Badge label={STATUS[course.status]?.label ?? "—"} tone={STATUS[course.status]?.tone ?? "neutral"} />}
                onPress={() => router.push({ pathname: courseRoute, params: { courseId: course.id } })}
              />
            ))}
          </Card>
        )}
      </QueryState>
    </View>
  );
}

export function CourseDetail({ courseId }: { courseId: string }) {
  const course = useCourse(courseId);
  const lessons = useLessons(courseId);
  const complete = useCompleteLesson(courseId);
  return (
    <View style={{ gap: spacing.md }}>
      <QueryState query={course} loadingLines={2}>
        {(data) =>
          data ? (
            <Card>
              <AppText variant="title3">{data.course.title}</AppText>
              <AppText tone="muted">{data.course.description}</AppText>
            </Card>
          ) : (
            <AppText tone="muted">Curso não encontrado.</AppText>
          )
        }
      </QueryState>
      <QueryState query={lessons} isEmpty={(list) => list.length === 0} empty={<AppText tone="muted">Sem aulas.</AppText>}>
        {(list) => (
          <View style={{ gap: spacing.sm }}>
            {list.map((lesson) => {
              const done = lesson.status === "concluido" || lesson.status === "CONCLUIDA";
              return (
                <Card key={lesson.id}>
                  <View style={{ gap: spacing.xs }}>
                    <AppText variant="bodyStrong">
                      {lesson.order}. {lesson.title}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {lesson.durationMinutes} min{done ? " · Concluída" : ""}
                    </AppText>
                    {isHttps(lesson.videoUrl) ? (
                      <Button label="Assistir aula" variant="outline" onPress={() => void Linking.openURL(lesson.videoUrl!)} />
                    ) : null}
                    {lesson.materials.filter((item) => isHttps(item.href)).map((item) => (
                      <ListRow key={item.href} title={item.label} onPress={() => void Linking.openURL(item.href)} />
                    ))}
                    {!done ? (
                      <Button
                        label="Marcar como concluída"
                        variant="ghost"
                        loading={complete.isPending && complete.variables === lesson.id}
                        onPress={() => complete.mutate(lesson.id)}
                      />
                    ) : null}
                  </View>
                </Card>
              );
            })}
            {complete.error ? (
              <AppText variant="callout" tone="danger">
                {userMessage(complete.error)}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="muted">
              Certificados ainda não estão disponíveis no aplicativo.
            </AppText>
          </View>
        )}
      </QueryState>
    </View>
  );
}
