import ExcelJS from 'exceljs'
import { fold, normalizeTime } from './grid'

// Lee el Excel de recogidas de una agencia (hotel × tour, como el
// PICK UP TOURS de Ecoterra) y lo convierte en un borrador para revisar:
//   - cada hoja: primera columna = hoteles, primera fila = tours
//   - cada celda: una hora por salida separadas por "/" ("7:45/14:45"), o una
//     hora de Excel (0.2847 = 6:50)
//   - la primera hoja son los tours propios; las demas, un operador cada una
// Los hoteles con exactamente las mismas horas en todo el archivo quedan en
// una zona. Nada se guarda aca: la agencia revisa y despues se guarda.
// Todo con codigo y no con IA, porque las horas tienen que salir exactas.

export type SlotKind = 'morning' | 'afternoon' | 'night'

export interface DraftColumn {
  key: string
  label: string                 // como dice el Excel: "PEREZOSOS"
  operator: string | null       // null = tour propio (primera hoja)
  slots: (SlotKind | null)[]    // una por salida, segun la hora tipica
}

export interface DraftHotel {
  name: string
  own: Record<string, (string | null)[]> // solo las horas que difieren de su zona
}

export interface DraftZone {
  key: string
  hotels: DraftHotel[]
  times: Record<string, (string | null)[]> // columna → hora por salida
}

export interface PickupDraft {
  columns: DraftColumn[]
  zones: DraftZone[]
  hotelCount: number
  sheetCount: number
}

const MAX_HOTELS = 2000

function titleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/ (De|Del|La|Las|Los|El|Y) /g, (word) => word.toLowerCase())
}

// "PICK UP WAVE RAFTING " → "Wave Rafting"
function operatorFromSheet(name: string) {
  const clean = name.replace(/^\s*pick\s*-?\s*ups?\s*/i, '').trim()
  return clean ? titleCase(clean) : titleCase(name)
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return excelTime(value) ?? String(value)
  if (value instanceof Date) {
    // Celdas con formato de hora: exceljs las da como fecha de 1899-12-30 (UTC).
    return `${value.getUTCHours()}:${String(value.getUTCMinutes()).padStart(2, '0')}`
  }
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((r) => r.text).join('')
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue)
    if ('text' in value) return String(value.text)
  }
  return String(value)
}

// Fraccion del dia de Excel → "H:MM" (0.2847 → 6:50).
function excelTime(n: number): string | null {
  if (!(n >= 0 && n < 1)) return null
  const minutes = Math.round(n * 1440)
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

// "7:45/14:45", "07:45 / 13:45", "9:00/:10:30" → ["7:45", "14:45"] …
function parseTimes(text: string): (string | null)[] {
  if (!text.trim()) return []
  return text.split('/').map((part) => normalizeTime(part.replace(/^\s*:/, '')))
}

function slotKind(times: string[]): SlotKind | null {
  if (!times.length) return null
  const minutes = times
    .map((t) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    })
    .sort((a, b) => a - b)
  const median = minutes[Math.floor(minutes.length / 2)]
  if (median < 12 * 60) return 'morning'
  if (median < 16 * 60 + 30) return 'afternoon'
  return 'night'
}

