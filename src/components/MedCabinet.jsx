import { useEffect, useState } from 'react'
import './MedCabinet.css'

const STORAGE_KEY = 'medsafe_pill_cabinet_v1'

const LABELS = [
  'Daily Care',
  'BP / Heart',
  'Diabetes',
  'Fever / Pain',
  'Antibiotic',
  'Gastric / Acidity',
  'Vitamin / Supplement',
  'First Aid'
]

export default function MedCabinet({ medicines = [] }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [name, setName] = useState('')
  const [label, setLabel] = useState('Daily Care')
  const [stock, setStock] = useState('10')
  const [dailyDose, setDailyDose] = useState('1')
  const [expiryDate, setExpiryDate] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore storage errors
    }
  }, [items])

  const handleAdd = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    const initialStock = Math.max(0, parseInt(stock, 10) || 0)
    const newItem = {
      id: Date.now().toString(),
      name: name.trim(),
      label: label || 'Daily Care',
      stock: initialStock,
      maxStock: Math.max(initialStock, 10),
      dailyDose: Math.max(1, parseInt(dailyDose, 10) || 1),
      expiryDate: expiryDate || ''
    }

    setItems((prev) => [newItem, ...prev])
    setName('')
    setLabel('Daily Care')
    setStock('10')
    setDailyDose('1')
    setExpiryDate('')
  }

  const importFromPrescription = () => {
    if (!Array.isArray(medicines) || medicines.length === 0) return
    const existingNames = new Set(items.map((i) => i.name.toLowerCase()))
    const toAdd = medicines
      .map((m) => m.name || m.medicine || '')
      .filter((n) => n && !existingNames.has(n.toLowerCase()))
      .map((n, idx) => ({
        id: `${Date.now()}-${idx}`,
        name: n,
        label: 'Prescription',
        stock: 10,
        maxStock: 10,
        dailyDose: 1,
        expiryDate: ''
      }))
    if (toAdd.length > 0) setItems((prev) => [...toAdd, ...prev])
  }

  const takeOneDose = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock - 1) } : item
      )
    )
  }

  const addRefillStrip = (id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const nextStock = item.stock + 10
        return { ...item, stock: nextStock, maxStock: Math.max(item.maxStock || 10, nextStock) }
      })
    )
  }

  const deleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const evaluateStatus = (item) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (item.expiryDate) {
      const exp = new Date(`${item.expiryDate}T00:00:00`)
      const daysToExpiry = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
      if (daysToExpiry < 0) {
        return { level: 'danger', badge: 'Expired — Do Not Use', daysLeft: 0 }
      }
      if (daysToExpiry <= 30) {
        return { level: 'warn', badge: `Expires in ${daysToExpiry}d`, daysLeft: Math.floor(item.stock / item.dailyDose) }
      }
    }

    const daysLeft = Math.floor(item.stock / item.dailyDose)
    if (item.stock === 0) {
      return { level: 'danger', badge: 'Out of Stock', daysLeft: 0 }
    }
    if (daysLeft <= 4) {
      return { level: 'warn', badge: `Low Stock (${daysLeft}d left)`, daysLeft }
    }
    return { level: 'ok', badge: 'Safe & Stocked', daysLeft }
  }

  const alertsCount = items.filter((i) => evaluateStatus(i).level !== 'ok').length

  return (
    <section className="cab-container">
      <div className="cab-banner">
        <div>
          <span className="cab-banner-tag">Home Medicine Inventory</span>
          <h2>Pill Stock, Refill & Expiry Tracker</h2>
          <p>Organize medicines by label, track strip counts, and catch expiry dates early.</p>
        </div>
        <div className="cab-stats-row">
          <div className="cab-stat-pill">
            <span className="cab-stat-num">{items.length}</span>
            <span>Total Meds</span>
          </div>
          <div className="cab-stat-pill">
            <span className="cab-stat-num">{alertsCount}</span>
            <span>Active Alerts</span>
          </div>
        </div>
      </div>

      <form className="cab-form-card" onSubmit={handleAdd}>
        <div className="cab-form-header">
          <h3 className="cab-form-title">Add Medicine to Cabinet</h3>
          {Array.isArray(medicines) && medicines.length > 0 && (
            <button type="button" className="cab-btn-refill" onClick={importFromPrescription}>
              + Sync from Prescription ({medicines.length})
            </button>
          )}
        </div>

        <div className="cab-form-grid">
          <label className="cab-field">
            Medicine Name *
            <input
              className="cab-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Telma 40 / Pan-D"
            />
          </label>

          <label className="cab-field">
            Category Label
            <select
              className="cab-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            >
              {LABELS.map((lbl) => (
                <option key={lbl} value={lbl}>{lbl}</option>
              ))}
            </select>
          </label>

          <label className="cab-field">
            Tablets Available
            <input
              type="number"
              min="0"
              className="cab-input"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </label>

          <label className="cab-field">
            Tablets / Day
            <input
              type="number"
              min="1"
              className="cab-input"
              value={dailyDose}
              onChange={(e) => setDailyDose(e.target.value)}
            />
          </label>

          <label className="cab-field">
            Strip Expiry Date
            <input
              type="date"
              className="cab-input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </label>
        </div>

        <button type="submit" className="cab-add-btn">+ Save to Med Cabinet</button>
      </form>

      {items.length === 0 ? (
        <div className="cab-form-card" style={{ textAlign: 'center', color: '#64748b' }}>
          Your medicine cabinet is empty. Add your daily medicines with a category label above!
        </div>
      ) : (
        <div className="cab-grid">
          {items.map((item) => {
            const status = evaluateStatus(item)
            const maxVal = Math.max(item.maxStock || 10, item.stock, 1)
            const pct = Math.min(100, Math.round((item.stock / maxVal) * 100))
            const waOrderText = encodeURIComponent(
              `Hello, I need to reorder medicine:\n• ${item.name} [${item.label || 'Medicine'}] (1-2 strips)\nSent via MedSafe`
            )

            return (
              <div key={item.id} className={`cab-item-card ${status.level === 'ok' ? '' : status.level}`}>
                <div>
                  <div className="cab-item-top">
                    <div>
                      <span className="cab-label-pill">{item.label || 'Daily Care'}</span>
                      <h4 className="cab-item-name">{item.name}</h4>
                    </div>
                    <span className={`cab-status-badge badge-${status.level}`}>{status.badge}</span>
                  </div>

                  <div className="cab-stock-bar-wrap">
                    <div className="cab-stock-bar-meta">
                      <span>{item.stock} tablets left</span>
                      <span>~{status.daysLeft} days supply</span>
                    </div>
                    <div className="cab-stock-track">
                      <div
                        className={`cab-stock-fill fill-${status.level}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="cab-item-details">
                    <span><strong>Dose:</strong> {item.dailyDose} / day</span>
                    <span><strong>Expiry:</strong> {item.expiryDate || 'Not set'}</span>
                  </div>
                </div>

                <div className="cab-actions">
                  <button type="button" className="cab-btn-dose" onClick={() => takeOneDose(item.id)}>
                    -1 Taken
                  </button>
                  <button type="button" className="cab-btn-refill" onClick={() => addRefillStrip(item.id)}>
                    +10 Refill
                  </button>
                  <a
                    href={`https://wa.me/?text=${waOrderText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cab-btn-order"
                  >
                    Order
                  </a>
                  <button type="button" className="cab-btn-del" onClick={() => deleteItem(item.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
