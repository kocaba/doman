/* ============================================================
   Domain Name Generator — script.js
   ============================================================ */

// ── TLD Configuration ──────────────────────────────────────
const TLD_CATEGORIES = [
  {
    id: 'popular', name: 'Popular TLDs',
    tlds: ['.com','.net','.org','.io','.co','.ai','.app','.dev','.xyz']
  },
  {
    id: 'country', name: 'Country Domains',
    tlds: ['.ua','.pl','.de','.fr','.it','.es','.nl','.be','.at','.ch',
           '.se','.no','.fi','.dk','.cz','.sk','.hu','.ro','.bg','.gr',
           '.pt','.ie','.lt','.lv','.ee','.us','.ca','.au','.nz','.jp',
           '.kr','.cn','.in','.br','.mx','.tr']
  },
  {
    id: 'business', name: 'Business Domains',
    tlds: ['.biz','.company','.inc','.ltd','.llc','.corp','.enterprises',
           '.holdings','.agency','.consulting']
  },
  {
    id: 'tech', name: 'Startup & Tech',
    tlds: ['.tech','.digital','.cloud','.software','.systems','.network',
           '.solutions','.engineering','.codes','.tools','.data']
  },
  {
    id: 'marketing', name: 'Marketing & SEO',
    tlds: ['.marketing','.media','.agency','.ads','.social','.email',
           '.events','.design','.studio','.press']
  },
  {
    id: 'ecommerce', name: 'Ecommerce',
    tlds: ['.shop','.store','.sale','.market','.deals','.fashion','.boutique']
  },
  {
    id: 'travel', name: 'Travel & Lifestyle',
    tlds: ['.travel','.tours','.vacations','.holiday','.cafe','.restaurant','.bar']
  },
  {
    id: 'education', name: 'Education',
    tlds: ['.school','.academy','.education','.training','.institute','.university']
  }
];

const DEFAULT_TLDS = new Set(['.com','.net','.org','.io','.co']);
const QUICK_TLDS   = ['.com','.net','.org','.io','.co','.ai','.tech','.shop'];

// ── Domain-generation vocabulary ──────────────────────────
const PREFIXES = [
  'get','go','try','my','best','top','the','super','smart','pro',
  'easy','fast','use','find','hey','just','real','true','ace','max',
  'one','nova','meta','neo','hub','ultra','next','open','core','zen'
];
const SUFFIXES = [
  'hub','lab','zone','world','group','pro','online','cloud','works',
  'base','point','space','site','media','network','solutions','app',
  'hq','co','io','api','ai','box','kit','spot','den','bay','place',
  'bridge','link','port','flow','gate','forge','craft','pulse','vault'
];

// ── State ──────────────────────────────────────────────────
let selectedTlds   = new Set(DEFAULT_TLDS);
let allResults     = [];       // { name, tld, domain, status }
let filterAvailable = false;
let sortMode        = 'default';
let checkQueue      = [];
let checkRunning    = 0;
const CHECK_CONCURRENCY = 6;

// ── Theme ──────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(saved);
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ── LocalStorage TLD persistence ──────────────────────────
function saveTlds() {
  localStorage.setItem('selectedTlds', JSON.stringify([...selectedTlds]));
}
function loadTlds() {
  try {
    const raw = localStorage.getItem('selectedTlds');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        selectedTlds = new Set(arr);
        return;
      }
    }
  } catch {}
  selectedTlds = new Set(DEFAULT_TLDS);
}

