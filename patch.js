const fs = require('fs');

const file = 'src/app/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Memberships table
code = code.replace(
  '<table className="min-w-full divide-y divide-gray-400">',
  '<table className="hidden lg:table min-w-full divide-y divide-gray-400">'
);

const mobileMemberships = fs.readFileSync('C:/Users/info/.gemini/antigravity/brain/a4b138a1-b5ac-4de5-b613-6a569d6facbd/scratch/mobile_layout.tsx', 'utf8');
const mobileMembershipsCode = mobileMemberships.split('            {/* Mobile View */}')[1].trim();

// 2. Insert mobile memberships after </table>
const membershipsEnd = `                </tbody>\n              </table>`;
code = code.replace(
  membershipsEnd,
  `${membershipsEnd}\n              <div className="block lg:hidden p-4 space-y-4">\n                ${mobileMembershipsCode}\n              </div>`
);

// 3. Past Members table
const pastMembersStart = `{activeTab === 'Past Members' && filteredPastMembers.length > 0 && (\n              <table className="min-w-full divide-y divide-gray-400">`;
code = code.replace(
  pastMembersStart,
  `{activeTab === 'Past Members' && filteredPastMembers.length > 0 && (\n              <>\n              <table className="hidden lg:table min-w-full divide-y divide-gray-400">`
);

const mobilePast = fs.readFileSync('C:/Users/info/.gemini/antigravity/brain/a4b138a1-b5ac-4de5-b613-6a569d6facbd/scratch/mobile_past.tsx', 'utf8');
const mobilePastCode = mobilePast.split('            {/* Mobile View */}')[1].trim();

// 4. Insert mobile past members and close fragment
const pastMembersEnd = `                </tbody>\n              </table>\n            )}`;
code = code.replace(
  pastMembersEnd,
  `                </tbody>\n              </table>\n              ${mobilePastCode}\n              </>\n            )}`
);

fs.writeFileSync(file, code);
console.log('Patched successfully');
