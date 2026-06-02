const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Remove the huge logic block
const lines = content.split('\n');
const targetStart = lines.findIndex(l => l.includes('const TARGET_FIELDS = ['));
const welcomeStart = lines.findIndex(l => l.includes('const handleSendWelcomeEmails = '));

if (targetStart !== -1 && welcomeStart !== -1) {
  lines.splice(targetStart, welcomeStart - targetStart);
}
content = lines.join('\n');

// 2. Remove the Input and Button
const inputStart = content.indexOf('<input \n              type="file"');
if (inputStart !== -1) {
  const buttonEndString = '{importing ? \'Importing...\' : \'Import CSV\'}\n            </button>\n';
  const buttonEnd = content.indexOf(buttonEndString, inputStart);
  if (buttonEnd !== -1) {
    content = content.substring(0, inputStart) + content.substring(buttonEnd + buttonEndString.length);
  }
}

// 3. Remove importResult
const importResultJSXStart = content.indexOf('{importResult && (');
if (importResultJSXStart !== -1) {
  const resultEndString = '        )}\n\n        <div className="grid grid-cols-2';
  const resultEnd = content.indexOf(resultEndString, importResultJSXStart);
  if (resultEnd !== -1) {
    content = content.substring(0, importResultJSXStart) + content.substring(resultEnd + 10);
  }
}

// 4. Remove showImportModal
const showImportModalStart = content.indexOf('{showImportModal && (');
if (showImportModalStart !== -1) {
  const modalEndString = '        )}\n      </div>\n    </div>\n  );\n}';
  const modalEnd = content.indexOf(modalEndString, showImportModalStart);
  if (modalEnd !== -1) {
    content = content.substring(0, showImportModalStart) + '      </div>\n    </div>\n  );\n}';
  }
}

fs.writeFileSync('src/app/admin/page.tsx', content);
console.log('Successfully cleaned up page.tsx');
