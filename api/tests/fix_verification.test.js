import { strict as assert } from 'node:assert'
import { VALID_STATUSES } from '../src/modules/talent/candidates.js'
import { checkPositionPermission } from '../src/modules/talent/permissions.js'
import { normalizeName, normalizePhone } from '../src/modules/talent/candidates.js'

function test(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (err) {
    console.error(`✗ ${name}`)
    console.error(err.message)
    process.exitCode = 1
  }
}

test('VALID_STATUSES contains all expected statuses', () => {
  const expected = ['pending', 'contacted', 'interviewing', 'offered', 'rejected']
  assert.deepEqual(VALID_STATUSES, expected)
})

test('normalizeName removes whitespace and converts to lowercase', () => {
  assert.equal(normalizeName('张三'), '张三')
  assert.equal(normalizeName('张 三'), '张三')
  assert.equal(normalizeName('张　三'), '张三')
  assert.equal(normalizeName('  张三  '), '张三')
  assert.equal(normalizeName('John Doe'), 'johndoe')
  assert.equal(normalizeName(''), '')
  assert.equal(normalizeName(null), '')
})

test('normalizePhone removes non-digit characters and strips country code', () => {
  assert.equal(normalizePhone('13800138000'), '13800138000')
  assert.equal(normalizePhone('138-0013-8000'), '13800138000')
  assert.equal(normalizePhone('+8613800138000'), '13800138000')
  assert.equal(normalizePhone('8613800138000'), '13800138000')
  assert.equal(normalizePhone('(86)13800138000'), '13800138000')
  assert.equal(normalizePhone(''), '')
  assert.equal(normalizePhone(null), '')
})

test('checkPositionPermission returns true for admin', async () => {
  const env = {}
  const user = { userId: '1', role: 'admin' }
  const result = await checkPositionPermission(env, user, '前端工程师', '2')
  assert.equal(result, true)
})

test('checkPositionPermission returns true when user owns candidate', async () => {
  const env = {
    DB: {
      prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) })
    }
  }
  const user = { userId: '1', role: 'user' }
  const result = await checkPositionPermission(env, user, null, '1')
  assert.equal(result, true)
})

test('checkPositionPermission returns false when user does not own candidate and no position access', async () => {
  const env = {
    DB: {
      prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) })
    }
  }
  const user = { userId: '1', role: 'user' }
  const result = await checkPositionPermission(env, user, null, '2')
  assert.equal(result, false)
})

test('checkPositionPermission returns true when position is in allowed list', async () => {
  const env = {
    DB: {
      prepare: () => ({ bind: () => ({ all: async () => ({ results: [{ position: '前端工程师' }] }) }) })
    }
  }
  const user = { userId: '1', role: 'user' }
  const result = await checkPositionPermission(env, user, '前端工程师', '2')
  assert.equal(result, true)
})

test('checkPositionPermission returns false when position is not in allowed list', async () => {
  const env = {
    DB: {
      prepare: () => ({ bind: () => ({ all: async () => ({ results: [{ position: '后端工程师' }] }) }) })
    }
  }
  const user = { userId: '1', role: 'user' }
  const result = await checkPositionPermission(env, user, '前端工程师', '2')
  assert.equal(result, false)
})

test('checkPositionPermission returns true when allowedPositions is null (super user)', async () => {
  const env = {
    DB: {
      prepare: () => ({ bind: () => ({ all: async () => ({ results: [{ position: '*' }] }) }) })
    }
  }
  const user = { userId: '1', role: 'user' }
  const result = await checkPositionPermission(env, user, '前端工程师', '2')
  assert.equal(result, true)
})

console.log('Fix verification tests complete')