// ── Extension Selector UI ──────────────────────────────────
function buildExtSelector() {
  const container = document.getElementById('extCategories');
  if (!container) return;
  container.innerHTML = '';

  TLD_CATEGORIES.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'ext-cat';
    div.dataset.catId = cat.id;

    const selCount = cat.tlds.filter(t => selectedTlds.has(t)).length;

    div.innerHTML = `
      <div class="ext-cat-header" role="button" tabindex="0" aria-expanded="false">
        <span class="ext-cat-name">${cat.name}</span>
        <span class="ext-cat-count ${selCount === 0 ? 'zero' : ''}" data-count="${cat.id}">
          ${selCount} selected
        </span>
        <div class="ext-cat-actions">
          <button class="ext-cat-act" data-action="all"  data-cat="${cat.id}">All</button>
          <button class="ext-cat-act" data-action="none" data-cat="${cat.id}">None</button>
        </div>
        <span class="ext-cat-chevron">▼</span>
      </div>
      <div class="ext-cat-tlds">
        ${cat.tlds.map(tld => {
          const checked = selectedTlds.has(tld);
          return `
            <label class="ext-cat-tld ${checked ? 'checked' : ''}" data-tld="${tld}">
              <input type="checkbox" ${checked ? 'checked' : ''}/>
              <span class="tld-check">${checked ? '✓' : ''}</span>
              <span>${tld}</span>
            </label>`;
        }).join('')}
      </div>`;

    // category toggle
    const header = div.querySelector('.ext-cat-header');
    header.addEventListener('click', e => {
      if (e.target.closest('.ext-cat-act')) return;
      div.classList.toggle('open');
      header.setAttribute('aria-expanded', div.classList.contains('open'));
    });
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
    });

    // tld checkboxes
    div.querySelectorAll('.ext-cat-tld').forEach(lbl => {
      lbl.addEventListener('click', e => {
        e.preventDefault();
        const tld = lbl.dataset.tld;
        const inp = lbl.querySelector('input');
        if (selectedTlds.has(tld)) { selectedTlds.delete(tld); inp.checked = false; lbl.classList.remove('checked'); lbl.querySelector('.tld-check').textContent = ''; }
        else                       { selectedTlds.add(tld);    inp.checked = true;  lbl.classList.add('checked');    lbl.querySelector('.tld-check').textContent = '✓'; }
        saveTlds();
        updateCounts();
        syncQuickChips();
      });
    });

    // select all / none per category
    div.querySelectorAll('.ext-cat-act').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.action;
        cat.tlds.forEach(tld => {
          if (action === 'all') selectedTlds.add(tld);
          else selectedTlds.delete(tld);
        });
        saveTlds();
        refreshCatTlds(div, cat);
        updateCounts();
        syncQuickChips();
      });
    });

    container.appendChild(div);
  });

  // open popular by default
  const first = container.querySelector('.ext-cat');
  if (first) { first.classList.add('open'); first.querySelector('.ext-cat-header').setAttribute('aria-expanded', 'true'); }
}

function refreshCatTlds(catEl, cat) {
  catEl.querySelectorAll('.ext-cat-tld').forEach(lbl => {
    const tld = lbl.dataset.tld;
    const inp = lbl.querySelector('input');
    const chk = lbl.querySelector('.tld-check');
    if (selectedTlds.has(tld)) { inp.checked = true;  lbl.classList.add('checked');    chk.textContent = '✓'; }
    else                       { inp.checked = false; lbl.classList.remove('checked'); chk.textContent = ''; }
  });
}

function updateCounts() {
  const total = selectedTlds.size;
  document.querySelectorAll('[data-count]').forEach(el => {
    const catId = el.dataset.count;
    const cat   = TLD_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    const n = cat.tlds.filter(t => selectedTlds.has(t)).length;
    el.textContent = `${n} selected`;
    el.classList.toggle('zero', n === 0);
  });
  const badge = document.getElementById('extCountBadge');
  if (badge) badge.textContent = `${total} zone${total !== 1 ? 's' : ''} selected`;
  const sub = document.getElementById('extHeaderSub');
  if (sub) sub.textContent = buildCategoryCountSummary();
}

function buildCategoryCountSummary() {
  const parts = TLD_CATEGORIES
    .map(c => ({ name: c.name, n: c.tlds.filter(t => selectedTlds.has(t)).length }))
    .filter(x => x.n > 0)
    .map(x => `${x.name} (${x.n})`);
  return parts.length ? parts.join(' · ') : 'No extensions selected';
}

function syncQuickChips() {
  document.querySelectorAll('.quick-chip').forEach(chip => {
    const tld = chip.dataset.tld;
    chip.classList.toggle('active', selectedTlds.has(tld));
  });
}

