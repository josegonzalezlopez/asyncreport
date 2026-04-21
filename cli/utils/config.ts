import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.asyncreport');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  apiKey: string;
  baseUrl: string;
  defaultProjectId?: string;
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function readConfig(): Partial<CliConfig> {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as Partial<CliConfig>;
  } catch {
    return {};
  }
}

export function writeConfig(config: Partial<CliConfig>) {
  ensureConfigDir();
  const current = readConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function getRequiredConfig(): CliConfig {
  const config = readConfig();
  // Prioridad para CI/e2e: variables de entorno sobre config local
  const envApiKey = process.env.ASYNCREPORT_API_KEY?.trim();
  const envBaseUrl = process.env.ASYNCREPORT_BASE_URL?.trim();
  const resolved = {
    ...config,
    ...(envApiKey ? { apiKey: envApiKey } : {}),
    ...(envBaseUrl ? { baseUrl: envBaseUrl } : {}),
  } as Partial<CliConfig>;

  if (!resolved.apiKey) {
    console.error(
      '\x1b[31mError:\x1b[0m No hay API Key configurada. Ejecuta:\n  npx asyncreport login',
    );
    process.exit(1);
  }
  if (!resolved.baseUrl) {
    console.error(
      '\x1b[31mError:\x1b[0m No hay URL configurada. Ejecuta:\n  npx asyncreport login',
    );
    process.exit(1);
  }

  return resolved as CliConfig;
}

export function clearConfig() {
  try {
    fs.unlinkSync(CONFIG_FILE);
  } catch {
    // ignorar si no existe
  }
}
