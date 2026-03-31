import React from 'react'
import { clsx } from 'clsx'

const variants = {
  primary: 'bg-brand-primary text-brand-gold hover:bg-indigo-800 shadow-md',
  gold: 'bg-brand-gold text-brand-primary hover:bg-yellow-400 shadow-lg font-bold',
  teal: 'bg-brand-teal text-white hover:bg-teal-700 shadow-md',
  outline: 'border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
  ghost: 'text-brand-primary hover:bg-gray-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
}

export default function Button({ variant = 'primary', size = 'md', className, disabled, loading, children, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold font-body transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
