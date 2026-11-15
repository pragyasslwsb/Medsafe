const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

console.log('--- SEARCHING FOR REMINDERS OR TABS IN App.jsx ---');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (/reminder|tab|LabReport|activeTab/i.test(line)) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
