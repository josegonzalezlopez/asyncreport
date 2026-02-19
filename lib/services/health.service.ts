export function getHealth() {
  return {
    status: 'ok',
    now: new Date().toISOString(),
  } as const;
}

