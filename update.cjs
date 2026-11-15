const fs = require('fs');

// 1. Clean up global banner from App.jsx if it was added there
let appCode = fs.readFileSync('src/App.jsx', 'utf8');
appCode = appCode.replace(/<div className="reminders-hero-banner"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*/g, '');
appCode = appCode.replace(/<div className="reminders-hero-banner"[\s\S]*?<\/div>/g, '');
fs.writeFileSync('src/App.jsx', appCode, 'utf8');

// 2. Find the Reminders component file (e.g. Reminders.jsx)
const files = fs.readdirSync('src');
let reminderFile = files.find(f => /reminder/i.test(f) && (f.endsWith('.jsx') || f.endsWith('.js')));

const banner = `
    <div className="reminders-hero-banner" style={{background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', borderRadius: '24px', padding: '2.5rem', color: '#fff', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(15, 118, 110, 0.3)'}}>
      <div>
        <p style={{fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.9, marginBottom: '0.5rem', fontWeight: 600}}>STAY ON TRACK</p>
        <h1 style={{fontSize: '2.25rem', fontWeight: 700, margin: '0 0 0.75rem 0'}}>Medicine Reminders</h1>
        <p style={{fontSize: '1rem', opacity: 0.9, maxWidth: '600px', margin: 0}}>Never miss a dose with smart schedule management and audio alarms.</p>
      </div>
      <div style={{background: 'rgba(255, 255, 255, 0.2)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'}}>
        ?
      </div>
    </div>
`;

if (reminderFile) {
  let rCode = fs.readFileSync('src/' + reminderFile, 'utf8');
  // Remove duplicate banner if present
  rCode = rCode.replace(/<div className="reminders-hero-banner"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*/g, '');
  rCode = rCode.replace(/<div className="reminders-hero-banner"[\s\S]*?<\/div>/g, '');
  
  // Inject banner inside the top return of Reminders component
  rCode = rCode.replace(/(return\s*\(\s*<div[^>]*>)/i, `$1\n${banner}`);
  fs.writeFileSync('src/' + reminderFile, rCode, 'utf8');
  console.log('Successfully placed banner inside:', reminderFile);
} else {
  console.log('Reminder component file not found separately, please check App.jsx');
}
