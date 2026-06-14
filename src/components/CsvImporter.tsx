'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

const TARGET_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email Address', required: true },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'gender', label: 'Gender' },
  { key: 'streetAddress', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'tagNumber', label: 'Shoe Tag Number' },
  { key: 'wantsFreeLessons', label: 'Interested in Free Lessons (Yes/No)' },
  { key: 'membershipType', label: 'Membership Type (Plan)' },
  { key: 'status', label: 'Membership Status (Active/Pending)' },
  { key: 'amountPaid', label: 'Amount Paid' },
  { key: 'paymentNotes', label: 'Payment Notes' },
  { key: 'paymentRecordedAt', label: 'Payment Date (YYYY-MM-DD)' },
  { key: 'householdId', label: 'Household Group ID' },
];

export default function CsvImporter({ onImportComplete }: { onImportComplete?: () => void }) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number, skipped: number, skippedRecords: { email: string, name: string, reason: string }[] } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          alert('Error parsing CSV: ' + results.errors[0].message);
          return;
        }
        
        if (!results.data || results.data.length === 0) {
          alert('CSV file is empty or invalid.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);
        
        const initialMapping: Record<string, string> = {};
        TARGET_FIELDS.forEach(field => {
          const matchedHeader = headers.find((h: string) => 
            h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.label.toLowerCase().replace(/[^a-z0-9]/g, '') ||
            h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (matchedHeader) {
            initialMapping[field.key] = matchedHeader;
          }
        });
        
        if (!initialMapping['firstName']) {
          const match = headers.find((h: string) => h.toLowerCase().includes('first'));
          if (match) initialMapping['firstName'] = match;
        }
        if (!initialMapping['lastName']) {
          const match = headers.find((h: string) => h.toLowerCase().includes('last'));
          if (match) initialMapping['lastName'] = match;
        }
        if (!initialMapping['phoneNumber']) {
          const match = headers.find((h: string) => h.toLowerCase().includes('phone'));
          if (match) initialMapping['phoneNumber'] = match;
        }
        if (!initialMapping['email']) {
          const match = headers.find((h: string) => h.toLowerCase().includes('email'));
          if (match) initialMapping['email'] = match;
        }
        
        setFieldMapping(initialMapping);
        setShowImportModal(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const executeImport = async () => {
    const missingRequired = TARGET_FIELDS.filter(f => f.required && !fieldMapping[f.key]);
    if (missingRequired.length > 0) {
      alert(`Please map the following required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setImporting(true);
    setShowImportModal(false);

    const standardizedData = csvData.map(row => {
      const standardObj: any = {};
      TARGET_FIELDS.forEach(field => {
        const csvHeader = fieldMapping[field.key];
        if (csvHeader && row[csvHeader] !== undefined) {
          standardObj[field.key] = row[csvHeader];
        }
      });
      if (markAsPaid) {
        standardObj.status = 'Active';
        if (!standardObj.paymentNotes) {
          standardObj.paymentNotes = 'Marked as paid during import';
        }
      }
      return standardObj;
    });

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(standardizedData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setImportResult({ imported: data.importedCount, skipped: data.skippedCount, skippedRecords: data.skippedRecords || [] });
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleImportCSV} 
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        title="Required columns: Email, First Name, Last Name"
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
      >
        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {importing ? 'Importing...' : 'Import CSV'}
      </button>

      {importResult && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Import Complete</h3>
              <button onClick={() => setImportResult(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <p className="mb-2 text-gray-800">Successfully imported <strong>{importResult.imported}</strong> members.</p>
            {importResult.skipped > 0 && (
              <>
                <p className="mb-2 text-orange-800">Skipped <strong>{importResult.skipped}</strong> records that were duplicates or invalid.</p>
                {importResult.skippedRecords.length > 0 && (
                  <div className="mt-4 max-h-64 overflow-y-auto bg-gray-50 rounded border border-gray-200 p-2">
                    <table className="min-w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 border-b border-gray-200">Name</th>
                          <th className="px-3 py-2 border-b border-gray-200">Email</th>
                          <th className="px-3 py-2 border-b border-gray-200">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.skippedRecords.map((rec, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <td className="px-3 py-2">{rec.name}</td>
                            <td className="px-3 py-2">{rec.email}</td>
                            <td className="px-3 py-2 text-orange-600">{rec.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setImportResult(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Map CSV Columns</h3>
              <p className="text-sm text-gray-500 mt-1">We found {csvHeaders.length} columns in your CSV. Map them to the correct fields in our database.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="flex flex-col sm:flex-row mb-2 px-3">
                <div className="w-full sm:w-1/2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-0">
                  Database Field
                </div>
                <div className="w-full sm:w-1/2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  CSV Column
                </div>
              </div>
              
              <div className="space-y-2">
                {TARGET_FIELDS.map(field => (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
                    <div className="w-full sm:w-1/2 mb-2 sm:mb-0">
                      <span className="text-sm font-medium text-gray-900">{field.label}</span>
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <div className="w-full sm:w-1/2">
                      <select
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={fieldMapping[field.key] || ''}
                        onChange={(e) => setFieldMapping({...fieldMapping, [field.key]: e.target.value})}
                      >
                        <option value="">-- Ignore this field --</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-lg">
              <div className="flex items-center self-start sm:self-auto">
                <input
                  id="markAsPaid"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                />
                <label htmlFor="markAsPaid" className="ml-2 block text-sm font-medium text-gray-900">
                  Mark all as Paid (Active)
                </label>
              </div>
              <div className="flex justify-end gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeImport}
                  className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Confirm & Import {csvData.length} Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
