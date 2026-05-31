const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/\r\n/g, '\n');

// Desktop
code = code.replace(
  `{m.user.dateOfBirth && (
                            <div className="text-xs text-gray-500 mt-1">
                              DOB: {new Date(m.user.dateOfBirth).toLocaleDateString()}
                              {m.user.gender && <span className="ml-2 pl-2 border-l border-gray-300">{m.user.gender}</span>}
                            </div>
                          )}`,
  `<div className="text-xs text-gray-500 mt-1">
                              DOB: {m.user.dateOfBirth ? new Date(m.user.dateOfBirth).toLocaleDateString() : <span className="text-red-500 italic font-medium">Missing</span>}
                              {m.user.gender && <span className="ml-2 pl-2 border-l border-gray-300">{m.user.gender}</span>}
                            </div>`
);

// Mobile
code = code.replace(
  `{m.user.dateOfBirth && <div><span className="font-medium text-gray-400 w-16 inline-block">DOB:</span> {new Date(m.user.dateOfBirth).toLocaleDateString()}{m.user.gender && <span className="ml-2 pl-2 border-l border-gray-300">{m.user.gender}</span>}</div>}`,
  `<div><span className="font-medium text-gray-400 w-16 inline-block">DOB:</span> {m.user.dateOfBirth ? new Date(m.user.dateOfBirth).toLocaleDateString() : <span className="text-red-500 italic font-medium">Missing</span>}{m.user.gender && <span className="ml-2 pl-2 border-l border-gray-300">{m.user.gender}</span>}</div>`
);

code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code);
console.log('Successfully patched DOB missing display');
