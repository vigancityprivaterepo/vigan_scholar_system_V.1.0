// Print/export windows are opened with window.open('') and share the app's origin,
// so any applicant-entered text written into them must be escaped.

export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

class SafeHtml {
  constructor(value) { this.value = value }
  toString() { return this.value }
}

const render = (value) => {
  if (value instanceof SafeHtml) return value.value
  if (Array.isArray(value)) return value.map(render).join('')
  return escapeHtml(value)
}

// Tagged template: every ${value} is escaped unless it was itself built with `html`.
// Arrays of `html` fragments are joined as-is, so row lists need no `.join('')`.
export const html = (strings, ...values) =>
  new SafeHtml(strings.reduce((out, chunk, i) => out + chunk + (i < values.length ? render(values[i]) : ''), ''))
