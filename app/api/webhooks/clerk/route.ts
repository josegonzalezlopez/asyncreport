import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { userService } from '@/lib/services/user.service';
import { logger } from '@/lib/helpers/logger';
import { errorResponse, successResponse } from '@/lib/helpers/api-response';

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

export async function POST(req: Request) {
  const webhookSecret = process.env['CLERK_WEBHOOK_SECRET'];
  if (!webhookSecret) {
    logger.error('CLERK_WEBHOOK_SECRET no configurado');
    return errorResponse('Server misconfiguration', 500);
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('Webhook recibido sin headers Svix');
    return errorResponse('Missing svix headers', 400);
  }

  const body = await req.text();

  const wh = new Webhook(webhookSecret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    logger.warn('Fallo en verificación de firma Svix');
    return errorResponse('Invalid webhook signature', 400);
  }

  const { type, data } = event;

  logger.info('Clerk webhook recibido', { type, userId: data.id });

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated':
        await userService.syncFromClerk(data);
        logger.info('Usuario sincronizado desde Clerk', { type, clerkId: data.id });
        break;

      case 'user.deleted':
        await userService.softDeleteByClerkId(data.id);
        logger.info('Usuario marcado como eliminado (soft-delete)', { clerkId: data.id });
        break;

      default:
        logger.info('Tipo de evento Clerk ignorado', { type });
    }
  } catch (err) {
    logger.error('Error procesando evento Clerk', { type, error: String(err) });
    return errorResponse('Internal error processing webhook', 500);
  }

  return successResponse({ received: true });
}
