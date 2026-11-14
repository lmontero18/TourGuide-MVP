// handoffTimeNote: abierto/cerrado y cuando abre. Correr con: pnpm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { handoffTimeNote } from '../lib/bot/businessHours.ts'

const TZ = 'America/Costa_Rica' // UTC-6, sin horario de verano
const weekdaysOnly = { weekdays: { start: '09:00', end: '18:00' }, weekend: null }
const everyDay = { weekdays: { start: '07:00', end: '21:00' }, weekend: { start: '07:00', end: '21:00' } }
// 2026-11-14 es sabado; 2026-11-17 es martes.
const at = (isoLocal) => new Date(`${isoLocal}-06:00`)

test('abierto dentro del horario', () => {
  assert.match(handoffTimeNote(weekdaysOnly, TZ, at('2026-11-17T11:20:00')), /ABIERTA.*en breve/)
  assert.match(handoffTimeNote(everyDay, TZ, at('2026-11-14T14:03:00')), /ABIERTA/)
})

test('sabado con el finde cerrado: abre el lunes', () => {
  const note = handoffTimeNote(weekdaysOnly, TZ, at('2026-11-14T14:03:00'))
  assert.match(note, /CERRADA y abre el lunes a las 9:00/)
  assert.match(note, /NO digas "en breve"/)
})

test('de noche: abre mañana', () => {
  assert.match(handoffTimeNote(weekdaysOnly, TZ, at('2026-11-17T20:15:00')), /abre mañana a las 9:00/)
  assert.match(handoffTimeNote(everyDay, TZ, at('2026-11-14T22:00:00')), /abre mañana a las 7:00/)
})

test('de madrugada: abre hoy', () => {
  assert.match(handoffTimeNote(weekdaysOnly, TZ, at('2026-11-17T06:30:00')), /abre hoy a las 9:00/)
})

test('viernes de noche con el finde cerrado: abre el lunes', () => {
  assert.match(handoffTimeNote(weekdaysOnly, TZ, at('2026-11-20T19:00:00')), /abre el lunes/)
})

test('la hora de cierre ya cuenta como cerrado', () => {
  assert.match(handoffTimeNote(weekdaysOnly, TZ, at('2026-11-17T18:00:00')), /CERRADA/)
})

test('formato viejo (un solo rango) vale para todos los dias', () => {
  assert.match(handoffTimeNote({ start: '08:00', end: '17:00' }, TZ, at('2026-11-14T10:00:00')), /ABIERTA/)
})

test('timezone invalida tira error (el webhook cae al default)', () => {
  assert.throws(() => handoffTimeNote(weekdaysOnly, 'Not/AZone', new Date()))
})
