import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n.js'
import './MedicineReminder.css'

const STORAGE_KEY = 'medsafe-custom-reminders'

const COPY = {
  'en-IN': {
    title: 'Medicine Timer & Calendar',
    testBtn: 'Test Pop & Voice (3s)',
    langSwitch: 'हिंदी में देखें',
    nextLabel: 'Next Dose Countdown',
    noNext: 'No upcoming medicine scheduled today',
    addHeading: 'Schedule Medicine for',
    nameLabel: 'Medicine Name & Dosage',
    namePlaceholder: 'e.g. Paracetamol 500mg (After breakfast)',
    timeLabel: 'Reminder Time',
    addBtn: '+ Set Medicine Reminder',
    listHeading: 'Scheduled Doses',
    emptyList: 'No medicines scheduled for this date.',
    alarmTitle: "It's time to take your medicine!",
    voicePhrase: "It's time to take your medicine",
    dismissBtn: 'Mark as Taken & Stop Alert',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  'hi-IN': {
    title: 'दवाई टाइमर और कैलेंडर',
    testBtn: 'अलार्म टेस्ट (3 सेकंड)',
    langSwitch: 'Switch to English',
    nextLabel: 'अगली दवाई का काउंटडाउन',
    noNext: 'आज कोई आगामी दवाई निर्धारित नहीं है',
    addHeading: 'दवाई का समय जोड़ें:',
    nameLabel: 'दवाई का नाम और खुराक',
    namePlaceholder: 'जैसे: पैरासिटामोल 500mg (नाश्ते के बाद)',
    timeLabel: 'दवाई लेने का समय',
    addBtn: '+ रिमाइंडर सेट करें',
    listHeading: 'निर्धारित दवाइयाँ',
    emptyList: 'इस तारीख के लिए कोई दवाई निर्धारित नहीं है।',
    alarmTitle: 'आपका दवाई लेने का समय हो गया है!',
    voicePhrase: 'आपका दवाई लेने का समय हो गया है',
    dismissBtn: 'दवाई ले ली है (अलार्म बंद करें)',
    weekdays: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
    months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  },
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MedicineReminder() {
  const { language, setLanguage } = useLanguage()
  const isHindi = language === 'hi-IN'
  const t = COPY[isHindi ? 'hi-IN' : 'en-IN']

  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [medName, setMedName] = useState('')
  const [medTime, setMedTime] = useState('09:00')
  const [reminders, setReminders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [countdown, setCountdown] = useState('--:--:--')
  const [nextDoseLabel, setNextDoseLabel] = useState('')
  const [activeAlarm, setActiveAlarm] = useState(null)
  const triggeredRef = useRef(new Set())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
  }, [reminders])

  function playPopSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      ;[587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.14)
        osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + idx * 0.14 + 0.12)
        gain.gain.setValueAtTime(0.45, now + idx * 0.14)
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.14 + 0.25)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.14)
        osc.stop(now + idx * 0.14 + 0.26)
      })
    } catch {
      // Ignore audio block if browser restricts autoplay
    }
  }

  function speakReminder(name, currentLang) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const phrase = COPY[currentLang === 'hi-IN' ? 'hi-IN' : 'en-IN'].voicePhrase
    const utterance = new SpeechSynthesisUtterance(`${phrase}. ${name}`)
    utterance.lang = currentLang === 'hi-IN' ? 'hi-IN' : 'en-IN'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  function triggerAlarm(name) {
    playPopSound()
    speakReminder(name, language)
    setActiveAlarm(name)
  }

  function dismissAlarm() {
    setActiveAlarm(null)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  function handleTestAlarm() {
    playPopSound()
    setTimeout(() => {
      triggerAlarm(isHindi ? 'पैरासिटामोल 500mg (टेस्ट)' : 'Paracetamol 500mg (Test)')
    }, 3000)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const today = toDateStr(now)
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      reminders.forEach((item) => {
        const key = `${item.id}-${today}-${hm}`
        if (item.date === today && item.time === hm && !triggeredRef.current.has(key)) {
          triggeredRef.current.add(key)
          triggerAlarm(item.name)
        }
      })

      const nextDose = reminders
        .filter((r) => r.date === today)
        .map((r) => {
          const [h, m] = r.time.split(':').map(Number)
          const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)
          return { ...r, diff: target - now }
        })
        .filter((r) => r.diff > 0)
        .sort((a, b) => a.diff - b.diff)[0]

      if (nextDose) {
        const hrs = String(Math.floor(nextDose.diff / 3600000)).padStart(2, '0')
        const mins = String(Math.floor((nextDose.diff % 3600000) / 60000)).padStart(2, '0')
        const secs = String(Math.floor((nextDose.diff % 60000) / 1000)).padStart(2, '0')
        setCountdown(`${hrs}:${mins}:${secs}`)
        setNextDoseLabel(`${nextDose.name} (${nextDose.time})`)
      } else {
        setCountdown('--:--:--')
        setNextDoseLabel('')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [reminders, language])

  function handleAdd(e) {
    e.preventDefault()
    if (!medName.trim() || !medTime) return
    setReminders((prev) => [
      ...prev,
      { id: Date.now().toString(), date: selectedDate, name: medName.trim(), time: medTime },
    ])
    setMedName('')
  }

  function handleDelete(id) {
    setReminders((prev) => prev.filter((item) => item.id !== id))
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dayReminders = reminders
    .filter((r) => r.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time))

  return (
    <section className="medsafe-reminder-wrap" aria-label={t.title}>
      <div className="medsafe-reminder-header">
        <h2>⏰ {t.title}</h2>
        <div className="medsafe-reminder-actions">
          <button type="button" className="button button-secondary" onClick={handleTestAlarm}>
            🔔 {t.testBtn}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setLanguage(isHindi ? 'en-IN' : 'hi-IN')}
          >
            🌐 {t.langSwitch}
          </button>
        </div>
      </div>

      <div className="medsafe-timer-banner">
        <div>
          <div className="medsafe-timer-label">{t.nextLabel}</div>
          <div className="medsafe-timer-med">{nextDoseLabel || t.noNext}</div>
        </div>
        <div className="medsafe-timer-clock">{countdown}</div>
      </div>

      <div className="medsafe-reminder-grid">
        <div className="medsafe-rem-card">
          <div className="medsafe-cal-nav">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
            >
              ‹
            </button>
            <strong>
              {t.months[month]} {year}
            </strong>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>

          <div className="medsafe-cal-grid">
            {t.weekdays.map((day) => (
              <div key={day} className="medsafe-cal-weekday">
                {day}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const hasDose = reminders.some((r) => r.date === dateStr)
              const isSelected = dateStr === selectedDate
              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`medsafe-cal-day ${isSelected ? 'selected' : ''} ${hasDose ? 'has-dose' : ''}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
        </div>

        <div className="medsafe-rem-card">
          <h3>
            {t.addHeading} {selectedDate}
          </h3>
          <form onSubmit={handleAdd}>
            <div className="medsafe-rem-field">
              <label htmlFor="medsafe-med-name">{t.nameLabel}</label>
              <input
                id="medsafe-med-name"
                type="text"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder={t.namePlaceholder}
                required
              />
            </div>
            <div className="medsafe-rem-field">
              <label htmlFor="medsafe-med-time">{t.timeLabel}</label>
              <input
                id="medsafe-med-time"
                type="time"
                value={medTime}
                onChange={(e) => setMedTime(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="button button-primary" style={{ width: '100%' }}>
              {t.addBtn}
            </button>
          </form>

          <h3 style={{ marginTop: '20px' }}>{t.listHeading}</h3>
          {dayReminders.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t.emptyList}</p>
          ) : (
            <ul className="medsafe-rem-list">
              {dayReminders.map((item) => (
                <li key={item.id} className="medsafe-rem-item">
                  <span>
                    <strong>{item.time}</strong> — {item.name}
                  </span>
                  <button
                    type="button"
                    className="medsafe-rem-del"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {activeAlarm && (
        <div className="medsafe-alarm-backdrop" role="alertdialog" aria-modal="true">
          <div className="medsafe-alarm-modal">
            <div style={{ fontSize: '3rem' }}>💊</div>
            <h2>{t.alarmTitle}</h2>
            <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: '14px 0' }}>{activeAlarm}</p>
            <button
              type="button"
              className="button button-primary"
              style={{ width: '100%' }}
              onClick={dismissAlarm}
            >
              {t.dismissBtn}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
