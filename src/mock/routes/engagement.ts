import type { Course, Lesson } from "@/features/academy/academy.service";
import type { Dashboard } from "@/features/dashboard/dashboard.service";
import type { DocumentItem } from "@/features/documents/document.service";
import type { NotificationItem } from "@/features/notifications/notification.service";
import type { Onboarding } from "@/features/onboarding/onboarding.service";
import type { SupportMessage, SupportTicket } from "@/features/support/support.service";
import { ApiError } from "@/services/api/errors";
import type { MockRoute } from "@/services/api/mock-transport";

import { currentMe, requireApproved } from "./account";

// ---------------------------------------------------------------- dashboard (B23)
const dashboard: Dashboard = {
  summary: { total_clientes: 22, clientes_ativos: 11, ucs_em_ativacao: 5, comissao_prevista_mes: 250 },
  alerts: [
    {
      id: "da-1",
      type: "DOCUMENTO_PENDENTE",
      description: "Carla Mendes: conta de energia pendente",
      entityId: "cli-3",
      entityType: "CLIENTE",
      read_at: null,
      resolved_at: null
    }
  ]
};

// ---------------------------------------------------------------- notifications (B17–B20)
const notifications: NotificationItem[] = [
  {
    id: "n-1",
    createdAt: "2026-09-27T14:00:00.000Z",
    title: "Documento reprovado",
    message: "A conta de energia de Carla Mendes está ilegível.",
    type: "DOC_REPROVADO",
    severity: "WARNING",
    readAt: null,
    entityType: "CLIENTE",
    entityId: "cli-3",
    actionLabel: "Ver cliente"
  },
  {
    id: "n-2",
    createdAt: "2026-09-25T09:30:00.000Z",
    title: "Comissões liberadas",
    message: "Suas comissões de agosto foram liberadas para pagamento.",
    type: "INFO_GERAL",
    severity: "INFO",
    readAt: "2026-09-25T10:00:00.000Z"
  }
];

// ---------------------------------------------------------------- support (SP1–SP6)
const tickets: SupportTicket[] = [
  {
    id: "SUP-1042",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-21T16:00:00.000Z",
    category: "PAGAMENTO",
    status: "EM_ATENDIMENTO",
    subject: "Comissão de julho",
    lastMessagePreview: "Estamos verificando o lote."
  }
];
const messages: SupportMessage[] = [
  { id: "m-1", ticketId: "SUP-1042", sentAt: "2026-09-20T10:00:00.000Z", sender: "USER", text: "Não recebi a comissão de julho." },
  { id: "m-2", ticketId: "SUP-1042", sentAt: "2026-09-21T16:00:00.000Z", sender: "AGENT", text: "Estamos verificando o lote. Retornamos em breve." }
];

const findTicket = (id: string | undefined) => {
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket) throw new ApiError({ status: 404, code: "TICKET_NOT_FOUND", message: "Chamado não encontrado." });
  return ticket;
};

// ---------------------------------------------------------------- academy (TR1–TR6)
const lessons: Lesson[] = [1, 2, 3].map((order) => ({
  id: `l-${order}`,
  courseId: "c-1",
  title: ["Boas-vindas à ACVEL", "Como funciona a energia por assinatura", "Seu primeiro cliente"][order - 1]!,
  description: "Aula introdutória.",
  durationMinutes: 8,
  order,
  videoUrl: null,
  materials: [],
  status: order === 1 ? "concluido" : "nao_iniciado"
}));

function courseState(): Course {
  const completed = lessons.filter((lesson) => lesson.status === "concluido").length;
  return {
    id: "c-1",
    title: "Primeiros passos",
    description: "O essencial para começar a vender.",
    category: "Onboarding",
    level: "Basico",
    totalLessons: lessons.length,
    durationMinutes: 24,
    completedLessons: completed,
    percent: Math.round((completed / lessons.length) * 100), // mock backend's own figure
    status: completed === lessons.length ? "concluido" : completed > 0 ? "em_andamento" : "nao_iniciado"
  };
}

