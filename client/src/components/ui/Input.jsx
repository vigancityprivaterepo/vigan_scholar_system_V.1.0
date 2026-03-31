import React from 'react'
import { clsx } from 'clsx'

export default function Input({ label, error, required, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 font-body">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        className={clsx('input-field', error && 'border-red-400 ring-1 ring-red-400', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
