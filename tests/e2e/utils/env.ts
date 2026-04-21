export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function hasEnv(name: string): boolean {
  return Boolean(process.env[name]);
}
