function parseNumber(value) {
  const raw = String(value || '').trim()
  const text = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw) ? raw.replace(/,/g, '') : raw
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

export function classifyPrintedRange(value, referenceRange) {
  const result = parseNumber(value)
  const range = String(referenceRange || '').trim().replace(/[–—]/g, '-')
  if (result === null || !range) return 'unknown'

  const numberPattern = '([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))'
  const interval = new RegExp(`^${numberPattern}\\s*(?:-|\\bto\\b)\\s*${numberPattern}$`, 'i').exec(range)
  if (interval) {
    const lower = Number(interval[1])
    const upper = Number(interval[2])
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) return 'unknown'
    if (result < lower) return 'low'
    if (result > upper) return 'high'
    return 'normal'
  }

  const oneSided = new RegExp(`^(<=|≤|<|>=|≥|>)\\s*${numberPattern}$`).exec(range)
  if (!oneSided) return 'unknown'
  const threshold = Number(oneSided[2])
  if (!Number.isFinite(threshold)) return 'unknown'

  switch (oneSided[1]) {
    case '<':
      return result < threshold ? 'normal' : 'high'
    case '<=':
    case '≤':
      return result <= threshold ? 'normal' : 'high'
    case '>':
      return result > threshold ? 'normal' : 'low'
    case '>=':
    case '≥':
      return result >= threshold ? 'normal' : 'low'
    default:
      return 'unknown'
  }
}
