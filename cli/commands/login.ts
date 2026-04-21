import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { writeConfig, readConfig, clearConfig } from '../utils/config.js';
import { createHttpClient } from '../utils/http.js';

interface MeResponse {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export function registerLogin(program: Command) {
  program
    .command('login')
    .description('Configura la API Key y la URL del servidor AsyncReport')
    .option('--logout', 'Elimina la configuración local guardada')
    .action(async (opts: { logout?: boolean }) => {
      if (opts.logout) {
        clearConfig();
        console.log(chalk.yellow('Sesión cerrada. Configuración eliminada.'));
        return;
      }

      const current = readConfig();

      const answers = await inquirer.prompt<{ baseUrl: string; apiKey: string }>([
        {
          type: 'input',
          name: 'baseUrl',
          message: 'URL del servidor AsyncReport:',
          default: current.baseUrl ?? 'http://localhost:3000',
          validate: (v: string) => (v.startsWith('http') ? true : 'Debe ser una URL válida'),
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'Pega tu API Key (se generó en /dashboard/profile):',
          mask: '*',
          validate: (v: string) => (v.trim().length > 0 ? true : 'La API Key no puede estar vacía'),
        },
      ]);

      const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let i = 0;
      const interval = setInterval(() => {
        process.stdout.write(`\r${spinner[i++ % spinner.length]} Verificando credenciales...`);
      }, 80);

      try {
        const client = createHttpClient({
          baseUrl: answers.baseUrl,
          apiKey: answers.apiKey.trim(),
        });

        const me = await client.get<MeResponse>('/api/users/me');

        clearInterval(interval);
        process.stdout.write('\r');

        writeConfig({ baseUrl: answers.baseUrl, apiKey: answers.apiKey.trim() });

        console.log(chalk.green('✔ Autenticado correctamente'));
        console.log(
          `  ${chalk.bold(me.name ?? me.email)} · ${chalk.cyan(me.role)}`,
        );
        console.log(chalk.dim(`  Configuración guardada en ~/.asyncreport/config.json`));
      } catch (err) {
        clearInterval(interval);
        process.stdout.write('\r');

        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`✖ Error: ${msg}`));
        console.error(chalk.dim('Verifica la URL y la API Key e inténtalo de nuevo.'));
        process.exit(1);
      }
    });
}
