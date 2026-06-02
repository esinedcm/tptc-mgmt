const fs = require('fs');
let lines = fs.readFileSync('src/app/admin/page.tsx', 'utf8').split('\n');

const removeBlock = (startStr, endStr) => {
  const start = lines.findIndex(l => l.includes(startStr));
  if (start !== -1) {
    const end = lines.findIndex((l, i) => i > start && l.includes(endStr));
    if (end !== -1) {
      lines.splice(start, end - start + 1);
    }
  }
};

removeBlock('<input ', '</button>'); // The button and input
removeBlock('{importResult && (', ')}'); // the importResult modal
removeBlock('{showImportModal && (', ')}'); // showImportModal modal
// Need to find the second )} for showImportModal? 
// The end of showImportModal is not just )}, it has a lot of divs.
// Let's just search and remove using regex for the whole file.

let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
content = content.replace(/<input [\s\S]*?Import CSV'}\s*<\/button>/g, '');
content = content.replace(/{importResult && \([\s\S]*?<\/table>[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*\)\}/g, '');
content = content.replace(/{showImportModal && \([\s\S]*?Confirm & Import {csvData\.length} Records\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/g, '');

fs.writeFileSync('src/app/admin/page.tsx', content);
