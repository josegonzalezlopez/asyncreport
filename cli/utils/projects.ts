import chalk from 'chalk';

export interface CliProject {
  id: string;
  name: string;
  code: string | null;
}

/** Cliente mínimo para evitar dependencia circular con http.ts */
export interface HttpClient {
  get: <T>(path: string) => Promise<T>;
}

export function shortId(id: string, visible = 10): string {
  if (id.length <= visible) return id;
  return `${id.slice(0, visible)}…`;
}

/** Orden estable: por código, luego nombre. */
export function sortProjects(a: CliProject, b: CliProject): number {
  const ca = (a.code ?? '\uffff').toLowerCase();
  const cb = (b.code ?? '\uffff').toLowerCase();
  if (ca !== cb) return ca.localeCompare(cb);
  return a.name.localeCompare(b.name, 'es');
}

export async function fetchMyProjects(client: HttpClient): Promise<CliProject[]> {
  const list = await client.get<CliProject[]>('/api/projects/my');
  return [...list].sort(sortProjects);
}

/** Etiqueta para listas inquirer: código destacado + nombre + id corto. */
export function formatChoiceLabel(p: CliProject): string {
  const code = p.code ? chalk.cyan(p.code) : chalk.dim('sin-código');
  const name = p.name.length > 42 ? `${p.name.slice(0, 42)}…` : p.name;
  return `${code}  ${name}  ${chalk.dim(shortId(p.id))}`;
}

export function formatProjectConfirm(p: CliProject): string {
  const code = p.code ? `[${p.code}] ` : '';
  return `${code}${p.name} — id: ${p.id}`;
}

/**
 * Resuelve referencia por id exacto o por código (case-insensitive).
 */
export function resolveProjectRef(
  projects: CliProject[],
  raw: string,
): CliProject | null {
  const t = raw.trim();
  if (!t) return null;

  const byId = projects.find((p) => p.id === t);
  if (byId) return byId;

  const up = t.toUpperCase();
  const matches = projects.filter((p) => (p.code ?? '').toUpperCase() === up);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return null; // ambiguo

  return null;
}

export function printProjectList(projects: CliProject[]): void {
  console.log(chalk.bold('\nTus proyectos (usa código o id completo):\n'));
  projects.forEach((p) => {
    const code = p.code ? chalk.cyan(`[${p.code}]`) : chalk.dim('[—]');
    console.log(`  ${code}  ${p.name}`);
    console.log(chalk.dim(`      id: ${p.id}\n`));
  });
}
