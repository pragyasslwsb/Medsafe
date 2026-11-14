import {
  ABNORMAL_READING_WINDOW_MS,
  BP_CRITICAL_DIASTOLIC,
  BP_CRITICAL_SYSTOLIC,
  BP_HIGH_DIASTOLIC,
  BP_HIGH_SYSTOLIC,
  BP_LOW_DIASTOLIC,
  BP_LOW_SYSTOLIC,
  REPEATED_ABNORMAL_READING_COUNT,
  RISING_TREND_READING_COUNT,
  SUGAR_CRITICAL_HIGH,
  SUGAR_CRITICAL_LOW,
  SUGAR_LOW,
  SUGAR_NORMAL_MAX,
} from './data/thresholds.js'

const sugarStatuses = {
  criticalLow: { key: 'critical-low', label: 'CRITICAL LOW', labelHindi: 'बहुत कम', color: 'red', severity: 'critical' },
  low: { key: 'low', label: 'LOW', labelHindi: 'कम', color: 'yellow', severity: 'low' },
  normal: { key: 'normal', label: 'NORMAL', labelHindi: 'सामान्य', color: 'green', severity: 'normal' },
  high: { key: 'high', label: 'HIGH', labelHindi: 'अधिक', color: 'orange', severity: 'high' },
  criticalHigh: { key: 'critical-high', label: 'CRITICAL HIGH', labelHindi: 'बहुत अधिक', color: 'red', severity: 'critical' },
}

const bloodPressureStatuses = {
  critical: { key: 'critical', label: 'CRITICAL', labelHindi: 'गंभीर', color: 'red', severity: 'critical' },
  high: { key: 'high', label: 'HIGH', labelHindi: 'उच्च', color: 'orange', severity: 'high' },
  low: { key: 'low', label: 'LOW', labelHindi: 'कम', color: 'yellow', severity: 'low' },
  normal: { key: 'normal', label: 'NORMAL', labelHindi: 'सामान्य', color: 'green', severity: 'normal' },
}

export function classifyReading(reading) {
  if (reading.type === 'sugar') {
    const value = Number(reading.value)
    if (value < SUGAR_CRITICAL_LOW) return sugarStatuses.criticalLow
    if (value < SUGAR_LOW) return sugarStatuses.low
    if (value <= SUGAR_NORMAL_MAX) return sugarStatuses.normal
    if (value < SUGAR_CRITICAL_HIGH) return sugarStatuses.high
    return sugarStatuses.criticalHigh
  }

  const systolic = Number(reading.systolic)
  const diastolic = Number(reading.diastolic)
  if (systolic >= BP_CRITICAL_SYSTOLIC || diastolic >= BP_CRITICAL_DIASTOLIC) {
    return bloodPressureStatuses.critical
  }
  if (systolic >= BP_HIGH_SYSTOLIC || diastolic >= BP_HIGH_DIASTOLIC) {
    return bloodPressureStatuses.high
  }
  if (systolic < BP_LOW_SYSTOLIC || diastolic < BP_LOW_DIASTOLIC) {
    return bloodPressureStatuses.low
  }
  return bloodPressureStatuses.normal
}