function buildQuickChips() {
  const bar = document.getElementById('extSticky');
  if (!bar) return;
  bar.innerHTML = `<span class="ext-sticky-label">Quick:</span>`;
  QUICK_TLDS.forEach(tld => {
    const chip = document.createElement('button');
    chip.className = 'quick-chip' + (selectedTlds.has(tld) ? ' active' : '');
    chip.dataset.tld = tld;
    chip.textContent = tld;
    chip.addEventListener('click', () => {
      if (selectedTlds.has(tld)) selectedTlds.delete(tld);
      else selectedTlds.add(tld);
      saveTlds();
      chip.classList.toggle('active');
      updateCounts();
      // sync full panel
      const catEl = document.querySelector(`.ext-cat-tld[data-tld="${tld}"]`);
      if (catEl) {
        const inp = catEl.querySelector('input');
        const chk = catEl.querySelector('.tld-check');
        if (selectedTlds.has(tld)) { inp.checked = true;  catEl.classList.add('checked');    chk.textContent = '✓'; }
        else                       { inp.checked = false; catEl.classList.remove('checked'); chk.textContent = ''; }
      }
    });
    bar.appendChild(chip);
  });
}

// TLD search filter
function filterTldSearch(query) {
  const q = query.toLowerCase().replace(/^\./, '');
  document.querySelectorAll('.ext-cat-tld').forEach(lbl => {
    const tld = lbl.dataset.tld.replace('.', '');
    lbl.style.display = (!q || tld.includes(q)) ? '' : 'none';
  });
  // auto-open categories that have visible matching tlds
  document.querySelectorAll('.ext-cat').forEach(catEl => {
    const visible = [...catEl.querySelectorAll('.ext-cat-tld')].some(l => l.style.display !== 'none');
    if (q) {
      catEl.classList.toggle('open', visible);
    }
  });
}

// ── Domain generation ──────────────────────────────────────
function generateNames(word) {
  const w = word.toLowerCase().trim();
  const names = new Set();

  // bare word
  names.add(w);

  // prefix + word
  PREFIXES.forEach(p => names.add(p + w));

  // word + suffix
  SUFFIXES.forEach(s => names.add(w + s));

  // prefix + word + suffix (smart combos)
  const shortPrefixes = ['get','go','my','the','try'];
  const shortSuffixes = ['hub','pro','app','co','io','hq','lab','kit'];
  shortPrefixes.forEach(p => shortSuffixes.forEach(s => names.add(p + w + s)));

  // word + number
  [24,365,7,100,360,247,99,pro => `${w}${pro}`].forEach(n => {
    if (typeof n === 'number') names.add(w + n);
  });
  names.add(w + '24');
  names.add(w + '365');
  names.add(w + '360');
  names.add(w + '247');
  names.add(w + '99');

  // word + short monosyllable combos
  ['ai','iq','fx','mx','hq','ox','db'].forEach(x => names.add(w + x));

  // hyphenated
  PREFIXES.slice(0, 8).forEach(p => names.add(p + '-' + w));
  SUFFIXES.slice(0, 8).forEach(s => names.add(w + '-' + s));

  // doubled / creative
  names.add(w + w.slice(0, 3));      // pizzapiz
  names.add(w.slice(0, 3) + w);      // pizpizza
  names.add('i' + w);               // ipizza
  names.add('e' + w);               // epizza
  names.add(w + 'ify');
  names.add(w + 'ly');
  names.add(w + 'pal');
  names.add(w + 'bay');
  names.add(w + 'wing');
  names.add('with' + w);
  names.add('use' + w);
  names.add('find' + w);
  names.add('love' + w);

  // clean: only valid hostname chars, min 3 chars
  const valid = [...names].filter(n =>
    n.length >= 3 && n.length <= 40 &&
    /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(n)
  );

  return [...new Set(valid)];
}

function buildResults(names) {
  const tldArr = [...selectedTlds];
  if (tldArr.length === 0) {
    showToast('Please select at least one domain extension.', 'error');
    return [];
  }
  const results = [];
  names.forEach(name => {
    tldArr.forEach(tld => {
      results.push({ name, tld, domain: name + tld, status: 'checking' });
    });
  });
  return results;
}

