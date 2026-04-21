import { Command } from 'commander';
import chalk from 'chalk';
import { getRequiredConfig } from '../utils/config.js';
import { createHttpClient } from '../utils/http.js';

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface DailyReport {
  id: string;
  reportDate: string;
  mood: number;
  isBlocker: boolean;
  fromCli: boolean;
  project: { name: string; code: string | null };
}

const MOOD_EMOJI = ['', '😰', '😔', '😐', '😊', '🚀'];

export function registerStatus(program: Command) {
  program
    .command('status')
    .description('Consulta el estado del reporte de hoy')
    .option('-p, --project <id>', 'ID del proyecto a consultar')
    .action(async (opts: { project?: string }) => {
      const config = getRequiredConfig();
      const client = createHttpClient(config);

      try {
        const today = new Date().toISOString().split('T')[0];

        const reports = await client.get<DailyReport[]>(
          `/api/daily?date=${today}${opts.project ? `&projectId=${opts.project}` : ''}`,
        );

        if (!Array.isArray(reports) || reports.length === 0) {
          console.log(chalk.yellow(`⚠  Sin reporte para hoy (${today})`));
          console.log(chalk.dim('  Ejecuta: npx asyncreport report'));
          return;
        }

        reports.forEach((r) => {
          const mood = MOOD_EMOJI[r.mood] ?? r.mood;
          const blocker = r.isBlocker ? chalk.red(' ⚠ BLOCKER') : '';
          const source = r.fromCli ? chalk.dim(' (CLI)') : '';
          console.log(
            `${chalk.green('✔')} ${r.project.name}${r.project.code ? chalk.dim(` [${r.project.code}]`) : ''} — ${mood} mood${blocker}${source}`,
          );
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`✖ ${msg}`));
        process.exit(1);
      }
    });

  program
    .command('projects')
    .description('Lista los proyectos en los que participas')
    .action(async () => {
      const config = getRequiredConfig();
      const client = createHttpClient(config);

      try {
        const projects = await client.get<Project[]>('/api/projects/my');

        if (!Array.isArray(projects) || projects.length === 0) {
          console.log(chalk.yellow('No estás asignado a ningún proyecto.'));
          return;
        }

        console.log(chalk.bold('\nTus proyectos:\n'));
        projects.forEach((p) => {
          const code = p.code ? chalk.cyan(` [${p.code}]`) : '';
          console.log(`  ${chalk.bold(p.id)}${code}  ${p.name}`);
        });
        console.log('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`✖ ${msg}`));
        process.exit(1);
      }
    });
}
