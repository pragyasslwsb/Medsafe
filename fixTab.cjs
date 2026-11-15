const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the unconditional <Reminders /> render with the correct activeScreen condition
code = code.replace(
  /<Reminders\s*\/>/g,
  "{activeScreen === 'reminders' && <Reminders />}"
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Successfully bound Reminders to activeScreen condition!');
