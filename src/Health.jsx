
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BP_CHART_NORMAL_MAX,
  BP_CHART_NORMAL_MIN,
  HEALTH_HISTORY_DAYS,
  SUGAR_LOW,
  SUGAR_NORMAL_MAX,
} from './data/thresholds.js'
import { classifyReading, getSafetyMessage, getTrendWarnings } from './healthSafety.js'
import { collectSpeechResults, parseSpokenReading } from './healthParsing.js'
import { translate, useLanguage } from './i18n.js'
import './Health.css'

const READINGS_STORAGE_KEY = 'medsafe-health-readings'
const MAX_SAVED_READINGS = 500
const DAY_MS = 24 * 60 * 60 * 1000
const APP_STARTED_AT = Date.now()
const METER_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const blankProfile = { name: '', conditions: [], familyName: '', familyNumber: '' }
const conditionOptions = ['Diabetes', 'High BP', 'Heart trouble']
const readingContextLabels = {
  fasting: 'Fasting',
  'after meal': 'After meal',
  random: 'Random',
}

const colors = {
  green: '#438455',
  yellow: '#b57b16',
  orange: '#c86627',
  red: '#bf4542',
}

const speechRecognitionSupported = typeof window !== 'undefined'
  && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

function readStorage(key, fallback) {
  try {
    const saved = window.localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function timestampValue(reading) {
  const timestamp = new Date(reading.timestamp).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function formatTimestamp(timestamp, language = 'en-IN', t = (message) => message) {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return t('Time not available')

  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function readingValue(reading, language = 'en-IN') {
  return reading.type === 'sugar'
    ? `${reading.value} mg/dL`
    : `${reading.systolic}/${reading.diastolic} mmHg${reading.pulse ? ` · ${language === 'hi-IN' ? 'पल्स' : 'pulse'} ${reading.pulse}` : ''}`
}

function toWhatsAppDigits(value) {
  return (value || '').replace(/\D/g, '')
}

function chartMetric(reading) {
  return reading.type === 'sugar'
    ? Number(reading.value)
    : Number(reading.systolic)
}

function ReadingChart({ type, readings }) {
  const { language, t } = useLanguage()
  const cutoff = APP_STARTED_AT - HEALTH_HISTORY_DAYS * DAY_MS

  const points = readings
    .filter((reading) => reading.type === type && timestampValue(reading) >= cutoff)
    .sort((a, b) => timestampValue(a) - timestampValue(b))

  const isSugar = type === 'sugar'
  const minimum = isSugar ? 40 : 50
  const maximum = isSugar ? 360 : 220
  const normalMinimum = isSugar ? SUGAR_LOW : BP_CHART_NORMAL_MIN
  const normalMaximum = isSugar ? SUGAR_NORMAL_MAX : BP_CHART_NORMAL_MAX

  const left = 42
  const right = 612
  const top = 14
  const bottom = 164

  const x = (index) => points.length < 2
    ? (left + right) / 2
    : left + (right - left) * index / (points.length - 1)

  const y = (value) => bottom - ((value - minimum) / (maximum - minimum)) * (bottom - top)

  const normalY = y(normalMaximum)
  const normalHeight = y(normalMinimum) - normalY

  const line = points
    .map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(chartMetric(point))}`)
    .join(' ')

  const title = type === 'sugar'
    ? t('Blood sugar · last 7 days')
    : t('Systolic blood pressure · last 7 days')

  return (
    <article className="health-chart-card">
      <div className="health-chart-heading">
        <h3>{title}</h3>
        <span>{type === 'sugar' ? 'mg/dL' : 'mmHg'}</span>
      </div>

      {points.length ? (
        <svg
          className="health-chart"
          viewBox="0 0 640 205"
          role="img"
          aria-label={title}
        >
          <rect
            x={left}
            y={normalY}
            width={right - left}
            height={normalHeight}
            rx="4"
            fill="#e9f2e7"
          />

          <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#d7dcd3" />
          <line x1={left} y1={top} x2={left} y2={bottom} stroke="#d7dcd3" />

          <text x="4" y={normalY + 4} className="chart-axis-label">
            {normalMaximum}
          </text>

          <text x="4" y={y(normalMinimum) + 4} className="chart-axis-label">
            {normalMinimum}
          </text>

          {line && (
            <path
              d={line}
              fill="none"
              stroke="#79987b"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {points.map((point, index) => {
            const status = classifyReading(point)

            return (
              <circle
                key={point.id}
                cx={x(index)}
                cy={y(chartMetric(point))}
                r="5"
                fill={colors[status.color]}
                stroke="white"
                strokeWidth="2"
              >
                <title>{`${readingValue(point, language)} · ${t(status.label)}`}</title>
              </circle>
            )
          })}

          <text x={left} y="190" className="chart-axis-label">
            {formatTimestamp(timestampValue(points[0]), language, t).split(',')[0]}
          </text>

          {points.length > 1 && (
            <text x={right} y="190" textAnchor="end" className="chart-axis-label">
                {t('Today')}
            </text>
          )}
        </svg>
      ) : (
        <div className="health-chart-empty">{t('No readings yet.')}</div>
      )}

      <p className="chart-caption">
        <span className="chart-normal-key" /> {t('Usual range')}
        {type === 'bp' && (
          <span className="chart-note">
            {' '}· {t('Systolic values; diastolic values appear in history.')}
          </span>
        )}
      </p>
    </article>
  )
}

function MyHealth({ profile, onProfileChange, onClearLocalData, isActive = true }) {
  const { language, t } = useLanguage()
  const [readings, setReadings] = useState(() => {
    const saved = readStorage(READINGS_STORAGE_KEY, [])
    return Array.isArray(saved) ? saved : []
  })

  const [profileDraft, setProfileDraft] = useState(() => ({
    ...blankProfile,
    ...(profile || {}),
    conditions: Array.isArray(profile?.conditions) ? profile.conditions : [],
  }))

  const [editingProfile, setEditingProfile] = useState(() => !profile?.name)
  const [profileNotice, setProfileNotice] = useState('')
  const [profileError, setProfileError] = useState('')
  const [readingType, setReadingType] = useState('sugar')

  const [form, setForm] = useState({
    value: '',
    context: 'fasting',
    systolic: '',
    diastolic: '',
    pulse: '',
  })

  const [voicePreview, setVoicePreview] = useState('')
  const [photoConfidence, setPhotoConfidence] = useState(null)
  const [source, setSource] = useState('manual')
  const [activeReadingId, setActiveReadingId] = useState('')
  const [readingError, setReadingError] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechMessage, setSpeechMessage] = useState('')

  const recognitionRef = useRef(null)
  const speechRequestRef = useRef(0)
  const speechVoiceWaitRef = useRef(null)
  const speechStartTimerRef = useRef(null)

  useEffect(() => {
    try {
      if (readings.length) {
        window.localStorage.setItem(
          READINGS_STORAGE_KEY,
          JSON.stringify(readings.slice(-MAX_SAVED_READINGS)),
        )
      } else {
        window.localStorage.removeItem(READINGS_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Could not save health readings:', error.message)
    }
  }, [readings])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Recognition may already have stopped.
        }
        recognitionRef.current = null
      }

      speechRequestRef.current += 1
      speechVoiceWaitRef.current?.()

      if (speechStartTimerRef.current !== null) {
        window.clearTimeout(speechStartTimerRef.current)
      }

      window.speechSynthesis?.cancel?.()
    }
  }, [])

  useEffect(() => {
    if (isActive || !recognitionRef.current) return

    const recognition = recognitionRef.current
    recognitionRef.current = null
    setListening(false)
    setReadingError(
      'Voice input stopped because you left My Health.',
    )
    try {
      recognition.abort()
    } catch (error) {
      console.warn('Could not abort speech recognition after leaving My Health:', error)
    }
  }, [isActive])

  const activeReading = readings.find((reading) => reading.id === activeReadingId)
    || [...readings].sort((a, b) => timestampValue(b) - timestampValue(a))[0]

  const activeSafety = activeReading
    ? getSafetyMessage(activeReading, language)
    : null

  const typeReadings = activeReading
    ? readings.filter((reading) => reading.type === activeReading.type)
    : []

  const trendWarnings = activeReading
    ? getTrendWarnings(typeReadings, activeReading.timestamp)
    : []

  const needsFamilyAlert = Boolean(
    activeSafety && activeSafety.status.severity !== 'normal',
  ) || trendWarnings.length > 0

  function updateProfileDraft(field, value) {
    setProfileDraft((current) => ({ ...current, [field]: value }))
    setProfileError('')
  }

  function toggleCondition(condition) {
    setProfileDraft((current) => ({
      ...current,
      conditions: current.conditions.includes(condition)
        ? current.conditions.filter((item) => item !== condition)
        : [...current.conditions, condition],
    }))
  }

  function saveProfile(event) {
    event.preventDefault()

    if (!profileDraft.name.trim()) {
      setProfileError('Please add the patient name.')
      return
    }

    const number = profileDraft.familyNumber.trim()
    const digits = toWhatsAppDigits(number)

    if (number && (!number.startsWith('+') || digits.length < 8 || digits.length > 15)) {
      setProfileError(
        'Add the WhatsApp number with country code, for example +91 98765 43210.',
      )
      return
    }

    const nextProfile = {
      ...profileDraft,
      name: profileDraft.name.trim(),
      familyName: profileDraft.familyName.trim(),
      conditions: [...profileDraft.conditions],
    }

    onProfileChange(nextProfile)
    setProfileDraft(nextProfile)
    setEditingProfile(false)
    setProfileNotice('Profile saved on this device.')
    setProfileError('')
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setReadingError('')
  }

  function recordReading(values, readingSource, confidence) {
    const timestamp = new Date().toISOString()

    const reading = {
      id: createId(),
      type: values.type,
      timestamp,
      source: readingSource,
      context: values.context || '',
      value: values.type === 'sugar' ? Number(values.value) : 0,
      systolic: values.type === 'bp' ? Number(values.systolic) : 0,
      diastolic: values.type === 'bp' ? Number(values.diastolic) : 0,
      pulse: values.type === 'bp' && values.pulse ? Number(values.pulse) : 0,
      confidence: Number.isFinite(confidence) ? confidence : 1,
    }

    setReadings((current) => [...current, reading].slice(-MAX_SAVED_READINGS))
    setActiveReadingId(reading.id)
    setReadingType(reading.type)

    setForm({
      value: '',
      context: 'fasting',
      systolic: '',
      diastolic: '',
      pulse: '',
    })

    setPhotoConfidence(null)
    setVoicePreview('')
    setSource('manual')
    setReadingError('')

    return reading
  }

  function saveTypedReading(event) {
    event.preventDefault()

    if (readingType === 'sugar') {
      const value = Number(form.value)

      if (!Number.isInteger(value) || value <= 0 || value > 800) {
        setReadingError('Enter a valid blood sugar reading.')
        return
      }

      recordReading(
        { ...form, type: 'sugar', value },
        source,
        photoConfidence ?? 1,
      )
      return
    }

    const systolic = Number(form.systolic)
    const diastolic = Number(form.diastolic)
    const pulse = form.pulse ? Number(form.pulse) : 0

    if (
      !Number.isInteger(systolic)
      || !Number.isInteger(diastolic)
      || systolic <= 0
      || systolic > 350
      || diastolic <= 0
      || diastolic > 250
    ) {
      setReadingError('Enter both blood pressure numbers.')
      return
    }

    if (form.pulse && (!Number.isInteger(pulse) || pulse <= 0 || pulse > 250)) {
      setReadingError('Enter a valid pulse or leave it blank.')
      return
    }

    recordReading(
      { ...form, type: 'bp', systolic, diastolic, pulse },
      source,
      photoConfidence ?? 1,
    )
  }

  function startVoiceEntry() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setReadingError(
        language === 'hi-IN'
          ? 'इस ब्राउज़र में आवाज़ से लिखना उपलब्ध नहीं है। आप रीडिंग टाइप कर सकते हैं।'
          : 'Voice entry is not available in this browser. You can type the reading.',
      )
      return
    }

    if (recognitionRef.current) return

    setReadingError('')
    setVoicePreview('')

    let recognition

    try {
      recognition = new Recognition()
    } catch {
      setReadingError(
        translate(
          'Voice entry could not start. Check microphone access or type the reading.',
          language,
        ),
      )
      return
    }

    let receivedError = false
    let finalTranscript = ''
    let interimTranscript = ''
    let lastFinalResultIndex = 0
    let hasProcessedTranscript = false

    recognition.lang = language
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognitionRef.current = recognition

    recognition.onstart = () => {
      if (recognitionRef.current === recognition) {
        setListening(true)
      }
    }

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return

      const collected = collectSpeechResults(
        event.results,
        event.resultIndex,
        finalTranscript,
        lastFinalResultIndex,
      )
      finalTranscript = collected.finalTranscript
      interimTranscript = collected.interimTranscript
      lastFinalResultIndex = collected.lastFinalResultIndex

      const preview = [finalTranscript, interimTranscript].filter(Boolean).join(' ')
      if (preview) setVoicePreview(preview)
    }

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return

      receivedError = true
      console.warn('Speech recognition failed:', {
        error: event?.error || 'unknown',
        message: event?.message || '',
      })
      recognitionRef.current = null
      setListening(false)

      const errorMessages = {
        'not-allowed': 'Allow microphone access in your browser to use voice entry.',
        'service-not-allowed': 'Allow microphone access in your browser to use voice entry.',
        'permission-denied': 'Allow microphone access in your browser to use voice entry.',
        'audio-capture': 'No microphone is available. Connect a microphone or type the reading.',
        network: 'Speech recognition service is unavailable. Check your connection and try again, or type the reading.',
        'no-speech': 'No speech was detected. Speak clearly and try again.',
        aborted: 'Voice entry was interrupted. Try again or type the reading.',
        'language-not-supported': 'Speech recognition does not support this language in this browser. Change the voice language or type the reading.',
      }

      setReadingError(
        translate(
          errorMessages[event?.error]
          || 'Voice entry could not hear that. Please try again or type the reading.',
          language,
        ),
      )
    }

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return

      recognitionRef.current = null
      setListening(false)

      if (receivedError) return

      if (finalTranscript && !hasProcessedTranscript) {
        hasProcessedTranscript = true
        setVoicePreview(finalTranscript)
        try {
          const parsed = parseSpokenReading(finalTranscript, readingType)
          setReadingType(parsed.type)
          setForm(parsed)
          setSource('voice')
          setPhotoConfidence(null)
          setReadingError('')
        } catch (error) {
          setReadingError(
            translate(
              error.message || 'Could not understand the reading. Please enter it manually.',
              language,
            ),
          )
        }
      } else if (interimTranscript) {
        setReadingError(
          translate(
            'Speech ended before a complete result was recognized. Please pause after speaking and try again, or type the reading.',
            language,
          ),
        )
      } else {
        setReadingError(
          translate(
            'No speech was recognized. Please try again or type the reading.',
            language,
          ),
        )
      }
    }

    setListening(true)

    try {
      recognition.start()
    } catch (error) {
      console.warn('Could not start speech recognition:', {
        name: error?.name || 'unknown',
        message: error?.message || '',
      })
      recognitionRef.current = null
      setListening(false)

      setReadingError(
        translate(
          error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
            ? 'Allow microphone access in your browser to use voice entry.'
            : 'Voice entry could not start. Check microphone access or type the reading.',
          language,
        ),
      )
    }
  }

  async function handleMeterPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setReadingError('')
    setVoicePreview('')

    if (!METER_IMAGE_TYPES.has(file.type)) {
      setReadingError('Choose a JPEG, PNG, or WebP photo of the meter display.')
      return
    }

    if (file.size > 7 * 1024 * 1024) {
      setReadingError('This image is over 7 MB. Please choose a smaller photo.')
      return
    }

    setPhotoLoading(true)

    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onerror = () => reject(
          new Error('Could not read the selected photo.'),
        )

        reader.onload = () => {
          const result = String(reader.result || '')
          const separator = result.indexOf(',')

          if (separator < 0) {
            reject(new Error('Could not prepare the selected photo.'))
            return
          }

          resolve(result.slice(separator + 1))
        }

        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/read-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mediaType: file.type }),
      })

      let result

      try {
        result = await response.json()
      } catch {
        throw new Error(
          'The meter reader returned an invalid response. Please enter the reading manually.',
        )
      }

      if (!response.ok) {
        throw new Error(result.error || 'Could not read this meter display.')
      }

      if (
        !['sugar', 'bp'].includes(result.type)
        || !Number.isFinite(Number(result.confidence))
      ) {
        throw new Error(
          'The meter reader returned an unclear result. Please enter the reading manually.',
        )
      }

      setReadingType(result.type)

      setForm(
        result.type === 'sugar'
          ? {
              value: Number(result.value) ? String(result.value) : '',
              context: 'random',
              systolic: '',
              diastolic: '',
              pulse: '',
            }
          : {
              value: '',
              context: 'fasting',
              systolic: Number(result.systolic) ? String(result.systolic) : '',
              diastolic: Number(result.diastolic) ? String(result.diastolic) : '',
              pulse: Number(result.pulse) ? String(result.pulse) : '',
            },
      )

      setPhotoConfidence(
        Math.min(1, Math.max(0, Number(result.confidence))),
      )

      setSource('photo')
      setReadingError('')
    } catch (error) {
      const message = error.name === 'TypeError'
        ? 'Could not reach the meter reader. Check your connection or enter the reading manually.'
        : error.message || 'Could not read the meter photo. Please try again or type the result.'

      setReadingError(message)
    } finally {
      setPhotoLoading(false)
    }
  }

  function loadDemoData() {
    if (readings.length || profile?.name) {
      const confirmed = window.confirm(t(
        'Replace this browser’s health profile and readings with fictional Ramesh Kumar demo data?',
      ))

      if (!confirmed) return
    }

    const demoProfile = {
      name: 'Ramesh Kumar',
      conditions: ['Diabetes', 'High BP'],
      familyName: 'Kavita Kumar',
      familyNumber: '',
    }

    const dayOffsets = [6, 5, 4, 3, 2, 1.25, 0]
    const sugarValues = [132, 148, 164, 190, 218, 254, 320]

    const bpValues = [
      [118, 76],
      [122, 78],
      [126, 80],
      [131, 83],
      [137, 87],
      [142, 90],
      [148, 94],
    ]

    const sugarReadings = sugarValues.map((value, index) => ({
      id: `demo-sugar-${index}`,
      type: 'sugar',
      value,
      context: index % 2 ? 'after meal' : 'fasting',
      systolic: 0,
      diastolic: 0,
      pulse: 0,
      timestamp: new Date(Date.now() - dayOffsets[index] * DAY_MS).toISOString(),
      source: 'demo',
      confidence: 1,
    }))

    const bpReadings = bpValues.map(([systolic, diastolic], index) => ({
      id: `demo-bp-${index}`,
      type: 'bp',
      value: 0,
      context: '',
      systolic,
      diastolic,
      pulse: 72 + index,
      timestamp: new Date(Date.now() - dayOffsets[index] * DAY_MS).toISOString(),
      source: 'demo',
      confidence: 1,
    }))

    const demoReadings = [...sugarReadings, ...bpReadings]
      .sort((a, b) => timestampValue(a) - timestampValue(b))

    onProfileChange(demoProfile)
    setProfileDraft(demoProfile)
    setEditingProfile(false)
    setProfileNotice(
      'Demo profile loaded. Add a real family number before sending a WhatsApp alert.',
    )

    setReadings(demoReadings)
    setActiveReadingId(sugarReadings[sugarReadings.length - 1].id)
    setReadingType('sugar')

    setForm({
      value: '',
      context: 'fasting',
      systolic: '',
      diastolic: '',
      pulse: '',
    })

    setSource('manual')
    setPhotoConfidence(null)
    setVoicePreview('')
    setReadingError('')
  }

  function clearSavedHealthData() {
    if (!window.confirm(t(
      'Clear this device’s saved health profile, readings, prescription list, and taken status? Saved account reports are not deleted.',
    ))) {
      return
    }

    try {
      window.localStorage.removeItem(READINGS_STORAGE_KEY)
    } catch {
      setReadingError(
        'This browser could not clear saved health data. Clear this site’s storage in your browser settings.',
      )
      return
    }

    setReadings([])
    setActiveReadingId('')
    setProfileDraft({ ...blankProfile })
    setEditingProfile(true)
    setProfileNotice('Saved health data was cleared from this device.')
    setProfileError('')

    setForm({
      value: '',
      context: 'fasting',
      systolic: '',
      diastolic: '',
      pulse: '',
    })

    setPhotoConfidence(null)
    setVoicePreview('')
    setSource('manual')
    setReadingError('')

    onProfileChange({ ...blankProfile })
    onClearLocalData()
  }

  function clearSpeechVoiceWait() {
    speechVoiceWaitRef.current?.()
    speechVoiceWaitRef.current = null
  }

  function clearSpeechStartTimer() {
    if (speechStartTimerRef.current === null) return

    window.clearTimeout(speechStartTimerRef.current)
    speechStartTimerRef.current = null
  }

  function speakMessage(text, emptyMessage, fallbackSpeech = '') {
    const synthesis = typeof window !== 'undefined'
      ? window.speechSynthesis
      : null

    if (
      typeof synthesis?.speak !== 'function'
      || typeof synthesis.getVoices !== 'function'
      || typeof window.SpeechSynthesisUtterance !== 'function'
    ) {
      setIsSpeaking(false)
      setSpeechMessage('Audio playback is not available in this browser.')
      return
    }

    const requestId = ++speechRequestRef.current
    const speech = typeof text === 'string' ? text.trim() : ''

    if (!speech) {
      clearSpeechVoiceWait()
      clearSpeechStartTimer()
      synthesis.cancel?.()
      setIsSpeaking(false)
      setSpeechMessage(emptyMessage)
      return
    }

    try {
      clearSpeechVoiceWait()
      clearSpeechStartTimer()

      const hadActiveSpeech = synthesis.speaking || synthesis.pending

      if (hadActiveSpeech) synthesis.cancel?.()

      const finishWithError = (message) => {
        if (requestId !== speechRequestRef.current) return

        clearSpeechVoiceWait()
        clearSpeechStartTimer()
        setIsSpeaking(false)
        setSpeechMessage(message)
      }

      const speakWithAvailableVoice = (voices) => {
        if (requestId !== speechRequestRef.current) return

        const requestedLanguage = language.toLowerCase()
        const languageCode = requestedLanguage.split('-')[0]

        let voice = voices.find(
          (item) => item.lang?.toLowerCase() === requestedLanguage,
        ) || voices.find(
          (item) => item.lang?.toLowerCase().split('-')[0] === languageCode,
        )

        let utteranceSpeech = speech
        let utteranceLanguage = language
        let fallbackNotice = ''

        if (!voice) {
          const fallback = typeof fallbackSpeech === 'string'
            ? fallbackSpeech.trim()
            : ''

          voice = fallback
            ? voices.find((item) => item.lang?.toLowerCase().startsWith('en-'))
              || voices.find((item) => item.default)
              || voices[0]
            : null

          if (!voice) {
            finishWithError(
              'No voice is available for this language. Change language or install a system voice.',
            )
            return
          }

          utteranceSpeech = fallback
          utteranceLanguage = voice.lang || 'en-US'

          fallbackNotice = 'The requested voice is unavailable; instructions will be read in English.'
        }

        let utterance

        try {
          utterance = new window.SpeechSynthesisUtterance(utteranceSpeech)
          utterance.voice = voice
          utterance.lang = utteranceLanguage
          utterance.rate = 0.95
          utterance.volume = 1
        } catch {
          finishWithError(
            'Audio could not start. Please read the instructions on screen.',
          )
          return
        }

        let hasStarted = false
        let hasEnded = false
        let hasErrored = false

        utterance.onstart = () => {
          if (requestId !== speechRequestRef.current || hasErrored) return

          hasStarted = true
          clearSpeechStartTimer()
          setIsSpeaking(true)

          setSpeechMessage(
            fallbackNotice
              ? `${fallbackNotice} Speaking instructions…`
              : 'Speaking instructions…',
          )
        }

        utterance.onend = () => {
          if (requestId !== speechRequestRef.current || hasErrored) return

          hasEnded = true
          clearSpeechStartTimer()
          setIsSpeaking(false)

          setSpeechMessage(
            hasStarted
              ? (fallbackNotice ? `${fallbackNotice} Audio finished.` : 'Audio finished.')
              : 'Audio did not start. Please try again.',
          )
        }

        utterance.onerror = (event) => {
          hasErrored = true

          const errorMessages = {
            'not-allowed': 'Chrome blocked audio playback. Try again or check this site’s audio permissions.',
            'voice-unavailable': 'No voice is available for this language. Change language or install a system voice.',
            'language-unavailable': 'No voice is available for this language. Change language or install a system voice.',
          }

          finishWithError(
            errorMessages[event?.error]
            || 'Audio could not be played. Please read the instructions on screen.',
          )
        }

        const startSpeaking = () => {
          speechStartTimerRef.current = null

          if (requestId !== speechRequestRef.current) return

          try {
            synthesis.speak(utterance)

            if (!hasStarted && !hasEnded) {
              speechStartTimerRef.current = window.setTimeout(() => {
                speechStartTimerRef.current = null

                finishWithError(
                  'Audio did not start. Check system voices or read the instructions instead.',
                )
              }, 5000)
            }
          } catch {
            finishWithError(
              'Audio could not start. Please read the instructions on screen.',
            )
          }
        }

        if (hadActiveSpeech) {
          speechStartTimerRef.current = window.setTimeout(startSpeaking, 50)
        } else {
          startSpeaking()
        }
      }

      setIsSpeaking(true)
      setSpeechMessage('Preparing audio…')

      const voices = synthesis.getVoices()

      if (voices.length) {
        speakWithAvailableVoice(voices)
      } else {
        const onVoicesChanged = () => {
          const availableVoices = synthesis.getVoices()

          if (!availableVoices.length) return

          clearSpeechVoiceWait()
          speakWithAvailableVoice(availableVoices)
        }

        let timeoutId

        const cleanup = () => {
          window.clearTimeout(timeoutId)
          synthesis.removeEventListener?.('voiceschanged', onVoicesChanged)
        }

        if (typeof synthesis.addEventListener !== 'function') {
          finishWithError(
            'Voices could not be loaded in this browser. Read the instructions instead.',
          )
          return
        }

        synthesis.addEventListener('voiceschanged', onVoicesChanged)

        timeoutId = window.setTimeout(() => {
          const availableVoices = synthesis.getVoices()

          clearSpeechVoiceWait()

          if (availableVoices.length) {
            speakWithAvailableVoice(availableVoices)
          } else {
            finishWithError(
              'No speech voices are available in this browser. Check system voices or read the instructions.',
            )
          }
        }, 3000)

        speechVoiceWaitRef.current = cleanup
        onVoicesChanged()
      }
    } catch {
      setIsSpeaking(false)
      setSpeechMessage('Audio could not start. Please read the instructions on screen.')
    }
  }

  function listenToReadingInstructions() {
    const englishSpeech = readingType === 'sugar'
      ? 'To enter blood sugar, type the number shown on your glucose meter in milligrams per deciliter. Choose whether it was measured fasting, after a meal, or at another time. Then select Save reading.'
      : 'To enter blood pressure, type the top number, systolic, and the bottom number, diastolic, shown on your monitor. If it displays a pulse or heart rate, enter it in the optional pulse field. Then select Save reading.'

    const speech = language === 'hi-IN'
      ? readingType === 'sugar'
        ? 'ब्लड शुगर दर्ज करने के लिए ग्लूकोमीटर पर दिख रहा नंबर मिलीग्राम प्रति डेसीलीटर में भरें। फिर चुनें कि रीडिंग खाली पेट, खाने के बाद, या किसी भी समय ली गई थी। रीडिंग सेव करें दबाएं।'
        : 'ब्लड प्रेशर दर्ज करने के लिए मशीन पर दिख रहा ऊपर का नंबर, सिस्टोलिक, और नीचे का नंबर, डायस्टोलिक, भरें। अगर मशीन पल्स या हार्ट रेट दिखाती है, तो उसे वैकल्पिक पल्स वाले खाने में भरें। रीडिंग सेव करें दबाएं।'
      : englishSpeech

    speakMessage(
      speech,
      'There are no instructions to read aloud.',
      language === 'hi-IN' ? englishSpeech : '',
    )
  }

  function listenToSafetyMessage() {
    const speech = activeSafety
      ? [
          activeSafety.message,
          ...trendWarnings.map(
            (warning) => language === 'hi-IN'
              ? warning.messageHindi
              : warning.message,
          ),
        ].join(' ')
      : ''

    const englishSpeech = activeReading
      ? [
          getSafetyMessage(activeReading, 'en-IN').message,
          ...trendWarnings.map((warning) => warning.message),
        ].join(' ')
      : ''

    speakMessage(
      speech,
      'There is no safety message to read aloud.',
      language === 'hi-IN' ? englishSpeech : '',
    )
  }

  function stopSpeaking() {
    speechRequestRef.current += 1
    clearSpeechVoiceWait()
    clearSpeechStartTimer()

    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel?.()
    }

    setIsSpeaking(false)
    setSpeechMessage('Audio stopped.')
  }

  function alertFamily() {
    if (
      !profile?.familyNumber
      || toWhatsAppDigits(profile.familyNumber).length < 8
    ) {
      setProfileError(
        'Add a WhatsApp number with country code in your profile before alerting family.',
      )
      setProfileNotice('')
      setEditingProfile(true)
      return
    }

    if (!activeReading) return

    const status = classifyReading(activeReading)
    const label = language === 'hi-IN' ? status.labelHindi : status.label

    const readingDescription = activeReading.type === 'sugar'
      ? `${profile.name || 'Patient'}'s blood sugar is ${activeReading.value} mg/dL (${label})`
      : `${profile.name || 'Patient'}'s blood pressure is ${activeReading.systolic}/${activeReading.diastolic} mmHg (${label})`

    const trendText = trendWarnings.length
      ? ` ${trendWarnings.map(
          (warning) => language === 'hi-IN'
            ? warning.titleHindi
            : warning.title,
        ).join('. ')}.`
      : ''

    const message = `MedSafe alert: ${readingDescription} at ${new Date(activeReading.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.${trendText} Please check on them and contact their doctor if needed.`

    const phone = toWhatsAppDigits(profile.familyNumber)

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  function deleteReading(id) {
    setReadings((current) => current.filter((reading) => reading.id !== id))

    if (activeReadingId === id) {
      setActiveReadingId('')
    }
  }

  const sortedReadings = useMemo(
    () => [...readings].sort(
      (a, b) => timestampValue(b) - timestampValue(a),
    ),
    [readings],
  )

  const activeStatusLabel = activeSafety && (
    language === 'hi-IN'
      ? activeSafety.status.labelHindi
      : activeSafety.status.label
  )

  return (
    <section className="health-page" aria-labelledby="health-heading">
      <div className="health-intro">
        <div>
          <span className="health-eyebrow">{t('CHRONIC CARE, MADE SIMPLE')}</span>
          <h1 id="health-heading">{t('My Health')}</h1>
          <p>{t('Log a reading, understand changes, and keep family in the loop.')}</p>
        </div>

        <button
          type="button"
          className="health-button health-button-demo"
          onClick={loadDemoData}
        >
          {t('Load demo data')}
        </button>
      </div>

      <p className="health-demo-note">
        {t('Demo readings are fictional and replace the saved health profile and readings on this device.')}
      </p>

      <section
        className="health-panel profile-panel"
        id="health-profile"
        aria-labelledby="profile-heading"
      >
        <div className="health-panel-heading">
          <div>
            <span className="health-step">01</span>
            <h2 id="profile-heading">
              {t('Patient profile')}
            </h2>
          </div>

          {!editingProfile && (
            <button
              type="button"
              className="health-text-button"
              onClick={() => {
                setEditingProfile(true)
                setProfileNotice('')
              }}
            >
              {t('Edit')}
            </button>
          )}
        </div>

        {editingProfile ? (
          <form className="profile-form" onSubmit={saveProfile}>
            <label className="health-field">
              <span>
                {t('Patient name')}
              </span>

              <input
                value={profileDraft.name}
                onChange={(event) => updateProfileDraft('name', event.target.value)}
                placeholder={t('e.g. Ramesh Kumar')}
                autoComplete="name"
              />
            </label>

            <fieldset className="condition-fieldset">
              <legend>
                {t('Conditions')}
              </legend>

              <div className="condition-options">
                {conditionOptions.map((condition) => (
                  <label className="condition-option" key={condition}>
                    <input
                      type="checkbox"
                      checked={profileDraft.conditions.includes(condition)}
                      onChange={() => toggleCondition(condition)}
                    />

                    <span>
                      {t(condition)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="profile-family-grid">
              <label className="health-field">
                <span>
                  {t('Family member name')}
                </span>

                <input
                  value={profileDraft.familyName}
                  onChange={(event) => updateProfileDraft('familyName', event.target.value)}
                  placeholder={t('e.g. Kavita Kumar')}
                  autoComplete="name"
                />
              </label>

              <label className="health-field">
                <span>
                  {t('WhatsApp number (with country code)')}
                </span>

                <input
                  type="tel"
                  value={profileDraft.familyNumber}
                  onChange={(event) => updateProfileDraft('familyNumber', event.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </label>
            </div>

            {profileError && (
              <p className="health-inline-error" role="alert">
                {t(profileError)}
              </p>
            )}

            {profileNotice && (
              <p className="health-inline-note">{t(profileNotice)}</p>
            )}

            <button
              type="submit"
              className="health-button health-button-primary"
            >
              {t('Save profile')}
            </button>
          </form>
        ) : (
          <div className="profile-summary">
            <div className="profile-name">{profile?.name || t('Patient')}</div>

            <div className="profile-conditions">
              {profile?.conditions?.length
                ? profile.conditions.map((condition) => (
                    <span className="condition-chip" key={condition}>
                      {t(condition)}
                    </span>
                  ))
                : (
                    <span className="muted-copy">
                      {t('No conditions selected')}
                    </span>
                  )}
            </div>

            <div className="profile-family-summary">
              <span>
                {t('Family contact')}
              </span>

              <strong>
                {profile?.familyName
                  || t('Not added')}
              </strong>

              <span>
                {profile?.familyNumber
                  || t('No WhatsApp number added')}
              </span>
            </div>

            {profileNotice && (
              <p className="health-inline-note">{t(profileNotice)}</p>
            )}
          </div>
        )}
      </section>

      {activeReading && activeSafety && (
        <section
          className={`health-safety-result safety-${activeSafety.status.color}`}
          aria-live="polite"
        >
          <div className="safety-result-topline">
            <span className="safety-status">{activeStatusLabel}</span>

            <time>
              {formatTimestamp(timestampValue(activeReading), language, t)}
            </time>
          </div>

          <div className="safety-reading-value">
            {readingValue(activeReading, language)}
          </div>

          {activeReading.type === 'sugar' && activeReading.context && (
            <div className="reading-context">
              {t(readingContextLabels[activeReading.context] || activeReading.context)}
            </div>
          )}

          <p className="safety-message">{t(activeSafety.message)}</p>

          {trendWarnings.length > 0 && (
            <div className="trend-warning-list">
              {trendWarnings.map((warning) => (
                <div className="trend-warning" key={warning.key}>
                  <strong>
                    {language === 'hi-IN' ? warning.titleHindi : t(warning.title)}
                  </strong>

                  <span>
                    {language === 'hi-IN' ? warning.messageHindi : t(warning.message)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="safety-result-actions">
            <button
              type="button"
              className="health-button health-button-listen"
              onClick={listenToSafetyMessage}
            >
              {t('Listen to steps')}
            </button>

            {needsFamilyAlert && (
              <button
                type="button"
                className="health-button health-button-family"
                onClick={alertFamily}
              >
                {t('Alert family on WhatsApp')}
              </button>
            )}
          </div>

          {activeSafety.status.severity === 'critical' && (
            <div className="critical-actions">
              <strong>
                {t('Get help now')}
              </strong>

              <a
                className="health-button health-button-emergency"
                href="tel:112"
              >
                {t('Call emergency (112)')}
              </a>
            </div>
          )}
        </section>
      )}

      <section
        className="health-panel reading-entry-panel"
        aria-labelledby="reading-heading"
      >
        <div className="health-panel-heading">
          <div>
            <span className="health-step">02</span>
            <h2 id="reading-heading">
              {t('Log a reading')}
            </h2>
          </div>

        </div>

        <div
          className="reading-type-tabs"
          role="tablist"
          aria-label={t('Reading type')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={readingType === 'sugar'}
            className={readingType === 'sugar' ? 'selected' : ''}
            onClick={() => {
              setReadingType('sugar')
              setSource('manual')
              setPhotoConfidence(null)
              setVoicePreview('')
            }}
          >
            {t('Blood sugar')}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={readingType === 'bp'}
            className={readingType === 'bp' ? 'selected' : ''}
            onClick={() => {
              setReadingType('bp')
              setSource('manual')
              setPhotoConfidence(null)
              setVoicePreview('')
            }}
          >
            {t('Blood pressure')}
          </button>
        </div>

        <div className="voice-entry-row">
          <button
            type="button"
            className="health-button health-button-listen"
            onClick={listenToReadingInstructions}
            disabled={isSpeaking}
          >
            {t('Listen to entry instructions')}
          </button>

          {isSpeaking && (
            <button
              type="button"
              className="health-button health-button-listen"
              onClick={stopSpeaking}
            >
              {t('Stop audio')}
            </button>
          )}
        </div>

        {speechMessage && (
          <p className="health-inline-note" role="status" aria-live="polite">
            {t(speechMessage)}
          </p>
        )}

        {speechRecognitionSupported ? (
          <div className="voice-entry-row">
            <button
              type="button"
              className={`health-button health-button-voice ${listening ? 'is-listening' : ''}`}
              onClick={startVoiceEntry}
              disabled={listening}
            >
              <span aria-hidden="true">🎙</span>

              {listening
                ? t('Listening…')
                : t('Speak a reading')}
            </button>

            <span>
              {t('Try “sugar 140” or “BP 130 over 85”.')}
            </span>
          </div>
        ) : (
          <p className="health-capability-note">
            {t('Voice entry is not available in this browser. You can type the reading instead.')}
          </p>
        )}

        {voicePreview && (
          <div className="parsed-reading-note">
            <strong>
              {t('Heard:')}
            </strong>{' '}
            {voicePreview} —{' '}
            {t('Review, edit if needed, then save.')}
          </div>
        )}

        {photoConfidence !== null && (
          <div className="parsed-reading-note photo-reading-note">
            <div>
              <strong>
                {t('Read from meter photo — confirm before saving')}
              </strong>

              <span>
                {readingType === 'sugar'
                  ? `${form.value || '—'} mg/dL · ${t(readingContextLabels[form.context] || form.context)}`
                  : `${form.systolic || '—'}/${form.diastolic || '—'} mmHg${form.pulse ? ` · ${language === 'hi-IN' ? 'पल्स' : 'pulse'} ${form.pulse}` : ''}`}
              </span>
            </div>

            {photoConfidence < 0.7 && (
              <span className="low-confidence-badge">
                {t('Low confidence — please confirm')}
              </span>
            )}
          </div>
        )}

        <form className="reading-form" onSubmit={saveTypedReading}>
          {readingType === 'sugar' ? (
            <>
              <label className="health-field">
                <span>
                  {t('Blood sugar (mg/dL)')}
                </span>

                <input
                  type="number"
                  min="1"
                  max="800"
                  step="1"
                  inputMode="numeric"
                  value={form.value}
                  onChange={(event) => setField('value', event.target.value)}
                  placeholder={t('e.g. 140')}
                />
              </label>

              <label className="health-field">
                <span>
                  {t('When was it measured?')}
                </span>

                <select
                  value={form.context}
                  onChange={(event) => setField('context', event.target.value)}
                >
                  <option value="fasting">
                    {t('Fasting')}
                  </option>

                  <option value="after meal">
                    {t('After meal')}
                  </option>

                  <option value="random">
                    {t('Random')}
                  </option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="health-field">
                <span>
                  {t('Top number (systolic)')}
                </span>

                <input
                  type="number"
                  min="1"
                  max="350"
                  step="1"
                  inputMode="numeric"
                  value={form.systolic}
                  onChange={(event) => setField('systolic', event.target.value)}
                  placeholder={t('e.g. 130')}
                />
              </label>

              <label className="health-field">
                <span>
                  {t('Bottom number (diastolic)')}
                </span>

                <input
                  type="number"
                  min="1"
                  max="250"
                  step="1"
                  inputMode="numeric"
                  value={form.diastolic}
                  onChange={(event) => setField('diastolic', event.target.value)}
                  placeholder={t('e.g. 85')}
                />
              </label>

              <label className="health-field">
                <span>
                  {t('Pulse (optional)')}
                </span>

                <input
                  type="number"
                  min="1"
                  max="250"
                  step="1"
                  inputMode="numeric"
                  value={form.pulse}
                  onChange={(event) => setField('pulse', event.target.value)}
                  placeholder={t('e.g. 72')}
                />
              </label>
            </>
          )}

          <div className="reading-submit-row">
            <button
              type="submit"
              className="health-button health-button-primary"
              disabled={photoLoading}
            >
              {photoConfidence !== null || voicePreview
                ? t('Confirm and save')
                : t('Save reading')}
            </button>

            {source === 'photo' && (
              <span>
                {t('Check or edit the photo reading first.')}
              </span>
            )}
          </div>
        </form>

        <div className="meter-photo-row">
          <label
            className={`health-button health-button-photo ${photoLoading ? 'is-loading' : ''}`}
          >
            <span aria-hidden="true">▧</span>

            {photoLoading
              ? t('Reading photo…')
              : t('Use a meter photo')}

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleMeterPhoto}
              disabled={photoLoading}
            />
          </label>

          <span>
            {t('Photo the glucometer or BP screen')}
          </span>
        </div>

        {readingError && (
          <p className="health-inline-error" role="alert">
            {t(readingError)}
          </p>
        )}

        <p className="health-data-note">
          {t('Readings stay in this browser. Always check AI-read values before saving.')}
        </p>
      </section>

      <section
        className="health-panel history-panel"
        aria-labelledby="history-heading"
      >
        <div className="health-panel-heading">
          <div>
            <span className="health-step">03</span>
            <h2 id="history-heading">
              {t('History and trends')}
            </h2>
          </div>

          <span className="history-count">
            {readings.length} {t('readings')}
          </span>
        </div>

        <div className="health-data-controls">
          <p>
            {t('Profile, readings, medicine details, and taken status are stored in this browser. Clear them before sharing this device. Saved account reports are not affected.')}
          </p>

          <button
            type="button"
            className="health-text-button"
            onClick={clearSavedHealthData}
          >
            {t('Clear saved health data on this device')}
          </button>
        </div>

        <div className="health-chart-grid">
          <ReadingChart type="sugar" readings={readings} />
          <ReadingChart type="bp" readings={readings} />
        </div>

        <div className="reading-history">
          <h3>
            {t('Recent readings')}
          </h3>

          {sortedReadings.length ? (
            sortedReadings.map((reading) => {
              const status = classifyReading(reading)
              const selected = activeReading?.id === reading.id

              return (
                <article
                  className={`history-row ${selected ? 'is-selected' : ''}`}
                  key={reading.id}
                >
                  <button
                    type="button"
                    className="history-reading-button"
                    onClick={() => setActiveReadingId(reading.id)}
                  >
                    <span className={`history-status-dot status-${status.color}`} />

                    <span className="history-reading-main">
                      <strong>
                        {t(reading.type === 'sugar' ? 'Blood sugar' : 'Blood pressure')}
                      </strong>

                      <span>
                        {readingValue(reading, language)}
                        {reading.type === 'sugar' && reading.context
                          ? ` · ${t(readingContextLabels[reading.context] || reading.context)}`
                          : ''}
                      </span>
                    </span>

                    <span className={`history-status status-${status.color}`}>
                      {language === 'hi-IN' ? status.labelHindi : t(status.label)}
                    </span>

                    <time>
                      {formatTimestamp(timestampValue(reading), language, t)}
                    </time>
                  </button>

                  <button
                    type="button"
                    className="history-delete-button"
                    onClick={() => deleteReading(reading.id)}
                    aria-label={t('Delete {type} reading {value}', {
                      type: t(reading.type === 'sugar' ? 'Blood sugar' : 'Blood pressure'),
                      value: readingValue(reading, language),
                    })}
                  >
                    {t('Delete')}
                  </button>
                </article>
              )
            })
          ) : (
            <p className="health-chart-empty">
              {t('Saved readings will appear here.')}
            </p>
          )}
        </div>
      </section>

      <p className="health-disclaimer">
        {t('This is not medical advice and does not replace a doctor. In an emergency call 112.')}
      </p>
    </section>
  )
}

export default MyHealth