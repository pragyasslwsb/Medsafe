import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyPrintedRange } from '../reportClassification.js'

test('classifies numeric results only against clear printed intervals', () => {
  assert.equal(classifyPrintedRange('10.2', '13.0-17.0'), 'low')
  assert.equal(classifyPrintedRange('17', '13 to 17'), 'normal')
  assert.equal(classifyPrintedRange('228', '<200'), 'high')
  assert.equal(classifyPrintedRange('200', '<=200'), 'normal')
  assert.equal(classifyPrintedRange('3', '>=3'), 'normal')
  assert.equal(classifyPrintedRange('3', '>3'), 'low')
  assert.equal(classifyPrintedRange('70', '70-100'), 'normal')
})

test('marks unreadable or unsupported ranges unknown instead of inferring', () => {
  assert.equal(classifyPrintedRange('142', ''), 'unknown')
  assert.equal(classifyPrintedRange('positive', 'negative'), 'unknown')
  assert.equal(classifyPrintedRange('5', '4.0-3.0'), 'unknown')
})