export async function parsePickupWorkbook(buffer: ArrayBuffer): Promise<PickupDraft> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const columns: DraftColumn[] = []
  // hotel (sin tilde ni mayusculas) → nombre lindo + horas por columna
  const hotels = new Map<string, { name: string; times: Map<string, (string | null)[]> }>()
  const sheets = workbook.worksheets.filter((sheet) => sheet.state === 'visible' || !sheet.state)

  sheets.forEach((sheet, sheetIndex) => {
    // Fila de encabezado: la primera con al menos dos celdas con texto.
    let headerRow = 0
    for (let r = 1; r <= Math.min(sheet.rowCount, 10); r++) {
      const values = (sheet.getRow(r).values as ExcelJS.CellValue[]).slice(1).map(cellText).filter((v) => v.trim())
      if (values.length >= 2) {
        headerRow = r
        break
      }
    }
    if (!headerRow) return

    const operator = sheetIndex === 0 ? null : operatorFromSheet(sheet.name)
    const header = sheet.getRow(headerRow)
    const sheetColumns: { col: number; column: DraftColumn }[] = []
    header.eachCell((cell, col) => {
      if (col === 1) return
      const label = cellText(cell.value).replace(/\s+/g, ' ').trim()
      if (!label) return
      const column: DraftColumn = { key: `${sheetIndex}:${col}`, label, operator, slots: [] }
      sheetColumns.push({ col, column })
    })

    const slotTimes = new Map<string, string[][]>()
    for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r)
      const name = cellText(row.getCell(1).value).replace(/\s+/g, ' ').trim()
      if (!name) continue
      const id = fold(name)
      if (!hotels.has(id)) {
        if (hotels.size >= MAX_HOTELS) break
        hotels.set(id, { name: titleCase(name), times: new Map() })
      }
      const hotel = hotels.get(id)!
      for (const { col, column } of sheetColumns) {
        const times = parseTimes(cellText(row.getCell(col).value))
        if (!times.some(Boolean)) continue
        hotel.times.set(column.key, times)
        const bySlot = slotTimes.get(column.key) ?? []
        times.forEach((t, i) => {
          if (!t) return
          bySlot[i] = [...(bySlot[i] ?? []), t]
        })
        slotTimes.set(column.key, bySlot)
      }
    }

    for (const { column } of sheetColumns) {
      const bySlot = slotTimes.get(column.key)
      // Una columna sin ninguna hora no es un tour con recogida.
      if (!bySlot?.length) continue
      column.slots = Array.from({ length: bySlot.length }, (_, i) => slotKind(bySlot[i] ?? []))
      columns.push(column)
    }
  })

  // Zonas: hoteles con exactamente las mismas horas en los tours propios (la
  // primera hoja). Las hojas de operadores no parten zonas: en cada zona va la
  // hora que tiene la mayoria y el hotel que difiere queda con horas propias.
  const keptColumns = columns.map((c) => c.key)
  const groupBy = columns.some((c) => !c.operator) ? columns.filter((c) => !c.operator).map((c) => c.key) : keptColumns
  const groups = new Map<string, { name: string; times: Map<string, (string | null)[]> }[]>()
  for (const hotel of hotels.values()) {
    if (!keptColumns.some((key) => hotel.times.has(key))) continue
    const signature = JSON.stringify(groupBy.map((key) => hotel.times.get(key) ?? null))
    groups.set(signature, [...(groups.get(signature) ?? []), hotel])
  }

  const zones: DraftZone[] = [...groups.values()].map((members, i) => {
    const times: Record<string, (string | null)[]> = {}
    for (const key of keptColumns) {
      const counts = new Map<string, number>()
      for (const m of members) {
        const value = JSON.stringify(m.times.get(key) ?? null)
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
      const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      const value = JSON.parse(top) as (string | null)[] | null
      if (value) times[key] = value
    }
    const hotels: DraftHotel[] = members.map((m) => {
      const own: Record<string, (string | null)[]> = {}
      for (const key of keptColumns) {
        const mine = m.times.get(key) ?? null
        if (JSON.stringify(mine) !== JSON.stringify(times[key] ?? null)) {
          // Un hotel que no tiene recogida donde su zona si, queda sin hora
          // propia (se ve la de la zona); el resto se respeta tal cual.
          if (mine) own[key] = mine
        }
      }
      return { name: m.name, own }
    })
    return { key: `z${i + 1}`, hotels, times }
  })

  return {
    columns,
    zones,
    hotelCount: zones.reduce((n, z) => n + z.hotels.length, 0),
    sheetCount: sheets.length,
  }
}
