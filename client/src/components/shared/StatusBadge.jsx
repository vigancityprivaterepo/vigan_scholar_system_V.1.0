import React from 'react'
import { getStatusBadge } from '../../utils/statusConfig'
import { clsx } from 'clsx'

export default function StatusBadge({ status, size = 'md' }) {
  const config = getStatusBadge(status)
  return (
    <span className={clsx('badge', config.color, size === 'sm' ? 'text-xs px-2 py-0.5' : '')}>
      {config.label}
    </span>
  )
}
