/**
 * Sanitiza texto de usuario antes de enviarlo a APIs externas (Gemini).
 * Elimina patrones que puedan contener credenciales o datos sensibles.
 * La función es idempotente: aplicarla dos veces produce el mismo resultado.
 */
export function sanitizeForAI(text: string): string {
  let result = text;

  // JWTs y Bearer tokens: eyJh... (base64url encodeado)
  result = result.replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
    '[TOKEN_REDACTED]',
  );

  // Bearer / Token headers
  result = result.replace(
    /\b(Bearer|token)\s+[A-Za-z0-9\-._~+/]+=*/gi,
    '$1 [TOKEN_REDACTED]',
  );

  // API Keys y secrets: key=valor, secret=valor, password=valor, api_key=valor, token=valor
  result = result.replace(
    /\b(key|secret|token|password|passwd|api[_-]?key|auth)\s*[=:]\s*["']?[A-Za-z0-9\-._~+/@]{8,}["']?/gi,
    '$1=[REDACTED]',
  );

  // Connection strings de bases de datos
  result = result.replace(
    /(postgresql|mysql|mongodb|redis|postgres):\/\/[^\s"'<>]+/gi,
    '$1://[CONNECTION_REDACTED]',
  );

  // Emails (reemplaza solo el dominio para preservar contexto)
  result = result.replace(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL_REDACTED]',
  );

  return result;
}
