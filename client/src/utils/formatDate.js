const MANILA_TIME_ZONE = 'Asia/Manila'

export const formatDate = (date) => new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}).format(new Date(date))

export const formatDateTime = (date) => new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
}).format(new Date(date))

export const formatScheduleDateTime = (date) => new Intl.DateTimeFormat('en-PH', {
  timeZone: MANILA_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
}).format(new Date(date))

export const fromNow = (date) => {
  const diffMs = new Date(date).getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), 'minute')
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), 'hour')
  return rtf.format(Math.round(diffMs / day), 'day')
}

export const formatShort = (date) => new Intl.DateTimeFormat('en-PH', {
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(date))
