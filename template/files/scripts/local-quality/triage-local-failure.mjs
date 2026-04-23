import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const logArg = process.argv[2];
const logPath = resolve(process.cwd(), logArg || 'reports/local-quality/prepush-latest.log');
const outPath = resolve(process.cwd(), 'reports/local-quality/prepush-triage.md');
const model = process.env.LOCAL_QA_OLLAMA_MODEL || 'qwen2.5-coder:7b';

function heuristic(log) {
  if (/eslint|ESLint|Parsing error/i.test(log)) {
    return 'Categoria: lint\nAccion: corregir errores de lint y reintentar.';
  }
  if (/Vitest|FAIL|AssertionError/i.test(log)) {
    return 'Categoria: unit\nAccion: revisar primer test fallido y fixtures.';
  }
  if (/playwright|E2E|Timeout|timed out/i.test(log)) {
    return 'Categoria: e2e\nAccion: validar entorno/variables y reintentar E2E.';
  }
  return 'Categoria: no clasificada\nAccion: revisar stacktrace inicial.';
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
    'Actua como QA lead.',
    'Devuelve causa raiz probable, clasificacion y plan de fix corto.',
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
let llm = 'Ollama no disponible.';
if (ollamaAvailable()) {
  try {
    llm = triageWithOllama(log);
  } catch (error) {
    llm = `Fallo con Ollama (${model}): ${String(error)}`;
  }
}

const output = [
  '## Local Failure Triage',
  '',
  `- Modelo local: \`${model}\``,
  '',
  '### Heuristica',
  heuristic(log),
  '',
  '### Analisis Ollama',
  llm,
  '',
].join('\n');

writeFileSync(outPath, output, 'utf8');
process.stdout.write(`${output}\n`);
