const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Clean up any unmatched closing tags or fragments around reminders
code = code.replace(/<\/>\s*<\/>/g, '</>');
fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed JSX syntax!');
