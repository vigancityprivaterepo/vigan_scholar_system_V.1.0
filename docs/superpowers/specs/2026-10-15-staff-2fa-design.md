# Staff two-step sign-in (authenticator app)

Date: 2026-10-15
Status: draft, awaiting approval

## Why

The staff side is reachable from the public internet, and staff sometimes work from outside City Hall, so blocking it by network is not an option. Today a staff password alone opens every applicant record. A second step means a stolen or guessed password is not enough on its own.

## What the owner decided

- **Method:** an authenticator app (Google Authenticator, Microsoft Authenticator, or any app that reads a standard QR code). No SMS, no email codes.
- **Who:** every staff account: `ADMIN`, `SUPER_ADMIN`, `REVIEWER`, `SCHEDULER`. Applicants are not affected in any way.
- **When:** not decided by location. The code is asked on any computer that is not trusted; staff can tick **"Trust this computer for 30 days"** so their office computer asks about once a month.
- **Lost phone:**
  1. The staff member signs in with one of their **8 one-time backup codes**, then sets up the new phone themselves.
  2. If they have lost the codes too, the **primary admin** uses **Reset 2FA** in Settings, then Access Management. They set up again at their next sign-in. Recorded in the activity log.
  3. If the primary admin has lost their own phone and codes, **MIS runs a server command**. The primary admin's 2FA cannot be reset through the website.
- **Rollout:** nobody is locked out on launch day. The first sign-in after the update walks each staff member through setup before they reach any staff page.

## Goals

- A stolen staff password can't be used from an untrusted computer.
- Staff at their usual office computer see the code prompt about once every 30 days.
- Recovery never needs a developer, except for the primary admin's own lockout.

## Non-goals (v1)

- 2FA for applicants.
- Detecting the City Hall network.
- SMS or email codes, security keys or passkeys.
- A self-service page for listing or removing trusted computers, or for making new backup codes. A primary-admin reset covers both.

## Anti-goals (a failure even if it "works")

- Any change at all to applicant sign-in, registration or pages.
- Staff locked out on deploy day.
- Any way around the second step: an old session, Google sign-in, the token refresh endpoint, or a challenge token used as a login token.
- The primary admin's 2FA being resettable from the website.

## How it works

### Sign-in flow (server)

`login` and `googleAuth` in `server/src/controllers/authController.js` both end in `issueAuthSession`. For staff roles only (by effective role, so the primary-admin email counts as `SUPER_ADMIN`), a check runs before that:

1. **Trusted computer cookie present and valid for this user:** issue the session as today.
2. **2FA already set up:** respond `{ twoFactorRequired: true, challengeToken }` and issue no session.
3. **2FA not set up yet:** respond `{ twoFactorSetupRequired: true, challengeToken }` and issue no session.

Applicant sign-in skips this check entirely and behaves exactly as today.

`challengeToken` is a JWT with `purpose: '2fa-challenge'` and `userId`. It expires after 10 minutes and is only accepted by the new 2FA endpoints. **`authenticate` must reject any token that carries a `purpose` claim.** Without that, a challenge token would work as a login token. This also closes the existing low finding that a password-reset token works as a login token.

### New endpoints (under `/api/auth/2fa`, no staff session needed; all take `challengeToken`)

| Endpoint | Does |
|---|---|
| `POST /setup` | Allowed only when 2FA is not set up. Creates a secret, stores it encrypted as pending, and returns a QR code image (data URL) plus the secret as text for manual entry. |
| `POST /enable` `{ code, trustDevice }` | Checks the code against the pending secret, turns 2FA on, creates 8 backup codes (only their hashes are stored), and returns them once, along with a normal session. |
| `POST /verify` `{ code \| backupCode, trustDevice }` | Checks a 6-digit code or an unused backup code. A used backup code is spent. Issues a normal session. If `trustDevice` is set, it also sets the trusted-computer cookie. |

The rate limit is 10 attempts per user per 15 minutes on `/enable` and `/verify`, in the same style as `server/src/middleware/rateLimits.js`.

### Admin reset

`POST /api/admin/users/:id/2fa/reset` uses the primary-admin check the other user-management endpoints already use (`isPrimaryAdminEmail`). It refuses the primary admin's own account. It clears the secret, the backup codes, the trusted computers and the refresh tokens (signing that person out everywhere), and writes an activity-log entry.

### Last resort (primary admin)

`server/scripts/reset-2fa.js <email>` is run with `docker compose exec server node scripts/reset-2fa.js <email>`. It does the same clearing for any account and prints what it did.

