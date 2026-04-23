import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOG_PATH = resolve(process.cwd(), 'e2e-output.log');
const OUT_PATH = resolve(process.cwd(), 'e2e-triage.md');

const RULES = [
  {
    id: 'infra-db',
    label: 'Infraestructura (DB/red)',
    patterns: [/ECONNREFUSED/i, /connect ECONNREFUSED/i, /pg_isready/i, /database/i],
    action:
      'Verificar servicio Postgres del workflow, `DATABASE_URL` y migración/schema (`prisma db push`).',
  },
  {
    id: 'env',
    label: 'Configuración de entorno',
    patterns: [/Faltan variables/i, /Preflight/i, /E2E_[A-Z0-9_]+/i],
    action:
      'Revisar generación de variables (`e2e:prepare-ci`) y secretos requeridos para la suite.',
  },
  {
    id: 'auth',
    label: 'Autenticación/autorización',
    patterns: [/401\b/i, /403\b/i, /Unauthorized/i, /forbidden/i, /Clerk/i],
    action:
      'Validar API keys seed, claims de rol y contratos RBAC de endpoints bajo prueba.',
  },
  {
    id: 'flake-timeout',
    label: 'Flaky o timeout',
    patterns: [/Timeout/i, /timed out/i, /retry/i],
    action:
      'Inspeccionar test inestable, reducir acoplamiento temporal o aumentar timeout solo si hay evidencia.',
  },
];

function classify(log) {
  const hits = [];
  for (const rule of RULES) {
    const matched = rule.patterns.some((rx) => rx.test(log));
    if (matched) hits.push(rule);
  }
  if (hits.length === 0) {
    hits.push({
      id: 'unknown',
      label: 'No clasificado',
      action:
        'Abrir artifact de Playwright y revisar primer test fallido para clasificarlo (infra/config/regresión).',
    });
  }
  return hits;
}

function lastUsefulLines(log, maxLines = 60) {
  return log
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(-maxLines)
    .join('\n');
}

let log = '';
try {
  log = readFileSync(LOG_PATH, 'utf8');
} catch {
  const msg =
    'No se encontró `e2e-output.log`; no hay datos para triage automático. Revisa el job de E2E.';
  writeFileSync(OUT_PATH, `${msg}\n`, 'utf8');
  process.stdout.write(`${msg}\n`);
  process.exit(0);
}

const categories = classify(log);
const body = [
  '## E2E Triage (auto, sin LLM pago)',
  '',
  '**Categorías detectadas:**',
  ...categories.map((c) => `- ${c.label}: ${c.action}`),
  '',
  '<details><summary>Últimas líneas del log</summary>',
  '',
  '```text',
  lastUsefulLines(log),
  '```',
  '',
  '</details>',
  '',
].join('\n');

writeFileSync(OUT_PATH, body, 'utf8');
process.stdout.write(`${body}\n`);