// ── Render table ──────────────────────────────────────────
function getVisibleResults() {
  let list = [...allResults];
  if (filterAvailable) list = list.filter(r => r.status === 'available');
  if (sortMode === 'az')        list.sort((a,b) => a.domain.localeCompare(b.domain));
  else if (sortMode === 'za')   list.sort((a,b) => b.domain.localeCompare(a.domain));
  else if (sortMode === 'avail') {
    const order = { available: 0, checking: 1, unknown: 2, taken: 3, error: 3 };
    list.sort((a,b) => (order[a.status]??99) - (order[b.status]??99));
  }
  return list;
}

function renderTable(scrollTop = false) {
  const section   = document.getElementById('resultsSection');
  const tableWrap = document.getElementById('tableWrap');
  const summaryEl = document.getElementById('summaryBar');
  const metaEl    = document.getElementById('resultsMeta');

  if (!allResults.length) { section.style.display = 'none'; return; }
  section.style.display = '';

  const visible = getVisibleResults();
  const avail   = allResults.filter(r => r.status === 'available').length;
  const taken   = allResults.filter(r => r.status === 'taken').length;
  const checking= allResults.filter(r => r.status === 'checking').length;

  if (metaEl) metaEl.innerHTML =
    `Showing <strong>${visible.length}</strong> of <strong>${allResults.length}</strong> domains`;

  // summary bar
  if (summaryEl) summaryEl.innerHTML = `
    <div class="summ-item"><span class="summ-dot" style="background:var(--success)"></span><strong>${avail}</strong> Available</div>
    <div class="summ-item"><span class="summ-dot" style="background:var(--danger)"></span><strong>${taken}</strong> Taken</div>
    <div class="summ-item"><span class="summ-dot" style="background:var(--warn)"></span><strong>${checking}</strong> Checking</div>
    <div class="summ-item" style="margin-left:auto;color:var(--text-4)">${allResults.length} total</div>`;

  // build rows (virtual-ish: cap at 500 for perf)
  const fragment = document.createDocumentFragment();
  visible.slice(0, 500).forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'domain-row';
    row.style.animationDelay = `${Math.min(i * 8, 300)}ms`;
    row.dataset.domain = r.domain;

    const [sld, ...tldParts] = r.domain.split('.');
    const tldStr = '.' + tldParts.join('.');

    row.innerHTML = `
      <div class="domain-name">
        <span class="domain-tld">${sld}</span><span class="domain-ext">${tldStr}</span>
      </div>
      ${badgeHTML(r.status)}
      <button class="copy-btn" title="Copy domain" data-domain="${r.domain}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>`;
    fragment.appendChild(row);
  });

  // replace inner while keeping head / progress / summary
  const existingHead   = tableWrap.querySelector('.table-head');
  const existingProg   = tableWrap.querySelector('.progress-wrap');
  const existingSummary= tableWrap.querySelector('.summary-bar');

  // remove all domain rows
  tableWrap.querySelectorAll('.domain-row,.skeleton-row').forEach(el => el.remove());

  // insert rows before summary
  if (existingSummary) tableWrap.insertBefore(fragment, existingSummary);
  else tableWrap.appendChild(fragment);

  if (scrollTop) tableWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // empty state
  if (!visible.length) {
    const emptyDiv = document.createElement('div');
    emptyDiv.style.cssText = 'text-align:center;padding:40px;color:var(--text-4);font-size:.9rem;';
    emptyDiv.textContent = filterAvailable ? 'No available domains found yet — results update as checking completes.' : 'No domains generated yet.';
    if (existingSummary) tableWrap.insertBefore(emptyDiv, existingSummary);
    else tableWrap.appendChild(emptyDiv);
  }
}

