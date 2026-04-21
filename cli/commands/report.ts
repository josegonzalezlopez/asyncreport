import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getRequiredConfig } from '../utils/config.js';
import { createHttpClient, ApiError } from '../utils/http.js';
import {
  fetchMyProjects,
  formatChoiceLabel,
  formatProjectConfirm,
  printProjectList,
  resolveProjectRef,
} from '../utils/projects.js';

interface DailyReport {
  id: string;
  reportDate: string;
  mood: number;
  isBlocker: boolean;
}

const MOOD_OPTIONS = [
  { name: '😰  1 — Muy mal día', value: 1 },
  { name: '😔  2 — Mal día', value: 2 },
  { name: '😐  3 — Día normal', value: 3 },
  { name: '😊  4 — Buen día', value: 4 },
  { name: '🚀  5 — Excelente día', value: 5 },
];

export function registerReport(program: Command) {
  program
    .command('report')
    .description('Carga el reporte diario de forma interactiva')
    .argument(
      '[projectRef]',
      'ID completo o código (ej. ASYNC-WEB). Equivale a --project. Con npm: npm run cli -- report ASYNC-WEB',
    )
    .option('-p, --project <ref>', 'ID o código del proyecto (tiene prioridad sobre el argumento posicional)')
    .option('--as-user <email>', 'ADMIN: cargar reporte en nombre de este email')
    .option('--yesterday <text>', 'Lo que hice ayer')
    .option('--today <text>', 'Lo que haré hoy')
    .option('--blockers <text>', 'Bloqueos actuales')
    .option('--mood <n>', 'Estado de ánimo (1–5)', parseInt)
    .action(
      async (
        projectRef: string | undefined,
        opts: {
          project?: string;
          asUser?: string;
          yesterday?: string;
          today?: string;
          blockers?: string;
          mood?: number;
        },
      ) => {
        const config = getRequiredConfig();
        const client = createHttpClient(config);

        let projects;
        try {
          projects = await fetchMyProjects(client);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(chalk.red(`✖ Error al obtener proyectos: ${msg}`));
          process.exit(1);
        }

        if (!projects.length) {
          console.error(chalk.yellow('No estás asignado a ningún proyecto.'));
          process.exit(1);
        }

        const rawRef = (opts.project ?? projectRef ?? config.defaultProjectId)?.trim();
        let projectId: string;

        if (rawRef) {
          const resolved = resolveProjectRef(projects, rawRef);
          if (!resolved) {
            console.error(
              chalk.red(`✖ No perteneces al proyecto "${rawRef}" o el código/id no coincide.`),
            );
            console.error(
              chalk.dim(
                '  Tip: ejecuta `npm run cli -- projects` o `npm run cli -- use-project`.\n' +
                  '  Con npm hace falta `--` antes de los argumentos: npm run cli -- report --project ASYNC-WEB',
              ),
            );
            printProjectList(projects);
            process.exit(1);
          }
          projectId = resolved.id;
          console.log(chalk.dim(`Proyecto: ${formatProjectConfirm(resolved)}`));
        } else {
          const { selected } = await inquirer.prompt<{ selected: string }>([
            {
              type: 'list',
              name: 'selected',
              message: 'Selecciona el proyecto (flechas ↑↓, Enter):',
              pageSize: 12,
              choices: projects.map((p) => ({
                name: formatChoiceLabel(p),
                value: p.id,
                short: p.code ?? p.name,
              })),
            },
          ]);
          projectId = selected;
          const picked = projects.find((p) => p.id === projectId);
          if (picked) console.log(chalk.dim(`Proyecto: ${formatProjectConfirm(picked)}`));
        }

        const MIN_CHARS = 10;
        const validateField = (label: string) => (v: string) => {
          const trimmed = v.trim();
          if (trimmed.length < MIN_CHARS)
            return `${label}: mínimo ${MIN_CHARS} caracteres (ahora: ${trimmed.length})`;
          if (trimmed.length > 1000) return `${label}: máximo 1000 caracteres`;
          return true;
        };

        const answers = await inquirer.prompt<{
          yesterday: string;
          today: string;
          isBlocker: boolean;
          blockers?: string;
          mood: number;
        }>([
          {
            type: 'input',
            name: 'yesterday',
            message: '¿Qué hiciste ayer?',
            when: !opts.yesterday,
            validate: validateField('Ayer'),
          },
          {
            type: 'input',
            name: 'today',
            message: '¿Qué harás hoy?',
            when: !opts.today,
            validate: validateField('Hoy'),
          },
          {
            type: 'confirm',
            name: 'isBlocker',
            message: '¿Tienes un bloqueante?',
            default: false,
            when: !opts.blockers,
          },
          {
            type: 'input',
            name: 'blockers',
            message: 'Describe el bloqueante:',
            when: (a: { isBlocker?: boolean }) => a.isBlocker === true && !opts.blockers,
            validate: (v: string) => (v.trim().length >= 3 ? true : 'Mínimo 3 caracteres'),
          },
          {
            type: 'list',
            name: 'mood',
            message: '¿Cómo fue tu día?',
            choices: MOOD_OPTIONS,
            default: 3,
            when: !opts.mood,
          },
        ]);

        const payload = {
          projectId,
          reportDate: new Date().toISOString(),
          yesterday: (opts.yesterday ?? answers.yesterday).trim(),
          today: (opts.today ?? answers.today).trim(),
          blockers: opts.blockers ?? answers.blockers ?? '',
          isBlocker: !!(opts.blockers ?? answers.isBlocker),
          mood: Number(opts.mood ?? answers.mood),
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          fromCli: true,
          ...(opts.asUser ? { asUserEmail: opts.asUser.trim().toLowerCase() } : {}),
        };

        if (!Number.isInteger(payload.mood) || payload.mood < 1 || payload.mood > 5) {
          console.error(chalk.red('✖ Mood inválido. Debe ser un entero entre 1 y 5.'));
          process.exit(1);
        }

        const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        const interval = setInterval(() => {
          process.stdout.write(`\r${spinner[i++ % spinner.length]} Enviando reporte...`);
        }, 80);

        try {
          await client.post<DailyReport>('/api/daily', payload);
          clearInterval(interval);
          process.stdout.write('\r');
          console.log(chalk.green('✔ Reporte enviado correctamente'));
          console.log(chalk.dim(`  Proyecto: ${projectId}`));
          if (opts.asUser) {
            console.log(chalk.dim(`  Usuario destino: ${opts.asUser}`));
          }
          console.log(chalk.dim(`  Fecha: ${new Date().toLocaleDateString('es-ES')}`));
        } catch (err) {
          clearInterval(interval);
          process.stdout.write('\r');

          if (err instanceof ApiError && err.status === 409) {
            console.error(chalk.yellow('⚠  Ya enviaste un reporte hoy para este proyecto.'));
          } else if (err instanceof ApiError && err.status === 400) {
            console.error(chalk.red('✖ Datos inválidos:'), err.message);
            console.error(
              chalk.dim('  Asegúrate de que "ayer" y "hoy" tengan al menos 10 caracteres.'),
            );
          } else if (
            err instanceof ApiError &&
            (err.status === 403 || /no pertenece|FORBIDDEN/i.test(err.message))
          ) {
            console.error(chalk.red(`✖ ${err.message}`));
            console.error(
              chalk.dim(
                '  No eres miembro de ese proyecto. Revisa con `npm run cli -- projects`.\n' +
                  '  Tip: `npm run cli -- use-project` guarda un proyecto por defecto válido.',
              ),
            );
            printProjectList(projects);
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(chalk.red(`✖ Error: ${msg}`));
          }
          process.exit(1);
        }
      },
    );
}
