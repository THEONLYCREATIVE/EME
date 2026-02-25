# Auth Upgrade Guide

Replace PIN-based auth with real accounts.

## File to edit
`src/services/auth.js` — replace `verifyStaff()` and `verifyMasterPassword()`.

## Option A: Supabase (Recommended — free tier)

### Setup
1. Create project at supabase.com
2. Add `SUPABASE_URL` + `SUPABASE_ANON_KEY` to env
3. Create `users` table with role column

### Code change
```js
// In auth.js, add:
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function verifyStaff(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, message: error.message }
  const role = data.user.user_metadata.role || 'staff'
  return { ok: true, role, user: data.user.email }
}
```

### Update login component
Change `staff-pin` input → email + password inputs. The component
calls `auth.verifyStaff()` — same interface, different implementation.

## Option B: Firebase Auth
```js
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
const auth = getAuth()

export async function verifyStaff(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return { ok: true, role: cred.user.customClaims?.role || 'staff', user: cred.user.email }
}
```

## Option C: Entra ID (Teams SSO)
See TEAMS_UPGRADE.md — use MSAL.js for seamless Teams login.

## Role-based access
- Staff: `role: 'staff'` — entry form only, no admin panel
- Master: `role: 'master'` — full access
- Store the role in `user.user_metadata.role` in Supabase
