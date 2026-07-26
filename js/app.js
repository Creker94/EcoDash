// ============================================================
// EcoDash — bootstrap, auth, viste (Fase 1: conti + movimenti)
// ============================================================

let CONTI = [], CATEGORIE = [], MOVIMENTI = [];
let tipoMovimento = 'uscita';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ---------- Avvio ----------
document.addEventListener('DOMContentLoaded', async () => {
  setTheme(localStorage.getItem('ecodash-theme') === 'light', false);
  setPrivacy(localStorage.getItem('ecodash-privacy') === '1', false);
  bindUI();
  $('#mov-data').value = oggiISO();

  const { data: { session } } = await sb.auth.getSession();
  if (session) { hideLogin(); boot(); }

  sb.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_IN' && s && !$('#login-overlay').hidden) {
      hideLogin();
      boot();
    }
  });
});

function hideLogin() { $('#login-overlay').hidden = true; }

async function boot() {
  try {
    await refresh();
    if (CATEGORIE.length === 0) await seedCategorie();
  } catch (e) {
    console.error(e);
    toast('Errore nel caricamento dei dati: ricarica la pagina', 'error');
  }
}

async function refresh() {
  [CONTI, CATEGORIE, MOVIMENTI] = await Promise.all([DB.conti(), DB.categorie(), DB.movimenti()]);
  renderDashboard();
  renderMovimenti();
  renderConti();
  fillSelects();
}

// Categorie di partenza al primo accesso
async function seedCategorie() {
  const rows = [
    ...['Stipendio', 'Affitti', 'Vendite', 'Altro (entrate)'].map(nome => ({ nome, tipo: 'entrata' })),
    ...['Casa', 'Tasse e imposte', 'Utenze', 'Spesa', 'Trasporti', 'Svago', 'Salute', 'Altro (uscite)'].map(nome => ({ nome, tipo: 'uscita' }))
  ];
  await DB.addCategorie(rows);
  CATEGORIE = await DB.categorie();
  fillSelects();
  toast('Categorie di base create');
}

// ---------- Login ----------
function bindLogin() {
  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#login-btn'), async () => {
      const { error } = await sb.auth.signInWithPassword({
        email: $('#login-email').value.trim(),
        password: $('#login-pass').value
      });
      loginMsg(error ? 'Credenziali non valide: controlla email e password.' : '', !!error);
    });
  });

  $('#signup-btn').addEventListener('click', () => {
    withBusy($('#signup-btn'), async () => {
      const email = $('#login-email').value.trim();
      const pass = $('#login-pass').value;
      if (!email || pass.length < 6) {
        return loginMsg('Inserisci email e una password di almeno 6 caratteri.', true);
      }
      const { error } = await sb.auth.signUp({ email, password: pass });
      loginMsg(error ? error.message : 'Account creato: controlla l\'email per confermare, poi accedi.', !!error);
    });
  });
}

function loginMsg(msg, err) {
  const el = $('#login-msg');
  el.textContent = msg;
  el.className = 'login-msg' + (err ? ' err' : '');
}

// ---------- UI generale ----------
function bindUI() {
  bindLogin();

  // Navigazione
  $$('.nav-item[data-view]').forEach(b => b.addEventListener('click', () => {
    $$('.nav-item[data-view]').forEach(x => x.classList.toggle('active', x === b));
    $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + b.dataset.view; });
    window.scrollTo(0, 0);
  }));

  // Toggle tema / riservata / logout
  $('#theme-toggle').addEventListener('click', () =>
    setTheme(!document.body.classList.contains('light')));
  $('#privacy-toggle').addEventListener('click', () => {
    const on = !document.body.classList.contains('privacy');
    setPrivacy(on);
    toast(on ? 'Modalit\u00e0 riservata attiva' : 'Modalit\u00e0 riservata disattivata');
  });
  $('#logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.reload();
  });

  // Apertura modali
  $$('[data-open="movimento"]').forEach(b => b.addEventListener('click', openMovimento));
  $$('[data-open="conto"]').forEach(b => b.addEventListener('click', () => {
    $('#modal-conto').hidden = false;
  }));

  // Chiusura modali (overlay, bottoni Annulla, Esc)
  $$('.modal-overlay').forEach(o => {
    o.addEventListener('click', (e) => { if (e.target === o) o.hidden = true; });
    o.querySelectorAll('[data-close]').forEach(b =>
      b.addEventListener('click', () => { o.hidden = true; }));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal-overlay').forEach(o => { o.hidden = true; });
  });

  // Tipo movimento (segmented)
  $$('#mov-tipo .seg-btn').forEach(b => b.addEventListener('click', () => {
    tipoMovimento = b.dataset.tipo;
    $$('#mov-tipo .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    fillCategoriaSelect();
  }));

  // Form movimento
  $('#form-movimento').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#mov-salva'), async () => {
      try {
        const raw = Math.abs(parseFloat($('#mov-importo').value));
        if (!raw) { toast('Inserisci un importo valido', 'error'); return; }
        await DB.addMovimento({
          conto_id: $('#mov-conto').value,
          categoria_id: $('#mov-categoria').value || null,
          importo: tipoMovimento === 'uscita' ? -raw : raw,
          descrizione: $('#mov-desc').value.trim() || null,
          data: $('#mov-data').value
        });
        $('#modal-movimento').hidden = true;
        $('#form-movimento').reset();
        $('#mov-data').value = oggiISO();
        toast('Salvato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nel salvataggio: riprova', 'error');
      }
    });
  });

  // Form conto
  $('#form-conto').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#conto-salva'), async () => {
      try {
        await DB.addConto({
          nome: $('#conto-nome').value.trim(),
          tipo: $('#conto-tipo').value,
          saldo_iniziale: parseFloat($('#conto-saldo').value) || 0
        });
        $('#modal-conto').hidden = true;
        $('#form-conto').reset();
        $('#conto-saldo').value = '0';
        toast('Salvato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nel salvataggio: riprova', 'error');
      }
    });
  });

  // Conferma azioni distruttive
  $('#confirm-no').addEventListener('click', () => closeConfirm(false));
  $('#confirm-yes').addEventListener('click', () => closeConfirm(true));
}

