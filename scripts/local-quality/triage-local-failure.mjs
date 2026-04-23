import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const logArg = process.argv[2];
const logPath = resolve(process.cwd(), logArg || 'reports/local-quality/prepush-latest.log');
const outPath = resolve(process.cwd(), 'reports/local-quality/prepush-triage.md');
const model = process.env.LOCAL_QA_OLLAMA_MODEL || 'qwen2.5-coder:7b';

function heuristic(log) {
  const rules = [
    {
      test: /(ESLint|eslint|no-unused-vars|Parsing error)/i,
      title: 'Lint',
      action: 'Corregir errores de ESLint y volver a correr `npm run lint`.',
    },
    {
      test: /(Vitest|FAIL|AssertionError|Expected)/i,
      title: 'Unit/Integration',
      action: 'Revisar el primer test fallido y validar contratos/fixtures antes de repetir `npm test`.',
    },
    {
      test: /(playwright|Timeout|timed out|E2E|browser)/i,
      title: 'E2E',
      action:
        'Validar disponibilidad de servicios locales/variables E2E y repetir `npm run test:e2e:ci`.',
    },
  ];

  const hit = rules.find((rule) => rule.test.test(log));
  if (hit) return `Categoria probable: ${hit.title}\nAccion sugerida: ${hit.action}`;
  return 'Categoria probable: no clasificada\nAccion sugerida: revisar primeras lineas de error del log.';
}

function ollamaAvailable() {
  try {
    execFileSync('ollama', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function triageWithOllama(log) {
  const prompt = [
    'Actua como Tech Lead de QA.',
    'Analiza el siguiente log de pre-push local y devuelve:',
    '1) Causa raiz mas probable.',
    '2) Clasificacion (lint|unit|e2e|infra|config).',
    '3) Pasos concretos de remediacion (maximo 5).',
    '4) Comando exacto para validar el fix.',
    '',
    'LOG:',
    log.slice(-12000),
  ].join('\n');

  return execFileSync('ollama', ['run', model, prompt], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 8,
  }).trim();
}

if (!existsSync(logPath)) {
  const body = `No existe log para triage: ${logPath}\n`;
  writeFileSync(outPath, body, 'utf8');
  process.stdout.write(body);
  process.exit(0);
}

const log = readFileSync(logPath, 'utf8');
const heuristicResult = heuristic(log);
let llmResult = 'Ollama no disponible o sin respuesta.';

if (ollamaAvailable()) {
  try {
    llmResult = triageWithOllama(log);
  } catch (error) {
    llmResult = `Fallo triage con Ollama (${model}): ${String(error)}`;
  }
}

const output = [
  '## Local Failure Triage',
  '',
  `- Modelo local: \`${model}\``,
  `- Log analizado: \`${logPath}\``,
  '',
  '### Heuristica',
  '',
  heuristicResult,
  '',
  '### Analisis Ollama',
  '',
  llmResult,
  '',
].join('\n');

writeFileSync(outPath, output, 'utf8');
process.stdout.write(`${output}\n`);
