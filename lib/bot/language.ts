// Idioma del ultimo mensaje del cliente, para decirselo al bot de forma
// explicita. La regla "responde en el idioma del cliente" ya esta en el prompt,
// pero el modelo se deja llevar por el saludo: visto en prod, a "Hola, Ecoterra
// Team! I have a family looking to do a horseback riding tour..." respondio
// "Hi! Qué lindo plan familiar..." mezclando ingles y español.
//
// Se cuentan palabras comunes de cada idioma, sin los saludos. Si el mensaje es
// corto o no hay un ganador claro devuelve null y el bot sigue la regla general
// (el idioma que se venia usando).

export type Lang = 'es' | 'en' | 'pt' | 'fr' | 'de'

const WORDS: Record<Lang, string[]> = {
  es: ['el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'para', 'por', 'con', 'es', 'son', 'somos', 'estamos', 'tienen', 'quiero', 'queremos', 'cuanto', 'cuánto', 'precio', 'gracias', 'tour', 'personas', 'mi', 'nos', 'se', 'si', 'sí', 'pero', 'como', 'cómo', 'hay', 'este', 'esta', 'está', 'puedo', 'necesito'],
  en: ['the', 'and', 'is', 'are', 'we', 'you', 'to', 'of', 'for', 'with', 'in', 'on', 'at', 'an', 'it', 'be', 'would', 'could', 'can', 'do', 'does', 'have', 'has', 'our', 'my', 'your', 'how', 'what', 'much', 'price', 'thanks', 'thank', 'people', 'looking', 'need', 'will', 'there', 'this', 'that', 'if', 'possible', 'please'],
  pt: ['o', 'os', 'as', 'do', 'da', 'dos', 'das', 'não', 'nao', 'você', 'voce', 'vocês', 'obrigado', 'obrigada', 'quanto', 'custa', 'pessoas', 'gostaria', 'para', 'com', 'em', 'um', 'uma', 'é', 'são', 'tem', 'passeio'],
  fr: ['le', 'les', 'des', 'du', 'et', 'est', 'sont', 'nous', 'vous', 'je', 'pour', 'avec', 'dans', 'une', 'pas', 'merci', 'combien', 'personnes', 'voudrais', 'aimerions', 'il', 'elle', 'ce', 'cette'],
  de: ['der', 'die', 'das', 'und', 'ist', 'sind', 'wir', 'sie', 'ich', 'für', 'mit', 'ein', 'eine', 'nicht', 'danke', 'wie', 'viel', 'kostet', 'personen', 'möchten', 'gibt', 'es', 'auf', 'zu'],
}

// Saludos y cortesias que la gente pone en otro idioma por cortesia ("Hola" de
// un turista que escribe en ingles). No cuentan.
const IGNORE = new Set(['hola', 'hello', 'hi', 'hey', 'buenas', 'buenos', 'dias', 'días', 'tardes', 'noches', 'pura', 'vida', 'ola', 'olá', 'bonjour', 'hallo', 'team', 'equipo'])

const NAMES: Record<Lang, string> = { es: 'español', en: 'ingles', pt: 'portugues', fr: 'frances', de: 'aleman' }

export function detectLanguage(text: string): Lang | null {
  // Las notas entre corchetes ("[Imagen: ...]", transcripciones) las genera el
  // sistema en español: no dicen nada del idioma del cliente.
  const words = text
    .replace(/\[[^\]]*\]/g, ' ')
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w && !IGNORE.has(w))
  if (words.length < 4) return null

  const scores = (Object.keys(WORDS) as Lang[])
    .map((lang) => {
      const set = new Set(WORDS[lang])
      return { lang, hits: words.filter((w) => set.has(w)).length }
    })
    .sort((a, b) => b.hits - a.hits)

  const [top, second] = scores
  // Un ganador claro: al menos 2 palabras y el doble que el segundo.
  if (top.hits < 2 || top.hits < second.hits * 2) return null
  return top.lang
}

// Linea final del system prompt: el idioma concreto cuando se detecta, la regla
// general si no.
export function languageReminder(text: string): string {
  const lang = detectLanguage(text)
  if (!lang) return 'Recordatorio: responde todo el mensaje en el idioma del ultimo mensaje del cliente, sin mezclar idiomas.'
  const name = NAMES[lang]
  return (
    `IDIOMA DE ESTA RESPUESTA: el cliente escribe en ${name}. Responde todo el mensaje en ${name}, ` +
    `de la primera a la ultima palabra, incluido el saludo, aunque el cliente haya usado alguna palabra en otro idioma (como "Hola"). ` +
    `Si antes de usar transfer_to_human le dices algo, tambien va en ${name}.`
  )
}
