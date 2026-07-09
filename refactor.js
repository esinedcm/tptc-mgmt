const fs = require('fs');
let content = fs.readFileSync('src/app/admin/settings/page.tsx', 'utf8');

const navMenuStart = content.indexOf('<div className="border-b pb-6">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">\n            Navigation Menu');
const sponsorLogosStart = content.indexOf('<div className="border-b pb-6">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">\n            Footer Sponsor Logos');
const courtSettingsStart = content.indexOf('<div className="border-b pb-6">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">\n            Court Settings');

const navMenuBlock = content.substring(navMenuStart, sponsorLogosStart);
const sponsorLogosBlock = content.substring(sponsorLogosStart, courtSettingsStart);

const websiteBrandingStart = content.indexOf('<div className="border-t pt-6 mt-6 pb-6">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">\n            Website & Branding');
const websitePagesManagerStart = content.indexOf('<div className="border-t pt-6 mt-6 pb-6">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">\n            Website Pages Manager');

const websiteBrandingBlock = content.substring(websiteBrandingStart, websitePagesManagerStart);

content = content.replace(websiteBrandingBlock, '');

const newBlock = \
        <details className="border rounded-md bg-white shadow-sm p-4 group mb-6">
          <summary className="text-lg font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center">
            Website & Branding
            <span className="transition group-open:rotate-180">
              <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          <div className="mt-6 space-y-6 border-t pt-6">
            \
            \
            \
          </div>
        </details>
\;

content = content.replace(navMenuBlock + sponsorLogosBlock, newBlock);

fs.writeFileSync('src/app/admin/settings/page.tsx', content);
console.log('Refactoring complete');
