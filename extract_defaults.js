const fs = require('fs');
const content = fs.readFileSync('src/lib/email.ts', 'utf8');

const regex = /const defaultHtml = `([\s\S]*?)`;\s+const defaultSubject = "(.*?)";[\s\S]*?fetchTemplate\('([^']+)'/g;

const defaults = {};
let match;
while ((match = regex.exec(content)) !== null) {
  const html = match[1];
  const subject = match[2];
  const id = match[3];
  defaults[id] = { subject, htmlBody: html.trim() };
}

console.log('const DEFAULT_TEMPLATES: Record<string, { subject: string, htmlBody: string }> = ' + JSON.stringify(defaults, null, 2) + ';');
