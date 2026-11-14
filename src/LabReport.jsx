import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from './i18n.js'
import './LabReport.css'

const supportedLanguages = ['en-IN', 'hi-IN', 'bn-IN', 'mr-IN', 'ta-IN', 'te-IN', 'gu-IN', 'pa-IN']
const maxReportFileBytes = 7 * 1024 * 1024
const supportedReportImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const demoTests = [
  {
    name: 'Haemoglobin',
    value: '10.2',
    unit: 'g/dL',
    reference_range: '13.0-17.0',
    status: 'low',
    meaning: 'Haemoglobin carries oxygen in the blood; this result is below the range printed on this report.',
  },
  {
    name: 'Fasting Blood Glucose',
    value: '142',
    unit: 'mg/dL',
    reference_range: '70-100',
    status: 'high',
    meaning: 'This test measures blood sugar after fasting; this result is above the range printed on this report.',
  },
  {
    name: 'HbA1c',
    value: '7.8',
    unit: '%',
    reference_range: '4.0-5.6',
    status: 'high',
    meaning: 'HbA1c estimates average blood sugar over recent months; this result is above the range printed on this report.',
  },
  {
    name: 'Total Cholesterol',
    value: '228',
    unit: 'mg/dL',
    reference_range: '<200',
    status: 'high',
    meaning: 'This test measures cholesterol in the blood; this result is above the range printed on this report.',
  },
  {
    name: 'Serum Creatinine',
    value: '0.9',
    unit: 'mg/dL',
    reference_range: '0.7-1.3',
    status: 'normal',
    meaning: 'Creatinine helps check how the kidneys filter blood; this result is within the range printed on this report.',
  },
  {
    name: 'TSH',
    value: '2.4',
    unit: 'uIU/mL',
    reference_range: '0.4-4.0',
    status: 'normal',
    meaning: 'TSH is a signal that helps check thyroid function; this result is within the range printed on this report.',
  },
  {
    name: 'Vitamin B12',
    value: '180',
    unit: 'pg/mL',
    reference_range: '211-911',
    status: 'low',
    meaning: 'Vitamin B12 supports blood cells and nerves; this result is below the range printed on this report.',
  },
]

const demoReport = {
  tests: demoTests,
  summary: 'This report has seven listed results. Five are outside the ranges printed on the report. Haemoglobin and Vitamin B12 are below their ranges, while glucose, HbA1c and total cholesterol are above theirs. Please discuss these results with your doctor.',
  questions_for_doctor: [
    'What do these results mean for my health?',
    'Do I need any repeat tests or follow-up?',
    'Could my medicines or daily routine affect these results?',
  ],
  unclear: [],
}

const statusOrder = { low: 0, high: 1, normal: 2, unknown: 3 }

function getSavedReportLanguage() {
  try {
    const saved = window.localStorage.getItem('medsafe-lab-language')
    return supportedLanguages.includes(saved) ? saved : 'hi-IN'
  } catch {
    return 'hi-IN'
  }
}

function isValidReport(value) {
  return value
    && Array.isArray(value.tests)
    && value.tests.length <= 200
    && value.tests.every((test) => (
      test
      && typeof test === 'object'
      && typeof test.name === 'string'
      && typeof test.value === 'string'
      && typeof test.unit === 'string'
      && typeof test.reference_range === 'string'
      && ['low', 'normal', 'high', 'unknown'].includes(test.status)
      && typeof test.meaning === 'string'
      && typeof test.method === 'string'
    ))
    && typeof value.summary === 'string'
    && value.summary.length <= 5000
    && Array.isArray(value.questions_for_doctor)
    && value.questions_for_doctor.length <= 3
    && value.questions_for_doctor.every((item) => typeof item === 'string')
    && Array.isArray(value.unclear)
    && value.unclear.length <= 100
    && value.unclear.every((item) => typeof item === 'string')
}

async function fileToBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('This file could not be prepared for upload.'))
    reader.readAsDataURL(file)
  })
  const separator = dataUrl.indexOf(',')
  if (separator < 0) throw new Error('This file could not be prepared for upload.')
  return dataUrl.slice(separator + 1)
}

