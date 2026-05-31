const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

code = code.replace(/lg:table/g, 'md:table');
code = code.replace(/lg:hidden/g, 'md:hidden');
code = code.replace(/lg:block/g, 'md:block');

fs.writeFileSync('src/app/admin/page.tsx', code);
console.log('Fixed breakpoints');
