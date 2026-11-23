// The six documents every new application needs; keys of Application.requirementChecklist.
export const REQUIREMENT_CHECKLIST_ITEMS = [
  'Personal Letter of Application addressed to City Mayor',
  'Certificate of Residency from the Punong Barangay',
  'Form 138 (General Average at least 83%, no grade lower than 80%)',
  'Certification from High School Principal (Good Moral Character)',
  'Result of College Admission Test (CAT)',
  'Picture (Passport Size with Printed Name)',
]

// Short labels used where space is tight (review drawer).
export const REQUIREMENT_SHORT_NAMES = [
  'Letter of application to the City Mayor',
  'Certificate of Residency',
  'Form 138 (report card)',
  "Principal's certification",
  'College Admission Test result',
  'Passport-size photo',
]

// Applicants upload one file per requirement, in checklist order. Returns the file for each item,
// or null for every item when the uploads cannot be matched one-to-one (e.g. after partial resubmits).
export const pairRequirementFiles = (files = []) => {
  if (files.length !== REQUIREMENT_CHECKLIST_ITEMS.length) return null
  return [...files].sort((a, b) => new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0))
}

// Addresses are saved as "street, Barangay, Vigan City, Ilocos Sur"; pick out the barangay.
export const barangayOf = (address) => {
  const parts = String(address || '').split(',').map((part) => part.trim()).filter(Boolean)
  const city = parts.findIndex((part) => /vigan/i.test(part))
  if (city > 0) return parts[city - 1]
  return parts[0] || ''
}

export const firstCollegeOf = (app) => {
  const pref = Array.isArray(app?.collegePreferences) ? app.collegePreferences[0] : null
  return pref?.name?.trim() || ''
}

export const formatPeso = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })} / month` : ''
}
