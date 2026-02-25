/**
 * Checklist Component — Daily task checklist slide panel
 */

import * as store    from '../store/index.js';
import * as analytics from '../services/analytics.js';

export function mount(wrapEl) {
  wrapEl.innerHTML = `
  <div class="checklist-panel" id="chk-panel">
    <div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-size:0.8rem;font-weight:700">📋 Daily Checklist</span>
        <span id="chk-count" style="font-size:0.7rem;color:var(--mint-dark);font-weight:600">0/6</span>
      </div>
      <div style="height:4px;background:var(--border);border-radius:4px;margin-bottom:14px;overflow:hidden">
        <div id="chk-bar" style="height:100%;background:linear-gradient(90deg,var(--mint),var(--mint-light));border-radius:4px;transition:width 0.4s;width:0%"></div>
      </div>
      <div id="chk-items"></div>
      <button class="btn btn-mint btn-full" id="chk-confirm" style="margin-top:12px;opacity:0.5">
        ✓ Mark Complete & Save
      </button>
    </div>
  </div>`;

  bindEvents(wrapEl);
  store.subscribe('checklistItemsChange', () => renderItems(wrapEl));
  store.subscribe('checklistDoneChange',  () => renderItems(wrapEl));
  document.addEventListener('app:toggle-checklist', () => toggle(wrapEl));
}

function toggle(wrapEl) {
  const panel = wrapEl.querySelector('#chk-panel');
  if (!panel) return;
  const open = panel.classList.toggle('open');
  if (open) renderItems(wrapEl);
}

function renderItems(wrapEl) {
  const items = store.state.checklist;
  const done  = store.getChecklistDone(analytics.todayStr());
  const doneCount = items.filter((_,i) => done[i]).length;
  const pct   = items.length ? (doneCount / items.length) * 100 : 0;

  const countEl = wrapEl.querySelector('#chk-count');
  const barEl   = wrapEl.querySelector('#chk-bar');
  const itemsEl = wrapEl.querySelector('#chk-items');
  const confBtn = wrapEl.querySelector('#chk-confirm');

  if (countEl) countEl.textContent = `${doneCount}/${items.length}`;
  if (barEl)   barEl.style.width   = pct + '%';
  if (confBtn) confBtn.style.opacity = pct >= 100 ? '1' : '0.5';

  if (itemsEl) {
    itemsEl.innerHTML = items.map((item, i) => `
      <div class="chk-item ${done[i]?'done':''}" data-idx="${i}">
        <div class="chk-icon">${done[i]?'✓':''}</div>
        <span>${item}</span>
      </div>`).join('');
  }
}

function bindEvents(wrapEl) {
  wrapEl.addEventListener('click', e => {
    const item = e.target.closest('[data-idx]');
    if (item) {
      const i    = parseInt(item.dataset.idx);
      const done = store.getChecklistDone(analytics.todayStr());
      done[i]    = !done[i];
      store.saveChecklistDone(analytics.todayStr(), done);
      renderItems(wrapEl);
    }
    if (e.target.id === 'chk-confirm') confirmChecklist(wrapEl);
  });
}

function confirmChecklist(wrapEl) {
  const items = store.state.checklist;
  const done  = store.getChecklistDone(analytics.todayStr());
  const allDone = items.every((_,i) => done[i]);
  if (!allDone) {
    document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Complete all items first', type: 'error' } }));
    return;
  }
  store.addAudit('checklist_confirmed', `${items.length} items confirmed`);
  wrapEl.querySelector('#chk-panel').classList.remove('open');
  document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: '✓ Checklist complete!', type: 'success' } }));
}

// Double-press Tab to open (when not in an input)
let lastTab = 0;
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  e.preventDefault();
  const now = Date.now();
  if (now - lastTab < 400) document.dispatchEvent(new Event('app:toggle-checklist'));
  lastTab = now;
});
