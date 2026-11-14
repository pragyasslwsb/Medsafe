export function parseSpokenReading(transcript, selectedType) {
  const devanagariDigits = '०१२३४५६७८९'
  if (typeof transcript !== 'string' || !transcript.trim()) {
    throw new Error('No speech was recognized. Please try again or type the reading.')
  }
  const normalized = transcript.trim().replace(/[०-९]/g, (digit) => String(devanagariDigits.indexOf(digit)))
  const isBloodPressure = /\bbp\b|blood pressure|बीपी|ब्लड प्रेशर/i.test(normalized)
  const isSugar = /sugar|glucose|शुगर|ग्लूकोज़|ग्लूकोज/i.test(normalized)
  const pulseMatch = /(?:\b(?:pulse|heart\s*rate|hr)\b|पल्स|हार्ट\s*रेट)[^\d]{0,20}(\d{1,3})/i.exec(normalized)
  const numbersText = pulseMatch
    ? `${normalized.slice(0, pulseMatch.index)} ${normalized.slice(pulseMatch.index + pulseMatch[0].length)}`
    : normalized
  const type = isBloodPressure ? 'bp' : isSugar ? 'sugar' : pulseMatch ? 'bp' : selectedType
  const numbers = numbersText.match(/\d{1,3}/g)?.map(Number) || []

  if (type === 'bp') {
    if (numbers.length < 2) {
      if (pulseMatch && !isBloodPressure) {
        return {
          type,
          value: '',
          systolic: '',
          diastolic: '',
          pulse: pulseMatch[1],
          context: 'random',
        }
      }
      throw new Error('Please say both blood pressure numbers, such as “BP 130 over 85”.')
    }
    return {

      type,
      value: '',
      systolic: String(numbers[0]),
      diastolic: String(numbers[1]),
      pulse: pulseMatch?.[1] || '',
      context: 'random',
    }
  }

  if (!numbers.length) throw new Error('I could not hear a number. Please say the reading again.')
  const lowerTranscript = normalized.toLowerCase()
  const context = /after meal|post meal|after eating|खाने के बाद/.test(lowerTranscript)
    ? 'after meal'
    : /fasting|खाली पेट/.test(lowerTranscript)
      ? 'fasting'
      : 'random'
  return {
    type,
    value: String(numbers[0]),
    context,
    systolic: '',
    diastolic: '',
    pulse: '',
  }
}

export function collectSpeechResults(
  results,
  resultIndex = 0,
  finalTranscript = '',
  lastFinalResultIndex = 0,
) {
  let nextFinalTranscript = finalTranscript
  let nextFinalResultIndex = lastFinalResultIndex
  let interimTranscript = ''
  const firstChangedIndex = Number.isInteger(resultIndex) && resultIndex >= 0
    ? resultIndex
    : 0

  for (let index = firstChangedIndex; index < (results?.length || 0); index += 1) {
    const result = results[index]
    const transcript = typeof result?.[0]?.transcript === 'string'
      ? result[0].transcript.trim()
      : ''
    if (!transcript) continue

    if (result.isFinal && index >= nextFinalResultIndex) {
      nextFinalTranscript = `${nextFinalTranscript} ${transcript}`.trim()
      nextFinalResultIndex = index + 1
    } else if (!result.isFinal && index >= nextFinalResultIndex) {
      interimTranscript = `${interimTranscript} ${transcript}`.trim()
    }
  }

  return {
    finalTranscript: nextFinalTranscript,
    interimTranscript,
    lastFinalResultIndex: nextFinalResultIndex,
  }
}
