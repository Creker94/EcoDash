// ============================================================
// EcoDash — bootstrap, auth, viste (Fasi 1–6: conti, movimenti,
// grafici, scadenze, patrimonio, debiti, obiettivi/PAC)
// ============================================================

let CONTI = [], CATEGORIE = [], MOVIMENTI = [], SCADENZE = [], BENI = [], DEBITI = [], OBIETTIVI = [];
let tipoMovimento = 'uscita';
let tipoScadenza = 'uscita';
let beneInEdit = null;
let debitoInEdit = null;
let obiettivoInEdit = null;
let obiettivoVersa = null;
let ordineDebiti = 'avalanche';
const MESI_RIC = { mensile: 1, bimestrale: 2, trimestrale: 3, semestrale: 6, annuale: 12 };

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ---------- Avvio ----------
document.addEventListener('DOMContentLoaded', async () => {
  setTheme(localStorage.getItem('ecodash-theme') === 'light', false);
  setPrivacy(localStorage.getItem('ecodash-privacy') === '1', false);
  bindUI();
  $('#mov-data').value = oggiISO();
  $('#sca-data').value = oggiISO();

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
  [CONTI, CATEGORIE, MOVIMENTI, SCADENZE, BENI, DEBITI, OBIETTIVI] = await Promise.all([
    DB.conti(), DB.categorie(), DB.movimenti(), DB.scadenze(), DB.beni(), DB.debiti(), DB.obiettivi()
  ]);
  renderDashboard();
  renderDashScadenze();
  renderCharts();
  renderMovimenti();
  renderScadenze();
  renderPatrimonio();
  renderDebiti();
  renderObiettivi();
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
  $$('[data-view-go]').forEach(b => b.addEventListener('click', () =>
    $(`.nav-item[data-view="${b.dataset.viewGo}"]`).click()));

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
  $$('[data-open="scadenza"]').forEach(b => b.addEventListener('click', openScadenza));
  $$('[data-open="bene"]').forEach(b => b.addEventListener('click', () => openBene(null)));
  $$('[data-open="debito"]').forEach(b => b.addEventListener('click', () => openDebito(null)));
  $$('[data-open="obiettivo"]').forEach(b => b.addEventListener('click', () => openObiettivo(null)));
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

  // Segmented tipo (movimento e scadenza)
  $$('#mov-tipo .seg-btn').forEach(b => b.addEventListener('click', () => {
    tipoMovimento = b.dataset.tipo;
    $$('#mov-tipo .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    fillCategoriaSelect();
  }));
  $$('#sca-tipo .seg-btn').forEach(b => b.addEventListener('click', () => {
    tipoScadenza = b.dataset.tipo;
    $$('#sca-tipo .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    fillCategoriaSelectScadenza();
  }));

  // Ordinamento debiti (avalanche / snowball)
  $$('#deb-ordine .seg-btn').forEach(b => b.addEventListener('click', () => {
    ordineDebiti = b.dataset.ord;
    $$('#deb-ordine .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    renderDebiti();
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

  // Form scadenza
  $('#form-scadenza').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#sca-salva'), async () => {
      try {
        const raw = Math.abs(parseFloat($('#sca-importo').value));
        if (!raw) { toast('Inserisci un importo valido', 'error'); return; }
        await DB.addScadenza({
          nome: $('#sca-nome').value.trim(),
          importo: tipoScadenza === 'uscita' ? -raw : raw,
          data_scadenza: $('#sca-data').value,
          ricorrenza: $('#sca-ric').value,
          conto_id: $('#sca-conto').value,
          categoria_id: $('#sca-categoria').value || null
        });
        $('#modal-scadenza').hidden = true;
        $('#form-scadenza').reset();
        $('#sca-data').value = oggiISO();
        toast('Salvato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nel salvataggio: riprova', 'error');
      }
    });
  });

  // Form bene (nuovo o modifica)
  $('#form-bene').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#bene-salva'), async () => {
      try {
        const payload = {
          nome: $('#bene-nome').value.trim(),
          tipo: $('#bene-tipo').value,
          valore_stimato: Math.abs(parseFloat($('#bene-valore').value)) || 0,
          prezzo_acquisto: $('#bene-prezzo').value !== '' ? Math.abs(parseFloat($('#bene-prezzo').value)) : null,
          data_acquisto: $('#bene-data').value || null,
          venduto: $('#bene-stato').value === 'venduto'
        };
        if (beneInEdit) await DB.updBene(beneInEdit, payload);
        else await DB.addBene(payload);
        $('#modal-bene').hidden = true;
        toast('Salvato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nel salvataggio: riprova', 'error');
      }
    });
  });

  // Form debito (nuovo o modifica)
  $('#form-debito').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#deb-salva'), async () => {
      try {
        const iniziale = Math.abs(parseFloat($('#deb-iniziale').value));
        if (!iniziale) { toast('Inserisci l\'importo iniziale', 'error'); return; }
        const resRaw = $('#deb-residuo').value;
        const residuo = resRaw !== '' ? Math.abs(parseFloat(resRaw)) : iniziale;
        const payload = {
          nome: $('#deb-nome').value.trim(),
          importo_iniziale: iniziale,
          residuo,
          tasso: $('#deb-tasso').value !== '' ? Math.abs(parseFloat($('#deb-tasso').value)) : null,
          rata: $('#deb-rata').value !== '' ? Math.abs(parseFloat($('#deb-rata').value)) : null,
          quota_capitale: $('#deb-quota').value !== '' ? Math.abs(parseFloat($('#deb-quota').value)) : null,
          conto_id: $('#deb-conto').value,
          categoria_id: $('#deb-categoria').value || null,
          estinto: residuo <= 0
        };
        if (debitoInEdit) await DB.updDebito(debitoInEdit, payload);
        else await DB.addDebito(payload);
        $('#modal-debito').hidden = true;
        toast('Salvato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nel salvataggio: riprova', 'error');
      }
    });
  });

  // Form obiettivo (nuovo o modifica)
  $('#form-obiettivo').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#ob-salva'), async () => {
      try {
        const target = Math.abs(parseFloat($('#ob-target').value));
        if (!target) { toast('Inserisci il traguardo', 'error'); return; }
        const payload = {
          nome: $('#ob-nome').value.trim(),
          target,
          versato: $('#ob-versato').value !== '' ? Math.abs(parseFloat($('#ob-versato').value)) : 0,
          rata_mensile: $('#ob-rata').value !== '' ? Math.abs(parseFloat($('#ob-rata').value)) : null,
          conto_id: $('#ob-conto').value || null
        };
        if (obiettivoInEdit) await DB.updObiettivo(obiettivoInEdit, payload);
        else await DB.addObiettivo(payload);
        $('#modal-obiettivo').hidden = true;
        toast('Salvato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nel salvataggio: riprova', 'error');
      }
    });
  });

  // Form versamento su obiettivo
  $('#form-versa').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy($('#versa-btn'), async () => {
      try {
        const o = OBIETTIVI.find(x => x.id === obiettivoVersa);
        if (!o) return;
        const imp = Math.abs(parseFloat($('#versa-importo').value));
        if (!imp) { toast('Inserisci un importo valido', 'error'); return; }
        await DB.addMovimento({
          conto_id: $('#versa-conto').value,
          categoria_id: null,
          importo: -imp,
          descrizione: `Versamento ${o.nome}`,
          data: oggiISO()
        });
        await DB.updObiettivo(o.id, { versato: Number(o.versato) + imp });
        $('#modal-versa').hidden = true;
        toast('Versato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nel versamento: riprova', 'error');
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

  // Conferma azioni
  $('#confirm-no').addEventListener('click', () => closeConfirm(false));
  $('#confirm-yes').addEventListener('click', () => closeConfirm(true));
}

function richiedeConto() {
  if (CONTI.length === 0) {
    toast('Crea prima un conto', 'error');
    $('#modal-conto').hidden = false;
    return true;
  }
  return false;
}

function openMovimento() { if (!richiedeConto()) $('#modal-movimento').hidden = false; }
function openScadenza() { if (!richiedeConto()) $('#modal-scadenza').hidden = false; }

function openBene(bene) {
  beneInEdit = bene ? bene.id : null;
  $('#bene-title').textContent = bene ? 'Modifica bene' : 'Nuovo bene';
  $('#form-bene').reset();
  if (bene) {
    $('#bene-nome').value = bene.nome;
    $('#bene-tipo').value = bene.tipo;
    $('#bene-valore').value = Number(bene.valore_stimato);
    $('#bene-prezzo').value = bene.prezzo_acquisto != null ? Number(bene.prezzo_acquisto) : '';
    $('#bene-data').value = bene.data_acquisto || '';
    $('#bene-stato').value = bene.venduto ? 'venduto' : 'attivo';
  }
  $('#modal-bene').hidden = false;
}

function openDebito(d) {
  if (richiedeConto()) return;
  debitoInEdit = d ? d.id : null;
  $('#deb-title').textContent = d ? 'Modifica debito' : 'Nuovo debito';
  $('#form-debito').reset();
  if (d) {
    $('#deb-nome').value = d.nome;
    $('#deb-iniziale').value = Number(d.importo_iniziale);
    $('#deb-residuo').value = Number(d.residuo);
    $('#deb-tasso').value = d.tasso != null ? Number(d.tasso) : '';
    $('#deb-rata').value = d.rata != null ? Number(d.rata) : '';
    $('#deb-quota').value = d.quota_capitale != null ? Number(d.quota_capitale) : '';
    if (d.conto_id) $('#deb-conto').value = d.conto_id;
    $('#deb-categoria').value = d.categoria_id || '';
  }
  $('#modal-debito').hidden = false;
}

function openObiettivo(o) {
  obiettivoInEdit = o ? o.id : null;
  $('#ob-title').textContent = o ? 'Modifica obiettivo' : 'Nuovo obiettivo';
  $('#form-obiettivo').reset();
  if (o) {
    $('#ob-nome').value = o.nome;
    $('#ob-target').value = Number(o.target);
    $('#ob-versato').value = Number(o.versato);
    $('#ob-rata').value = o.rata_mensile != null ? Number(o.rata_mensile) : '';
    $('#ob-conto').value = o.conto_id || '';
  }
  $('#modal-obiettivo').hidden = false;
}

function openVersa(o) {
  if (richiedeConto()) return;
  obiettivoVersa = o.id;
  $('#versa-title').textContent = `Versa \u00b7 ${o.nome}`;
  $('#form-versa').reset();
  if (o.rata_mensile) $('#versa-importo').value = Number(o.rata_mensile);
  if (o.conto_id) $('#versa-conto').value = o.conto_id;
  $('#modal-versa').hidden = false;
}

// ---------- Conferma (z 4000) ----------
let _confirmResolve = null;
function confirmAsk(msg, okLabel = 'Elimina', okDanger = true) {
  $('#confirm-msg').textContent = msg;
  const y = $('#confirm-yes');
  y.textContent = okLabel;
  y.className = 'btn ' + (okDanger ? 'btn-danger' : 'btn-primary');
  $('#confirm').hidden = false;
  return new Promise(res => { _confirmResolve = res; });
}
function closeConfirm(ok) {
  $('#confirm').hidden = true;
  if (_confirmResolve) { _confirmResolve(ok); _confirmResolve = null; }
}

// ---------- Select ----------
function fillSelects() {
  const opzConti = CONTI.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#mov-conto').innerHTML = opzConti;
  $('#sca-conto').innerHTML = opzConti;
  $('#deb-conto').innerHTML = opzConti;
  $('#versa-conto').innerHTML = opzConti;
  $('#ob-conto').innerHTML = '<option value="">\u2014 nessuno \u2014</option>' + opzConti;
  const uscite = CATEGORIE.filter(c => c.tipo === 'uscita')
    .map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#deb-categoria').innerHTML = '<option value="">\u2014 nessuna \u2014</option>' + uscite;
  fillCategoriaSelect();
  fillCategoriaSelectScadenza();
}
function fillCategoriaSelect() {
  const opts = CATEGORIE.filter(c => c.tipo === tipoMovimento)
    .map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#mov-categoria').innerHTML = '<option value="">\u2014 nessuna \u2014</option>' + opts;
}
function fillCategoriaSelectScadenza() {
  const opts = CATEGORIE.filter(c => c.tipo === tipoScadenza)
    .map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#sca-categoria').innerHTML = '<option value="">\u2014 nessuna \u2014</option>' + opts;
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
function accantonatoTotale() {
  return OBIETTIVI.reduce((s, o) => s + Number(o.versato), 0);
}

// Serie giornaliera del saldo totale (ultimi N giorni)
function serieSaldo(giorni = 90) {
  const oggi = oggiISO();
  const start = oggiISO(new Date(Date.now() - giorni * 86400000));
  const base = CONTI.reduce((s, c) => s + Number(c.saldo_iniziale), 0);

  const perData = {};
  let prima = 0;
  for (const m of MOVIMENTI) {
    if (m.data < start) prima += Number(m.importo);
    else perData[m.data] = (perData[m.data] || 0) + Number(m.importo);
  }

  let run = base + prima;
  const out = [];
  const t = new Date(start + 'T00:00:00');
  for (;;) {
    const iso = oggiISO(t);
    run += perData[iso] || 0;
    out.push({ x: iso, y: run });
    if (iso >= oggi) break;
    t.setDate(t.getDate() + 1);
  }
  return out;
}

// Entrate/uscite per ciascuno degli ultimi N mesi
function serieMensile(n = 6) {
  const nomi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const oggi = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
    const pref = oggiISO(m).slice(0, 7);
    const del = MOVIMENTI.filter(x => x.data.startsWith(pref));
    out.push({
      label: nomi[m.getMonth()],
      entrate: del.filter(x => x.importo > 0).reduce((s, x) => s + Number(x.importo), 0),
      uscite: Math.abs(del.filter(x => x.importo < 0).reduce((s, x) => s + Number(x.importo), 0))
    });
  }
  return out;
}

// Uscite del mese corrente per categoria: top 5 + "Altro" (§9)
function speseCategoria() {
  const pref = oggiISO().slice(0, 7);
  const map = {};
  for (const m of MOVIMENTI) {
    if (m.importo >= 0 || !m.data.startsWith(pref)) continue;
    const nome = m.categoria?.nome || 'Senza categoria';
    map[nome] = (map[nome] || 0) + Math.abs(Number(m.importo));
  }
  const arr = Object.entries(map).map(([nome, val]) => ({ nome, val }))
    .sort((a, b) => b.val - a.val);
  if (arr.length > 6) {
    const top = arr.slice(0, 5);
    top.push({ nome: 'Altro', val: arr.slice(5).reduce((s, x) => s + x.val, 0) });
    return top;
  }
  return arr;
}

function renderCharts() {
  Charts.line($('#chart-saldo'), (CONTI.length || MOVIMENTI.length) ? serieSaldo() : []);
  Charts.bars($('#chart-mesi'), serieMensile());
  Charts.hbars($('#chart-cat'), speseCategoria());
}

// ---------- Scadenze ----------
function statoScadenza(s) {
  const oggi = oggiISO();
  const entro = oggiISO(new Date(Date.now() + 30 * 86400000));
  if (s.data_scadenza < oggi) return { label: 'Scaduta', cls: 'red' };
  if (s.data_scadenza <= entro) return { label: 'In arrivo', cls: 'orange' };
  return { label: 'Programmata', cls: 'blue' };
}

function rigaScadenza(s) {
  const st = statoScadenza(s);
  const ric = `<span class="badge grey">${s.ricorrenza === 'nessuna' ? 'una tantum' : esc(s.ricorrenza)}</span>`;
  return `<tr>
    <td class="num">${dataIT(s.data_scadenza)}</td>
    <td>${esc(s.nome)}</td>
    <td>${ric}</td>
    <td><span class="badge ${st.cls}">${st.label}</span></td>
    <td class="importo">${importoHTML(Number(s.importo))}</td>
    <td class="td-actions">
      <button class="btn btn-ghost btn-sm" data-paga="${s.id}" title="Registra movimento">\u2713</button>
      <button class="btn btn-ghost btn-sm" data-delsca="${s.id}" title="Elimina">\u2715</button>
    </td>
  </tr>`;
}

function renderScadenze() {
  const oggi = oggiISO();
  const entro = oggiISO(new Date(Date.now() + 30 * 86400000));
  const scadute = SCADENZE.filter(s => s.data_scadenza < oggi);
  const arrivo = SCADENZE.filter(s => s.data_scadenza >= oggi && s.data_scadenza <= entro);
  const uscDi = a => Math.abs(a.filter(s => s.importo < 0).reduce((x, s) => x + Number(s.importo), 0));

  $('#sca-stat-arrivo').textContent = fmtEUR.format(uscDi(arrivo));
  $('#sca-stat-arrivo-sub').textContent = arrivo.length + ' scadenze';
  $('#sca-stat-scadute').textContent = fmtEUR.format(uscDi(scadute));
  $('#sca-stat-scadute-sub').textContent = scadute.length + ' da registrare';

  const tb = $('#tbl-scadenze tbody');
  tb.innerHTML = SCADENZE.length
    ? SCADENZE.map(rigaScadenza).join('')
    : '<tr><td colspan="6" class="empty">Nessuna scadenza: aggiungi IMU, TARI, rate e abbonamenti con "+ Nuova scadenza"</td></tr>';

  tb.querySelectorAll('[data-paga]').forEach(b => b.addEventListener('click', async () => {
    const s = SCADENZE.find(x => x.id === b.dataset.paga);
    if (!s) return;
    const conto = CONTI.find(c => c.id === s.conto_id);
    if (!conto) { toast('Assegna un conto valido alla scadenza', 'error'); return; }
    const ok = await confirmAsk(
      `Registrare "${s.nome}" (${fmtEUR.format(s.importo)}) oggi su ${conto.nome}?`,
      'Registra', false);
    if (!ok) return;
    withBusy(b, async () => {
      try {
        await DB.addMovimento({
          conto_id: s.conto_id,
          categoria_id: s.categoria_id || null,
          importo: Number(s.importo),
          descrizione: s.nome,
          data: oggiISO()
        });
        if (s.ricorrenza === 'nessuna') {
          await DB.updScadenza(s.id, { archiviata: true });
        } else {
          await DB.updScadenza(s.id, { data_scadenza: addMesi(s.data_scadenza, MESI_RIC[s.ricorrenza]) });
        }
        toast('Registrata', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nella registrazione: riprova', 'error');
      }
    });
  }));

  tb.querySelectorAll('[data-delsca]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmAsk('Eliminare definitivamente questa scadenza?');
    if (!ok) return;
    withBusy(b, async () => {
      try {
        await DB.delScadenza(b.dataset.delsca);
        toast('Eliminata', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nell\'eliminazione: riprova', 'error');
      }
    });
  }));
}

function renderDashScadenze() {
  const tb = $('#tbl-dash-scadenze tbody');
  const prossime = SCADENZE.slice(0, 5);
  tb.innerHTML = prossime.length
    ? prossime.map(s => {
        const st = statoScadenza(s);
        return `<tr>
          <td class="num">${dataIT(s.data_scadenza)}</td>
          <td>${esc(s.nome)}</td>
          <td><span class="badge ${st.cls}">${st.label}</span></td>
          <td class="importo">${importoHTML(Number(s.importo))}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="4" class="empty">Nessuna scadenza in programma</td></tr>';
}

// ---------- Patrimonio ----------
function cardBene(b) {
  const val = Number(b.valore_stimato);
  let delta = '';
  if (!b.venduto && b.prezzo_acquisto != null && Number(b.prezzo_acquisto) > 0) {
    const diff = val - Number(b.prezzo_acquisto);
    const pct = Math.round(diff / Number(b.prezzo_acquisto) * 100);
    const cls = diff >= 0 ? 'pos' : 'neg';
    const segno = diff > 0 ? '+' : '';
    delta = `<span class="num amount ${cls}">${segno}${fmtEUR.format(diff)} · ${segno}${fmtNum.format(pct)}%</span>`;
  }
  const stato = b.venduto ? '<span class="badge grey">venduto</span>' : '';
  return `
    <div class="stat-card">
      <div class="bene-head">
        <div class="stat-label">${esc(b.nome)}</div>
        <div class="bene-actions">
          <button class="btn btn-ghost btn-sm" data-editbene="${b.id}" title="Modifica">\u270e</button>
          <button class="btn btn-ghost btn-sm" data-delbene="${b.id}" title="Elimina">\u2715</button>
        </div>
      </div>
      <div class="stat-card-val ${b.venduto ? 'stat-grey' : 'stat-accent'} amount">${fmtEUR.format(val)}</div>
      <div class="stat-sub"><span class="badge grey">${esc(b.tipo)}</span> ${stato} ${delta}</div>
    </div>`;
}

function renderPatrimonio() {
  const attivi = BENI.filter(b => !b.venduto);
  const liquidita = saldoTotale();
  const valBeni = attivi.reduce((s, b) => s + Number(b.valore_stimato), 0);
  const accantonato = accantonatoTotale();

  $('#pat-totale').textContent = fmtEUR.format(liquidita + valBeni + accantonato);
  $('#pat-liquidita').textContent = fmtEUR.format(liquidita);
  $('#pat-liquidita-sub').textContent = CONTI.length + ' conti';
  $('#pat-beni').textContent = fmtEUR.format(valBeni);
  $('#pat-beni-sub').textContent = attivi.length + ' beni in portafoglio';
  $('#pat-accantonato').textContent = fmtEUR.format(accantonato);
  $('#pat-accantonato-sub').textContent = OBIETTIVI.length + ' obiettivi';

  const g = $('#beni-grid');
  g.innerHTML = BENI.length
    ? BENI.map(cardBene).join('')
    : '<div class="empty">Nessun bene: aggiungi orologi, immobili e oggetti di valore con "+ Nuovo bene"</div>';

  g.querySelectorAll('[data-editbene]').forEach(b => b.addEventListener('click', () => {
    const bene = BENI.find(x => x.id === b.dataset.editbene);
    if (bene) openBene(bene);
  }));
  g.querySelectorAll('[data-delbene]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmAsk('Eliminare definitivamente questo bene?');
    if (!ok) return;
    withBusy(b, async () => {
      try {
        await DB.delBene(b.dataset.delbene);
        toast('Eliminato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nell\'eliminazione: riprova', 'error');
      }
    });
  }));
}

// ---------- Debiti ----------
function cardDebito(d, prio) {
  const pct = Math.min(100, Math.max(0, Math.round((1 - Number(d.residuo) / Number(d.importo_iniziale)) * 100)));
  const tassoB = d.tasso != null ? `<span class="badge grey">${('' + Number(d.tasso)).replace('.', ',')}%</span>` : '';
  const prioB = prio ? '<span class="badge orange">priorit\u00e0</span>' : '';
  const estB = d.estinto ? '<span class="badge grey">estinto</span>' : '';
  const rataTxt = d.rata != null
    ? ` \u00b7 rata <span class="num amount">${fmtEUR.format(d.rata)}</span>`
    : '';
  const chk = (!d.estinto && d.rata != null)
    ? `<button class="btn btn-ghost btn-sm" data-ratadeb="${d.id}" title="Registra rata">\u2713</button>`
    : '';
  return `
    <div class="stat-card">
      <div class="bene-head">
        <div class="stat-label">${esc(d.nome)}</div>
        <div class="bene-actions">
          ${chk}
          <button class="btn btn-ghost btn-sm" data-editdeb="${d.id}" title="Modifica">\u270e</button>
          <button class="btn btn-ghost btn-sm" data-deldeb="${d.id}" title="Elimina">\u2715</button>
        </div>
      </div>
      <div class="stat-card-val ${d.estinto ? 'stat-grey' : 'stat-red'} amount">${fmtEUR.format(d.residuo)}</div>
      <div class="prog"><div class="prog-fill" style="width:${pct}%"></div></div>
      <div class="stat-sub">${fmtNum.format(pct)}% rimborsato \u00b7 iniziale <span class="num amount">${fmtEUR.format(d.importo_iniziale)}</span>${rataTxt}</div>
      <div class="stat-sub">${tassoB} ${prioB} ${estB}</div>
    </div>`;
}

function renderDebiti() {
  const attivi = DEBITI.filter(d => !d.estinto);
  const residuoTot = attivi.reduce((s, d) => s + Number(d.residuo), 0);
  const rataTot = attivi.reduce((s, d) => s + Number(d.rata || 0), 0);

  $('#deb-stat-residuo').textContent = fmtEUR.format(residuoTot);
  $('#deb-stat-residuo-sub').textContent = attivi.length + ' debiti attivi';
  $('#deb-stat-rate').textContent = fmtEUR.format(rataTot);

  const ord = [...DEBITI].sort((a, b) => {
    if (a.estinto !== b.estinto) return a.estinto ? 1 : -1;
    if (ordineDebiti === 'avalanche') return (Number(b.tasso) || 0) - (Number(a.tasso) || 0);
    return Number(a.residuo) - Number(b.residuo);
  });
  const prioId = ord.find(d => !d.estinto)?.id;

  const g = $('#debiti-grid');
  g.innerHTML = ord.length
    ? ord.map(d => cardDebito(d, d.id === prioId && ord.filter(x => !x.estinto).length > 1)).join('')
    : '<div class="empty">Nessun debito registrato \u2014 ottima notizia. Se ne hai, aggiungili con "+ Nuovo debito"</div>';

  g.querySelectorAll('[data-ratadeb]').forEach(b => b.addEventListener('click', async () => {
    const d = DEBITI.find(x => x.id === b.dataset.ratadeb);
    if (!d) return;
    const conto = CONTI.find(c => c.id === d.conto_id);
    if (!conto) { toast('Assegna un conto valido al debito (\u270e)', 'error'); return; }
    const ok = await confirmAsk(
      `Registrare la rata di ${fmtEUR.format(d.rata)} per "${d.nome}" su ${conto.nome}?`,
      'Registra', false);
    if (!ok) return;
    withBusy(b, async () => {
      try {
        await DB.addMovimento({
          conto_id: d.conto_id,
          categoria_id: d.categoria_id || null,
          importo: -Math.abs(Number(d.rata)),
          descrizione: `Rata ${d.nome}`,
          data: oggiISO()
        });
        const scala = d.quota_capitale != null ? Number(d.quota_capitale) : Number(d.rata);
        const nuovo = Math.max(0, Number(d.residuo) - scala);
        await DB.updDebito(d.id, { residuo: nuovo, estinto: nuovo <= 0 });
        toast(nuovo <= 0 ? 'Registrata \u2014 debito estinto!' : 'Registrata', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nella registrazione: riprova', 'error');
      }
    });
  }));

  g.querySelectorAll('[data-editdeb]').forEach(b => b.addEventListener('click', () => {
    const d = DEBITI.find(x => x.id === b.dataset.editdeb);
    if (d) openDebito(d);
  }));
  g.querySelectorAll('[data-deldeb]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmAsk('Eliminare definitivamente questo debito?');
    if (!ok) return;
    withBusy(b, async () => {
      try {
        await DB.delDebito(b.dataset.deldeb);
        toast('Eliminato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nell\'eliminazione: riprova', 'error');
      }
    });
  }));
}

// ---------- Obiettivi ----------
function cardObiettivo(o) {
  const versato = Number(o.versato), target = Number(o.target);
  const pct = Math.min(100, Math.round(versato / target * 100));
  const raggiunto = versato >= target;
  let proiezione = '';
  if (!raggiunto && o.rata_mensile != null && Number(o.rata_mensile) > 0) {
    const mesi = Math.ceil((target - versato) / Number(o.rata_mensile));
    proiezione = `<div class="stat-sub">al ritmo di <span class="num amount">${fmtEUR.format(o.rata_mensile)}</span>/mese \u00b7 traguardo \u2248 ${dataIT(addMesi(oggiISO(), mesi))}</div>`;
  }
  const badge = raggiunto ? '<span class="badge green">raggiunto</span>' : '';
  return `
    <div class="stat-card">
      <div class="bene-head">
        <div class="stat-label">${esc(o.nome)}</div>
        <div class="bene-actions">
          <button class="btn btn-ghost btn-sm" data-versa="${o.id}" title="Versa">+</button>
          <button class="btn btn-ghost btn-sm" data-editob="${o.id}" title="Modifica">\u270e</button>
          <button class="btn btn-ghost btn-sm" data-delob="${o.id}" title="Elimina">\u2715</button>
        </div>
      </div>
      <div class="stat-card-val stat-accent amount">${fmtEUR.format(versato)}</div>
      <div class="prog"><div class="prog-fill" style="width:${pct}%"></div></div>
      <div class="stat-sub">${fmtNum.format(pct)}% di <span class="num amount">${fmtEUR.format(target)}</span> ${badge}</div>
      ${proiezione}
    </div>`;
}

function renderObiettivi() {
  const versatoTot = accantonatoTotale();
  const targetTot = OBIETTIVI.reduce((s, o) => s + Number(o.target), 0);
  const pctAll = targetTot > 0 ? Math.min(100, Math.round(versatoTot / targetTot * 100)) : 0;

  $('#ob-stat-versato').textContent = fmtEUR.format(versatoTot);
  $('#ob-stat-versato-sub').textContent = OBIETTIVI.length + ' obiettivi';
  $('#ob-stat-target').textContent = fmtEUR.format(targetTot);
  $('#ob-stat-target-sub').textContent = fmtNum.format(pctAll) + '% completato';

  const g = $('#obiettivi-grid');
  g.innerHTML = OBIETTIVI.length
    ? OBIETTIVI.map(cardObiettivo).join('')
    : '<div class="empty">Nessun obiettivo: crea un fondo emergenza o un PAC con "+ Nuovo obiettivo"</div>';

  g.querySelectorAll('[data-versa]').forEach(b => b.addEventListener('click', () => {
    const o = OBIETTIVI.find(x => x.id === b.dataset.versa);
    if (o) openVersa(o);
  }));
  g.querySelectorAll('[data-editob]').forEach(b => b.addEventListener('click', () => {
    const o = OBIETTIVI.find(x => x.id === b.dataset.editob);
    if (o) openObiettivo(o);
  }));
  g.querySelectorAll('[data-delob]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmAsk('Eliminare definitivamente questo obiettivo?');
    if (!ok) return;
    withBusy(b, async () => {
      try {
        await DB.delObiettivo(b.dataset.delob);
        toast('Eliminato', 'success');
        await refresh();
      } catch (err) {
        console.error(err);
        toast('Errore nell\'eliminazione: riprova', 'error');
      }
    });
  }));
}

// ---------- Render ----------
function renderDashboard() {
  $('#hero-saldo').textContent = fmtEUR.format(saldoTotale());

  const attivi = BENI.filter(b => !b.venduto);
  const accantonato = accantonatoTotale();
  const heroPat = $('#hero-patrimonio');
  if (attivi.length || accantonato > 0) {
    const totale = saldoTotale()
      + attivi.reduce((s, b) => s + Number(b.valore_stimato), 0)
      + accantonato;
    heroPat.innerHTML = `Patrimonio complessivo: <span class="num amount">${fmtEUR.format(totale)}</span>`;
    heroPat.hidden = false;
  } else {
    heroPat.hidden = true;
  }

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
