#!/usr/bin/env tsx
import { program } from 'commander';
import chalk from 'chalk';
import { readConfig } from './utils/config.js';
import { registerLogin } from './commands/login.js';
import { registerReport } from './commands/report.js';
import { registerStatus } from './commands/status.js';

const pkg = { name: 'asyncreport', version: '0.1.0' };

program
  .name(pkg.name)
  .description(
    chalk.bold('AsyncReport CLI') +
      chalk.dim(' — carga reportes diarios desde la terminal'),
  )
  .version(pkg.version, '-v, --version');

// Muestra un aviso si no hay configuración en comandos que la requieren
program.hook('preAction', (thisCommand) => {
  const name = thisCommand.name();
  if (['report', 'status', 'projects'].includes(name)) {
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

program.parse(process.argv);
