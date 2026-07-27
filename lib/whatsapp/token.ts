import 'server-only'

// Token de runtime para enviar mensajes y marcar como leido contra la Cloud API.
//
// Modelo Tech Provider: via Embedded Signup el WABA de cada cliente queda compartido
// con nuestro negocio, asi que usamos UN solo System User token permanente
// (META_SYSTEM_USER_TOKEN) para operar los numeros de todos los tenants.
//
// El token NO se guarda en la DB. Antes existia un fallback a
// whatsapp_accounts.access_token para tenants legacy, pero esa columna quedaba
// legible por cualquier miembro de la org (incluido el rol agent) via PostgREST.
// Se purgo en CODE-151 / M8.
export function getMessagingToken(): string {
  return process.env.META_SYSTEM_USER_TOKEN ?? ''
}
