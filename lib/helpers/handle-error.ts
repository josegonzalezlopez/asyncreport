import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

export function handleApiError(error: unknown, context?: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation error', code: 400, details: error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with this value already exists', code: 409 },
        { status: 409 },
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found', code: 404 },
        { status: 404 },
      );
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('not a member') ||
      msg.includes('forbidden') ||
      msg.includes('not authorized')
    ) {
      return NextResponse.json({ error: error.message, code: 403 }, { status: 403 });
    }
  }

  logger.error('Unhandled API error', {
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    { error: 'Internal server error', code: 500 },
    { status: 500 },
  );
}
