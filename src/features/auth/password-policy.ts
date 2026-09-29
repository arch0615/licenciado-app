/**
 * Client-side mirror of the licenciado-api password policy (src/lib/validation.ts, SEC-AUTH-6):
 * 8–128 chars, lower, upper, digit and a special character from @$!%*?&.
 * The server re-validates on registration; this only drives the checklist in the form.
 */
export const PASSWORD_RULES = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (value: string) => value.length >= 8 && value.length <= 128 },
  { id: "lower", label: "Uma letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { id: "upper", label: "Uma letra maiúscula", test: (value: string) => /[A-Z]/.test(value) },
  { id: "digit", label: "Um número", test: (value: string) => /\d/.test(value) },
  { id: "special", label: "Um caractere especial (@$!%*?&)", test: (value: string) => /[@$!%*?&]/.test(value) }
] as const;

export function passwordMeetsPolicy(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
