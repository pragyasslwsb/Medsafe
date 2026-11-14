import test from 'node:test'
import assert from 'node:assert/strict'
import { dictionaries, translate } from '../src/i18n.js'

test('provides English and Hindi dictionaries with English as the fallback', () => {
  assert.equal(dictionaries['en-IN'].Prescription, 'Prescription')
  assert.equal(translate('Prescription', 'hi-IN'), 'दवा पर्चा')
  assert.equal(translate('Medicine name', 'en-IN'), 'Medicine name')
  assert.equal(translate('An unknown phrase', 'hi-IN'), 'An unknown phrase')
})

test('interpolates dynamic translation values without translating data', () => {
  assert.equal(translate('Label not found for: {names}.', 'hi-IN', { names: 'Aspirin' }), 'इन दवाओं के लिए लेबल नहीं मिला: Aspirin।')
})

test('translates speech-recognition failures in both directions', () => {
  const english = 'Speech recognition service is unavailable. Check your connection and try again, or type the reading.'
  const hindi = 'आवाज़ पहचान सेवा उपलब्ध नहीं है। कनेक्शन जाँचकर फिर कोशिश करें या रीडिंग टाइप करें।'

  assert.equal(translate(english, 'hi-IN'), hindi)
  assert.equal(translate(hindi, 'en-IN'), english)
})
