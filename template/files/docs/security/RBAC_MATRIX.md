# RBAC Matrix (Template)

| Route / Action | ADMIN | TECH_LEAD | USER |
|---|---|---|---|
| `/api/projects` create/update | Allow | Deny | Deny |
| `/api/projects/my` read own | Allow | Allow | Allow |
| `/api/daily` create own | Allow | Allow | Allow |
| `/api/daily` with `asUser` | Allow | Deny | Deny |
| `/api/ai-summary` execute | Allow | Allow | Deny |

> Ajustar esta matriz por dominio y mantenerla sincronizada con middleware y servicios.
