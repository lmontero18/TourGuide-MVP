# Feature flags

Probamos en prod con las orgs del equipo en vez de un ambiente local. Lo nuevo
queda detrás de un flag hasta que lo soltamos para todas las agencias.

## Cómo funciona

- `lib/features.ts` registra cada feature como `'beta'` o `'live'`.
- `organizations.is_beta`: la org ve **todos** los features `'beta'` (orgs de prueba del equipo).
- `organizations.features`: lista de features puntuales para una agencia (acceso temprano).
- `hasFeature(flags, 'attachments')` → `true` si el feature es `'live'`, o la org es beta, o lo tiene en `features`.

Un admin no puede activarse nada: esas columnas no tienen grant de UPDATE para
`authenticated` (test en `supabase/tests/anon_and_privesc_test.sql`).

## Ciclo de un feature

1. Agregarlo en `FEATURES` como `'beta'` y envolver lo nuevo con `hasFeature`.
2. Merge → prod. Solo las orgs beta lo ven. Probar.
3. Pasarlo a `'live'` → lo ven todas. En ese mismo PR va su entrada en `lib/changelog.ts` (no antes: el panel de novedades lo ven todas las agencias).
4. Cuando ya no hay vuelta atrás, borrar la entrada y los `if`.

## Leer los flags

- Server Components / API routes del panel: `getOrgFeatureFlags(orgId)` (`lib/supabase/queries/organizations.ts`), pasar el resultado por props a los Client Components.
- Webhook / crons (service client): seleccionar `is_beta, features` junto con la org.
- Siempre chequear también en el endpoint, no solo esconder el botón.

## Marcar orgs (Supabase → SQL Editor, service role)

```sql
-- org de prueba: ve todo lo beta
update organizations set is_beta = true where id = '<org_id>';

-- acceso temprano a un feature puntual
update organizations set features = array_append(features, 'attachments') where id = '<org_id>';
```

## Lo que el flag NO protege

- **Migraciones**: corren para todos. Solo cambios compatibles con el código viejo (agregar columnas, no renombrar/borrar).
- **Bot / n8n**: un solo workflow de prod para todas las orgs.
- **Errores fuera del `if`**: un crash en código compartido afecta a todos (CI + Sentry).
