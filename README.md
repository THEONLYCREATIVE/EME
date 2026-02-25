# No7 Analytics PWA
**Dubai Airport T3 Arrivals · Sales Performance Platform**
**Version 2.0 — Modular Architecture**

---

## 🚀 Deploy to GitHub Pages (3 minutes)

```bash
# 1. Create repo
gh repo create no7-analytics --public

# 2. Push files
git init && git add . && git commit -m "Initial No7 Analytics"
git remote add origin https://github.com/YOURUSERNAME/no7-analytics.git
git push -u origin main

# 3. Enable Pages
# Settings → Pages → Source: main / root
# URL: https://YOURUSERNAME.github.io/no7-analytics
```

---

## 🔐 Login Credentials

| Role | Credential | Access |
|------|-----------|--------|
| Staff | PIN: `1234` or `5678` or `9012` | Entry, Analysis, Staff |
| Master | Password `master2026` + Slide + Hold 5s | Full access incl. Admin |

> **Before deploying:** Change these in `js/services/auth.js` → `CONFIG` object.

---

## 📱 Install as PWA

| Platform | Steps |
|----------|-------|
| iPhone / iPad | Safari → Share → Add to Home Screen |
| Android | Chrome → Menu → Install App |
| Desktop Chrome | Click install icon in address bar |

Works fully offline after first visit.

---

## 📁 Project Structure

```
no7-analytics/
├── index.html              # Shell only — no logic
├── manifest.json           # PWA config
├── sw.js                   # Service worker (offline)
├── css/                    # Layered styles (tokens → base → layout → components → animations)
├── js/
│   ├── app.js              # Bootstrap + router
│   ├── data/               # Constants (BP data)
│   ├── store/              # Reactive state
│   ├── services/           # All external I/O (auth, db, ocr, sync, teams)
│   ├── utils/              # Pure helpers (calc, format, export, ui)
│   └── views/              # One file per screen
└── docs/
    ├── ARCHITECTURE.md
    └── UPGRADE-HOOKS.md    # Step-by-step upgrade guides
```

---

## ✨ Features

### Entry View
- Day selector (Fri–Thu) with data indicators
- Live auto-calculated KPIs: ATV, IPC, Conversion, AURA%, No7%, Gap to BP
- Sales vs BP hero card with progress bar + achievement badge
- KD currency conversion (configurable rate)
- Division A/B split with progress bars
- Photo capture → OCR field detection (demo; hook to real API)
- WhatsApp formatted share
- Timestamp + user on every save
- Previous week comparison chips

### Analysis View
- Week-end sales forecast (rolling daily average)
- Best day / Weakest day / Avg ATV / No7 contribution
- Sales trend chart (last 3 weeks vs BP)
- No7 % daily contribution chart
- AURA capture % trend chart
- KPI progress bars (Sales, No7, SFA, AURA)

### Staff Tracker
- Team No7 summary with achievement %
- Individual staff cards with ranked leaderboard (🥇🥈🥉)
- Per-staff weekly targets + progress bars
- Master-only entry panel: log No7 sales per staff per day

### Admin Panel (Master only)
- Unlocked via: password → drag slider → 5-second hold
- Store settings, week number, BP overrides, KD rate, division split
- Staff manager: add members, set targets
- Checklist editor: add/remove daily checklist items
- Feature toggles: OCR, confetti, staff tracker, divisions, KD converter
- Export: CSV (all weeks) + JSON backup
- Import: restore from JSON backup
- Audit trail: last 200 actions with user + timestamp
- Manager review: lock/unlock weeks

### Daily Checklist
- Slide-down panel (tap ☑️ or double-press Tab)
- Per-item toggle with progress bar
- Confirm when 100% complete → logged to audit trail
- Items configurable in Admin

### Offline-First
- Service worker caches all assets on first load
- Works without internet after first visit
- Sync queue for future cloud backend

---

## 🔌 Upgrade Paths

See `docs/UPGRADE-HOOKS.md` for complete step-by-step guides.

| Feature | Current | Upgrade To |
|---------|---------|-----------|
| Auth | Client-side PIN | Firebase Auth / Supabase / Entra ID |
| Storage | localStorage | Supabase Postgres / Firestore |
| OCR | Demo simulation | Azure Vision / Google Vision / Tesseract |
| Sync | Offline queue stub | Supabase real-time / Firestore listeners |
| Teams | Browser link | MSAL.js + Graph API |
| Voice | MediaRecorder capture | Azure Speech / OpenAI Whisper |
| PDF | — | jsPDF client / Puppeteer server |

**Key principle:** Each upgrade touches only one file in `js/services/`. Views and store don't change.

---

## 📊 Pre-loaded BP Data

All 53 weeks of 2026 store targets for RE1-D139-BOO (Dubai Airport T3 Arrivals) are pre-loaded in `js/data/bp.js`. Daily targets run Fri → Thu (retail week).

---

## 🔒 Security Notes

The current PIN/password system is **client-side only** — suitable for:
- Internal team use on trusted devices
- Offline-first retail environments
- Prototype / staging deployments

For production with sensitive data, upgrade to Firebase/Supabase auth (see `docs/UPGRADE-HOOKS.md` §1).

---

*Built for No7 Beauty · Dubai Airport T3 Arrivals*
