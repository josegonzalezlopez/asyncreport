import { NextResponse } from 'next/server';

export function successResponse<T>(data: T, status = 200, message?: string) {
  return NextResponse.json(
    { data, ...(message && { message }) },
    { status },
  );
}

export function errorResponse(
  message: string,
  status = 500,
  details?: unknown,
) {
  return NextResponse.json(
    { error: message, code: status, ...(details !== undefined && { details }) },
    { status },
  );
}
