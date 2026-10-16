export type LanguageCode = "AUTO" | "EN" | "TE";

export const LANGUAGE_OPTIONS: { value: LanguageCode; label: string; hint: string }[] = [
  { value: "AUTO", label: "Auto-detect", hint: "Mixed Telugu and English is fine" },
  { value: "EN", label: "English", hint: "Messages mostly in English" },
  { value: "TE", label: "Telugu", hint: "తెలుగు — messages mostly in Telugu" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/** Keep a stored value selectable even if it is not in the canonical list. */
export function stateOptions(current?: string | null) {
  return current && !INDIAN_STATES.includes(current) ? [current, ...INDIAN_STATES] : INDIAN_STATES;
}
