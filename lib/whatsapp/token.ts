// Token de runtime para enviar mensajes y marcar como leido contra la Cloud API.
//
// Modelo Tech Provider: via Embedded Signup el WABA de cada cliente queda compartido
// con nuestro negocio, asi que usamos UN solo System User token permanente
// (META_SYSTEM_USER_TOKEN) para operar los numeros de todos los tenants. No guardamos
// el token del cliente en la DB.
//
// El fallback al access_token guardado cubre tenants legacy que hayan quedado con un
// token persistido de antes de adoptar el token central.
export function getMessagingToken(account?: { access_token?: string | null }): string {
  return process.env.META_SYSTEM_USER_TOKEN ?? account?.access_token ?? ''
}
