import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getRequiredConfig, readConfig, writeConfig } from '../utils/config.js';
import { createHttpClient } from '../utils/http.js';
import {
  fetchMyProjects,
  formatChoiceLabel,
  formatProjectConfirm,
  printProjectList,
  resolveProjectRef,
} from '../utils/projects.js';

export function registerUseProject(program: Command) {
  program
    .command('use-project')
    .description('Define el proyecto por defecto para report/status (se guarda en ~/.asyncreport/config.json)')
    .argument('[codeOrId]', 'ID o código del proyecto (ej. ASYNC-WEB). Sin argumento: selector interactivo.')
    .option('-c, --clear', 'Quitar proyecto por defecto')
    .action(async (codeOrId: string | undefined, opts: { clear?: boolean }) => {
      if (opts.clear) {
        // Sobrescribe con undefined para que JSON omita la clave al guardar
        writeConfig({ defaultProjectId: undefined });
        console.log(chalk.yellow('✔ Proyecto por defecto eliminado.'));
        return;
      }

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

      let chosenId: string;

      if (codeOrId?.trim()) {
        const resolved = resolveProjectRef(projects, codeOrId);
        if (!resolved) {
          console.error(chalk.red(`✖ No encontré "${codeOrId.trim()}" entre tus proyectos.`));
          printProjectList(projects);
          process.exit(1);
        }
        chosenId = resolved.id;
        console.log(chalk.dim(`Seleccionado: ${formatProjectConfirm(resolved)}`));
      } else {
        const { selected } = (await (inquirer.prompt as unknown as (q: unknown) => Promise<{ selected: string }>)([
          {
            type: 'list',
            name: 'selected',
            message: 'Proyecto por defecto:',
            pageSize: 12,
            choices: projects.map((p) => ({
              name: formatChoiceLabel(p),
              value: p.id,
              short: p.code ?? p.name,
            })),
          },
        ])) as { selected: string };
        chosenId = selected;
        const p = projects.find((x) => x.id === chosenId);
        if (p) console.log(chalk.dim(`Guardando: ${formatProjectConfirm(p)}`));
      }

      writeConfig({ ...readConfig(), defaultProjectId: chosenId });
      console.log(chalk.green('✔ Proyecto por defecto guardado.'));
      console.log(
        chalk.dim('  Tip: `npm run cli -- report` usará este proyecto sin preguntar.'),
      );
    });
}
