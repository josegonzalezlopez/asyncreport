import process from "node:process";
import { Client } from "pg";

const databaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing SUPABASE_DATABASE_URL environment variable.");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

const rlsQuery = `
  select n.nspname as schema_name, c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r'
    and n.nspname = 'public'
    and c.relrowsecurity = false
  order by c.relname;
`;

const grantsQuery = `
  select
    n.nspname as schema_name,
    c.relname as table_name,
    has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'SELECT,INSERT,UPDATE,DELETE') as anon_has_dml,
    has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'SELECT,INSERT,UPDATE,DELETE') as authenticated_has_dml
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r'
    and n.nspname = 'public'
  order by c.relname;
`;

try {
  await client.connect();

  const [rlsResult, grantsResult] = await Promise.all([
    client.query(rlsQuery),
    client.query(grantsQuery),
  ]);

  const tablesWithoutRls = rlsResult.rows.map(
    (row) => `${row.schema_name}.${row.table_name}`,
  );

  const dangerousGrantTables = grantsResult.rows
    .filter((row) => row.anon_has_dml || row.authenticated_has_dml)
    .map(
      (row) =>
        `${row.schema_name}.${row.table_name} (anon=${row.anon_has_dml}, authenticated=${row.authenticated_has_dml})`,
    );

  if (tablesWithoutRls.length > 0) {
    console.error("RLS is disabled in exposed schema tables:");
    for (const table of tablesWithoutRls) {
      console.error(` - ${table}`);
    }
  }

  if (dangerousGrantTables.length > 0) {
    console.error("Dangerous DML grants found for anon/authenticated:");
    for (const table of dangerousGrantTables) {
      console.error(` - ${table}`);
    }
  }

  if (tablesWithoutRls.length > 0 || dangerousGrantTables.length > 0) {
    process.exit(1);
  }

  console.log("Supabase security checks passed (RLS + grants).");
} catch (error) {
  console.error("Failed to run Supabase security checks.");
  console.error(error);
  process.exit(1);
} finally {
  await client.end();
}
