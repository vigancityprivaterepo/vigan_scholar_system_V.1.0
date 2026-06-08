import { GoogleLogin } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function GoogleAuthButton({ onSuccess, onError, text = 'continue_with', disabled = false }) {
  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <GoogleLogin
        onSuccess={(response) => onSuccess?.(response?.credential || '')}
        onError={() => onError?.()}
        text={text}
        theme="outline"
        size="large"
        shape="rectangular"
        width="380"
      />
    </div>
  )
}
