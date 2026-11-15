const fs = require('fs');

// 1. Create clean Reminders.jsx with matching MedSafe theme and clock icon
const remindersCode = `import React, { useState } from 'react';
import './Reminders.css';

export default function Reminders() {
  const [reminders, setReminders] = useState([
    { id: 1, name: 'Aspirin 75mg', dose: '1 tablet', time: '08:00', date: '2026-11-15' },
    { id: 2, name: 'Vitamin D3', dose: '1 capsule', time: '14:00', date: '2026-11-15' }
  ]);
  const [form, setForm] = useState({ name: '', dose: '', time: '', date: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.time) return;
    setReminders([...reminders, { id: Date.now(), ...form }]);
    setForm({ name: '', dose: '', time: '', date: '' });
  };

  return (
    <div className="reminders-container" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Matching MedSafe Teal Hero Banner with Clock Icon */}
      <div className="reminders-hero-banner" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', borderRadius: '24px', padding: '2.5rem', color: '#fff', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(15, 118, 110, 0.3)' }}>
        <div>
          <p style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.9, marginBottom: '0.5rem', fontWeight: 600 }}>STAY ON TRACK</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>Medicine Reminders</h1>
          <p style={{ fontSize: '1rem', opacity: 0.9, maxWidth: '600px', margin: 0 }}>Never miss a dose with smart schedule management, audio alarms, and instant notifications.</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.2)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', backdropFilter: 'blur(4px)' }}>
          ?
        </div>
      </div>

      {/* Add Reminder Form Card */}
      <div className="reminder-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)', padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: '#0f172a', fontSize: '1.25rem', fontWeight: 600 }}>Add New Reminder</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Medicine Name</label>
            <input type="text" placeholder="e.g. Paracetamol" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Dose (optional)</label>
            <input type="text" placeholder="e.g. 1 tablet" value={form.dose} onChange={e => setForm({...form, dose: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Time</label>
            <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} />
          </div>
          <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
            <button type="submit" style={{ background: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}>Add Reminder ?</button>
          </div>
        </form>
      </div>

      {/* Reminders List */}
      <div className="reminder-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)', padding: '1.75rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: '#0f172a', fontSize: '1.25rem', fontWeight: 600 }}>Active Reminders</h3>
        {reminders.length === 0 ? (
          <p style={{ color: '#64748b' }}>No reminders set yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reminders.map(rem => (
              <div key={rem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.05rem' }}>{rem.name} {rem.dose && <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal' }}>({rem.dose})</span>}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>?? {rem.date || 'Today'} ? {rem.time}</p>
                </div>
                <span className="countdown-pill" style={{ display: 'inline-flex', alignItems: 'center', background: '#dcfce7', color: '#166534', fontWeight: 600, fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>Active</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/Reminders.jsx', remindersCode, 'utf8');

// 2. Ensure Reminders.css exists
const remindersCss = `
.reminders-container { color: #0f172a; font-family: inherit; }
.reminder-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05); padding: 1.75rem; margin-bottom: 1.5rem; }
input:focus, select:focus { border-color: #0f766e !important; box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15) !important; background: #ffffff !important; }
`;
fs.writeFileSync('src/Reminders.css', remindersCss, 'utf8');

console.log('Reminders component and CSS created successfully!');
