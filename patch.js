const fs = require('fs');

// Patch Settings Page
let settingsContent = fs.readFileSync('src/app/admin/settings/page.tsx', 'utf8');

if (!settingsContent.includes('CsvImporter')) {
  settingsContent = settingsContent.replace(
    "import Link from 'next/link';",
    "import Link from 'next/link';\nimport CsvImporter from '@/components/CsvImporter';"
  );

  const section = `
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Members (CSV)</h3>
          <p className="text-sm text-gray-500 mb-6">Upload a CSV file containing your member database. This is typically only done once when setting up the club for the first time.</p>
          <div className="bg-gray-50 p-4 border border-gray-400 rounded-md shadow-sm">
            <CsvImporter />
          </div>
        </div>
`;

  settingsContent = settingsContent.replace(
    '<div className="border-t pt-6 mt-6">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Templates</h3>',
    section + '        <div className="border-t pt-6 mt-6">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Templates</h3>'
  );

  fs.writeFileSync('src/app/admin/settings/page.tsx', settingsContent);
  console.log('Updated settings page');
}

// Patch Admin Page (Remove all Import logic)
let adminContent = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Remove papaparse import
adminContent = adminContent.replace(/import Papa from 'papaparse';\n/g, '');

// Remove states
adminContent = adminContent.replace(/const \[importing, setImporting\] = useState\(false\);\n/g, '');
adminContent = adminContent.replace(/const \[importResult, setImportResult\].*?\n/g, '');
adminContent = adminContent.replace(/const \[showImportModal, setShowImportModal\].*?\n/g, '');
adminContent = adminContent.replace(/const \[csvData, setCsvData\].*?\n/g, '');
adminContent = adminContent.replace(/const \[csvHeaders, setCsvHeaders\].*?\n/g, '');
adminContent = adminContent.replace(/const \[fieldMapping, setFieldMapping\].*?\n/g, '');
adminContent = adminContent.replace(/const fileInputRef = useRef<HTMLInputElement>\(null\);\n/g, '');

// Remove TARGET_FIELDS and import functions
const targetFieldsStart = adminContent.indexOf('const TARGET_FIELDS = [');
if (targetFieldsStart !== -1) {
  const targetFieldsEndString = 'setImporting(false);\n    }\n  };\n';
  const targetFieldsEnd = adminContent.indexOf(targetFieldsEndString, targetFieldsStart) + targetFieldsEndString.length;
  adminContent = adminContent.substring(0, targetFieldsStart) + adminContent.substring(targetFieldsEnd);
}

// Remove button and input
const inputStart = adminContent.indexOf('<input \n              type="file"');
if (inputStart !== -1) {
  const buttonEndString = '{importing ? \'Importing...\' : \'Import CSV\'}\n            </button>\n';
  const buttonEnd = adminContent.indexOf(buttonEndString, inputStart) + buttonEndString.length;
  adminContent = adminContent.substring(0, inputStart) + adminContent.substring(buttonEnd);
}

// Remove import results modal (if it was there)
const importResultJSXStart = adminContent.indexOf('{importResult && (');
if (importResultJSXStart !== -1) {
  const resultEndString = '        )}\n\n        <div className="grid grid-cols-2';
  const resultEnd = adminContent.indexOf(resultEndString, importResultJSXStart);
  if (resultEnd !== -1) {
    adminContent = adminContent.substring(0, importResultJSXStart) + adminContent.substring(resultEnd + 10);
  }
}

// Remove big import modal JSX
const showImportModalStart = adminContent.indexOf('{showImportModal && (');
if (showImportModalStart !== -1) {
  const modalEndString = '        )}\n      </div>\n    </div>\n  );\n}';
  const modalEnd = adminContent.indexOf(modalEndString, showImportModalStart);
  if (modalEnd !== -1) {
    adminContent = adminContent.substring(0, showImportModalStart) + '      </div>\n    </div>\n  );\n}';
  }
}

fs.writeFileSync('src/app/admin/page.tsx', adminContent);
console.log('Updated admin page');
