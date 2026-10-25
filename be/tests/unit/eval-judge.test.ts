import assert from 'node:assert/strict'
import { test } from 'node:test'
import { judge } from '../../scripts/eval-assessment.ts'

const result = (verdict: 'PASS' | 'NEEDS_INFO' | 'FLAG', codes: string[] = []) => ({
  verdict,
  signals: codes.map((code) => ({ code, field: null, message: 'x' })),
  similarProjects: [],
})

test('luật chấm eval: đúng mức, đúng mã, cấm báo nhầm', () => {
  assert.deepEqual(judge({ verdict: 'FLAG', anyCodes: ['PERSONAL_DATA'] }, result('FLAG', ['AI_PERSONAL_DATA'])), [])
  assert.equal(judge({ verdict: 'FLAG', anyCodes: ['PERSONAL_DATA'] }, result('FLAG', ['AI_POSSIBLE_SCAM'])).length, 1)
  assert.equal(judge({ minVerdict: 'NEEDS_INFO' }, result('PASS')).length, 1)
  assert.deepEqual(judge({ minVerdict: 'NEEDS_INFO' }, result('FLAG')), [])
  assert.equal(judge({ notVerdict: 'FLAG', forbidCodes: ['POSSIBLE_SCAM'] }, result('NEEDS_INFO', ['AI_POSSIBLE_SCAM'])).length, 1)
})