// ---------------------------------------------------------------- onboarding + documents (L*, S*, D*)
// The pending personas start with an onboarding in progress and one rejected document.
const documents: DocumentItem[] = [
  { id: "doc-1", tipo: "RG", status_validacao: "REPROVADO", reprovado_motivo: "Foto ilegível. Envie novamente pelo portal.", created_at: "2026-09-20T12:00:00.000Z", arquivo_nome: "rg.jpg" },
  { id: "doc-2", tipo: "CNPJ", status_validacao: "EM_ANALISE", reprovado_motivo: null, created_at: "2026-09-21T12:00:00.000Z", arquivo_nome: "cartao-cnpj.pdf" }
];
let onboardingStarted = true;
let submitted = false;
const completedSteps = new Set<string>();

const STEP_CODES: Record<string, string> = {
  "dados-pessoais": "DADOS_PESSOAIS",
  "dados-profissionais": "DADOS_PROFISSIONAIS",
  "dados-bancarios": "DADOS_BANCARIOS",
  documentos: "DOCUMENTOS_ENVIADOS",
  termos: "CONTRATO_ACEITO",
  "conferencia-empresa": "CONFERENCIA_EMPRESA",
  "dados-login": "DADOS_LOGIN"
};

function requiredSteps(): string[] {
  return currentMe().tipoUsuarioResolvido === "SUBLICENCIADO"
    ? ["CONTRATO_ACEITO", "CONFERENCIA_EMPRESA", "DADOS_LOGIN", "DOCUMENTOS_ENVIADOS", "DADOS_PESSOAIS"]
    : ["DOCUMENTOS_ENVIADOS", "DADOS_PESSOAIS", "DADOS_PROFISSIONAIS", "DADOS_BANCARIOS", "CONTRATO_ACEITO"];
}

const PENDING_LABELS: Record<string, string> = {
  DOCUMENTOS_ENVIADOS: "Enviar RG ou CNH",
  DADOS_PESSOAIS: "Preencher dados pessoais",
  DADOS_PROFISSIONAIS: "Preencher dados da empresa",
  DADOS_BANCARIOS: "Preencher dados bancários",
  CONTRATO_ACEITO: "Aceitar o contrato de licenciamento",
  CONFERENCIA_EMPRESA: "Confirmar a empresa",
  DADOS_LOGIN: "Confirmar os dados de acesso"
};

function onboardingState(): Onboarding {
  const hasId = documents.some((doc) => (doc.tipo === "RG" || doc.tipo === "CNH") && doc.status_validacao !== "REPROVADO");
  const done = requiredSteps().filter((step) => completedSteps.has(step) && (step !== "DOCUMENTOS_ENVIADOS" || hasId));
  const pendencias = requiredSteps()
    .filter((step) => !done.includes(step))
    .map((step) => PENDING_LABELS[step]!);
  return {
    id: "onb-1",
    status: submitted ? "EM_ANALISE" : "DRAFT",
    etapa_atual: submitted ? "EM_ANALISE" : (requiredSteps().find((step) => !done.includes(step)) ?? "REVISAO"),
    etapas_concluidas: done,
    pendencias: submitted ? [] : pendencias,
    progresso_percentual: Math.round((done.length / requiredSteps().length) * 100), // mock backend's own figure
    can_submit: !submitted && pendencias.length === 0,
    submitted,
    submitted_at: submitted ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    reprovado_motivo: null
  };
}

const requireNotApproved = () => {
  const me = currentMe();
  if (!me.licenciadoId && !me.sublicenciadoId) {
    throw new ApiError({ status: 404, code: "ACCOUNT_NOT_FOUND", message: "Cadastro não encontrado. Conclua o primeiro acesso." });
  }
  return me;
};