function badgeHTML(status) {
  const map = {
    available: `<span class="badge badge-available"><span class="badge-dot"></span>Available</span>`,
    taken:     `<span class="badge badge-taken"><span class="badge-dot"></span>Taken</span>`,
    checking:  `<span class="badge badge-checking"><span class="badge-dot"></span>Checking</span>`,
    unknown:   `<span class="badge badge-unknown"><span class="badge-dot"></span>Unknown</span>`,
    error:     `<span class="badge badge-unknown"><span class="badge-dot"></span>Error</span>`,
  };
  return map[status] || map.unknown;
}

function updateRowStatus(domain, status) {
  const row = document.querySelector(`.domain-row[data-domain="${domain}"]`);
  if (!row) return;
  const badgeEl = row.querySelector('.badge');
  if (badgeEl) badgeEl.outerHTML = badgeHTML(status);
}

// ── Skeleton ──────────────────────────────────────────────
function showSkeleton(count = 12) {
  const tableWrap = document.getElementById('tableWrap');
  tableWrap.innerHTML = `
    <div class="table-head">
      <span>Domain</span><span>Status</span><span class="col-action"></span>
    </div>
    <div class="progress-wrap"><div class="progress-bar" id="progressBar"></div></div>
    ${Array.from({length: count}, () => `
      <div class="skeleton-row">
        <div class="skel skel-name"></div>
        <div class="skel skel-badge"></div>
        <div class="skel skel-btn"></div>
      </div>`).join('')}
    <div class="summary-bar" id="summaryBar"></div>`;
}

function initTableStructure() {
  const tableWrap = document.getElementById('tableWrap');
  if (!tableWrap.querySelector('.table-head')) {
    tableWrap.innerHTML = `
      <div class="table-head">
        <span>Domain</span><span>Status</span><span class="col-action"></span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" id="progressBar"></div></div>
      <div class="summary-bar" id="summaryBar"></div>`;
  }
}

// ── RDAP Check queue ──────────────────────────────────────
function enqueueCheck(domain) {
  checkQueue.push(domain);
  drainQueue();
}

function drainQueue() {
  while (checkRunning < CHECK_CONCURRENCY && checkQueue.length) {
    const domain = checkQueue.shift();
    checkRunning++;
    checkDomain(domain).finally(() => {
      checkRunning--;
      drainQueue();
      updateProgress();
    });
  }
}

