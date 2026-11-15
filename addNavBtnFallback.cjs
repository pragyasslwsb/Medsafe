const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Fallback: Find the nav element and insert the Reminders button before the closing </nav> tag
const navCloseIndex = code.lastIndexOf('</nav>');
if (navCloseIndex !== -1 && !code.includes("setActiveScreen('reminders')")) {
  const reminderButton = `\n          <button type="button" role="tab" aria-selected={activeScreen === 'reminders'} className={activeScreen === 'reminders' ? 'active' : ''} onClick={() => setActiveScreen('reminders')}><span aria-hidden="true">?</span><span>Reminders</span></button>\n        `;
  code = code.slice(0, navCloseIndex) + reminderButton + code.slice(navCloseIndex);
  fs.writeFileSync('src/App.jsx', code, 'utf8');
  console.log("Successfully injected Reminders button into nav!");
} else {
  console.log("Nav element not found or button already exists.");
}
