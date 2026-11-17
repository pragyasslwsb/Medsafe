import { useEffect, useMemo, useRef, useState } from 'react'
import './RemindersNew.css'

const STORAGE_KEY = 'medsafe_calendar_reminders_v1'

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function to24Hour(hour12, minute, period) {
  let h = parseInt(hour12, 10)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function format12Hour(time24) {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const hrs = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function playAlarmTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioCtx()
    const notes = [880, 1046.5, 880, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.22)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.22)
      osc.stop(ctx.currentTime + i * 0.22 + 0.2)
    })
  } catch {
    // ignore audio autoplay restriction if user has not interacted yet
  }
}

export default function RemindersNew() {
  const [now, setNow] = useState(() => new Date())
  const todayKey = formatDateKey(now)

  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1)
  )
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [medicineName, setMedicineName] = useState('')
  const [dosage, setDosage] = useState('')

  // Flexible Any-Time State (Hour 01-12, Minute 00-59, AM/PM)
  const [hour12, setHour12] = useState('08')
  const [minute, setMinute] = useState('00')
  const [period, setPeriod] = useState('AM')
  const [mealNote, setMealNote] = useState('After food')
  const [activeAlarm, setActiveAlarm] = useState(null)

  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const remindersRef = useRef(reminders)
  remindersRef.current = reminders

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
    } catch {
      // ignore storage errors
    }
  }, [reminders])

  // 1-second live timer & alarm trigger
  useEffect(() => {
    const interval = setInterval(() => {
      const current = new Date()
      setNow(current)

      const curDate = formatDateKey(current)
      const curTime = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`

      remindersRef.current.forEach((r) => {
        if (!r.taken && !r.notified && r.date === curDate && r.time === curTime) {
          setReminders((prev) =>
            prev.map((item) => (item.id === r.id ? { ...item, notified: true } : item))
          )
          setActiveAlarm(r)
          playAlarmTone()

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('MedSafe Medicine Alarm', {
              body: `Time to take ${r.medicineName} (${r.dosage}) - ${r.mealNote}`
            })
          }
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Repeat beep every 4 seconds while alarm banner is open
  useEffect(() => {
    if (!activeAlarm) return
    const beepLoop = setInterval(() => playAlarmTone(), 4000)
    return () => clearInterval(beepLoop)
  }, [activeAlarm])

  const selectedTime24 = to24Hour(hour12, minute, period)

  const setQuickMinutesFromNow = (minsToAdd) => {
    const target = new Date(Date.now() + minsToAdd * 60000)
    setSelectedDate(formatDateKey(target))
    setCurrentMonth(new Date(target.getFullYear(), target.getMonth(), 1))
    let h = target.getHours()
    const m = String(target.getMinutes()).padStart(2, '0')
    const p = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    setHour12(String(h).padStart(2, '0'))
    setMinute(m)
    setPeriod(p)
  }

  const handleExactTimeInput = (val24) => {
    if (!val24) return
    const [hStr, mStr] = val24.split(':')
    let h = parseInt(hStr, 10)
    const p = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    setHour12(String(h).padStart(2, '0'))
    setMinute(mStr)
    setPeriod(p)
  }

  // Find next upcoming untaken reminder for live header timer
  const nextUpcoming = useMemo(() => {
    const nowMs = now.getTime()
    const upcoming = reminders
      .filter((r) => !r.taken)
      .map((r) => {
        const targetMs = new Date(`${r.date}T${r.time}:00`).getTime()
        return { ...r, targetMs, diffMs: targetMs - nowMs }
      })
      .filter((r) => r.diffMs > -60000)
      .sort((a, b) => a.targetMs - b.targetMs)
    return upcoming[0] || null
  }, [reminders, now])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarCells = []
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(new Date(year, month, d))

  const datesWithReminders = useMemo(() => new Set(reminders.map((r) => r.date)), [reminders])

  const handleAddReminder = (e) => {
    e.preventDefault()
    if (!medicineName.trim()) return

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const newItem = {
      id: Date.now().toString(),
      date: selectedDate,
      time: selectedTime24,
      medicineName: medicineName.trim(),
      dosage: dosage.trim() || '1 tablet',
      mealNote,
      taken: false,
      notified: false
    }

    setReminders((prev) =>
      [...prev, newItem].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    )
    setMedicineName('')
    setDosage('')
  }

  const toggleTaken = (id) => {
    setReminders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, taken: !item.taken } : item))
    )
    if (activeAlarm?.id === id) setActiveAlarm(null)
  }

  const snoozeAlarm = (alarmItem) => {
    const snoozed = new Date(Date.now() + 5 * 60000)
    const newDate = formatDateKey(snoozed)
    const newTime = `${String(snoozed.getHours()).padStart(2, '0')}:${String(snoozed.getMinutes()).padStart(2, '0')}`
    setReminders((prev) =>
      prev.map((item) =>
        item.id === alarmItem.id ? { ...item, date: newDate, time: newTime, notified: false } : item
      )
    )
    setActiveAlarm(null)
  }

  const deleteReminder = (id) => {
    setReminders((prev) => prev.filter((item) => item.id !== id))
    if (activeAlarm?.id === id) setActiveAlarm(null)
  }

  const selectedDateReminders = reminders.filter((r) => r.date === selectedDate)

  return (
    <section className="rem-container">
      <div className="rem-header-banner">
        <div>
          <h2>Medicine Calendar & Live Timer</h2>
          <p>Pick any date and exact minute — live countdown & sound alarm included.</p>
        </div>

        <div className="live-timer-box">
          <div className="live-timer-label">
            {nextUpcoming ? 'Next Dose Countdown' : 'No Upcoming Dose'}
          </div>
          <div className="live-timer-clock">
            {nextUpcoming ? formatCountdown(nextUpcoming.diffMs) : '--:--:--'}
          </div>
          <div className="live-timer-med">
            {nextUpcoming
              ? `${nextUpcoming.medicineName} • ${format12Hour(nextUpcoming.time)}`
              : 'Schedule a dose below'}
          </div>
        </div>
      </div>

      {activeAlarm && (
        <div className="alarm-ringing-banner" role="alert">
          <div>
            <strong style={{ fontSize: '1.15rem', display: 'block' }}>
              TIME FOR MEDICINE: {activeAlarm.medicineName} ({activeAlarm.dosage})
            </strong>
            <span>{activeAlarm.mealNote} • Scheduled at {format12Hour(activeAlarm.time)}</span>
          </div>
          <div className="alarm-ringing-actions">
            <button type="button" className="alarm-btn-taken" onClick={() => toggleTaken(activeAlarm.id)}>
              ✓ Mark Taken & Stop
            </button>
            <button type="button" className="alarm-btn-snooze" onClick={() => snoozeAlarm(activeAlarm)}>
              Snooze 5 Min
            </button>
          </div>
        </div>
      )}

      <div className="rem-grid-layout">
        {/* Left: Interactive Calendar */}
        <div className="rem-card">
          <div className="cal-nav">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            >
              ← Prev
            </button>
            <h3 className="cal-month-title">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            >
              Next →
            </button>
          </div>

          <div className="cal-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="cal-days-grid">
            {calendarCells.map((dateObj, idx) => {
              if (!dateObj) return <div key={`empty-${idx}`} className="cal-day-cell empty" />
              const key = formatDateKey(dateObj)
              const isSelected = key === selectedDate
              const isToday = key === todayKey
              const hasRem = datesWithReminders.has(key)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                >
                  <span>{dateObj.getDate()}</span>
                  {hasRem && <span className="cal-dot" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Any-Time Slot Picker & Timer Form */}
        <form className="rem-card" onSubmit={handleAddReminder}>
          <h3 className="rem-form-title">Set Reminder & Timer</h3>
          <div className="selected-date-pill">Selected Date: {selectedDate}</div>

          <label className="rem-field">
            Medicine Name *
            <input
              className="rem-input"
              required
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g. Dolo 650 / Metformin"
            />
          </label>

          <label className="rem-field">
            Dosage
            <input
              className="rem-input"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 1 Tablet / 10 ml"
            />
          </label>

          <div className="rem-field">
            <span>Choose Any Time Slot (Hour : Minute : AM/PM)</span>
            <div className="any-time-picker-row">
              <select
                className="rem-input"
                aria-label="Hour"
                value={hour12}
                onChange={(e) => setHour12(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                  <option key={h} value={h}>{h} hr</option>
                ))}
              </select>

              <select
                className="rem-input"
                aria-label="Minute"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
              >
                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>

              <select
                className="rem-input"
                aria-label="AM or PM"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            <input
              type="time"
              className="rem-input"
              value={selectedTime24}
              onChange={(e) => handleExactTimeInput(e.target.value)}
              aria-label="Exact time input"
            />

            <div className="quick-offset-row">
              <button type="button" className="quick-offset-btn" onClick={() => setQuickMinutesFromNow(1)}>
                +1 Min (Test Timer)
              </button>
              <button type="button" className="quick-offset-btn" onClick={() => setQuickMinutesFromNow(15)}>
                +15 Mins
              </button>
              <button type="button" className="quick-offset-btn" onClick={() => setQuickMinutesFromNow(60)}>
                +1 Hour
              </button>
              <button type="button" className="quick-offset-btn" onClick={() => setQuickMinutesFromNow(240)}>
                +4 Hours
              </button>
            </div>
          </div>

          <label className="rem-field">
            Instruction
            <select
              className="rem-input"
              value={mealNote}
              onChange={(e) => setMealNote(e.target.value)}
            >
              <option value="After food">After food</option>
              <option value="Before food">Before food</option>
              <option value="Empty stomach">Empty stomach</option>
              <option value="Before sleep">Before sleep</option>
            </select>
          </label>

          <button type="submit" className="rem-submit-btn">
            Start Timer for {format12Hour(selectedTime24)}
          </button>
        </form>
      </div>

      {/* Scheduled Reminders for Selected Date */}
      <div className="rem-list-section">
        <h3 className="rem-form-title">
          Reminders on {selectedDate} ({selectedDateReminders.length})
        </h3>

        {selectedDateReminders.length === 0 ? (
          <div className="rem-card" style={{ textAlign: 'center', color: '#64748b' }}>
            No reminders scheduled for <strong>{selectedDate}</strong>. Select any date & time above to start a timer!
          </div>
        ) : (
          selectedDateReminders.map((item) => {
            const targetMs = new Date(`${item.date}T${item.time}:00`).getTime()
            const diffMs = targetMs - now.getTime()

            return (
              <div key={item.id} className={`rem-item-card ${item.taken ? 'taken' : ''}`}>
                <div className="rem-item-main">
                  <h4>{item.medicineName} — {item.dosage}</h4>
                  <div className="rem-item-meta">
                    <span><strong>Time:</strong> {format12Hour(item.time)}</span>
                    <span>• {item.mealNote}</span>
                    {!item.taken && (
                      <span className="countdown-pill">
                        {diffMs > 0 ? `Starts in ${formatCountdown(diffMs)}` : 'Time Passed / Due'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rem-item-actions">
                  <button
                    type="button"
                    className="btn-taken"
                    onClick={() => toggleTaken(item.id)}
                  >
                    {item.taken ? '✓ Taken' : 'Mark Taken'}
                  </button>
                  <button
                    type="button"
                    className="btn-del"
                    onClick={() => deleteReminder(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
