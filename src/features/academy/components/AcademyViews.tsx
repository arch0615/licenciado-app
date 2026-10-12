import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { ListRow } from "@/components/ui/ListRow";
import { userMessage } from "@/services/api/errors";
import { formatNumber } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/tokens";

import type { CourseStatus, TrainingSummary } from "../academy.service";
import { useCompleteLesson, useCourse, useCourses, useLessons, useTrainingSummary } from "../useAcademy";

/** Route of the course detail in the hosting area. */
export type CourseRoute = "/course/[courseId]" | "/pending/course/[courseId]";

const STATUS: Record<CourseStatus, { label: string; tone: "neutral" | "highlight" | "success" }> = {
  nao_iniciado: { label: "Não iniciado", tone: "neutral" },
  em_andamento: { label: "Em andamento", tone: "highlight" },
  concluido: { label: "Concluído", tone: "success" }
};

const isHttps = (url: string | null | undefined): url is string => typeof url === "string" && url.startsWith("https://");

const CATEGORY_FILTERS = [
  { value: "ALL", label: "Todas as categorias" },
  { value: "Onboarding", label: "Onboarding" },
  { value: "Operacao", label: "Operação" },
  { value: "Comercial", label: "Comercial" },
  { value: "Produto", label: "Produto" },
  { value: "Financeiro", label: "Financeiro" }
];
const LEVEL_FILTERS = [
  { value: "ALL", label: "Todos os níveis" },
  { value: "Basico", label: "Básico" },
  { value: "Intermediario", label: "Intermediário" },
  { value: "Avancado", label: "Avançado" }
];
const STATUS_FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "nao_iniciado", label: "Não iniciado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" }
];

/** Portal /treinamentos/progresso: KPIs + per-course progress (values from GET /v1/training/summary). */
function TrainingProgress({ summary }: { summary: TrainingSummary }) {
  const { colors } = useTheme();
  return (
    <Card variant="hero">
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          Seu progresso
        </AppText>
        <AppText variant="bodyStrong">
          {summary.coursesCompleted} cursos concluídos · {summary.coursesInProgress} em andamento
        </AppText>
        <AppText variant="caption" tone="muted">
          Nível atual: {summary.currentLevel} · {formatNumber(summary.studiedHours)} horas estudadas
        </AppText>
        {summary.byCourse.map((course) => (
          <View key={course.courseId} style={{ gap: 2 }}>
            <AppText variant="caption">
              {course.courseTitle} · {formatNumber(course.percent)}%
            </AppText>
            <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.muted }}>
              <View
                style={{
                  width: `${Math.min(100, Math.max(0, course.percent))}%`,
                  height: 6,
                  borderRadius: radius.full,
                  backgroundColor: colors.primary
                }}
              />
            </View>
          </View>
        ))}
        <AppText variant="caption" tone="muted">
          Certificados ainda não estão disponíveis.
        </AppText>
      </View>
    </Card>
  );
}

export function CourseList({ courseRoute }: { courseRoute: CourseRoute }) {
  const allCourses = useCourses();
  const summary = useTrainingSummary();
  const [category, setCategory] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  // Filters stay visible even when the result is empty (the portal hides them — a known portal bug).
  const courses = {
    ...allCourses,
    data: allCourses.data?.filter(
      (course) =>
        (category === "ALL" || course.category === category) &&
        (level === "ALL" || course.level === level) &&
        (status === "ALL" || course.status === status)
    )
  } as typeof allCourses;
  return (
    <View style={{ gap: spacing.md }}>
      {summary.data ? <TrainingProgress summary={summary.data} /> : null}
      <ChipGroup options={CATEGORY_FILTERS} value={category} onChange={setCategory} />
      <ChipGroup options={LEVEL_FILTERS} value={level} onChange={setLevel} />
      <ChipGroup options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <QueryState
        query={courses}
        isEmpty={(list) => list.length === 0}
        empty={
          <AppText tone="muted">
            {category !== "ALL" || level !== "ALL" || status !== "ALL"
              ? "Não encontramos cursos para os filtros selecionados."
              : "Nenhum curso disponível no momento."}
          </AppText>
        }
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
      <QueryState query={lessons} isEmpty={(list) => list.length === 0} empty={<AppText tone="muted">Sem aulas cadastradas para este curso.</AppText>}>
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
