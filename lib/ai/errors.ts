// Errores cuyo message es seguro mostrar al usuario final.
// Cualquier otro error (SDK de OpenAI, red, etc.) puede filtrar detalles
// internos — las rutas deben responder con un mensaje genérico.
export class ImportUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportUserError'
  }
}
