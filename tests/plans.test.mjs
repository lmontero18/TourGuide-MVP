// hasPlan / hasProFeature (CODE-201). Correr con: pnpm test
// Node quita los tipos de lib/features.ts al importarlo (solo tiene imports de tipos).
import test from 'node:test'
import assert from 'node:assert/strict'
import { hasPlan, hasProFeature, PRO_FEATURES } from '../lib/features.ts'

// Con el flag `plans` en 'beta': prendido = org beta o con 'plans' en features.
const on = (plan) => ({ is_beta: false, features: ['plans'], plan })
const off = (plan) => ({ is_beta: false, features: [], plan })

test('flag apagado: todos tienen todo', () => {
  assert.equal(hasPlan(off('starter'), 'pro'), true)
  assert.equal(hasPlan(off('pro'), 'pro'), true)
  assert.equal(hasPlan(null, 'pro'), true)
  assert.equal(hasProFeature(off('starter'), 'leadsBoard'), true)
})

test('flag prendido: Starter no tiene Pro', () => {
  assert.equal(hasPlan(on('starter'), 'starter'), true)
  assert.equal(hasPlan(on('starter'), 'pro'), false)
  for (const feature of PRO_FEATURES) assert.equal(hasProFeature(on('starter'), feature), false, feature)
})

test('flag prendido: Pro tiene todo', () => {
  assert.equal(hasPlan(on('pro'), 'starter'), true)
  assert.equal(hasPlan(on('pro'), 'pro'), true)
  for (const feature of PRO_FEATURES) assert.equal(hasProFeature(on('pro'), feature), true, feature)
})

test('org beta prende el flag', () => {
  assert.equal(hasPlan({ is_beta: true, features: [], plan: 'starter' }, 'pro'), false)
})

test('flag prendido sin plan cargado: cuenta como Starter', () => {
  assert.equal(hasPlan({ is_beta: true, features: [] }, 'pro'), false)
})
