import { useEffect, useRef, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function GoogleAuthButton({ onSuccess, onError, text = 'continue_with', disabled = false }) {
  const containerRef = useRef(null)
  const [buttonWidth, setButtonWidth] = useState(320)

  useEffect(() => {
    const updateWidth = () => {
      const nextWidth = Math.max(220, Math.floor(containerRef.current?.clientWidth || 320))
      setButtonWidth(nextWidth)
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(() => updateWidth())
    if (containerRef.current) observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div ref={containerRef} className={`w-full max-w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <GoogleLogin
        onSuccess={(response) => onSuccess?.(response?.credential || '')}
        onError={() => onError?.()}
        text={text}
        theme="outline"
        size="large"
        shape="rectangular"
        width={String(buttonWidth)}
      />
    </div>
  )
}
