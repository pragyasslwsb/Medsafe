const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Ensure Reminders is imported
if (!code.includes("import Reminders")) {
  code = code.replace(/(import\s+LabReport[^\n]*\n)/, "$1import Reminders from './Reminders';\n");
  if (!code.includes("import Reminders")) {
    code = "import Reminders from './Reminders';\n" + code;
  }
}

// 2. Inspect how LabReport is rendered in JSX and mirror it for Reminders
const labMatch = code.match(/([^\n]*<LabReport\s*\/>[^\n]*)/);

if (labMatch) {
  const labLine = labMatch[1];
  console.log('Matched LabReport render pattern:', labLine.trim());

  // Replace 'lab' / 'labReport' / 'Lab Report' in the matched condition with 'reminders'
  let reminderLine = labLine
    .replace(/<LabReport\s*\/>/, '<Reminders />')
    .replace(/(['"`])(lab[-_]?report|lab)\1/i, "$1reminders$1");

  if (!code.includes('<Reminders')) {
    code = code.replace(labLine, `${labLine}\n${reminderLine}`);
    console.log('Injected Reminders line:', reminderLine.trim());
  }
} else {
  console.log('Could not find <LabReport /> tag. Printing tab lines from App.jsx:');
  code.split('\n').forEach((line, i) => {
    if (/tab|reminders|LabReport/i.test(line)) console.log(`${i + 1}: ${line}`);
  });
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
