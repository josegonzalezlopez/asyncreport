import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/helpers/auth';
import { apiKeyService } from '@/lib/services/apikey.service';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(64),
  expiresAt: z.string().datetime().optional(),
});

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await apiKeyService.listByUser(ctx.dbUserId);
  return NextResponse.json({ data: keys });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, expiresAt } = parsed.data;
  const created = await apiKeyService.create(
    ctx.dbUserId,
    name,
    expiresAt ? new Date(expiresAt) : undefined,
  );

  return NextResponse.json(
    {
      data: {
        token: created.token,
        apiKey: {
          id: created.apiKey.id,
          name: created.apiKey.name,
          createdAt: created.apiKey.createdAt,
          expiresAt: created.apiKey.expiresAt,
        },
      },
      message: 'Guarda este token — no se mostrará de nuevo.',
    },
    { status: 201 },
  );
}