async function resizeImage(file) {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const loadedImage = new Image()
      loadedImage.onload = () => resolve(loadedImage)
      loadedImage.onerror = () => reject(new Error('This photo could not be opened. Please choose another image.'))
      loadedImage.src = imageUrl
    })
    const largestSide = Math.max(image.naturalWidth, image.naturalHeight)
    if (!largestSide) throw new Error('This photo has no readable image data.')
    const scale = Math.min(1, 1600 / largestSide)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not prepare the photo. Please try another browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => (
        result
          ? resolve(result)
          : reject(new Error('This photo could not be resized. Please try again.'))
      ), 'image/jpeg', 0.85)
    })
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('This photo could not be prepared for upload.'))
      reader.readAsDataURL(blob)
    })
    return { image: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

async function prepareReportFile(file) {
  if (file.type === 'application/pdf') {
    return { image: await fileToBase64(file), mediaType: file.type }
  }
  return resizeImage(file)
}

function statusLabel(status) {
  return { low: 'Low', high: 'High', normal: 'Normal', unknown: 'Check' }[status] || 'Check'
}

function todayAsInputDate() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function localDateLabel(value, language = 'en-IN', t = (message) => message) {
  if (!value) return t('Date not recorded')
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? t('Date not recorded') : date.toLocaleDateString(language)
}

function numericValue(value) {
  const text = String(value || '').trim()
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ? Number(text) : null
}

function normalizeClientText(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function LabTrendChart({ points, label }) {
  const { language, t } = useLanguage()
  if (!points.length) return <p className="lab-history-empty">{t('No saved numeric results for this test yet.')}</p>
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = max === min ? Math.max(Math.abs(max) * 0.1, 1) : (max - min) * 0.12
  const low = min - padding
  const high = max + padding
  const chartWidth = 640
  const chartHeight = 190
  const inset = { x: 34, y: 18 }
  const plotWidth = chartWidth - inset.x * 2
  const plotHeight = chartHeight - inset.y * 2
  const plotted = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? chartWidth / 2 : inset.x + (index / (points.length - 1)) * plotWidth,
    y: inset.y + ((high - point.value) / (high - low)) * plotHeight,
  }))
  const colorFor = (status) => ({ low: '#c28a24', high: '#c74e4a', normal: '#3d8b5a', unknown: '#899590' })[status] || '#899590'

  return (
    <div className="lab-trend-chart">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={t('Saved results over time for {test}', { test: label })}>
        <line x1={inset.x} y1={inset.y + plotHeight / 2} x2={chartWidth - inset.x} y2={inset.y + plotHeight / 2} />
        {plotted.length > 1 && <polyline points={plotted.map((point) => `${point.x},${point.y}`).join(' ')} />}
        {plotted.map((point) => (
          <circle key={`${point.id}-${point.name}-${point.date}`} cx={point.x} cy={point.y} r="5" fill={colorFor(point.status)}>
            <title>{`${localDateLabel(point.date, language, t)}: ${point.rawValue} ${point.unit} (${t(statusLabel(point.status))})`}</title>
          </circle>
        ))}
      </svg>
      <div className="lab-trend-dates"><span>{localDateLabel(points[0].date, language, t)}</span><span>{localDateLabel(points[points.length - 1].date, language, t)}</span></div>
      <p className="lab-trend-disclaimer">{t('Informational changes only. A rise or fall is not automatically better or worse.')}</p>
    </div>
  )
}

