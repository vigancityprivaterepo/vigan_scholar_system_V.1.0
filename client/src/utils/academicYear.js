// Academic years start in June, matching server/src/utils/academicYear.js.
export const getCurrentAcademicYear = (date = new Date()) => {
  const start = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1
  return `${start}-${start + 1}`
}

export const getAcademicYearOptions = (count = 8) => {
  const base = Number(getCurrentAcademicYear().slice(0, 4))
  return Array.from({ length: count }, (_, i) => `${base - i}-${base - i + 1}`)
}