export const engagementRoutes: MockRoute[] = [
  { method: "GET", path: "/v1/dashboards/licenciado-central/:id", handler: () => (requireApproved(), dashboard) },

  {
    method: "GET",
    path: "/v1/notifications/me/summary",
    handler: () => (currentMe(), { unreadCount: notifications.filter((n) => !n.readAt).length, latest: notifications.slice(0, 3) })
  },
  {
    method: "GET",
    path: "/v1/notifications/me",
    handler: ({ request }) => {
      currentMe();
      const onlyUnread = request.query?.onlyUnread === "true";
      const items = notifications.filter((n) => !onlyUnread || !n.readAt);
      return { items, total: items.length, page: 1, pageSize: 20 };
    }
  },
  {
    method: "POST",
    path: "/v1/notifications/me/read-all",
    handler: () => {
      for (const n of notifications) n.readAt ??= new Date().toISOString();
      return null;
    }
  },
  {
    method: "POST",
    path: "/v1/notifications/me/:id/read",
    handler: ({ params }) => {
      const item = notifications.find((n) => n.id === params.id);
      if (item) item.readAt ??= new Date().toISOString();
      return null;
    }
  },

  {
    method: "GET",
    path: "/v1/support/tickets",
    handler: () => (currentMe(), { items: tickets, total: tickets.length, page: 1, pageSize: 20 })
  },
  {
    method: "POST",
    path: "/v1/support/tickets",
    handler: ({ request }) => {
      currentMe();
      const body = request.body as { category: SupportTicket["category"]; subject?: string; initialMessage?: string };
      const now = new Date().toISOString();
      const ticket: SupportTicket = {
        id: `SUP-${1043 + tickets.length}`,
        createdAt: now,
        updatedAt: now,
        category: body.category,
        status: "AGUARDANDO",
        subject: body.subject ?? null
      };
      tickets.unshift(ticket);
      if (body.initialMessage) messages.push({ id: `m-${messages.length + 1}`, ticketId: ticket.id, sentAt: now, sender: "USER", text: body.initialMessage });
      return ticket;
    }
  },
  { method: "GET", path: "/v1/support/tickets/:id", handler: ({ params }) => findTicket(params.id) },
  {
    method: "GET",
    path: "/v1/support/tickets/:id/messages",
    handler: ({ params }) => (findTicket(params.id), messages.filter((m) => m.ticketId === params.id))
  },
  {
    method: "POST",
    path: "/v1/support/tickets/:id/messages",
    handler: ({ params, request }) => {
      const ticket = findTicket(params.id);
      const message: SupportMessage = {
        id: `m-${messages.length + 1}`,
        ticketId: ticket.id,
        sentAt: new Date().toISOString(),
        sender: "USER",
        text: (request.body as { text: string }).text
      };
      messages.push(message);
      ticket.updatedAt = message.sentAt;
      return message;
    }
  },
  {
    method: "PATCH",
    path: "/v1/support/tickets/:id/status",
    handler: ({ params }) => {
      const ticket = findTicket(params.id);
      ticket.status = "RESOLVIDO";
      return ticket;
    }
  },

  { method: "GET", path: "/v1/training/summary", handler: () => {
      const course = courseState();
      return {
        coursesCompleted: course.status === "concluido" ? 1 : 0,
        coursesInProgress: course.status === "em_andamento" ? 1 : 0,
        studiedHours: 0.1,
        currentLevel: "Iniciante",
        byCourse: [{ courseId: course.id, courseTitle: course.title, percent: course.percent }]
      };
    } },
  { method: "GET", path: "/v1/training/courses", handler: () => [courseState()] },
  { method: "GET", path: "/v1/training/courses/:id", handler: () => ({ course: courseState(), status: courseState().status }) },
  { method: "GET", path: "/v1/training/courses/:id/lessons", handler: () => lessons },
  {
    method: "POST",
    path: "/v1/training/courses/:id/lessons/:lessonId/complete",
    handler: ({ params }) => {
      const lesson = lessons.find((item) => item.id === params.lessonId);
      if (lesson) lesson.status = "concluido";
      return courseState();
    }
  },

  { method: "GET", path: "/v1/onboarding/licenciado/:id", handler: () => (requireNotApproved(), onboardingStarted ? onboardingState() : notStarted()) },
  { method: "GET", path: "/v1/onboarding/sublicenciado/:id", handler: () => (requireNotApproved(), onboardingStarted ? onboardingState() : notStarted()) },

  { method: "POST", path: "/v1/onboarding/iniciar", handler: () => ((onboardingStarted = true), onboardingState()) },
  { method: "POST", path: "/v1/onboarding/iniciar-sublicenciado", handler: () => ((onboardingStarted = true), onboardingState()) },
  { method: "POST", path: "/v1/onboarding/validate-uniqueness", handler: () => ({ cpfUnique: true, emailUnique: true, phoneUnique: true }) },
  ...(["licenciado", "sublicenciado"] as const).flatMap((role): MockRoute[] => [
    {
      method: "PUT",
      path: `/v1/onboarding/${role}/:id/etapas/:step`,
      handler: ({ params }) => {
        const code = STEP_CODES[params.step!];
        if (!code) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Etapa inexistente." });
        completedSteps.add(code);
        return onboardingState();
      }
    },
    {
      method: "POST",
      path: `/v1/onboarding/${role}/:id/submit`,
      handler: () => {
        if (!onboardingState().can_submit) {
          throw new ApiError({ status: 422, code: "ONBOARDING_INCOMPLETE", message: "Ainda há etapas pendentes no cadastro." });
        }
        submitted = true;
        return onboardingState();
      }
    }
  ]),

  { method: "GET", path: "/v1/documentos", handler: () => ({ data: documents }) },
  {
    method: "POST",
    path: "/v1/documentos/presign-upload",
    handler: () => ({
      upload_url: "/v1/mock-storage/upload",
      upload_method: "PUT",
      arquivo_path: `mock/${Date.now()}`,
      expires_at: new Date(Date.now() + 600_000).toISOString()
    })
  },
  { method: "PUT", path: "/v1/mock-storage/upload", handler: () => null },
  {
    method: "POST",
    path: "/v1/documentos/confirm-upload",
    handler: ({ request }) => {
      const body = request.body as { tipo: string; arquivo_nome: string };
      const doc: DocumentItem = {
        id: `doc-${documents.length + 1}`,
        tipo: body.tipo,
        status_validacao: "PENDENTE",
        reprovado_motivo: null,
        created_at: new Date().toISOString(),
        arquivo_nome: body.arquivo_nome
      };
      documents.unshift(doc);
      return doc;
    }
  },
  {
    method: "POST",
    path: "/v1/documentos/:id/reenviar",
    handler: ({ params, request }) => {
      const doc = documents.find((item) => item.id === params.id);
      if (!doc) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Documento não encontrado." });
      Object.assign(doc, {
        status_validacao: "PENDENTE",
        reprovado_motivo: null,
        arquivo_nome: (request.body as { arquivo_nome?: string }).arquivo_nome ?? doc.arquivo_nome
      });
      return doc;
    }
  },

  { method: "GET", path: "/v1/licenciado-settings/me/notification-preferences", handler: () => notificationPreferences },
  {
    method: "PUT",
    path: "/v1/licenciado-settings/me/notification-preferences",
    handler: ({ request }) => Object.assign(notificationPreferences, request.body as object)
  },
  { method: "GET", path: "/v1/licenciado-settings/me/preferences", handler: () => preferences },
  { method: "PUT", path: "/v1/licenciado-settings/me/preferences", handler: ({ request }) => (preferences = request.body as typeof preferences) },
  {
    method: "POST",
    path: "/v1/dashboards/licenciado-central/:id/alerts/:alertId/read",
    handler: ({ params }) => alertAction(params.alertId!, "read_at")
  },
  {
    method: "POST",
    path: "/v1/dashboards/licenciado-central/:id/alerts/:alertId/resolve",
    handler: ({ params }) => alertAction(params.alertId!, "resolved_at")
  },
  {
    method: "GET",
    path: "/v1/documentos/:id/signed-url",
    handler: ({ params }) => ({
      document_id: params.id,
      signed_url: "https://example.com/acvel-mock-document.pdf",
      expires_at: new Date(Date.now() + 300_000).toISOString()
    })
  },
];

// ---------------------------------------------------------------- own settings
const notificationPreferences = { documentos: true, ativacaoUc: true, inadimplencia: true, compensacao: false };
// Consents start unset: the user must opt in.
let preferences: unknown = { notifications: { push: true, email: true, whatsapp: false, sms: false }, language: "pt-BR" };

function alertAction(alertId: string, field: "read_at" | "resolved_at") {
  requireApproved();
  const alert = dashboard.alerts?.find((item) => item.id === alertId);
  if (!alert) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Alerta não encontrado." });
  Object.assign(alert, { [field]: new Date().toISOString() });
  return alert;
}

function notStarted(): never {
  throw new ApiError({ status: 404, code: "ONBOARDING_NOT_FOUND", message: "Cadastro ainda não iniciado." });
}
