const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Check if Reminders tab button exists in nav
if (!code.includes("activeScreen === 'reminders'")) {
  console.log("Reminders tab button missing from nav. Adding it now...");
  // Find the Lab Report tab button and add Reminders button after it
  const labButtonRegex = /(<button[^>]*aria-selected=\{activeScreen === 'lab'\}[\s\S]*?<\/button>)/;
  if (labButtonRegex.test(code)) {
    const remindersButton = `\n          <button type="button" role="tab" aria-selected={activeScreen === 'reminders'} className={activeScreen === 'reminders' ? 'active' : ''} onClick={() => setActiveScreen('reminders')}><span aria-hidden="true">?</span><span>Reminders</span></button>`;
    code = code.replace(labButtonRegex, `$1${remindersButton}`);
    fs.writeFileSync('src/App.jsx', code, 'utf8');
    console.log("Added Reminders tab button to nav!");
  } else {
    console.log("Could not find lab button in App.jsx nav.");
  }
} else {
  console.log("Reminders tab button already present.");
}
