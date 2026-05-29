const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
const words = ['color', 'center', 'behavior', 'program', 'canceled', 'enroll'];
const regexes = words.map(w => new RegExp(`\\b${w}\\b`, 'i'));

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let hasMatch = false;
  
  // ignore Tailwind classes and variable names by checking if it's likely a text node
  // A simple heuristic: check lines containing the words
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    for (let r of regexes) {
      if (r.test(line)) {
        // filter out tailwind and common code vars
        if (!line.includes('primaryColor') && !line.includes('className=') && !line.includes('justify-center') && !line.includes('items-center') && !line.includes('text-center')) {
          console.log(`[${file}:${i+1}] ${line.trim()}`);
        }
      }
    }
  });
});
