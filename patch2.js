const fs = require('fs');

const file = 'src/app/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Get mobile contents
const mobileMemberships = fs.readFileSync('C:/Users/info/.gemini/antigravity/brain/a4b138a1-b5ac-4de5-b613-6a569d6facbd/scratch/mobile_layout.tsx', 'utf8');
let mobileMembershipsCode = mobileMemberships.split('{/* Mobile View */}')[1].trim();
mobileMembershipsCode = mobileMembershipsCode.replace(/lg:hidden/g, 'md:hidden');

const mobilePast = fs.readFileSync('C:/Users/info/.gemini/antigravity/brain/a4b138a1-b5ac-4de5-b613-6a569d6facbd/scratch/mobile_past.tsx', 'utf8');
let mobilePastCode = mobilePast.split('{/* Mobile View */}')[1].trim();
mobilePastCode = mobilePastCode.replace(/lg:hidden/g, 'md:hidden');

// FIX 1: Remove `hidden md:table` from the tables themselves
code = code.replace(/<table className="hidden md:table min-w-full divide-y divide-gray-400">/g, '<table className="min-w-full divide-y divide-gray-400">');

// FIX 2: Wrap the desktop table in hidden md:block, and insert mobile
const membershipsDesktopTableStart = `: activeTab !== 'Past Members' && (\n              <table`;
const membershipsDesktopTableReplacement = `: activeTab !== 'Past Members' && (\n              <>\n              <div className="hidden md:block w-full overflow-x-auto">\n              <table`;
code = code.replace(membershipsDesktopTableStart, membershipsDesktopTableReplacement);

const membershipsDesktopTableEnd = `                </tbody>\n              </table>\n            )}`;
const membershipsDesktopTableEndReplacement = `                </tbody>\n              </table>\n              </div>\n              ${mobileMembershipsCode}\n              </>\n            )}`;
code = code.replace(membershipsDesktopTableEnd, membershipsDesktopTableEndReplacement);

// FIX 3: Same for Past Members
const pastDesktopTableStart = `{activeTab === 'Past Members' && filteredPastMembers.length > 0 && (\n              <table`;
const pastDesktopTableReplacement = `{activeTab === 'Past Members' && filteredPastMembers.length > 0 && (\n              <>\n              <div className="hidden md:block w-full overflow-x-auto">\n              <table`;
code = code.replace(pastDesktopTableStart, pastDesktopTableReplacement);

const pastDesktopTableEnd = `                </tbody>\n              </table>\n            )}`;
const pastDesktopTableEndReplacement = `                </tbody>\n              </table>\n              </div>\n              ${mobilePastCode}\n              </>\n            )}`;
code = code.replace(pastDesktopTableEnd, pastDesktopTableEndReplacement);

// Convert back to CRLF
code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code);
console.log('Patch completed successfully');
