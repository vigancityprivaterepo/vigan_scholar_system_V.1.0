import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg tracking-[0.2em] text-[#0c2340] placeholder-slate-400 transition-all focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]'
const primaryButton = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0c4a3a] text-sm font-semibold text-white transition-colors hover:bg-[#064e3b] disabled:cursor-not-allowed disabled:opacity-60'
const linkButton = 'inline-flex min-h-11 items-center text-sm font-medium text-[#047857] transition-colors hover:text-[#0c2340]'

// Second sign-in step for staff who already set up their authenticator app.
export default function TwoFactorCode({ challengeToken, onSuccess, onExpired, onCancel }) {
  const verifyTwoFactor = useAuthStore((state) => state.verifyTwoFactor)
  const [useBackup, setUseBackup] = useState(false)
  const [value, setValue] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cleaned = value.replace(/[\s-]/g, '')
  const canSubmit = !loading && (useBackup ? cleaned.length === 10 : /^\d{6}$/.test(cleaned))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      const user = await verifyTwoFactor(challengeToken, useBackup ? { backupCode: value } : { code: value }, trustDevice)
      onSuccess(user)
    } catch (err) {
      const message = err.response?.data?.message || 'Could not check the code. Please try again.'
      if (err.response?.status === 401) onExpired(message)
      else setError(message)
      setLoading(false)
    }
  }

  const switchMode = () => {
    setUseBackup((current) => !current)
    setValue('')
    setError('')
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-semibold text-[#0c2340]">
        {useBackup ? 'Enter a backup code' : 'Enter your sign-in code'}
      </h2>
      <p className="mt-2 text-base text-slate-600">
        {useBackup
          ? 'Use one of the backup codes you saved when you set up two-step sign-in. Each code works once.'
          : 'Open your authenticator app and type the 6-digit code shown for Vigan Scholarship.'}
      </p>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="two-factor-code" className="mb-1.5 block text-sm font-medium text-slate-700">
            {useBackup ? 'Backup code' : '6-digit code'}
          </label>
          <input
            id="two-factor-code"
            key={useBackup ? 'backup' : 'code'}
            className={inputClass}
            value={value}
            onChange={(event) => { setValue(useBackup ? event.target.value.toUpperCase() : event.target.value); if (error) setError('') }}
            inputMode={useBackup ? 'text' : 'numeric'}
            autoComplete={useBackup ? 'off' : 'one-time-code'}
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={useBackup ? 11 : 7}
            placeholder={useBackup ? 'XXXXX-XXXXX' : '123456'}
            autoFocus
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(event) => setTrustDevice(event.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-[#10b981]"
          />
          <span>
            Trust this computer for 30 days
            <span className="block text-slate-500">Only on a computer that you alone use, such as your office computer.</span>
          </span>
        </label>

        <button type="submit" disabled={!canSubmit} className={primaryButton}>
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {loading ? 'Checking…' : 'Verify and sign in'}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={switchMode} className={linkButton}>
          {useBackup ? 'Use the code from my app instead' : 'Use a backup code instead'}
        </button>
        <button type="button" onClick={onCancel} className={linkButton}>Back to sign in</button>
      </div>
    </div>
  )
}
