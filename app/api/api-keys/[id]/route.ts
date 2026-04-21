import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/helpers/auth';
import { apiKeyService } from '@/lib/services/apikey.service';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await apiKeyService.revoke(id, ctx.dbUserId);
    return NextResponse.json({ data: null, message: 'API Key revocada.' });
  } catch {
    return NextResponse.json(
      { error: 'API Key no encontrada o sin permisos.' },
      { status: 404 },
    );
  }
}
