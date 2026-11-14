import assert from 'node:assert/strict'
import test from 'node:test'
import { collectSpeechResults, parseSpokenReading } from '../src/healthParsing.js'

test('keeps interim speech as preview text until a final result arrives', () => {
  const result = collectSpeechResults(
    [{ 0: { transcript: 'sugar 140' }, isFinal: false }],
    0,
  )

  assert.deepEqual(result, {
    finalTranscript: '',
    interimTranscript: 'sugar 140',
    lastFinalResultIndex: 0,
  })
})

test('collects each final speech segment only once', () => {
  const first = collectSpeechResults(
    [{ 0: { transcript: 'BP 130 over 85' }, isFinal: true }],
    0,
  )
  const duplicate = collectSpeechResults(
    [{ 0: { transcript: 'BP 130 over 85' }, isFinal: true }],
    0,
    first.finalTranscript,
    first.lastFinalResultIndex,
  )

  assert.equal(first.finalTranscript, 'BP 130 over 85')
  assert.equal(duplicate.finalTranscript, 'BP 130 over 85')
})

test('parses spoken blood pressure and a separately labeled pulse', () => {
  assert.deepEqual(
    parseSpokenReading('Heart rate 72, BP 130 over 85', 'sugar'),
    {
      type: 'bp',
      value: '',
      systolic: '130',
      diastolic: '85',
      pulse: '72',
      context: 'random',
    },
  )
})

test('parses an isolated heart rate without inventing blood pressure values', () => {
  assert.deepEqual(
    parseSpokenReading('heart rate 72', 'sugar'),
    {
      type: 'bp',
      value: '',
      systolic: '',
      diastolic: '',
      pulse: '72',
      context: 'random',
    },
  )
})

test('does not mistake a pulse for the missing second blood-pressure number', () => {
  assert.throws(
    () => parseSpokenReading('BP 130, pulse 72', 'bp'),
    /both blood pressure numbers/,
  )
})

test('parses spoken blood sugar and Hindi numerals', () => {
  assert.deepEqual(parseSpokenReading('sugar 140 fasting', 'bp'), {
    type: 'sugar',
    value: '140',
    context: 'fasting',
    systolic: '',
    diastolic: '',
    pulse: '',
  })
  assert.equal(parseSpokenReading('शुगर १४०', 'bp').value, '140')
})
