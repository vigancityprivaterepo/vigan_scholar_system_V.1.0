import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { html } from '../../utils/escapeHtml'

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg tracking-[0.2em] text-[#0c2340] placeholder-slate-400 transition-all focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]'
const primaryButton = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0c4a3a] text-sm font-semibold text-white transition-colors hover:bg-[#064e3b] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50'
const linkButton = 'inline-flex min-h-11 items-center text-sm font-medium text-[#047857] transition-colors hover:text-[#0c2340]'

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const printCodes = (codes) => {
  const win = window.open('', '_blank', 'width=600,height=700')
  if (!win) return
  const rows = codes.map((code) => html`<li>${code}</li>`)
  win.document.write(String(html`<!doctype html><html><head><title>Backup codes</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#0c2340}h1{font-size:20px}p{font-size:13px;color:#475569}
    ol{font-family:Consolas,monospace;font-size:18px;line-height:2}</style></head>
    <body><h1>Vigan Scholarship: two-step sign-in backup codes</h1>
    <p>Each code works once. Keep this page somewhere safe and private.</p><ol>${rows}</ol>
    </body></html>`))
  win.document.close()
  // Printed from here, not by a script inside the window: the site's CSP blocks inline scripts.
  win.focus()
  setTimeout(() => win.print(), 300)
}

// First sign-in after two-step sign-in became required: scan, confirm, save backup codes.
export default function TwoFactorSetup({ challengeToken, onDone, onExpired, onCancel }) {
  const { startTwoFactorSetup, enableTwoFactor } = useAuthStore()
  const [setupData, setSetupData] = useState(null)
  const [code, setCode] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')

  const handleFailure = (err, fallback) => {
    const message = err.response?.data?.message || fallback
    if (err.response?.status === 401) onExpired(message)
    else setError(message)
  }

  useEffect(() => {
    let active = true
    startTwoFactorSetup(challengeToken)
      .then((data) => { if (active) setSetupData(data) })
      .catch((err) => { if (active) handleFailure(err, 'Could not start setup. Please sign in again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [challengeToken])

  const canConfirm = !loading && /^\d{6}$/.test(code.replace(/\s/g, ''))

  const handleConfirm = async (event) => {
    event.preventDefault()
    if (!canConfirm) return
    setError('')
    setLoading(true)
    try {
      setResult(await enableTwoFactor(challengeToken, code, trustDevice))
    } catch (err) {
      handleFailure(err, 'Could not check the code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const flashCopied = async (text, what) => {
    if (await copyText(text)) {
      setCopied(what)
      setTimeout(() => setCopied(''), 2000)
    }
  }

  if (result) {
    return (
      <div>
        <h2 className="font-display text-3xl font-semibold text-[#0c2340]">Save your backup codes</h2>
        <p className="mt-2 text-base text-slate-600">
          If you lose your phone, each of these codes lets you sign in once. They are shown only now.
          Print them or write them down and keep them somewhere private.
        </p>
        <ol className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-base text-[#0c2340] tabular-nums">
          {result.backupCodes.map((backupCode) => (
            <li key={backupCode} className="font-semibold tracking-[0.08em]">{backupCode}</li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => flashCopied(result.backupCodes.join('\n'), 'codes')}>
            {copied === 'codes' ? 'Copied' : 'Copy codes'}
          </button>
          <button type="button" className={secondaryButton} onClick={() => printCodes(result.backupCodes)}>Print codes</button>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-[#10b981]" />
          <span>I've saved these codes somewhere safe</span>
        </label>
        <button type="button" disabled={!saved} onClick={() => onDone(result.user)} className={`${primaryButton} mt-5`}>
          Continue
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-semibold text-[#0c2340]">Set up two-step sign-in</h2>
      <p className="mt-2 text-base text-slate-600">
        Staff accounts need a code from an authenticator app at sign-in. This takes about a minute and is needed once.
      </p>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <ol className="mt-6 flex flex-col gap-6">
        <li>
          <h3 className="text-base font-semibold text-[#0c2340]">1. Scan this code with your phone</h3>
          <p className="mt-1 text-sm text-slate-600">
            Use Google Authenticator or Microsoft Authenticator. In the app, choose add account, then scan a QR code.
          </p>
          <div className="mt-3 flex min-h-[200px] items-center justify-center rounded-lg border border-slate-200 bg-white p-3">
            {setupData
              ? <img src={setupData.qrDataUrl} alt="QR code for your authenticator app" className="h-48 w-48" />
              : <p className="text-sm text-slate-500">{loading ? 'Preparing your QR code…' : 'QR code unavailable.'}</p>}
          </div>
          {setupData && (
            <p className="mt-2 text-sm text-slate-600">
              Can't scan? Enter this key in the app instead:{' '}
              <span className="break-all font-semibold tabular-nums text-[#0c2340]">{setupData.manualKey}</span>{' '}
              <button type="button" className={linkButton} onClick={() => flashCopied(setupData.manualKey, 'key')}>
                {copied === 'key' ? 'Copied' : 'Copy key'}
              </button>
            </p>
          )}
        </li>
        <li>
          <h3 className="text-base font-semibold text-[#0c2340]">2. Enter the 6-digit code the app shows</h3>
          <form onSubmit={handleConfirm} noValidate className="mt-3 flex flex-col gap-4">
            <div>
              <label htmlFor="two-factor-setup-code" className="mb-1.5 block text-sm font-medium text-slate-700">6-digit code</label>
              <input
                id="two-factor-setup-code"
                className={inputClass}
                value={code}
                onChange={(event) => { setCode(event.target.value); if (error) setError('') }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                placeholder="123456"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <input type="checkbox" checked={trustDevice} onChange={(event) => setTrustDevice(event.target.checked)} className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-[#10b981]" />
              <span>
                Trust this computer for 30 days
                <span className="block text-slate-500">Only on a computer that you alone use, such as your office computer.</span>
              </span>
            </label>
            <button type="submit" disabled={!canConfirm || !setupData} className={primaryButton}>
              {loading && setupData && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Turn on two-step sign-in
            </button>
          </form>
        </li>
      </ol>

      <button type="button" onClick={onCancel} className={`${linkButton} mt-4`}>Back to sign in</button>
    </div>
  )
}
