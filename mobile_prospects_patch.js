const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Normalize line endings for reliable matching
code = code.replace(/\r\n/g, '\n');

const startIdx = code.indexOf('<div className="overflow-x-auto">');
const endIdxStr = '            )}';
// Find the closing div of the overflow-x-auto after the table
const endTableIdx = code.indexOf('              </table>\n            )}\n          </div>', startIdx);

if (startIdx === -1 || endTableIdx === -1) {
  console.log('Could not find target block');
  process.exit(1);
}

const before = code.substring(0, startIdx);
const after = code.substring(endTableIdx + '              </table>\n            )}\n          </div>'.length);

const replacementStr = `<>
              {filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No prospects found.</div>
              ) : (
                <>
                  <div className="hidden md:block w-full overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-400">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prospect Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-400">
                        {filteredLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{lead.email}</div>
                              {lead.phoneNumber && <div className="text-sm text-gray-500">{lead.phoneNumber}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {lead.status !== 'Converted' && (
                                <Link
                                  href={\`/register?leadId=\${lead.id}\`}
                                  className="text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-md text-sm px-4 py-2 shadow-sm transition-colors mr-2"
                                >
                                  Register
                                </Link>
                              )}
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-white bg-red-600 hover:bg-red-700 font-medium rounded-md text-sm px-4 py-2 shadow-sm transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50 border-t border-gray-200">
                    {filteredLeads.map((lead) => (
                      <div key={lead.id} className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-lg font-bold text-gray-900 leading-tight">{lead.firstName} {lead.lastName}</h4>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
                          <div><span className="font-medium text-gray-400 w-16 inline-block">Email:</span> {lead.email}</div>
                          {lead.phoneNumber && <div><span className="font-medium text-gray-400 w-16 inline-block">Phone:</span> {lead.phoneNumber}</div>}
                        </div>
                        
                        <div className="mt-auto border-t border-gray-100 pt-3 flex flex-col gap-2">
                          {lead.status !== 'Converted' && (
                            <Link
                              href={\`/register?leadId=\${lead.id}\`}
                              className="text-center text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-md text-sm px-4 py-2 transition-colors w-full"
                            >
                              Register
                            </Link>
                          )}
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 font-medium rounded-md text-sm px-4 py-2 transition-colors w-full"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>`;

let newCode = before + replacementStr + after;
newCode = newCode.replace(/\n/g, '\r\n');

fs.writeFileSync(file, newCode);
console.log('Successfully applied Prospects mobile layout patch.');
