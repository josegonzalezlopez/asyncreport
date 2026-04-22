# Supabase Schema Security Checklist

Usar esta checklist en cada PR que incluya cambios de base de datos.

## Checklist obligatoria
- [ ] Tabla nueva o modificada en `public` con `ENABLE ROW LEVEL SECURITY`.
- [ ] Grants de DML revocados para `anon` y `authenticated` si el acceso es backend-only.
- [ ] Si hay acceso directo desde cliente Supabase, existen politicas RLS explicitas y de minimo privilegio.
- [ ] `public._prisma_migrations` sigue sin acceso para `anon`/`authenticated`.
- [ ] `npm run security:supabase` pasa en local o CI.
- [ ] Security Advisor sin `rls_disabled_in_public`.

## Snippet base para hardening
```sql
ALTER TABLE public."MyTable" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."MyTable" FROM anon, authenticated;
```

## Notas operativas
- Si aparece `rls_enabled_no_policy` como `INFO` en un modelo backend-only, documentar la decision en el PR.
- Si una tabla requiere acceso por cliente, agregar politicas RLS versionadas en migracion y tests de autorizacion.
