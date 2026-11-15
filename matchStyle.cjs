const fs = require('fs');

const remindersCode = `import React, { useState, useEffect } from 'react';
import './Reminders.css';

export default function Reminders() {
  const [reminders, setReminders] = useState([
    { id: 1, name: 'Aspirin 75mg', dose: '1 tablet', time: '08:00', date: new Date().toISOString().split('T')[0], active: true },
    { id: 2, name: 'Vitamin D3', dose: '1 capsule', time: '14:00', date: new Date().toISOString().split('T')[0], active: true }
  ]);
  const [form, setForm] = useState({ name: '', dose: '', time: '', date: new Date().toISOString().split('T')[0] });
  const [alertModal, setAlertModal] = useState(null);

  // Audio alarm chime generator
  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.log("Audio alert initialized");
    }
  };

  // Real-time alarm checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      reminders.forEach(rem => {
        if (rem.active && rem.date === currentDate && rem.time === currentTime) {
          setAlertModal(rem);
          playAlarmSound();
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reminders]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.time || !form.date) return;
    setReminders([...reminders, { id: Date.now(), ...form, active: true }]);
    setForm({ name: '', dose: '', time: '', date: new Date().toISOString().split('T')[0] });
  };

  const toggleActive = (id) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const deleteReminder = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="reminders-main-container">
      
      {/* Alarm Alert Popup Modal */}
      {alertModal && (
        <div className="reminder-modal-overlay">
          <div className="reminder-modal-card">
            <div className="reminder-modal-icon">???</div>
            <h2 className="reminder-modal-title">It's time for your medicine!</h2>
            <p className="reminder-modal-med">{alertModal.name}</p>
            {alertModal.dose && <p className="reminder-modal-dose">Prescribed Dose: {alertModal.dose}</p>}
            <button className="reminder-modal-btn" onClick={() => setAlertModal(null)}>
              Dismiss / Taken ?
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner matching LabReport / Health tabs */}
      <div className="reminders-hero">
        <div className="reminders-hero-content">
          <span className="reminders-badge">STAY ON TRACK</span>
          <h1>Medicine Reminders & Alarms</h1>
          <p>Never miss a dose with real-time schedule alarms, custom date/time pickers, and instant pop-up notifications.</p>
        </div>
        <div className="reminders-hero-icon" aria-hidden="true">
          ?
        </div>
      </div>

      {/* Add Reminder Card */}
      <div className="medsafe-card">
        <h3 className="medsafe-card-title">Schedule New Medicine Alarm</h3>
        <form onSubmit={handleSubmit} className="reminders-form-grid">
          <div className="reminders-field">
            <label>Medicine Name</label>
            <input 
              type="text" 
              placeholder="e.g. Paracetamol" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              required 
            />
          </div>
          <div className="reminders-field">
            <label>Dose</label>
            <input 
              type="text" 
              placeholder="e.g. 1 tablet / 5ml" 
              value={form.dose} 
              onChange={e => setForm({...form, dose: e.target.value})} 
            />
          </div>
          <div className="reminders-field">
            <label>Date</label>
            <input 
              type="date" 
              value={form.date} 
              onChange={e => setForm({...form, date: e.target.value})} 
              required 
            />
          </div>
          <div className="reminders-field">
            <label>Time</label>
            <input 
              type="time" 
              value={form.time} 
              onChange={e => setForm({...form, time: e.target.value})} 
              required 
            />
          </div>
          <div className="reminders-submit-wrapper">
            <button type="submit" className="medsafe-primary-btn">
              Set Alarm ?
            </button>
          </div>
        </form>
      </div>

      {/* Active Reminders List Card */}
      <div className="medsafe-card">
        <h3 className="medsafe-card-title">Active Alarms & Schedule</h3>
        {reminders.length === 0 ? (
          <p className="reminders-empty">No reminders scheduled yet.</p>
        ) : (
          <div className="reminders-list">
            {reminders.map(rem => (
              <div key={rem.id} className="reminder-item-row">
                <div>
                  <h4 className="reminder-item-name">
                    {rem.name} {rem.dose && <span className="reminder-item-dose">({rem.dose})</span>}
                  </h4>
                  <p className="reminder-item-datetime">
                    <span>?? {rem.date}</span> <span>? {rem.time}</span>
                  </p>
                </div>
                <div className="reminder-item-actions">
                  <button 
                    onClick={() => toggleActive(rem.id)} 
                    className={`reminder-toggle-btn ${rem.active ? 'active' : 'muted'}`}
                  >
                    {rem.active ? 'Alarm Active ??' : 'Muted ??'}
                  </button>
                  <button onClick={() => deleteReminder(rem.id)} className="reminder-delete-btn">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
`;

const remindersCss = `
.reminders-main-container {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  font-family: inherit;
  color: #0f172a;
}

.reminders-hero {
  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
  border-radius: 24px;
  padding: 2.5rem;
  color: #ffffff;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 25px -5px rgba(15, 118, 110, 0.3);
}

.reminders-badge {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  opacity: 0.9;
  margin-bottom: 0.5rem;
  font-weight: 600;
  display: block;
}

.reminders-hero h1 {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: #ffffff;
}

.reminders-hero p {
  font-size: 1rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0;
  line-height: 1.5;
}

.reminders-hero-icon {
  background: rgba(255, 255, 255, 0.2);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  backdrop-filter: blur(4px);
  flex-shrink: 0;
}

.medsafe-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
  padding: 1.75rem;
  margin-bottom: 1.5rem;
}

.medsafe-card-title {
  margin: 0 0 1.25rem 0;
  color: #0f172a;
  font-size: 1.25rem;
  font-weight: 600;
}

.reminders-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.reminders-field label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.5rem;
}

.reminders-field input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 0.95rem;
  background: #f8fafc;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
}

.reminders-field input:focus {
  border-color: #0f766e !important;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15) !important;
  background: #ffffff !important;
}

.reminders-submit-wrapper {
  grid-column: span 2;
  margin-top: 0.5rem;
}

.medsafe-primary-btn {
  background: #0f766e;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
  transition: background 0.2s ease;
}

.medsafe-primary-btn:hover {
  background: #115e59;
}

.reminders-empty {
  color: #64748b;
  margin: 0;
  font-size: 0.95rem;
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reminder-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.reminder-item-name {
  margin: 0 0 0.35rem 0;
  color: #0f172a;
  font-size: 1.1rem;
  font-weight: 600;
}

.reminder-item-dose {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: normal;
}

.reminder-item-datetime {
  margin: 0;
  font-size: 0.9rem;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.reminder-item-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reminder-toggle-btn {
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.reminder-toggle-btn.active {
  background: #dcfce7;
  color: #166534;
}

.reminder-toggle-btn.muted {
  background: #f1f5f9;
  color: #64748b;
}

.reminder-delete-btn {
  background: #fee2e2;
  color: #991b1b;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.reminder-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
}

.reminder-modal-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 2.5rem;
  width: 90%;
  max-width: 450px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.reminder-modal-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.reminder-modal-title {
  color: #0f766e;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.reminder-modal-med {
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.reminder-modal-dose {
  font-size: 0.95rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.reminder-modal-btn {
  background: #0f766e;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0.85rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
}
`;

fs.writeFileSync('src/Reminders.jsx', remindersCode, 'utf8');
fs.writeFileSync('src/Reminders.css', remindersCss, 'utf8');
console.log('Reminders component successfully matched with MedSafe UI/UX styling!');
