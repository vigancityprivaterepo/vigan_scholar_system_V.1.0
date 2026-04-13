import api from '../services/api'

export const openProtectedFile = async (resourcePath) => {
  const { data } = await api.get(resourcePath, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(data)
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000)
}
