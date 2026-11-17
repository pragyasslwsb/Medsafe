import { useEffect, useState } from 'react'
import './EmergencyCard.css'

const STORAGE_KEY = 'medsafe_emergency_card_v1'

const PROFILE_LABELS = [
  'Self',
  'Parents / Senior Care',
  'Child / Pediatric',
  'Cardiac Care',
  'Diabetic Care',
  'High Allergy Risk',
  'Maternity / Prenatal'
]

export default function EmergencyCard({ medicines = [], healthProfile = {}, t = (s) => s }) {
  const [card, setCard] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved
        ? { profileLabel: 'Self', ...JSON.parse(saved) }
        : {
            profileLabel: 'Self',
            fullName: '',
            age: '',
            bloodGroup: 'O+',
            allergies: '',
            conditions: '',
            doctorName: '',
            doctorPhone: '',
            emergencyName: '',
            emergencyPhone: '',
            notes: ''
          }
    } catch {
      return {
        profileLabel: 'Self',
        fullName: '',
        age: '',
        bloodGroup: 'O+',
        allergies: '',
        conditions: '',
        doctorName: '',
        doctorPhone: '',
        emergencyName: '',
        emergencyPhone: '',
        notes: ''
      }
    }
  })

  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(card))
    } catch {
      // ignore storage quota errors
    }
  }, [card])

  const updateField = (field, value) => {
    setCard((prev) => ({ ...prev, [field]: value }))
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 1800)
  }

  const activeMeds = Array.isArray(medicines)
    ? medicines.map((m) => `${m.name || m.medicine || 'Unknown'}${m.dose ? ` (${m.dose})` : ''}${m.frequency ? ` - ${m.frequency}` : ''}`)
    : []

  const buildReportText = () => {
    const lines = [
      '==============================',
      'MEDSAFE - EMERGENCY & DOCTOR SUMMARY',
      `Profile Tag: ${card.profileLabel || 'Self'}`,
      `Generated: ${new Date().toLocaleString()}`,
      '==============================',
      `Patient Name: ${card.fullName || 'Not specified'}`,
      `Age: ${card.age || healthProfile?.age || 'Not specified'}`,
      `Blood Group: ${card.bloodGroup || 'Not specified'}`,
      `Allergies: ${card.allergies || 'None reported'}`,
      `Conditions: ${card.conditions || 'None reported'}`,
      `Emergency Contact: ${card.emergencyName || 'N/A'} (${card.emergencyPhone || 'N/A'})`,
      `Primary Doctor: ${card.doctorName || 'N/A'} (${card.doctorPhone || 'N/A'})`,
      '',
      'CURRENT MEDICATIONS:',
      ...(activeMeds.length ? activeMeds.map((m, i) => `${i + 1}. ${m}`) : ['No active prescription loaded']),
      '',
      card.notes ? `Additional Notes: ${card.notes}` : '',
      'Disclaimer: Decision-support only. Confirm with a licensed doctor.'
    ].filter(Boolean)
    return lines.join('\n')
  }

  const downloadSummary = () => {
    const blob = new Blob([buildReportText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MedSafe-Summary-${(card.fullName || 'Patient').replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(buildReportText())
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="emergency-container">
      <div className="emergency-id-card">
        <div className="emergency-card-header">
          <div>
            <div className="emergency-badges-row">
              <span className="emergency-badge">{t('Emergency Medical ID')}</span>
              <span className="emergency-profile-label">{card.profileLabel || 'Self'}</span>
            </div>
            <h2 className="emergency-patient-name">
              {card.fullName || t('Your Emergency Health Card')}
            </h2>
            <div className="emergency-meta-row">
              <span>{t('Blood Group')}:</span>
              <span className="blood-group-pill">{card.bloodGroup}</span>
              {card.age && <span>• {t('Age')}: <strong>{card.age}</strong></span>}
            </div>
          </div>

          <div className="emergency-sos-actions">
            <a href="tel:112" className="sos-btn-primary">SOS 112</a>
            {card.emergencyPhone && (
              <a href={`tel:${card.emergencyPhone}`} className="sos-btn-secondary">
                {t('Call')} {card.emergencyName || t('Contact')}
              </a>
            )}
          </div>
        </div>

        {(card.allergies || card.conditions) && (
          <div className="emergency-alerts-grid">
            {card.allergies && (
              <div className="emergency-alert-box">
                <div className="emergency-alert-label">{t('Critical Allergies')}</div>
                <div className="emergency-alert-value">{card.allergies}</div>
              </div>
            )}
            {card.conditions && (
              <div className="emergency-alert-box">
                <div className="emergency-alert-label">{t('Medical Conditions')}</div>
                <div className="emergency-alert-value">{card.conditions}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="emergency-panel emergency-form-panel">
        <div className="emergency-panel-header">
          <h3 className="emergency-panel-title">{t('Patient & Emergency Details')}</h3>
          {savedToast && <span className="saved-pill">✓ {t('Saved locally')}</span>}
        </div>

        <div className="emergency-form-grid">
          <label className="emergency-field">
            {t('Card Label / Profile Tag')}
            <select className="emergency-input" value={card.profileLabel || 'Self'} onChange={(e) => updateField('profileLabel', e.target.value)}>
              {PROFILE_LABELS.map((lbl) => (
                <option key={lbl} value={lbl}>{lbl}</option>
              ))}
            </select>
          </label>

          <label className="emergency-field">
            {t('Full Name')}
            <input className="emergency-input" value={card.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="e.g. Rajesh Sharma" />
          </label>

          <label className="emergency-field">
            {t('Age')}
            <input className="emergency-input" value={card.age} onChange={(e) => updateField('age', e.target.value)} placeholder="e.g. 54" />
          </label>

          <label className="emergency-field">
            {t('Blood Group')}
            <select className="emergency-input" value={card.bloodGroup} onChange={(e) => updateField('bloodGroup', e.target.value)}>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </label>

          <label className="emergency-field">
            {t('Drug / Food Allergies')}
            <input className="emergency-input" value={card.allergies} onChange={(e) => updateField('allergies', e.target.value)} placeholder="e.g. Penicillin, Sulfa, Peanuts" />
          </label>

          <label className="emergency-field">
            {t('Chronic Conditions')}
            <input className="emergency-input" value={card.conditions} onChange={(e) => updateField('conditions', e.target.value)} placeholder="e.g. Type 2 Diabetes, Hypertension" />
          </label>

          <label className="emergency-field">
            {t('Emergency Contact Name')}
            <input className="emergency-input" value={card.emergencyName} onChange={(e) => updateField('emergencyName', e.target.value)} placeholder="e.g. Priya Sharma (Spouse)" />
          </label>

          <label className="emergency-field">
            {t('Emergency Contact Phone')}
            <input className="emergency-input" value={card.emergencyPhone} onChange={(e) => updateField('emergencyPhone', e.target.value)} placeholder="e.g. +91 98765 43210" />
          </label>

          <label className="emergency-field">
            {t('Doctor Name & Phone')}
            <input className="emergency-input" value={card.doctorName} onChange={(e) => updateField('doctorName', e.target.value)} placeholder="e.g. Dr. Mehta - 9811122233" />
          </label>
        </div>

        <label className="emergency-field emergency-notes-wrap">
          {t('Important Notes for Paramedics / Doctor')}
          <textarea rows={2} className="emergency-input" value={card.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="e.g. Wears pacemaker, prefers morning doses..." />
        </label>
      </div>

      <div className="doctor-report-panel">
        <div className="emergency-panel-header">
          <h3 className="emergency-panel-title">
            {t('Doctor Visit Report & Active Medicines')}
            <span className="med-count-badge">{activeMeds.length}</span>
          </h3>
        </div>

        {activeMeds.length > 0 ? (
          <ul className="active-meds-list">
            {activeMeds.map((med, idx) => (
              <li key={idx}>{med}</li>
            ))}
          </ul>
        ) : (
          <p className="empty-meds-hint">
            {t('Scan or add a prescription in the Prescription tab to automatically include your medicines here.')}
          </p>
        )}

        <div className="report-actions-row">
          <button type="button" className="button button-primary" onClick={() => window.print()}>
            {t('Print / Save PDF')}
          </button>
          <button type="button" className="button button-secondary" onClick={downloadSummary}>
            {t('Download Doctor Report (.txt)')}
          </button>
          <button type="button" className="button button-whatsapp" onClick={shareWhatsApp}>
            {t('Share Emergency Card on WhatsApp')}
          </button>
        </div>
      </div>
    </section>
  )
}