async function checkDomain(domain) {
  try {
    const res = await fetch(`/api/check?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const idx = allResults.findIndex(r => r.domain === domain);
    if (idx !== -1) {
      allResults[idx].status = data.available === true  ? 'available' :
                               data.available === false ? 'taken'     :
                               data.status === 'unknown'? 'unknown'   : 'error';
      updateRowStatus(domain, allResults[idx].status);
      updateSummaryBar();
    }
  } catch {
    const idx = allResults.findIndex(r => r.domain === domain);
    if (idx !== -1) { allResults[idx].status = 'unknown'; updateRowStatus(domain, 'unknown'); }
  }
}

function updateProgress() {
  const total    = allResults.length;
  const remaining = allResults.filter(r => r.status === 'checking').length;
  const done     = total - remaining;
  const pct      = total ? Math.round((done / total) * 100) : 0;
  const bar      = document.getElementById('progressBar');
  if (bar) bar.style.width = pct + '%';
}

function updateSummaryBar() {
  const avail   = allResults.filter(r => r.status === 'available').length;
  const taken   = allResults.filter(r => r.status === 'taken').length;
  const checking= allResults.filter(r => r.status === 'checking').length;
  const summ    = document.getElementById('summaryBar');
  if (summ) summ.innerHTML = `
    <div class="summ-item"><span class="summ-dot" style="background:var(--success)"></span><strong>${avail}</strong> Available</div>
    <div class="summ-item"><span class="summ-dot" style="background:var(--danger)"></span><strong>${taken}</strong> Taken</div>
    <div class="summ-item"><span class="summ-dot" style="background:var(--warn)"></span><strong>${checking}</strong> Checking</div>
    <div class="summ-item" style="margin-left:auto;color:var(--text-4)">${allResults.length} total</div>`;
  const meta = document.getElementById('resultsMeta');
  if (meta) {
    const visible = getVisibleResults().length;
    meta.innerHTML = `Showing <strong>${visible}</strong> of <strong>${allResults.length}</strong> domains`;
  }
}

// ── Generate handler ──────────────────────────────────────
function generate() {
  const kw = document.getElementById('keyword').value.trim();
  if (!kw) { showToast('Please enter a keyword.', 'error'); return; }
  if (!/^[a-zA-Z0-9\-]+$/.test(kw)) { showToast('Use only letters, numbers, or hyphens.', 'error'); return; }
  if (selectedTlds.size === 0) { showToast('Select at least one domain extension.', 'error'); return; }

  // reset
  checkQueue = [];
  checkRunning = 0;
  filterAvailable = false;
  sortMode = 'default';
  document.getElementById('filterBtn').classList.remove('active');
  document.getElementById('sortSelect').value = 'default';

  const section = document.getElementById('resultsSection');
  section.style.display = '';

  showSkeleton(Math.min(selectedTlds.size * 6, 20));

  const names = generateNames(kw);
  allResults  = buildResults(names);

  if (!allResults.length) {
    showToast('No extensions selected — nothing to generate.', 'error');
    section.style.display = 'none';
    return;
  }

  // short delay to let skeleton render
  requestAnimationFrame(() => {
    setTimeout(() => {
      initTableStructure();
      renderTable(true);
      allResults.forEach(r => enqueueCheck(r.domain));
    }, 120);
  });

  showToast(`Generating ${allResults.length} domains for "${kw}"…`, 'success');
}

// ── Copy ──────────────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  const domain = btn.dataset.domain;
  navigator.clipboard.writeText(domain).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    }, 1500);
    showToast(`Copied: ${domain}`, 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = domain; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast(`Copied: ${domain}`, 'success');
  });
});

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  toast.innerHTML = icon + `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// ── Ext selector panel open/close ─────────────────────────
function initExtBlock() {
  const block  = document.getElementById('extBlock');
  const header = document.getElementById('extBlockHeader');
  if (!block || !header) return;
  header.addEventListener('click', () => block.classList.toggle('open'));
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadTlds();
  buildExtSelector();
  buildQuickChips();
  updateCounts();

  // theme toggle
  document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);

  // ext block toggle
  initExtBlock();

  // generate button
  document.getElementById('generateBtn')?.addEventListener('click', generate);

  // enter key
  document.getElementById('keyword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') generate();
  });

  // filter available
  document.getElementById('filterBtn')?.addEventListener('click', () => {
    filterAvailable = !filterAvailable;
    document.getElementById('filterBtn').classList.toggle('active', filterAvailable);
    renderTable();
  });

  // sort
  document.getElementById('sortSelect')?.addEventListener('change', e => {
    sortMode = e.target.value;
    renderTable();
  });

  // TLD search
  document.getElementById('extSearch')?.addEventListener('input', e => {
    filterTldSearch(e.target.value);
  });

  // global TLD buttons
  document.getElementById('btnSelectAll')?.addEventListener('click', () => {
    TLD_CATEGORIES.forEach(cat => cat.tlds.forEach(t => selectedTlds.add(t)));
    saveTlds();
    document.querySelectorAll('.ext-cat').forEach((catEl, i) => {
      refreshCatTlds(catEl, TLD_CATEGORIES[i]);
    });
    updateCounts();
    syncQuickChips();
  });

  document.getElementById('btnClearAll')?.addEventListener('click', () => {
    selectedTlds.clear();
    saveTlds();
    document.querySelectorAll('.ext-cat').forEach((catEl, i) => {
      refreshCatTlds(catEl, TLD_CATEGORIES[i]);
    });
    updateCounts();
    syncQuickChips();
  });

  document.getElementById('btnReset')?.addEventListener('click', () => {
    selectedTlds = new Set(DEFAULT_TLDS);
    saveTlds();
    document.querySelectorAll('.ext-cat').forEach((catEl, i) => {
      refreshCatTlds(catEl, TLD_CATEGORIES[i]);
    });
    updateCounts();
    syncQuickChips();
    showToast('Reset to default extensions.', 'success');
  });

  // results section hidden by default
  const section = document.getElementById('resultsSection');
  if (section) section.style.display = 'none';
});
