import { NextResponse } from 'next/server';
import { getHealth } from '@/lib/services/health.service';

export function GET() {
  return NextResponse.json(getHealth());
}