function LabReport() {
  const { language: uiLanguage, t } = useLanguage()
  const [reportLanguage, setReportLanguage] = useState(getSavedReportLanguage)
  const [report, setReport] = useState(null)
  const [sourceReport, setSourceReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [error, setError] = useState('')
  const translationRequest = useRef(0)
  const [patient, setPatient] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authLoading, setAuthLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyMessage, setHistoryMessage] = useState('')
  const [reportDate, setReportDate] = useState(todayAsInputDate)
  const [laboratory, setLaboratory] = useState('')
  const [isDemoReport, setIsDemoReport] = useState(false)
  const [currentSavedId, setCurrentSavedId] = useState('')
  const [savingReport, setSavingReport] = useState(false)
  const [comparisonSelection, setComparisonSelection] = useState({ previous: '', latest: '' })
  const [comparison, setComparison] = useState(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonError, setComparisonError] = useState('')
  const [trendKey, setTrendKey] = useState('')
  const [summarySelection, setSummarySelection] = useState([])

  const orderedTests = useMemo(() => (
    report
      ? [...report.tests].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3))
      : []
  ), [report])
  const abnormalTests = report?.tests.filter((test) => test.status === 'low' || test.status === 'high') || []
  const abnormalCount = abnormalTests.length
  const unknownCount = report?.tests.filter((test) => test.status === 'unknown').length || 0
  const trendOptions = useMemo(() => {
    const options = new Map()
    history.forEach((savedReport) => {
      savedReport.tests.forEach((test) => {
        const value = numericValue(test.value)
        if (value === null || !test.name || !test.unit) return
        const key = JSON.stringify([test.name, test.unit, test.method || ''])
        if (!options.has(key)) options.set(key, { key, name: test.name, unit: test.unit, method: test.method || '' })
      })
    })
    return [...options.values()]
  }, [history])
  const trendPoints = useMemo(() => {
    const selected = trendOptions.find((option) => option.key === trendKey)
    if (!selected) return []
    return [...history]
      .sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate))
      .flatMap((savedReport) => savedReport.tests
        .filter((test) => (
          normalizeClientText(test.name) === normalizeClientText(selected.name)
          && normalizeClientText(test.unit) === normalizeClientText(selected.unit)
          && normalizeClientText(test.method) === normalizeClientText(selected.method)
        ))
        .map((test) => ({
          id: savedReport.id,
          name: test.name,
          date: savedReport.reportDate,
          rawValue: test.value,
          value: numericValue(test.value),
          unit: test.unit,
          status: test.status,
        })))
  }, [history, trendKey, trendOptions])

  useEffect(() => {
    let active = true
    async function restoreSession() {
        try {
          const response = await fetch('/api/auth/me')
          const result = await response.json()
          if (!response.ok) {
            if (response.status !== 401 && active) setAuthError(result.error || 'Account service is currently unavailable.')
            return
          }
          if (!active) return
          setPatient(result.patient)
          await refreshHistory(active)
        } catch {
          if (active) setAuthError('Could not reach the account service. Your current report remains available.')
        } finally {
          if (active) setAuthLoading(false)
        }
    }
    void restoreSession()
    return () => { active = false }
  }, [])

  async function refreshHistory(isMounted = true) {
    setHistoryLoading(true)
    setHistoryError('')
    try {
        const response = await fetch('/api/patient/reports')
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not load your health history.')
        if (isMounted) setHistory(Array.isArray(result.reports) ? result.reports : [])
    } catch (loadError) {
        if (isMounted) setHistoryError(loadError.name === 'TypeError'
          ? 'Could not reach the health history service.'
          : loadError.message || 'Could not load your health history.')
    } finally {
        if (isMounted) setHistoryLoading(false)
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')
    try {
        const response = await fetch(`/api/auth/${authMode === 'register' ? 'register' : 'login'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not sign in.')
        setPatient(result.patient)
        setAuthForm({ name: '', email: '', password: '' })
        setSummarySelection([])
        await refreshHistory()
    } catch (requestError) {
        setAuthError(requestError.name === 'TypeError'
          ? 'Could not reach the account service. Please try again.'
          : requestError.message || 'Could not sign in.')
    } finally {
        setAuthSubmitting(false)
    }
  }

  async function handleSignOut() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
        setAuthError('Could not confirm sign-out with the server.')
    }
    setPatient(null)
    setHistory([])
    setSummarySelection([])
    setComparison(null)
    setReport(null)
    setSourceReport(null)
    setCurrentSavedId('')
    setIsDemoReport(false)
    setHistoryMessage('')
  }

  async function saveReportToHistory(reportToSave) {
    const response = await fetch('/api/patient/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate,
          laboratory,
          tests: reportToSave.tests,
          summary: reportToSave.summary,
          questions_for_doctor: reportToSave.questions_for_doctor,
          unclear: reportToSave.unclear,
        }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not save this report.')
    setHistory((previous) => [result.report, ...previous.filter((item) => item.id !== result.report.id)]
        .sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate)))
    setCurrentSavedId(result.report.id)
    setHistoryMessage('Report saved to your private account history. The original photo was not stored.')
    return result.report
  }

  async function saveCurrentReport() {
    if (!patient) {
        setHistoryMessage('Sign in or create an account to save this report privately.')
        return
    }
    if (!sourceReport || isDemoReport) {
        setHistoryMessage('Demo results are not saved to patient history.')
        return
    }
    setSavingReport(true)
    setHistoryError('')
    try {
        await saveReportToHistory(sourceReport)
    } catch (saveError) {
        setHistoryError(saveError.name === 'TypeError'
          ? 'Could not reach the report history service. Your extracted results are still on screen.'
          : saveError.message || 'Could not save this report.')
    } finally {
        setSavingReport(false)
    }
  }

  async function openSavedReport(reportId) {
    setHistoryError('')
    try {
        const response = await fetch(`/api/patient/reports/${encodeURIComponent(reportId)}`)
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not open this report.')
        const savedReport = result.report
        setSourceReport(savedReport)
        setReportDate(String(savedReport.reportDate).slice(0, 10))
        setLaboratory(savedReport.laboratory || '')
        setIsDemoReport(false)
        setCurrentSavedId(savedReport.id)
        setReport(savedReport)
        setError('')
        setHistoryMessage('')
        await applyLanguageToReport(savedReport, reportLanguage)
    } catch (openError) {
        setHistoryError(openError.name === 'TypeError'
          ? 'Could not reach the report history service.'
          : openError.message || 'Could not open this report.')
    }
  }

  async function compareSavedReports() {
    if (!comparisonSelection.previous || !comparisonSelection.latest) return
    setComparisonLoading(true)
    setComparisonError('')
    setComparison(null)
    try {
        const response = await fetch('/api/patient/reports/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previousReportId: comparisonSelection.previous,
            latestReportId: comparisonSelection.latest,
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not compare these reports.')
        setComparison(result)
    } catch (compareError) {
        setComparisonError(compareError.name === 'TypeError'
          ? 'Could not reach the report comparison service.'
          : compareError.message || 'Could not compare these reports.')
    } finally {
        setComparisonLoading(false)
    }
  }

  function selectedHistorySummary() {
    const selected = history
        .filter((savedReport) => summarySelection.includes(savedReport.id))
        .sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate))
    const lines = [
        'MedSafe — appointment health summary',
        `Patient account: ${patient?.name || 'Patient'}`,
        'For discussion with a healthcare professional; not a diagnosis or medical advice.',
        '',
    ]
    selected.forEach((savedReport) => {
        lines.push(`${localDateLabel(savedReport.reportDate)}${savedReport.laboratory ? ` — ${savedReport.laboratory}` : ''}`)
        savedReport.tests.forEach((test) => {
          lines.push(`• ${test.name}: ${test.value || 'not readable'} ${test.unit || ''} | ${statusLabel(test.status)} | printed range: ${test.reference_range || 'not recorded'}`)
        })
        if (savedReport.unclear.length) lines.push(`Confirm on paper: ${savedReport.unclear.join('; ')}`)
        lines.push('')
    })
    if (comparison && summarySelection.includes(comparison.previousReport.id) && summarySelection.includes(comparison.latestReport.id)) {
        lines.push('Informational changes between selected reports (not a judgment about whether the change is good or bad):')
        comparison.comparisons.forEach((item) => {
          lines.push(`• ${item.name}: ${item.previous.value} → ${item.latest.value} ${item.unit} (${item.direction}; difference ${item.difference}; status ${item.previous.status} → ${item.latest.status})`)
        })
    }
    lines.push('Please discuss these results and any changes with your doctor.')
    return lines.join('\n')
  }

  function downloadDoctorSummary() {
    if (!summarySelection.length || !window.confirm(t('This summary contains sensitive health information. Download it to this device?'))) return
    const blob = new Blob([selectedHistorySummary()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'medsafe-appointment-summary.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  function shareDoctorSummary() {
    if (!summarySelection.length || !window.confirm(t('This summary contains sensitive health information. Continue to WhatsApp to choose a healthcare professional to share it with?'))) return
    window.open(`https://wa.me/?text=${encodeURIComponent(selectedHistorySummary())}`, '_blank', 'noopener,noreferrer')
  }

  async function translateReport(baseReport, targetLanguage) {
    const response = await fetch('/api/translate-lab-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: targetLanguage,
        summary: baseReport.summary,
        meanings: baseReport.tests.map((test) => test.meaning),
        questions_for_doctor: baseReport.questions_for_doctor,
        unclear: baseReport.unclear,
      }),
    })
    let result
    try {
      result = await response.json()
    } catch {
      throw new Error('Translation is unavailable. The original English explanation is shown.')
    }
    if (!response.ok) {
      throw new Error(result.error || 'Translation is unavailable. The original English explanation is shown.')
    }
    if (
      !result
      || typeof result.summary !== 'string'
      || !Array.isArray(result.meanings)
      || result.meanings.length !== baseReport.tests.length
      || result.meanings.some((item) => typeof item !== 'string')
      || !Array.isArray(result.questions_for_doctor)
      || result.questions_for_doctor.length !== baseReport.questions_for_doctor.length
      || result.questions_for_doctor.some((item) => typeof item !== 'string')
      || !Array.isArray(result.unclear)
      || result.unclear.length !== baseReport.unclear.length
      || result.unclear.some((item) => typeof item !== 'string')
    ) {
      throw new Error('The translation was incomplete. The original English explanation is shown.')
    }

    return {
      ...baseReport,
      tests: baseReport.tests.map((test, index) => ({ ...test, meaning: result.meanings[index] })),
      summary: result.summary,
      questions_for_doctor: result.questions_for_doctor,
      unclear: result.unclear,
    }
  }

  async function applyLanguageToReport(baseReport, targetLanguage) {
    const requestId = ++translationRequest.current
    setTranslationError('')
    if (targetLanguage === 'en-IN') {
      setReport(baseReport)
      setTranslationLoading(false)
      return
    }

    setTranslationLoading(true)
    try {
      const translated = await translateReport(baseReport, targetLanguage)
      if (requestId === translationRequest.current) setReport(translated)
    } catch (translationFailure) {
      if (requestId === translationRequest.current) {
        setReport(baseReport)
        setTranslationError(translationFailure.name === 'TypeError'
          ? 'Could not reach the translation service. The original English explanation is shown.'
          : translationFailure.message || 'Translation is unavailable. The original English explanation is shown.')
      }
    } finally {
      if (requestId === translationRequest.current) setTranslationLoading(false)
    }
  }

  function handleReportLanguageChange(event) {
    const nextLanguage = event.target.value
    setReportLanguage(nextLanguage)
    try {
      window.localStorage.setItem('medsafe-lab-language', nextLanguage)
    } catch {
      setTranslationError('This browser could not save your language preference.')
    }
    if (sourceReport) void applyLanguageToReport(sourceReport, nextLanguage)
  }

  function loadDemoReport() {
    setSourceReport(demoReport)
    setReport(demoReport)
    setIsDemoReport(true)
    setCurrentSavedId('')
    setHistoryMessage('')
    setError('')
    void applyLanguageToReport(demoReport, reportLanguage)
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (file.type !== 'application/pdf' && !supportedReportImageTypes.has(file.type)) {
      setError('Choose a JPEG, PNG, WebP image, or PDF document.')
      return
    }
    if (file.size > maxReportFileBytes) {
      setError('This file is over 7 MB. Please choose a smaller report.')
      return
    }

    setLoading(true)
    setIsDemoReport(false)
    setCurrentSavedId('')
    setHistoryMessage('')
    translationRequest.current += 1
    setTranslationLoading(false)
    try {
      const resized = await prepareReportFile(file)
      const response = await fetch('/api/read-lab-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...resized, language: 'en-IN' }),
      })
      let result
      try {
        result = await response.json()
      } catch {
        setError({
          message: 'The report service returned an unexpected response (HTTP {status}). Restart the backend with "npm run server" and try again or use the demo.',
          values: { status: response.status },
        })
        return
      }
      if (!response.ok) throw new Error(result.error || 'We could not read this report. Please try again or use the demo.')
      if (!isValidReport(result)) {
        throw new Error('The report reader returned an unclear result. Please try again or use the demo.')
      }
      const extractedReport = {
        tests: result.tests.map((test) => ({
          name: typeof test.name === 'string' ? test.name : '',
          value: typeof test.value === 'string' ? test.value : '',
          unit: typeof test.unit === 'string' ? test.unit : '',
          reference_range: typeof test.reference_range === 'string' ? test.reference_range : '',
          status: ['low', 'normal', 'high', 'unknown'].includes(test.status) ? test.status : 'unknown',
          meaning: typeof test.meaning === 'string' ? test.meaning : '',
          method: typeof test.method === 'string' ? test.method : '',
        })),
        summary: result.summary,
        questions_for_doctor: result.questions_for_doctor.filter((question) => typeof question === 'string').slice(0, 3),
        unclear: result.unclear.filter((item) => typeof item === 'string'),
      }
      setSourceReport(extractedReport)
      setReport(extractedReport)
      await applyLanguageToReport(extractedReport, reportLanguage)
    } catch (uploadError) {
      setError(uploadError.name === 'TypeError'
        ? 'Could not reach the report reader. Check your connection or try the demo report.'
        : uploadError.message || 'We could not read this report. Please try again or use the demo.')
    } finally {
      setLoading(false)
    }
  }

  function listenToReport() {
    if (!report) return
    if (!('speechSynthesis' in window)) {
      setError('Audio playback is not available in this browser.')
      return
    }
    window.speechSynthesis.cancel()
    const reading = [
      report.summary,
      ...abnormalTests.map((test) => `${test.name}: ${test.value} ${test.unit}. ${test.meaning}`),
    ].join(' ')
    const utterance = new SpeechSynthesisUtterance(reading)
    utterance.lang = reportLanguage
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  function shareReport() {
    if (!report) return
    const abnormalSummary = abnormalTests.length
      ? `\nOutside the printed range:\n${abnormalTests.map((test) => `- ${test.name}: ${test.value} ${test.unit} (${statusLabel(test.status)})`).join('\n')}`
      : ''
    const message = `MedSafe lab report summary:\n${report.summary}${abnormalSummary}\n\nPlease discuss every result with a doctor.`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const headline = !report
    ? ''
    : abnormalCount
      ? t('{abnormal} of {total} values are outside the range', {
        abnormal: abnormalCount,
        total: report.tests.length,
      })
      : unknownCount
        ? t('Some values need a range check')
        : t('All values are in range')

  return (
    <section className="lab-report" aria-labelledby="lab-heading">
      <header className="lab-hero">
        <span className="lab-eyebrow">{t('A CLEARER LOOK AT YOUR RESULTS')}</span>
        <h1 id="lab-heading">{t('Lab Report')}</h1>
        <p>{t('Understand the numbers on your blood test report and prepare questions for your doctor.')}</p>
        <span className="lab-hero-art" aria-hidden="true">✚</span>
      </header>

      <section className="lab-upload-card" aria-label={t('Upload a lab report')}>
        <div className="lab-upload-heading">
          <div>
            <span className="lab-step">01</span>
            <h2>{t('Choose a report image or PDF')}</h2>
            <p>{t('Use a clear, well-lit image or a PDF of the printed results.')}</p>
          </div>
          <label className="lab-language-control">
            <span>{t('Report explanation language')}</span>
            <select value={reportLanguage} onChange={handleReportLanguageChange} disabled={loading || translationLoading}>
              <option value="en-IN">{t('English')}</option>
              <option value="hi-IN">{t('Hindi')}</option>
              <option value="bn-IN">{t('Bengali')}</option>
              <option value="mr-IN">{t('Marathi')}</option>
              <option value="ta-IN">{t('Tamil')}</option>
              <option value="te-IN">{t('Telugu')}</option>
              <option value="gu-IN">{t('Gujarati')}</option>
              <option value="pa-IN">{t('Punjabi')}</option>
            </select>
          </label>
        </div>

        <div className="lab-report-metadata">
          <label>
            <span>{t('Report date')}</span>
            <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} />
          </label>
          <label>
            <span>{t('Laboratory name (optional)')}</span>
            <input type="text" maxLength="120" value={laboratory} onChange={(event) => setLaboratory(event.target.value)} placeholder={t('Enter the lab name from the report')} />
          </label>
        </div>

        <div className="lab-upload-actions">
          <label className={`lab-button lab-button-primary ${loading ? 'lab-disabled' : ''}`}>
            <span aria-hidden="true">↥</span>
            {loading ? t('Reading report…') : t('Upload image, PDF, or take a photo')}
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={handleUpload} disabled={loading || translationLoading} />
          </label>
          <span className="lab-or">{t('or')}</span>
          <button type="button" className="lab-button lab-button-secondary" onClick={loadDemoReport} disabled={loading || translationLoading}>
            <span aria-hidden="true">✳</span> {t('Try demo report')}
          </button>
        </div>

        <p className="lab-privacy-note">{t('The image or PDF is sent to Google Gemini to read it. Hide the patient name and ID before uploading. MedSafe does not save the file.')}</p>
      </section>

      <section className="lab-history-panel" aria-labelledby="lab-history-heading">
        <div className="lab-history-header">
          <div>
            <span className="lab-step">{t('YOUR PRIVATE RECORD')}</span>
            <h2 id="lab-history-heading">{t('Health History')}</h2>
            <p>{t('Save extracted results, revisit reports, and compare changes between visits.')}</p>
          </div>
          {patient && <button type="button" className="lab-button lab-button-secondary" onClick={handleSignOut}>{t('Sign out')}</button>}
        </div>

        {authLoading ? (
          <div className="lab-loading" role="status"><span className="lab-spinner" /> {t('Checking your account…')}</div>
        ) : patient ? (
          <div className="lab-account-badge">
            <span aria-hidden="true">●</span>
            {t('Signed in as')} <strong>{patient.name}</strong> · {patient.email}
          </div>
        ) : (
          <form className="lab-auth-form" onSubmit={handleAuthSubmit}>
            <h3>{authMode === 'register' ? t('Create your private account') : t('Sign in to your account')}</h3>
            {authMode === 'register' && (
              <label>
                <span>{t('Your name')}</span>
                <input required autoComplete="name" maxLength="80" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />
              </label>
            )}
            <label>
              <span>{t('Email')}</span>
              <input required type="email" autoComplete="email" maxLength="254" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
            </label>
            <label>
              <span>{t('Password')} {authMode === 'register' && t('(10 characters minimum)')}</span>
              <input required type="password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} minLength={authMode === 'register' ? 10 : undefined} maxLength="128" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
            </label>
            <div className="lab-auth-actions">
              <button type="submit" className="lab-button lab-button-primary" disabled={authSubmitting}>
                {authSubmitting ? t('Please wait…') : authMode === 'register' ? t('Create account') : t('Sign in')}
              </button>
              <button type="button" className="lab-text-button" onClick={() => { setAuthMode(authMode === 'register' ? 'login' : 'register'); setAuthError('') }}>
                {authMode === 'register' ? t('I already have an account') : t('Create a new account')}
              </button>
            </div>
            {authError && <p className="lab-error" role="alert">{t(authError)}</p>}
            <p className="lab-privacy-note">{t('Your reports are stored in your MongoDB Atlas account record and are accessible only after sign-in. Passwords are securely hashed; session tokens are kept in an HTTP-only cookie.')}</p>
          </form>
        )}

        {patient && (
          <>
            <div className="lab-history-subheading">
              <h3>{t('Saved laboratory reports')}</h3>
              {historyLoading && <span>{t('Updating…')}</span>}
            </div>
            {historyError && <p className="lab-error" role="alert">{t(historyError)}</p>}
            {historyMessage && <p className="lab-history-message" role="status">{t(historyMessage)}</p>}
            {!historyLoading && history.length === 0 ? (
              <p className="lab-history-empty">{t('No reports are saved yet. Upload and review a report, then choose “Save to my history.” Demo results are never saved.')}</p>
            ) : (
              <div className="lab-history-list">
                {history.map((savedReport) => (
                  <article className="lab-history-item" key={savedReport.id}>
                    <label className="lab-history-select">
                      <input
                        type="checkbox"
                        checked={summarySelection.includes(savedReport.id)}
                        onChange={(event) => setSummarySelection((current) => event.target.checked
                          ? [...current, savedReport.id]
                          : current.filter((id) => id !== savedReport.id))}
                      />
                      <span className="lab-history-checkbox" aria-hidden="true" />
                      <span>{t('Select for appointment summary')}</span>
                    </label>
                    <div className="lab-history-item-main">
                      <div>
                        <strong>{localDateLabel(savedReport.reportDate, uiLanguage, t)}</strong>
                        <span>{savedReport.laboratory || t('Laboratory not recorded')} · {t('{count} tests', { count: savedReport.tests.length })}</span>
                      </div>
                      <button type="button" className="lab-button lab-button-secondary" onClick={() => void openSavedReport(savedReport.id)}>{t('Open report')}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <>
                <section className="lab-history-tool" aria-labelledby="lab-compare-heading">
                  <div className="lab-section-title">
                    <span className="lab-step">{t('COMPARE')}</span>
                    <h3 id="lab-compare-heading">{t('Compare two reports')}</h3>
                  </div>
                  <div className="lab-compare-controls">
                    <label>
                      <span>{t('Previous report')}</span>
                      <select value={comparisonSelection.previous} onChange={(event) => setComparisonSelection({ ...comparisonSelection, previous: event.target.value })}>
                      <option value="">{t('Choose report')}</option>
                      {history.map((savedReport) => <option key={savedReport.id} value={savedReport.id}>{localDateLabel(savedReport.reportDate, uiLanguage, t)}{savedReport.laboratory ? ` · ${savedReport.laboratory}` : ''}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>{t('Latest report')}</span>
                      <select value={comparisonSelection.latest} onChange={(event) => setComparisonSelection({ ...comparisonSelection, latest: event.target.value })}>
                      <option value="">{t('Choose report')}</option>
                      {history.map((savedReport) => <option key={savedReport.id} value={savedReport.id}>{localDateLabel(savedReport.reportDate, uiLanguage, t)}{savedReport.laboratory ? ` · ${savedReport.laboratory}` : ''}</option>)}
                      </select>
                    </label>
                    <button type="button" className="lab-button lab-button-primary" onClick={() => void compareSavedReports()} disabled={comparisonLoading || history.length < 2 || !comparisonSelection.previous || !comparisonSelection.latest}>
                      {comparisonLoading ? t('Comparing…') : t('Compare results')}
                    </button>
                  </div>
                  <p className="lab-trend-disclaimer">{t('Only identical test names with the same unit are compared. If printed methods differ, that test is excluded. Changes are informational, not a diagnosis or a judgment about whether a result is better or worse.')}</p>
                  {comparisonError && <p className="lab-error" role="alert">{t(comparisonError)}</p>}
                  {comparison && (
                    <div className="lab-comparison-results">
                      {comparison.comparisons.length === 0
                        ? <p className="lab-history-empty">{t('No safely comparable numeric test results were found in these reports.')}</p>
                        : comparison.comparisons.map((item) => (
                          <article className="lab-comparison-item" key={`${item.name}-${item.unit}`}>
                            <h4>{item.name} <span>{item.unit}</span></h4>
                            <div className="lab-comparison-grid">
                              <div><small>{t('Previous')} · {localDateLabel(comparison.previousReport.reportDate, uiLanguage, t)}</small><strong>{item.previous.value} {item.unit}</strong><span>{t('Printed range:')} {item.previous.reference_range || t('not recorded')}</span><span>{t('Status:')} {t(statusLabel(item.previous.status))}</span></div>
                              <div><small>{t('Latest')} · {localDateLabel(comparison.latestReport.reportDate, uiLanguage, t)}</small><strong>{item.latest.value} {item.unit}</strong><span>{t('Printed range:')} {item.latest.reference_range || t('not recorded')}</span><span>{t('Status:')} {t(statusLabel(item.latest.status))}</span></div>
                            </div>
                            <p>{item.direction === 'unchanged'
                              ? t('Unchanged')
                              : `${t('Value {direction}', { direction: t(item.direction) })} ${t('by {difference} {unit}.', {
                                difference: Math.abs(item.difference).toLocaleString(uiLanguage, { maximumFractionDigits: 4 }),
                                unit: item.unit,
                              })}`} {item.statusChanged
                                ? t('Classification changed from {from} to {to}.', {
                                  from: t(statusLabel(item.previous.status)),
                                  to: t(statusLabel(item.latest.status)),
                                })
                                : t('Classification did not change.')}</p>
                          </article>
                        ))}
                      {comparison.notCompared.length > 0 && (
                        <p className="lab-history-empty">{t('Not compared:')} {comparison.notCompared.map((item) => `${item.name} (${t(item.reason)})`).join('; ')}.</p>
                      )}
                    </div>
                  )}
                </section>

                <section className="lab-history-tool" aria-labelledby="lab-trends-heading">
                  <div className="lab-section-title">
                    <span className="lab-step">{t('OVER TIME')}</span>
                    <h3 id="lab-trends-heading">{t('Saved result trends')}</h3>
                  </div>
                  {trendOptions.length ? (
                    <>
                      <label className="lab-trend-select">
                        <span>{t('Select a test parameter')}</span>
                        <select value={trendKey} onChange={(event) => setTrendKey(event.target.value)}>
                          <option value="">{t('Choose test')}</option>
                          {trendOptions.map((option) => <option key={option.key} value={option.key}>{option.name} · {option.unit}{option.method ? ` · ${option.method}` : ''}</option>)}
                        </select>
                      </label>
                      {trendKey && <LabTrendChart points={trendPoints} label={trendOptions.find((option) => option.key === trendKey)?.name || t('Selected test')} />}
                    </>
                  ) : <p className="lab-history-empty">{t('Saved numeric test results will appear here. No sample values are shown.')}</p>}
                </section>

                <section className="lab-history-tool" aria-labelledby="lab-doctor-summary-heading">
                  <div className="lab-section-title">
                    <span className="lab-step">{t('FOR YOUR VISIT')}</span>
                    <h3 id="lab-doctor-summary-heading">{t('Prepare a doctor-friendly summary')}</h3>
                  </div>
                  <p className="lab-trend-disclaimer">{t('Choose the reports you want to include. Sharing or downloading requires your confirmation and may reveal sensitive health information.')}</p>
                  <div className="lab-summary-actions">
                    <button type="button" className="lab-button lab-button-secondary" onClick={downloadDoctorSummary} disabled={!summarySelection.length}>{t('Download summary')}</button>
                    <button type="button" className="lab-button lab-button-share" onClick={shareDoctorSummary} disabled={!summarySelection.length}>{t('Share summary on WhatsApp')}</button>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </section>

      {loading && <div className="lab-loading" role="status"><span className="lab-spinner" /> {t('Reading the report carefully…')}</div>}
      {translationLoading && <div className="lab-loading" role="status"><span className="lab-spinner" /> {t('Translating explanations…')}</div>}
      {translationError && <p className="lab-translation-note" role="status">{t(translationError)} {t('Medical test names, values, units, ranges, and classifications remain unchanged.')}</p>}
      {error && <p className="lab-error" role="alert">{typeof error === 'string' ? t(error) : t(error.message, error.values)}</p>}

      {!report && !loading && (
        <div className="lab-empty-state">
          <span aria-hidden="true">🧪</span>
          <h2>{t('Your results will appear here')}</h2>
          <p>{t('Upload a report photo or try the sample report. Always check the numbers against the paper report.')}</p>
        </div>
      )}

      {report && (
        <div className="lab-results">
          <section className="lab-summary-card" aria-labelledby="lab-summary-heading">
            <span className="lab-step">{t('02 · YOUR SUMMARY')}</span>
            <h2 id="lab-summary-heading">{report.tests.length ? headline : t('No test results found')}</h2>
            <p>{report.summary || t('Please review the paper report with your doctor.')}</p>
            <p className="lab-ai-note" role="note">
              {isDemoReport
                ? t('Fictional demo values — not a real patient report or medical advice.')
                : t('AI-extracted results and AI-generated explanations are not independently verified. Check every test, value, range, and classification against the original report and discuss it with your doctor.')}
            </p>
            <div className="lab-summary-actions">
              <button type="button" className="lab-button lab-button-secondary" onClick={listenToReport} disabled={translationLoading}><span aria-hidden="true">◖</span> {t('Listen')}</button>
              <button type="button" className="lab-button lab-button-share" onClick={shareReport} disabled={translationLoading}><span aria-hidden="true">↗</span> {t('Share on WhatsApp')}</button>
              {!isDemoReport && !currentSavedId && (
                <button type="button" className="lab-button lab-button-primary" onClick={() => void saveCurrentReport()} disabled={savingReport || loading || translationLoading}>
                  {savingReport ? t('Saving securely…') : t('Save to my history')}
                </button>
              )}
              {currentSavedId && <span className="lab-saved-label">{t('Saved in your private history')}</span>}
            </div>
          </section>

          {report.tests.length ? (
            <section className="lab-test-section" aria-labelledby="lab-tests-heading">
              <div className="lab-section-title">
                <span className="lab-step">03</span>
                <h2 id="lab-tests-heading">{t('Test results')}</h2>
              </div>
              <div className="lab-test-list">
                {orderedTests.map((test, index) => (
                  <article className="lab-test-card" key={`${test.name}-${index}`}>
                    <div className="lab-test-card-top">
                      <h3>{test.name || t('Unnamed test')}</h3>
                      <span className={`lab-status-chip lab-status-${test.status}`}>{t(statusLabel(test.status))}</span>
                    </div>
                    <div className="lab-test-value">{test.value || '—'} <span>{test.unit}</span></div>
                    <p className="lab-range"><strong>{t('Printed range:')}</strong> {test.reference_range || t('Not shown or not clear')}</p>
                    <p className="lab-meaning">{test.meaning || t('Please discuss this result with your doctor.')}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="lab-empty-results">
              <span aria-hidden="true">⌕</span>
              <strong>{t('No tests were identified.')}</strong>
              <span>{t('Please check that this is a blood test report and try a clearer photo.')}</span>
            </div>
          )}

          {report.questions_for_doctor.length > 0 && (
            <section className="lab-questions-card">
              <div className="lab-section-title">
                <span className="lab-step">04</span>
                <h2>{t('Questions to ask your doctor')}</h2>
              </div>
              <ol>{report.questions_for_doctor.slice(0, 3).map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}</ol>
            </section>
          )}

          {report.unclear.length > 0 && (
            <section className="lab-unclear-note" aria-label={t('Items to confirm')}>
              <strong>{t('Please confirm these on the paper report')}</strong>
              <ul>{report.unclear.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
            </section>
          )}
        </div>
      )}

      <p className="lab-disclaimer">{t('This is not a diagnosis or medical advice. Please discuss every result with your doctor.')}</p>
    </section>
  )
}

export default LabReport
