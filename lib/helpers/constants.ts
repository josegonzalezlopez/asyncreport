/** Máximo de resúmenes de IA por proyecto por día (se reinicia a las 00:00 UTC). */
export const MAX_DAILY_SUMMARIES = 5;

/** Intervalo de polling para el estado del resumen de IA (ms). */
export const AI_SUMMARY_POLL_INTERVAL_MS = 2000;

/** Timeout máximo de espera para el resumen de IA en el cliente (ms). */
export const AI_SUMMARY_POLL_TIMEOUT_MS = 120_000;