function openMovimento() {
  if (CONTI.length === 0) {
    toast('Crea prima un conto', 'error');
    $('#modal-conto').hidden = false;
    return;
  }
  $('#modal-movimento').hidden = false;
}

// ---------- Conferma (z 4000) ----------
let _confirmResolve = null;
function confirmAsk(msg) {
  $('#confirm-msg').textContent = msg;
  $('#confirm').hidden = false;
  return new Promise(res => { _confirmResolve = res; });
}
function closeConfirm(ok) {
  $('#confirm').hidden = true;
  if (_confirmResolve) { _confirmResolve(ok); _confirmResolve = null; }
}

// ---------- Select ----------
function fillSelects() {
  $('#mov-conto').innerHTML = CONTI
    .map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  fillCategoriaSelect();
}
function fillCategoriaSelect() {
  const opts = CATEGORIE.filter(c => c.tipo === tipoMovimento)
    .map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#mov-categoria').innerHTML = '<option value="">\u2014 nessuna \u2014</option>' + opts;
}

// ---------- Calcoli ----------
function saldoConto(id) {
  const c = CONTI.find(x => x.id === id);
  const mov = MOVIMENTI.filter(m => m.conto_id === id)
    .reduce((s, m) => s + Number(m.importo), 0);
  return Number(c?.saldo_iniziale || 0) + mov;
}
function saldoTotale() {
  return CONTI.reduce((s, c) => s + saldoConto(c.id), 0);
}

// ---------- Render ----------
function renderDashboard() {
  $('#hero-saldo').textContent = fmtEUR.format(saldoTotale());

  const mese = oggiISO().slice(0, 7);
  const delMese = MOVIMENTI.filter(m => m.data.startsWith(mese));
  const entrate = delMese.filter(m => m.importo > 0).reduce((s, m) => s + Number(m.importo), 0);
  const uscite = delMese.filter(m => m.importo < 0).reduce((s, m) => s + Number(m.importo), 0);
  const bilancio = entrate + uscite;

  $('#stat-entrate').textContent = fmtEUR.format(entrate);
  $('#stat-uscite').textContent = fmtEUR.format(Math.abs(uscite));
  $('#stat-entrate-sub').textContent = delMese.filter(m => m.importo > 0).length + ' movimenti';
  $('#stat-uscite-sub').textContent = delMese.filter(m => m.importo < 0).length + ' movimenti';

  const b = $('#stat-bilancio');
  b.textContent = (bilancio > 0 ? '+' : '') + fmtEUR.format(bilancio);
  b.classList.toggle('stat-green', bilancio >= 0);
  b.classList.toggle('stat-red', bilancio < 0);

  const tb = $('#tbl-recenti tbody');
  const rows = MOVIMENTI.slice(0, 8);
  tb.innerHTML = rows.length
    ? rows.map(m => rigaMovimento(m, false)).join('')
    : '<tr><td colspan="4" class="empty">Nessun movimento: comincia con "+ Nuovo"</td></tr>';
}

function rigaMovimento(m, full) {
  const cat = m.categoria
    ? `<span class="badge ${m.categoria.tipo === 'entrata' ? 'green' : 'red'}">${esc(m.categoria.nome)}</span>`
    : '<span class="badge grey">\u2014</span>';
  const conto = full ? `<td>${esc(m.conto?.nome || '')}</td>` : '';
  const del = full
    ? `<td class="td-actions"><button class="btn btn-ghost btn-sm" data-del="${m.id}" title="Elimina">\u2715</button></td>`
    : '';
  return `<tr>
    <td class="num">${dataIT(m.data)}</td>
    <td>${esc(m.descrizione || '\u2014')}</td>
    <td>${cat}</td>${conto}
    <td class="importo">${importoHTML(Number(m.importo))}</td>${del}
  </tr>`;
}

function renderMovimenti() {
  const tb = $('#tbl-movimenti tbody');
  tb.innerHTML = MOVIMENTI.length
    ? MOVIMENTI.map(m => rigaMovimento(m, true)).join('')
    : '<tr><td colspan="6" class="empty">Nessun movimento registrato</td></tr>';

  tb.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmAsk('Eliminare definitivamente questo movimento?');
    if (!ok) return;
    withBusy(b, async () => {
      try {
        await DB.delMovimento(b.dataset.del);
        toast('Eliminato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nell\'eliminazione: riprova', 'error');
      }
    });
  }));
}

function renderConti() {
  const g = $('#conti-grid');
  g.innerHTML = CONTI.length
    ? CONTI.map(c => `
      <div class="stat-card">
        <div class="stat-label">${esc(c.nome)}</div>
        <div class="stat-card-val stat-accent amount">${fmtEUR.format(saldoConto(c.id))}</div>
        <div class="stat-sub"><span class="badge grey">${esc(c.tipo)}</span></div>
      </div>`).join('')
    : '<div class="empty">Nessun conto: creane uno con "+ Nuovo conto"</div>';
}
