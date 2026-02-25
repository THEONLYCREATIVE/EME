# Upgrade Hooks — Step-by-Step Guide

Each service in `js/services/` is designed to be swapped independently.
**No other file changes** when you upgrade a service — only the service file itself.

---

## 1. Real Auth (Replace PIN system)

**File:** `js/services/auth.js`

### Option A — Firebase Auth
```bash
npm install firebase
```
```js
// auth.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const app  = initializeApp({ /* your config */ });
const auth = getAuth(app);

export async function verifyStaffPin(pin) {
  // Map PINs to email:password pairs stored in Firestore
  const email = `staff-${pin}@yourstore.com`;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pin);
    return { ok: true, role: 'staff', user: cred.user.displayName };
  } catch {
    return { ok: false, error: 'Invalid PIN' };
  }
}
```

### Option B — Supabase Auth
```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function verifyStaffPin(pin) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `staff${pin}@yourstore.ae`,
    password: pin,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, role: data.user.user_metadata.role, user: data.user.email };
}
```

### Option C — Entra ID (for Teams SSO)
See Section 4 (Teams OAuth) below.

---

## 2. Cloud Sync (Replace localStorage)

**File:** `js/services/db.js`

### Supabase (recommended for simplicity)
```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(URL, ANON_KEY);

export const db = {
  async get(key) {
    const { data } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', key)
      .eq('user_id', currentUserId())
      .single();
    return data?.value ?? null;
  },

  async set(key, value) {
    await supabase.from('kv_store').upsert({
      key, value,
      user_id: currentUserId(),
      updated_at: new Date().toISOString(),
    });
  },

  async del(key) {
    await supabase.from('kv_store').delete()
      .eq('key', key).eq('user_id', currentUserId());
  },
  
  // Keep these helper methods:
  entryKey: (weekNum, day) => `entry__w${weekNum}_2026_${day}`,
  saveEntry: async (weekNum, day, data) => { /* upsert to entries table */ },
  getEntry:  async (weekNum, day) => { /* query entries table */ },
};
```

**Supabase table schema:**
```sql
-- Key-value store (for settings, staff, checklist)
create table kv_store (
  key        text,
  user_id    uuid references auth.users,
  value      jsonb,
  updated_at timestamptz default now(),
  primary key (key, user_id)
);

-- Typed entries table (for reporting)
create table entries (
  week_num   int,
  day        text,
  store_id   text,
  sales      numeric,
  trn        int,
  sfa        numeric,
  items      int,
  no7        numeric,
  no7_trn    int,
  aura       int,
  csat       int,
  focus      int,
  entered_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (week_num, day, store_id)
);
```

---

## 3. OCR (Replace demo parser)

**File:** `js/services/ocr.js`

### Azure Computer Vision (recommended)
1. Create Azure Computer Vision resource at portal.azure.com
2. Copy endpoint + key
3. Set `OCR_CONFIG.provider = 'azure'` and fill in credentials

```js
// Already implemented in ocr.js — just set:
const OCR_CONFIG = {
  provider: 'azure',
  azure: {
    endpoint: 'https://YOUR_RESOURCE.cognitiveservices.azure.com',
    key:      'YOUR_32_CHAR_KEY',
  },
};
```

### Google Cloud Vision
```js
const OCR_CONFIG = {
  provider: 'google',
  google: { apiKey: 'YOUR_KEY' },
};
```

### Tesseract.js (fully offline, ~10MB download)
```html
<!-- Add to index.html -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
```
```js
const OCR_CONFIG = { provider: 'tesseract' };
```

---

## 4. Microsoft Teams OAuth + Meeting Notes

**File:** `js/services/teams.js`

### Step 1 — Register Entra ID App
1. portal.azure.com → App Registrations → New registration
2. Name: "No7 Analytics"
3. Redirect URI: `https://yourdomain.github.io/no7-analytics`
4. API Permissions: `User.Read`, `Calendars.Read`, `ChannelMessage.Send`

### Step 2 — Add MSAL.js
```html
<script src="https://alcdn.msauth.net/browser/2.32.2/js/msal-browser.min.js"></script>
```

### Step 3 — Replace teamsLogin()
```js
// teams.js
const msalConfig = {
  auth: {
    clientId: TEAMS_CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${TEAMS_CONFIG.tenantId}`,
    redirectUri: window.location.origin,
  },
};
const msalInstance = new msal.PublicClientApplication(msalConfig);

export async function teamsLogin() {
  const result = await msalInstance.loginPopup({
    scopes: ['User.Read', 'Calendars.Read'],
  });
  teamsToken = result.accessToken;
  return { ok: true, user: result.account.name };
}
```

### Step 4 — Post daily report to Teams channel
```js
export async function postToTeamsChannel(channelId, message) {
  await fetch(
    `https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${teamsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: { content: message } }),
    }
  );
}
```

---

## 5. Voice Transcription

**File:** `js/services/teams.js` → `voice.stopAndTranscribe()`

### Azure Speech Services
```js
// In stopAndTranscribe():
const blob = new Blob(audioChunks, { type: 'audio/wav' });
const response = await fetch(
  `https://YOUR_REGION.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-AE`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
    },
    body: blob,
  }
);
const { DisplayText } = await response.json();
return { text: DisplayText, blob };
```

### OpenAI Whisper API
```js
const form = new FormData();
form.append('file', blob, 'recording.webm');
form.append('model', 'whisper-1');
form.append('language', 'en');
const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${OPENAI_KEY}` },
  body: form,
});
const { text } = await response.json();
return { text, blob };
```

---

## 6. PDF Export

**File:** `js/utils/export.js`

### Client-side — jsPDF
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
```
```js
export function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.autoTable({ head: [headers], body: rows });
  doc.save('no7-weekly-report.pdf');
}
```

### Server-side — Puppeteer (Vercel / Node.js)
```js
// POST /api/export/pdf
// Body: { weekNum, entries }
// Returns: PDF buffer
// Use puppeteer to render your weekly report HTML → PDF
```

---

## Conflict Resolution Strategy

When moving to multi-device real-time sync:

| Strategy | When to use |
|----------|-------------|
| Last-write-wins (current) | Fine for single-user offline |
| `updated_at` timestamp | Good for small teams (1 user per store) |
| Field-level merging | For concurrent multi-user entry |
| Server authority | For locked/audited weeks |

The `db.saveEntry()` already stamps `updatedAt` on every save — making last-write-wins trivial to implement on the server side.
