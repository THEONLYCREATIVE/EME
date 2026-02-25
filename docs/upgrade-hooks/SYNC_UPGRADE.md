# Cloud Sync Upgrade Guide

Replace localStorage with real-time cloud sync.

## Files to edit
- `src/store/db.js` — swap localStorage API for Supabase/Firebase calls
- `src/services/sync.js` — implement real push/pull
- `sw.js` — enable background sync

## Option A: Supabase (PostgreSQL)

### Schema
```sql
CREATE TABLE entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   text NOT NULL DEFAULT 'DXB_T3',
  week       int  NOT NULL,
  day        text NOT NULL,
  sales      numeric,
  trn        int,
  no7        numeric,
  no7trn     int,
  sfa        numeric,
  items      int,
  aura       int,
  csat       int,
  focus      int,
  saved_by   text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, week, day)
);

CREATE TABLE staff_entries (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id int  NOT NULL,
  week     int  NOT NULL,
  day      text NOT NULL,
  no7      numeric,
  no7trn   int,
  saved_by text,
  saved_at timestamptz DEFAULT now()
);
```

### db.js replacement
```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function get(key) {
  if (key.startsWith('w') && key.includes('_2026_')) {
    const [, week, , day] = key.match(/w(\d+)_2026_(.+)/) || []
    const { data } = await sb.from('entries')
      .select('*').eq('week', week).eq('day', day).single()
    return data
  }
  // Fallback to localStorage for non-entry keys
  return JSON.parse(localStorage.getItem('n7_'+key))
}
```

### Real-time updates
```js
// Add to app.js after mountApp():
supabase.channel('entries')
  .on('postgres_changes', { event:'*', schema:'public', table:'entries' }, payload => {
    store.notify('entryChange', payload.new)
  })
  .subscribe()
```

## Conflict Resolution
Current: last-write-wins (updatedAt comparison in restoreBackup).
For stricter: implement operational transforms or CRDTs.
Simple recommendation: server timestamp wins, clients show "synced X mins ago".
