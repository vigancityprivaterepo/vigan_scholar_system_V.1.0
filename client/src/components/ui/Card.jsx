import React from 'react'
import { clsx } from 'clsx'

export default function Card({ children, className, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'card',
        hover && 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
