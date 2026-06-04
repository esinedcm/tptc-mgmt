export const CANADIAN_POSTAL_CODE_REGEX = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
export const NA_PHONE_REGEX = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

export function isValidPostalCode(postalCode?: string): boolean {
  if (!postalCode) return true; // Let 'required' handle empty checks
  return CANADIAN_POSTAL_CODE_REGEX.test(postalCode);
}

export function isValidPhoneNumber(phoneNumber?: string): boolean {
  if (!phoneNumber) return true;
  return NA_PHONE_REGEX.test(phoneNumber);
}

export function formatPhoneNumber(phoneNumber: string): string {
  const match = phoneNumber.match(NA_PHONE_REGEX);
  if (match) {
    return `(${match[1]})${match[2]}-${match[3]}`;
  }
  return phoneNumber;
}

export function formatPostalCode(postalCode: string): string {
  if (!postalCode) return postalCode;
  const cleaned = postalCode.replace(/[\s-]/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return postalCode;
}