export function getSafetyMessage(reading, language) {
  const status = classifyReading(reading)
  if (language === 'hi-IN') {
    if (reading.type === 'sugar') {
      const messages = {
        'critical-low': 'शुगर बहुत कम है। अगर व्यक्ति होश में है और निगल सकता है, तो 15 ग्राम जल्दी असर करने वाली चीनी (ग्लूकोज़, जूस या चीनी) दें और 15 मिनट बाद फिर जाँचें। बेहोशी या दौरा हो तो मुँह से कुछ न दें और 112 पर कॉल करें। सुधार न हो तो डॉक्टर को बुलाएँ।',
        low: 'शुगर कम है। अगर व्यक्ति होश में है और निगल सकता है, तो 15 ग्राम जल्दी असर करने वाली चीनी (ग्लूकोज़, जूस या चीनी) लें और 15 मिनट बाद फिर जाँचें। बेहोशी या दौरा हो तो मुँह से कुछ न दें और 112 पर कॉल करें। सुधार न हो तो डॉक्टर को बुलाएँ।',
        normal: 'शुगर सामान्य सीमा में है। अपने डॉक्टर की बताई योजना जारी रखें।',
        high: 'शुगर अधिक है। पानी पिएँ (अगर डॉक्टर ने मना न किया हो), फिर जाँचें और अपनी देखभाल टीम से सलाह लें। अतिरिक्त दवा खुद से न लें।',
        'critical-high': 'शुगर बहुत अधिक है। हाथ धोकर दोबारा जाँचें और अभी डॉक्टर से संपर्क करें। उल्टी, साँस में तकलीफ़ या बहुत कमजोरी हो तो 112 पर कॉल करें।',
      }
      return { status, message: messages[status.key] }
    }

    const messages = {
      critical: 'बीपी बहुत अधिक है। बैठकर आराम करें, खुद से अतिरिक्त दवा न लें और अभी डॉक्टर या आपातकालीन सेवा से संपर्क करें। सीने में दर्द, साँस की तकलीफ़ या कमजोरी हो तो 112 पर कॉल करें।',
      high: 'बीपी अधिक है। पाँच मिनट शांत बैठकर फिर जाँचें और डॉक्टर से जल्द सलाह लें। खुद से अतिरिक्त दवा न लें।',
      low: 'बीपी कम है। बैठें या लेटें, कुछ मिनट बाद फिर जाँचें और डॉक्टर से सलाह लें। चक्कर या बेहोशी हो तो तुरंत मदद लें।',
      normal: 'बीपी सामान्य सीमा में है। अपने डॉक्टर की बताई योजना जारी रखें।',
    }
    return { status, message: messages[status.key] }
  }

  if (reading.type === 'sugar') {
    const messages = {
      'critical-low': 'Your blood sugar is very low. If the person is awake and can swallow, take 15 g of fast sugar (glucose, juice or sugar) and re-check in 15 minutes. If they are unconscious or having a seizure, give nothing by mouth and call 112. Call your doctor if it does not improve.',
      low: 'Your blood sugar is low. If you are awake and can swallow, take 15 g of fast sugar (glucose, juice or sugar), re-check in 15 minutes, and call your doctor if it does not improve. If someone is unconscious or having a seizure, give nothing by mouth and call 112.',
      normal: 'Your blood sugar is in the usual range. Continue the plan from your doctor.',
      high: 'Your blood sugar is high. Drink water unless your doctor limits fluids, re-check, and contact your care team. Do not take extra medicine on your own.',
      'critical-high': 'Your blood sugar is very high. Wash your hands and re-check, then contact a doctor now. Call 112 for vomiting, trouble breathing or severe weakness.',
    }
    return { status, message: messages[status.key] }
  }

  const messages = {
    critical: 'Your blood pressure is very high. Sit and rest, do not take extra medicine on your own, and contact a doctor or emergency services now. Call 112 for chest pain, trouble breathing or weakness.',
    high: 'Your blood pressure is high. Sit quietly for five minutes and re-check. Contact your doctor soon; do not take extra medicine on your own.',
    low: 'Your blood pressure is low. Sit or lie down, re-check after a few minutes, and contact your doctor. Get urgent help for fainting or severe dizziness.',
    normal: 'Your blood pressure is in the usual range. Continue the plan from your doctor.',
  }
  return { status, message: messages[status.key] }
}

function metricValue(reading) {
  return reading.type === 'sugar' ? Number(reading.value) : Number(reading.systolic)
}

function timestampValue(reading) {
  const value = new Date(reading.timestamp).getTime()
  return Number.isFinite(value) ? value : 0
}

export function getTrendWarnings(readings, asOfTimestamp) {
  if (!readings.length) return []
  const asOf = asOfTimestamp ? new Date(asOfTimestamp).getTime() : Number.POSITIVE_INFINITY
  const ordered = readings
    .filter((reading) => timestampValue(reading) <= asOf)
    .sort((a, b) => timestampValue(a) - timestampValue(b))
  if (!ordered.length) return []
  const latestTimestamp = timestampValue(ordered[ordered.length - 1])
  const recentAbnormal = ordered.filter((reading) => {
    const abnormal = classifyReading(reading).severity !== 'normal'
    const withinWindow = timestampValue(reading) >= latestTimestamp - ABNORMAL_READING_WINDOW_MS
    return abnormal && withinWindow
  })
  const warnings = []

  if (recentAbnormal.length >= REPEATED_ABNORMAL_READING_COUNT) {
    warnings.push({
      key: 'repeated-abnormal',
      title: 'Repeated abnormal readings',
      titleHindi: 'बार-बार असामान्य रीडिंग',
      message: 'There have been multiple high or low readings in the last 24 hours. Please contact your doctor for advice.',
      messageHindi: 'पिछले 24 घंटों में कई बार रीडिंग अधिक या कम आई है। कृपया डॉक्टर से सलाह लें।',
    })
  }

  const recent = ordered.slice(-RISING_TREND_READING_COUNT)
  if (
    recent.length === RISING_TREND_READING_COUNT
    && recent.every((reading, index) => {
      const aboveNormal = classifyReading(reading).severity === 'high'
        || classifyReading(reading).severity === 'critical'
      return aboveNormal && (index === 0 || metricValue(reading) > metricValue(recent[index - 1]))
    })
  ) {
    warnings.push({
      key: 'rising-trend',
      title: 'Rising trend',
      titleHindi: 'बढ़ता हुआ रुझान',
      message: 'Your last three readings are rising and above the usual range. Please contact your doctor.',
      messageHindi: 'आपकी पिछली तीन रीडिंग लगातार बढ़ी हैं और सामान्य सीमा से ऊपर हैं। कृपया डॉक्टर से संपर्क करें।',
    })
  }

  return warnings
}
