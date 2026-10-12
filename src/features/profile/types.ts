import type { AccountStatus } from "@/features/auth/types";

/** licenciado-api `GET/PATCH /v1/licenciados/me`, `POST /v1/licenciados/bootstrap-me` (Swagger). */
export type LicenciadoProfile = {
  id: string;
  codigo_licenciado: string;
  codigo_cupom: string | null;
  status: AccountStatus;
  reprovado_motivo: string | null;
  tipo_pessoa: "FISICA" | "JURIDICA" | null;
  licenciado_type: "EMPRESA" | "MEI" | null;
  email: string;
  nome_completo: string | null;
  telefone: string | null;
  cpf: string | null;
  rg_ie: string | null;
  data_nascimento: string | null;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  avatar_url: string | null;
  created_at: string;
};


/** Fields the portal lets a licenciado edit (name and phone). */
export type LicenciadoProfileUpdate = Partial<{ nome_completo: string; telefone: string }>;

/** licenciado-api `GET/PATCH /v1/sublicenciados/me` (Swagger). */
export type SublicenciadoProfile = {
  id: string;
  codigo_licenciado: string;
  codigo_sublicenciado: string;
  codigo_cupom: string | null;
  status: AccountStatus;
  reprovado_motivo: string | null;
  email: string;
  nome_completo: string | null;
  telefone: string | null;
  cpf: string | null;
  rg: string | null;
  rg_uf: string | null;
  data_nascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  created_at: string;
  licenciado: {
    id: string;
    codigo_licenciado: string;
    razao_social: string | null;
    nome_fantasia: string | null;
    cnpj: string | null;
    status: string;
  };
};


export type AccountProfile =
  | { role: "LICENCIADO"; data: LicenciadoProfile }
  | { role: "SUBLICENCIADO"; data: SublicenciadoProfile };
