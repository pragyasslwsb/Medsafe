import React, { useState, useEffect } from 'react';
import './Reminders.css';

export default function Reminders() {
  const [reminders, setReminders] = useState([
    { id: 1, name: 'Aspirin 75mg', dose: '1 tablet', time: '08:00', date: new Date().toISOString().split('T')[0], active: true },
    { id: 2, name: 'Vitamin D3', dose: '1 capsule', time: '14:00', date: new Date().toISOString().split('T')[0], active: true }
  ]);
  const [form, setForm] = useState({ name: '', dose: '', time: '', date: new Date().toISOString().split('T')[0] });
  const [alertModal, setAlertModal] = useState(null);

  // Play pop/alarm sound using Web Audio API
  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.log("Audio not supported or blocked");
    }
  };

  // Check reminders every second against current system date and time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

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
    <div className="reminders-container" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
      
      {/* Alarm Popup Modal */}
      {alertModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2.5rem', width: '90%', maxWidth: '450px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>???</div>
            <h2 style={{ color: '#0f766e', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>It's time to take your medicine!</h2>
            <p style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 600, marginBottom: '0.5rem' }}>{alertModal.name}</p>
            {alertModal.dose && <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1.5rem' }}>Dose: {alertModal.dose}</p>}
            <button onClick={() => setAlertModal(null)} style={{ background: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)' }}>
              Dismiss / Taken ?
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="reminders-hero-banner" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', borderRadius: '24px', padding: '2.5rem', color: '#fff', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(15, 118, 110, 0.3)' }}>
        <div>
          <p style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.9, marginBottom: '0.5rem', fontWeight: 600 }}>STAY ON TRACK</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>Medicine Reminders & Alarms</h1>
          <p style={{ fontSize: '1rem', opacity: 0.9, maxWidth: '600px', margin: 0 }}>Set exact dates and times. Get audio alerts and popups when it's time to take your dose.</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.2)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', backdropFilter: 'blur(4px)' }}>
          ?
        </div>
      </div>

      {/* Add Reminder Form */}
      <div className="reminder-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)', padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: '#0f172a', fontSize: '1.25rem', fontWeight: 600 }}>Schedule New Alarm</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Medicine Name</label>
            <input type="text" placeholder="e.g. Paracetamol" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Dose</label>
            <input type="text" placeholder="e.g. 1 tablet / 5ml" value={form.dose} onChange={e => setForm({...form, dose: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Time</label>
            <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }} required />
          </div>
          <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
            <button type="submit" style={{ background: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0.85rem 1.5rem', fontWeight: 600, cursor: 'pointer', width: '100%', fontSize: '1rem', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)' }}>
              Set Medicine Alarm ?
            </button>
          </div>
        </form>
      </div>

      {/* Reminders List */}
      <div className="reminder-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)', padding: '1.75rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: '#0f172a', fontSize: '1.25rem', fontWeight: 600 }}>Active Alarms & Schedule</h3>
        {reminders.length === 0 ? (
          <p style={{ color: '#64748b' }}>No reminders scheduled yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reminders.map(rem => (
              <div key={rem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: 600 }}>
                    {rem.name} {rem.dose && <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal' }}>({rem.dose})</span>}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>?? {rem.date}</span> <span>? {rem.time}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={() => toggleActive(rem.id)} style={{ background: rem.active ? '#dcfce7' : '#f1f5f9', color: rem.active ? '#166534' : '#64748b', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    {rem.active ? 'Alarm Active ??' : 'Muted ??'}
                  </button>
                  <button onClick={() => deleteReminder(rem.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
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
}
