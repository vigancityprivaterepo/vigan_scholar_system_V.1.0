import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

export const formatDate = (date) => dayjs(date).format('MMM D, YYYY')
export const formatDateTime = (date) => dayjs(date).format('MMM D, YYYY h:mm A')
export const fromNow = (date) => dayjs(date).fromNow()
export const formatShort = (date) => dayjs(date).format('MM/DD/YY')
