export interface IndianState {
  name: string;
  gstStateCode: string;
}

/** GST state/UT codes as assigned by the Indian government (Schedule III to the CGST Act). */
export const INDIAN_STATES: IndianState[] = [
  { name: "Jammu and Kashmir", gstStateCode: "01" },
  { name: "Himachal Pradesh", gstStateCode: "02" },
  { name: "Punjab", gstStateCode: "03" },
  { name: "Chandigarh", gstStateCode: "04" },
  { name: "Uttarakhand", gstStateCode: "05" },
  { name: "Haryana", gstStateCode: "06" },
  { name: "Delhi", gstStateCode: "07" },
  { name: "Rajasthan", gstStateCode: "08" },
  { name: "Uttar Pradesh", gstStateCode: "09" },
  { name: "Bihar", gstStateCode: "10" },
  { name: "Sikkim", gstStateCode: "11" },
  { name: "Arunachal Pradesh", gstStateCode: "12" },
  { name: "Nagaland", gstStateCode: "13" },
  { name: "Manipur", gstStateCode: "14" },
  { name: "Mizoram", gstStateCode: "15" },
  { name: "Tripura", gstStateCode: "16" },
  { name: "Meghalaya", gstStateCode: "17" },
  { name: "Assam", gstStateCode: "18" },
  { name: "West Bengal", gstStateCode: "19" },
  { name: "Jharkhand", gstStateCode: "20" },
  { name: "Odisha", gstStateCode: "21" },
  { name: "Chhattisgarh", gstStateCode: "22" },
  { name: "Madhya Pradesh", gstStateCode: "23" },
  { name: "Gujarat", gstStateCode: "24" },
  { name: "Daman and Diu", gstStateCode: "25" },
  { name: "Dadra and Nagar Haveli", gstStateCode: "26" },
  { name: "Maharashtra", gstStateCode: "27" },
  { name: "Karnataka", gstStateCode: "29" },
  { name: "Goa", gstStateCode: "30" },
  { name: "Lakshadweep", gstStateCode: "31" },
  { name: "Kerala", gstStateCode: "32" },
  { name: "Tamil Nadu", gstStateCode: "33" },
  { name: "Puducherry", gstStateCode: "34" },
  { name: "Andaman and Nicobar Islands", gstStateCode: "35" },
  { name: "Telangana", gstStateCode: "36" },
  { name: "Andhra Pradesh", gstStateCode: "37" },
  { name: "Ladakh", gstStateCode: "38" },
];

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function stateCodeFromGstin(gstin: string): string | null {
  const trimmed = gstin.trim();
  if (trimmed.length < 2) return null;
  const code = trimmed.slice(0, 2);
  return INDIAN_STATES.some((s) => s.gstStateCode === code) ? code : null;
}

export function stateNameFromCode(code: string): string | null {
  return INDIAN_STATES.find((s) => s.gstStateCode === code)?.name ?? null;
}

export function stateCodeFromName(name: string): string | null {
  return INDIAN_STATES.find((s) => s.name.toLowerCase() === name.trim().toLowerCase())
    ?.gstStateCode ?? null;
}
