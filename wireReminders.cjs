const fs = require('fs');

let appCode = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add import for Reminders if not present
if (!appCode.includes("import Reminders")) {
  appCode = "import Reminders from './Reminders';\n" + appCode;
}

// 2. Replace the tab view logic or placeholder for reminders with the <Reminders /> component
// Looking for common tab conditions like activeTab === 'reminders' or similar
if (appCode.includes("activeTab") || appCode.includes("currentTab") || appCode.includes("tab")) {
  // Replace fallback or reminder render block with <Reminders />
  appCode = appCode.replace(/['\"]reminders['\"][\s\S]*?:([\s\S]*?[;>])/i, "'reminders': <Reminders />$1");
}

// If there's a specific section or conditional rendering for reminders, ensure it renders <Reminders />
if (!appCode.includes("<Reminders")) {
  // Try to inject it right inside the main content router area
  appCode = appCode.replace(/(activeTab\s*===\s*['\"]reminders['\"]\s*\?\s*)([^:\)]+)/i, `$1<Reminders />`);
}

fs.writeFileSync('src/App.jsx', appCode, 'utf8');
console.log('Successfully wired Reminders into App.jsx!');
