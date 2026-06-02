const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Remove Button and Input
const inputStart = content.indexOf('            <input \n              type="file" \n              accept=".csv" \n              ref={fileInputRef} \n              style={{ display: \'none\' }} \n              onChange={handleImportCSV} \n            />');
if (inputStart !== -1) {
  const buttonEndStr = '              {importing ? \'Importing...\' : \'Import CSV\'}\n            </button>\n';
  const buttonEnd = content.indexOf(buttonEndStr, inputStart) + buttonEndStr.length;
  content = content.substring(0, inputStart) + content.substring(buttonEnd);
}

// 2. Remove importResult
const importResultStart = content.indexOf('        {importResult && (\n          <div className="mb-8 p-4 bg-blue-50 text-blue-900 rounded-md border border-blue-200">');
if (importResultStart !== -1) {
  const resultEndStr = '          </div>\n        )}\n';
  const resultEnd = content.indexOf(resultEndStr, importResultStart) + resultEndStr.length;
  content = content.substring(0, importResultStart) + content.substring(resultEnd);
}

// 3. Remove showImportModal
const showImportModalStart = content.indexOf('      {showImportModal && (\n        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">');
if (showImportModalStart !== -1) {
  const modalEndStr = '        </div>\n      )}\n';
  const modalEnd = content.indexOf(modalEndStr, showImportModalStart) + modalEndStr.length;
  content = content.substring(0, showImportModalStart) + content.substring(modalEnd);
}

fs.writeFileSync('src/app/admin/page.tsx', content);
console.log('Patch 3 complete');
