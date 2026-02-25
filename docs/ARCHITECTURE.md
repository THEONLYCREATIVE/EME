# Architecture Overview

```
no7-analytics/
│
├── index.html              # App shell only. Zero business logic.
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline-first)
│
├── css/
│   ├── tokens.css          # Design tokens (colours, spacing, fonts)
│   ├── base.css            # Reset + typography
│   ├── layout.css          # Shell: sidebar, header, nav, views
│   ├── components.css      # All reusable UI components
│   └── animations.css      # Keyframes + animated states
│
├── js/
│   ├── app.js              # Bootstrap, router, nav, checklist
│   │
│   ├── data/
│   │   └── bp.js           # BP constants + helpers (pure, no side effects)
│   │
│   ├── store/
│   │   └── index.js        # Reactive state store (pub/sub)
│   │                         Slice: auth, settings, staff, checklist,
│   │                                auditLog, weekLocks
│   │
│   ├── services/           # External I/O — all upgrade hooks here
│   │   ├── db.js           # Data persistence (localStorage → cloud)
│   │   ├── auth.js         # Authentication (PIN → Firebase/Supabase/Entra)
│   │   ├── ocr.js          # Image parsing (demo → Azure/Google Vision)
│   │   ├── sync.js         # Offline queue (local → real-time sync)
│   │   └── teams.js        # MS Teams + voice transcription stubs
│   │
│   ├── utils/              # Pure helpers — no DOM, no state
│   │   ├── calc.js         # KPI math (ATV, IPC, AURA%, forecast)
│   │   ├── format.js       # Number/date formatting
│   │   ├── export.js       # CSV + JSON export
│   │   └── ui.js           # Toast, confetti, DOM helpers
│   │
│   └── views/              # One file per screen
│       ├── login.js        # Login screen (tabs, drag, hold-ring)
│       ├── entry.js        # Daily entry + live calc
│       ├── analysis.js     # Charts + forecast
│       ├── staff.js        # Staff tracker
│       └── admin.js        # Admin panel (master only)
│
└── docs/
    ├── ARCHITECTURE.md     # This file
    └── UPGRADE-HOOKS.md    # Detailed upgrade guide for each service
```

## Data Flow

```
User Input → views/entry.js
                 │ gNum() reads input
                 ↓
           utils/calc.js          (pure math, no side effects)
                 │ calcDayKPIs()
                 ↓
           utils/ui.js            (DOM updates)
                 │ setText(), setBar()
                 ↓
           services/db.js         (persistence)
                 │ db.saveEntry()
                 ↓
           services/sync.js       (queue for cloud)
```

## State Flow

```
store/index.js ← loadAll() on boot
      │
      ├── auth        → login.js (setAuth)
      ├── settings    → all views (saveSettings)
      ├── staff       → staff.js (logStaffEntry)
      ├── checklist   → app.js (toggleChecklistItem)
      └── auditLog    → admin.js (addAuditEntry)
                              ↑
                    Every mutation calls addAuditEntry()
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| No framework (vanilla JS + ES modules) | Zero build step, GitHub Pages compatible, no node_modules |
| Reactive store (pub/sub) | Decouples views from state; easy to swap to Redux/Zustand later |
| Services layer for all I/O | Every external call is isolated in `/services/` — swap provider without touching views |
| Pure utils (no DOM) | `calc.js` and `format.js` are fully unit-testable |
| localStorage now, same API later | `db.js` exposes `get/set/del/list` — matching Supabase/Firebase interface |
