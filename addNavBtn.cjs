const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Check if Reminders button already exists in nav
if (!code.includes("setActiveScreen('reminders')")) {
  // Find the Lab Report tab button and inject Reminders button right after it
  const target = 'onClick={() => setActiveScreen(\'lab\')}><span className="lab-tab-icon" aria-hidden="true">??</span><span>{t(\'Lab Report\')}</span></button>';
  
  const reminderButton = `\n          <button type="button" role="tab" aria-selected={activeScreen === 'reminders'} className={activeScreen === 'reminders' ? 'active' : ''} onClick={() => setActiveScreen('reminders')}><span aria-hidden="true">?</span><span>Reminders</span></button>`;
  
  if (code.includes(target)) {
    code = code.replace(target, target + reminderButton);
    fs.writeFileSync('src/App.jsx', code, 'utf8');
    console.log("Successfully added Reminders button to nav!");
  } else {
    console.log("Target button not found exactly, trying fallback injection...");
  }
} else {
  console.log("Reminders button already exists in nav.");
}
