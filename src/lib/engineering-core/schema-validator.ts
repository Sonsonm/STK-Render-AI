/**
 * SchemaValidator — Engineering Core
 *
 * Responsável por validar e normalizar o EngineeringJSON recebido de um
 * Analysis Provider, antes de qualquer regra de engenharia ser aplicada.
 *
 * Implementação real: Sprint 3.
 */

import { safeParseEngineeringJsonV1, type EngineeringJsonV1 } from "./schema/engineering-json";

export interface ValidationResult {
  valid: boolean;
  data?: EngineeringJsonV1;
  errors?: string[];
}

export function validateEngineeringJson(raw: unknown): ValidationResult {
  const result = safeParseEngineeringJsonV1(raw);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
    };
  }

  return { valid: true, data: result.data };
}
