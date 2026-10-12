import type { ClientAlert, ClientDetail, ClientJourneyCard } from "@/features/clients/types";
import { ApiError } from "@/services/api/errors";
import type { MockRoute } from "@/services/api/mock-transport";

import { requireApproved } from "./account";

const NAMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Daniel Rocha", "Eduarda Alves", "Felipe Costa", "Gabriela Nunes",
  "Henrique Dias", "Isabela Martins", "João Pereira", "Karina Ribeiro", "Lucas Ferreira", "Mariana Gomes",
  "Nicolas Barbosa", "Olívia Castro", "Paulo Araújo", "Queila Moreira", "Rafael Teixeira", "Sofia Cardoso",
  "Tiago Correia", "Padaria Pão Quente Ltda", "Mercado Bom Preço ME"
];
const CITIES: [string, string][] = [["São Paulo", "SP"], ["Campinas", "SP"], ["Belo Horizonte", "MG"], ["Curitiba", "PR"]];
const STATUSES = ["APROVADO", "APROVADO", "PENDENTE_APROVACAO", "INATIVO"] as const;
const JOURNEY = ["COMPENSANDO_NORMAL", "UC_AGUARDANDO_COMPENSACAO", "EM_CADASTRO", "CANCELADO"] as const;

const clients: ClientDetail[] = NAMES.map((name, index) => {
  const company = name.includes("Ltda") || name.includes("ME");
  const [cidade, uf] = CITIES[index % CITIES.length]!;
  return {
    id: `cli-${index + 1}`,
    tipo_pessoa: company ? "JURIDICA" : "FISICA",
    nome_completo: company ? "Responsável Legal" : name,
    razao_social: company ? name : null,
    documento: null,
    cpf: company ? null : `***.${String(100 + index)}.***-**`,
    cnpj: company ? `**.***.${String(100 + index)}/0001-**` : null,
    telefone: `1198765${String(4000 + index)}`,
    celular: `1198765${String(4000 + index)}`,
    email: `${name.split(" ")[0]!.toLowerCase()}@exemplo.com`,
    cidade,
    uf,
    status: STATUSES[index % STATUSES.length]!,
    created_at: new Date(Date.UTC(2026, index % 9, 1 + index)).toISOString(),
    total_ucs_vinculadas: 1 + (index % 2),
    vinculos_uc: [
      { id: `v-${index}-1`, uc_numero: `30${String(1000 + index)}`, ativo: index % 4 !== 3, uc: { concessionaria: "CPFL", cidade, uf } }
    ]
  };
});

function journeyFor(client: ClientDetail, index: number): ClientJourneyCard {
  const status = JOURNEY[index % JOURNEY.length]!;
  const compensating = status === "COMPENSANDO_NORMAL";
  return {
    consumidorId: client.id,
    clientName: client.razao_social ?? client.nome_completo ?? "Cliente",
    clientType: client.tipo_pessoa === "JURIDICA" ? "PJ" : "PF",
    clientStatus: status,
    cidade: client.cidade,
    uf: client.uf,
    isCompensating: compensating,
    hasDocumentPending: status === "EM_CADASTRO",
    hasInvoiceOverdue: false,
    metrics: { totalUcs: 1, totalUcsAtivas: compensating ? 1 : 0, totalUcsCompensando: compensating ? 1 : 0, totalInvoicesOverdue: 0 },
    badges: [],
    lastActionLabel: compensating ? "Fatura compensada" : "Cadastro atualizado",
    lastActionAt: client.created_at,
    nextRecommendedActionLabel: status === "EM_CADASTRO" ? "Enviar documentos" : null,
    clientJourney: [
      { key: "cadastro", label: "Cadastro", state: status === "EM_CADASTRO" ? "CURRENT" : "DONE", date: client.created_at },
      { key: "analise", label: "Análise", state: status === "EM_CADASTRO" ? "PENDING" : "DONE" },
      { key: "uc", label: "Ativação da UC", state: compensating ? "DONE" : status === "UC_AGUARDANDO_COMPENSACAO" ? "CURRENT" : "PENDING" },
      { key: "compensacao", label: "Compensando", state: compensating ? "CURRENT" : "PENDING" }
    ]
  };
}

const alerts: ClientAlert[] = [
  {
    id: "al-1",
    tipo: "DOCUMENTO_PENDENTE",
    severidade: "WARNING",
    titulo: "Documento pendente",
    descricao: "Carla Mendes ainda não enviou a conta de energia.",
    consumidor_id: "cli-3",
    created_at: "2026-09-20T12:00:00.000Z",
    recommended_action_label: "Ver cliente"
  },
  {
    id: "al-2",
    tipo: "FATURA_VENCIDA",
    severidade: "CRITICAL",
    titulo: "Fatura vencida",
    descricao: "Daniel Rocha tem uma fatura vencida há 12 dias.",
    consumidor_id: "cli-4",
    created_at: "2026-09-18T12:00:00.000Z",
    recommended_action_label: "Entrar em contato"
  }
];

const findClient = (id: string | undefined) => {
  const client = clients.find((item) => item.id === id);
  if (!client) throw new ApiError({ status: 404, code: "CONSUMIDOR_NAO_ENCONTRADO", message: "Cliente não encontrado." });
  return client;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const clientRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/v1/consumidores",
    handler: ({ request }) => {
      requireApproved();
      const query = request.query ?? {};
      const nome = normalize(String(query.nome ?? ""));
      const status = query.status ? String(query.status) : null;
      const page = Number(query.page ?? 1);
      const perPage = Number(query.perPage ?? 20);
      const filtered = clients.filter(
        (client) =>
          (!nome || normalize(`${client.nome_completo ?? ""} ${client.razao_social ?? ""}`).includes(nome)) &&
          (!status || client.status === status)
      );
      const data = filtered.slice((page - 1) * perPage, page * perPage).map(({ vinculos_uc: _links, ...item }) => item);
      return { data, meta: { total: filtered.length, page, perPage } };
    }
  },
  { method: "GET", path: "/v1/consumidores/:id", handler: ({ params }) => (requireApproved(), findClient(params.id)) },
  {
    method: "GET",
    path: "/v1/acompanhamento/cards",
    handler: ({ request }) => {
      requireApproved();
      const query = normalize(String(request.query?.query ?? ""));
      return {
        data: clients
          .map((client, index) => journeyFor(client, index))
          .filter((card) => !query || normalize(card.clientName).includes(query))
      };
    }
  },
  { method: "GET", path: "/v1/acompanhamento/alertas", handler: () => (requireApproved(), { data: alerts }) },
  {
    method: "GET",
    path: "/v1/acompanhamento/:id",
    handler: ({ params }) => {
      requireApproved();
      const client = findClient(params.id);
      return journeyFor(client, clients.indexOf(client));
    }
  }
];
