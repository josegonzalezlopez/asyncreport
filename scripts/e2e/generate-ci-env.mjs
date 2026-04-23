import { PrismaClient } from '@prisma/client';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const KEY_FILE = resolve(process.cwd(), 'prisma/seed-api-keys.generated.txt');
const SEED_EMAILS = {
  api: 'dev-a1@seed.asyncreport.test',
  admin: 'admin@seed.asyncreport.test',
  user: 'dev-b1@seed.asyncreport.test',
  techLead: 'tl-alpha@seed.asyncreport.test',
  asUser: 'dev-a2@seed.asyncreport.test',
};

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function parseKeyFile(content) {
  const map = new Map();
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [email, token] = line.split('\t');
    if (!email || !token) continue;
    map.set(email.trim(), token.trim());
  }
  return map;
}

async function resolveProjectIds(prisma) {
  const projects = await prisma.project.findMany({
    where: { code: { in: ['SEED-ALPHA', 'SEED-BETA'] } },
    select: { id: true, code: true },
  });

  const byCode = new Map(projects.map((p) => [p.code, p.id]));
  const dailyProjectId = byCode.get('SEED-ALPHA');
  const nonMemberProjectId = byCode.get('SEED-BETA');
  const aiProjectId = byCode.get('SEED-ALPHA');

  if (!dailyProjectId || !nonMemberProjectId || !aiProjectId) {
    fail(
      'No se encontraron proyectos seed esperados (SEED-ALPHA / SEED-BETA). Ejecuta npm run prisma:seed antes.',
    );
  }

  return { dailyProjectId, nonMemberProjectId, aiProjectId };
}

function publishEnv(values) {
  const githubEnv = process.env.GITHUB_ENV;
  if (githubEnv?.trim()) {
    for (const [name, value] of Object.entries(values)) {
      appendFileSync(githubEnv, `${name}=${value}\n`, 'utf8');
    }
    return;
  }

  for (const [name, value] of Object.entries(values)) {
    process.stdout.write(`${name}=${value}\n`);
  }
}

async function main() {
  let keyContent = '';
  try {
    const { readFileSync } = await import('node:fs');
    keyContent = readFileSync(KEY_FILE, 'utf8');
  } catch {
    fail(`No pude leer ${KEY_FILE}. Ejecuta npm run prisma:seed antes.`);
  }

  const keysByEmail = parseKeyFile(keyContent);
  const requiredKeys = {
    E2E_API_KEY: keysByEmail.get(SEED_EMAILS.api),
    E2E_ADMIN_API_KEY: keysByEmail.get(SEED_EMAILS.admin),
    E2E_USER_API_KEY: keysByEmail.get(SEED_EMAILS.user),
    E2E_TECHLEAD_API_KEY: keysByEmail.get(SEED_EMAILS.techLead),
  };

  const missing = Object.entries(requiredKeys)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    fail(`Faltan API keys seed: ${missing.join(', ')}.`);
  }

  const prisma = new PrismaClient();
  try {
    const { dailyProjectId, nonMemberProjectId, aiProjectId } =
      await resolveProjectIds(prisma);

    publishEnv({
      E2E_BASE_URL: 'http://127.0.0.1:3005',
      E2E_PORT: '3005',
      ASYNCREPORT_BASE_URL: 'http://127.0.0.1:3005',
      ...requiredKeys,
      E2E_DAILY_PROJECT_ID: dailyProjectId,
      E2E_NON_MEMBER_PROJECT_ID: nonMemberProjectId,
      E2E_AI_PROJECT_ID: aiProjectId,
      E2E_AS_USER_EMAIL: SEED_EMAILS.asUser,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
