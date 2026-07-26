// ============================================================
// EcoDash — utility condivise. UNICHE (vedi CLAUDE.md):
// niente formatter monetari o utility data duplicati altrove.
// ============================================================

// Un solo formatter monetario
const fmtEUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

// Formatter NUMERICO per assi/scale dei grafici (non è monetario:
// fmtEUR resta l'unico per gli importi; qui solo tick di scala)
const fmtNum = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

// Una sola utility data, in ora locale (mai toISOString().slice)
function oggiISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

// Aggiunge n mesi a una data ISO (giorno bloccato a fine mese se serve)
function addMesi(iso, n) {
  const [y, m, g] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const ultimo = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(g, ultimo));
  return oggiISO(target);
}

// Data ISO → gg/mm/aa senza passare da Date (niente bug di fuso)
function dataIT(iso) {
  if (!iso) return '';
  const [y, m, g] = iso.split('-');
  return `${g}/${m}/${y.slice(2)}`;
}

// Escape per testo utente dentro innerHTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Importo con segno + colore insieme (mai colore da solo)
function importoHTML(v) {
  const cls = v >= 0 ? 'pos' : 'neg';
  const segno = v > 0 ? '+' : '';
  return `<span class="num amount ${cls}">${segno}${fmtEUR.format(v)}</span>`;
}

// Anti doppio-tap: obbligatorio su ogni azione che scrive
async function withBusy(btn, fn) {
  if (!btn || btn.disabled) return;
  const prev = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = prev;
  }
}

// Toast: informativo, mai bloccante (pointer-events:none in CSS)
let _toastTimer;
function toast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = tipo ? `show ${tipo}` : 'show';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = ''; }, 2600);
}

// Tema + theme-color allineato a --bg
function setTheme(light, save = true) {
  document.body.classList.toggle('light', light);
  if (save) localStorage.setItem('ecodash-theme', light ? 'light' : 'dark');
  const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', bg);
}

// Modalità riservata: blur sugli importi per l'uso in pubblico
function setPrivacy(on, save = true) {
  document.body.classList.toggle('privacy', on);
  if (save) localStorage.setItem('ecodash-privacy', on ? '1' : '0');
}