### Data

New columns on `users`:
- `totp_secret` (encrypted)
- `totp_pending_secret` (encrypted)
- `totp_enabled_at`
- `totp_last_used_step` (blocks reusing the same code within its 30-second window)
- `totp_backup_codes` (JSON list of `{hash, usedAt}`)

New table `trusted_devices`:
- `id`, `user_id`, `token_hash`, `user_agent`, `created_at`, `expires_at`, `last_used_at`
- cascade delete with the user

The trusted-computer cookie is `staff_trusted_device`: a random 32-byte value; HttpOnly, Secure in production, SameSite=Lax, path `/api/auth`, 30 days. Only its SHA-256 hash is stored. It counts only for the user it was issued to, and it expires after 30 days.

### Existing sessions on deploy

Staff refresh tokens issued before this feature would let staff skip setup for up to 7 days. To close that without relying on a manual cleanup step, `refresh_tokens` gets a `two_factor_verified` boolean (default `false`). It is set to `true` only on tokens issued after a completed staff 2FA step, or after a trusted-computer pass. The refresh endpoint refuses a staff user's token unless that flag is `true`. So old staff sessions end at their next refresh, and staff go through setup once. Applicant tokens are not checked for the flag, so applicant sessions are untouched.

### Client

- **Sign-in page** (`LoginPage.jsx`, `authStore.js`): when the response says `twoFactorRequired`, show a code step on the same card with:
  - a 6-digit input (numeric, `autocomplete="one-time-code"`)
  - "Use a backup code instead"
  - the "Trust this computer for 30 days" checkbox

  When it says `twoFactorSetupRequired`, show the setup steps:
  1. A QR code plus the manual key.
  2. Enter a code to confirm.
  3. The backup codes, with Copy and Print buttons and an "I've saved these codes" checkbox before Continue.
- **Google sign-in** follows the same steps, because the server answers the same way.
- **Access Management:** a 2FA column (On / Not set up) and a **Reset 2FA** button per staff row, behind the existing confirmation dialog. It's hidden for the primary admin's own row.

## Constraints

- The system is live. Applicant behaviour must not change.
- Single server instance, so in-memory rate-limit counters are fine.
- Schema changes are applied the existing way (`prisma db push` through `AUTO_APPLY_DB_CHANGES`, or by hand). A migration SQL file is included for the manual route.

## New dependencies and config (owner approval needed)

- **`otplib`**: the standard implementation of authenticator codes (TOTP, RFC 6238), 30-second steps, ±1 step tolerance for clock drift.
- **`qrcode`**: makes the QR image on the server, so the secret is never sent to a third-party QR service.
- **New environment variable `TWO_FACTOR_ENCRYPTION_KEY`**: a 32-byte random key in base64, used to encrypt the stored secrets with AES-256-GCM. The server checks for it at startup. If it's missing, staff sign-in returns a clear "2FA not configured" error instead of skipping 2FA, while applicants keep working.

## Builder's calls (decided here, changeable)

- Backup codes are 10 characters, grouped `XXXXX-XXXXX`, hashed with SHA-256 plus a per-user salt.
- The challenge token lasts 10 minutes, and the trusted-computer cookie lasts 30 days.
- Wrong codes say "That code didn't work. Check the time on your phone and try again." There's no lockout beyond the rate limit.
- After a primary-admin reset, the staff member's next password sign-in goes straight to setup.
- Old staff sessions are ended by the `two_factor_verified` flag on refresh tokens, not by a manual cleanup step, so it works however the schema change is applied.

## Testing

- **Server:** a script-level test of the full flow against a scratch database or in-memory fakes:
  - setup, enable, verify
  - backup code spent once
  - trusted cookie honoured for its own user only
  - challenge token rejected by `authenticate`
  - applicant login unchanged
  - reset clears everything
- **Manual, on staging or local, with a real authenticator app:**
  - enrol
  - sign in with and without trusting the computer
  - backup code
  - reset and re-enrol
  - Google sign-in for a staff account
- **Applicant regression:** register, sign in (password and Google), and open the status page. All unchanged.

## Deploy steps

1. Add `TWO_FACTOR_ENCRYPTION_KEY` to `.env`.
2. Pull, then apply the schema change.
3. Rebuild the client and restart the server. Existing staff sessions end at their next refresh (see Existing sessions on deploy).
4. Tell staff: "Next time you sign in, have your phone ready."
