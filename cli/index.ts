#!/usr/bin/env tsx
import { program } from 'commander';
import chalk from 'chalk';
import { readConfig } from './utils/config.js';
import { registerLogin } from './commands/login.js';
import { registerReport } from './commands/report.js';
import { registerStatus } from './commands/status.js';
import { registerUseProject } from './commands/use-project.js';

const pkg = { name: 'asyncreport', version: '0.1.0' };

program
  .name(pkg.name)
  .description(
    chalk.bold('AsyncReport CLI') +
      chalk.dim(' — carga reportes diarios desde la terminal'),
  )
  .version(pkg.version, '-v, --version')
  .addHelpText(
    'after',
    `
${chalk.bold('Uso con npm')} (el separador ${chalk.cyan('--')} es obligatorio):
  ${chalk.dim('npm run cli --')} report
  ${chalk.dim('npm run cli --')} report ASYNC-WEB
  ${chalk.dim('npm run cli --')} report --project ASYNC-INFRA --yesterday "..." --today "..." --mood 4
  ${chalk.dim('npm run cli --')} use-project ASYNC-WEB
  ${chalk.dim('npm run cli --')} projects
`,
  );

// Muestra un aviso si no hay configuración en comandos que la requieren
program.hook('preAction', (thisCommand) => {
  const name = thisCommand.name();
  if (['report', 'status', 'projects', 'use-project'].includes(name)) {
    const { apiKey } = readConfig();
    if (!apiKey) {
      console.log(
        chalk.yellow('⚠  Sin configurar. Ejecuta primero:') +
          chalk.bold(' npx asyncreport login\n'),
      );
    }
  }
});

registerLogin(program);
registerReport(program);
registerStatus(program);
registerUseProject(program);

program.parse(process.argv);
