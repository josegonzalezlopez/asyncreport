import { Resend } from 'resend';
import { logger } from '@/lib/helpers/logger';

function getResendClient(): Resend {
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey || apiKey === 're_placeholder') {
    throw new Error('RESEND_API_KEY no configurada');
  }
  return new Resend(apiKey);
}

const FROM = process.env['RESEND_FROM_EMAIL'] ?? 'onboarding@resend.dev';
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

/**
 * En desarrollo, redirige todos los emails al RESEND_DEV_OVERRIDE_TO
 * para no enviar a usuarios reales mientras se prueba.
 */
function resolveRecipient(email: string): string {
  const override = process.env['RESEND_DEV_OVERRIDE_TO'];
  return override && override !== 'tu-email@gmail.com' ? override : email;
}

/**
 * Envía email de bienvenida cuando un usuario es asignado a un proyecto.
 * Fallo silencioso: no lanza error para no bloquear la operación principal.
 */
export async function sendProjectAssignmentEmail(
  userEmail: string,
  userName: string,
  projectName: string,
  isTechLead: boolean,
): Promise<void> {
  try {
    const resend = getResendClient();
    const role = isTechLead ? 'Tech Lead' : 'miembro';

    await resend.emails.send({
      from: FROM,
      to: resolveRecipient(userEmail),
      subject: `📌 Fuiste asignado al proyecto "${projectName}"`,
      html: buildAssignmentEmail({ userName, projectName, role }),
    });

    logger.info('Assignment email sent', { userEmail, projectName });
  } catch (error) {
    logger.error('Failed to send assignment email', {
      userEmail,
      projectName,
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
    // No relanzar — el fallo de email no debe bloquear la operación
  }
}

/**
 * Envía alerta urgente al Tech Lead cuando se reporta un bloqueador.
 * Fallo silencioso: no lanza error para no bloquear la creación del daily.
 */
export async function sendBlockerAlertEmail(
  techLeadEmail: string,
  techLeadName: string,
  projectName: string,
  reporterName: string,
  blockerContent: string,
): Promise<void> {
  try {
    const resend = getResendClient();

    await resend.emails.send({
      from: FROM,
      to: resolveRecipient(techLeadEmail),
      subject: `⚠️ Bloqueador crítico en "${projectName}"`,
      html: buildBlockerEmail({
        techLeadName,
        projectName,
        reporterName,
        blockerContent,
      }),
    });

    logger.info('Blocker alert email sent', { techLeadEmail, projectName });
  } catch (error) {
    logger.error('Failed to send blocker alert email', {
      techLeadEmail,
      projectName,
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AsyncReport</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:20px 32px;border-bottom:1px solid #27272a;">
            <span style="font-size:20px;font-weight:700;color:#f4f4f5;">⚡ AsyncReport</span>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #27272a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#71717a;">
              AsyncReport · <a href="${APP_URL}/dashboard" style="color:#6366f1;text-decoration:none;">Ir al dashboard</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAssignmentEmail(p: {
  userName: string;
  projectName: string;
  role: string;
}): string {
  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#f4f4f5;">
      Hola, ${p.userName} 👋
    </h2>
    <p style="margin:0 0 12px;color:#a1a1aa;line-height:1.6;">
      Fuiste asignado al proyecto <strong style="color:#f4f4f5;">${p.projectName}</strong>
      como <strong style="color:#6366f1;">${p.role}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#a1a1aa;line-height:1.6;">
      Ya podés acceder al proyecto y comenzar a cargar tus reportes diarios.
    </p>
    <a href="${APP_URL}/dashboard/projects"
       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
      Ver proyecto →
    </a>
  `);
}

function buildBlockerEmail(p: {
  techLeadName: string;
  projectName: string;
  reporterName: string;
  blockerContent: string;
}): string {
  return baseLayout(`
    <div style="background:#7f1d1d;border:1px solid #991b1b;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#fca5a5;text-transform:uppercase;letter-spacing:.05em;">
        ⚠️ Bloqueador Crítico
      </p>
    </div>
    <h2 style="margin:0 0 16px;font-size:20px;color:#f4f4f5;">
      Hola, ${p.techLeadName}
    </h2>
    <p style="margin:0 0 8px;color:#a1a1aa;line-height:1.6;">
      <strong style="color:#f4f4f5;">${p.reporterName}</strong> reportó un bloqueador
      en el proyecto <strong style="color:#f4f4f5;">${p.projectName}</strong>:
    </p>
    <div style="background:#18181b;border-left:3px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
      <p style="margin:0;color:#d4d4d8;font-style:italic;line-height:1.6;">"${p.blockerContent}"</p>
    </div>
    <a href="${APP_URL}/dashboard/team"
       style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
      Ver feed del equipo →
    </a>
  `);
}
