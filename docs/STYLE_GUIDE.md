# Guida di stile — derivata da GoldGest v2.347

> Punto di partenza per EcoDash (dashboard gestione economica familiare/personale). Tutti i valori sono **estratti direttamente da `public/css/style.css` e `index.html` della v2.347** — nessun valore inventato. Le uniche parti "proposte" sono gli adattamenti al dominio finanziario, marcati 🔶.

---

## 1. Filosofia di design

1. **Dark-first.** Tema scuro default, tema chiaro alternativo (`body.light`). Niente nero puro come superficie: il nero `#000` compare solo come testo/glifo sopra l'oro.
2. **Un solo accento: l'oro.** `--accent` è l'identità; tutto il resto è neutro o semantico. Regola di linguaggio: **oro → testo/glifo nero** (bottoni primari, chip attive).
3. **Mobile-first, PWA-first.** Progettata per iPhone in standalone; tablet e desktop sono adattamenti (sidebar "sospesa", più respiro).
4. **Numeri "da gestionale serio".** Tutti gli importi e i contatori in **JetBrains Mono con cifre tabulari**: le colonne non "ballano". In un'app finanziaria è la regola più importante.
5. **Il colore comunica lo stato** (badge tinta scura + testo colore pieno), ma mai da solo: sempre con testo o segno.
6. **Un componente-firma legato al dominio.** In GoldGest è `.targa` (targa italiana fedele, banda blu UE, bianca in entrambi i temi). In EcoDash 🔶 è il **saldo hero come display a segmenti** (pannello inset + numero mono oro).
7. **Zero azioni ambigue.** Ogni scrittura è protetta da anti doppio-tap (`withBusy`), dà feedback via toast e usa lo stesso verbo dall'inizio alla fine.

---

## 2. Token colore (reali, v2.347)

```css
:root {
  /* ===== Tema scuro (default) ===== */
  --bg: #0f0f0f;
  --surface: #181818;
  --surface2: #222222;   /* input, chip, righe in rilievo */
  --border: #2e2e2e;
  --accent: #e8c547;     /* oro — identità */
  --accent2: #c9a227;    /* oro profondo — hover del primario */
  --accent-weak: rgba(232,197,71,.16); /* fondi tinta oro */
  --text: #f0ede8;
  --muted: #9a9a9a;      /* era #888: alzato in v2.300, ~4.3:1 era al limite sui 12-13px */
  --red: #e05a5a;
  --green: #5acd8a;
  --blue: #5a9fe0;
  --radius: 12px;
}

/* ===== Tema chiaro ===== */
body.light {
  --bg: #f4f1ea;         /* carta calda, non bianco */
  --surface: #ffffff;
  --surface2: #ece8df;
  --border: #dcd7cc;
  --accent: #b8941f;     /* l'oro si scurisce per il contrasto */
  --accent2: #9c7d18;
  --accent-weak: #f3ecda;
  --text: #1f1d18;
  --muted: #6f6a60;
  --red: #c0392b;
  --green: #1f8a4c;
  --blue: #2563c0;
}
```

Colori fuori variabile ma canonici: arancione `#f59e0b` (stato "scadenze/da incassare") e grigio `#9ca3af` (stato "archiviato"/neutro).

### Fondi badge (tinta scura del colore, testo nel colore pieno)

| Badge | Scuro | Chiaro |
|---|---|---|
| green | `#1a3326` | `#e3f4ea` |
| yellow (oro) | `#2d2610` | `#f6efd2` |
| red | `#2a1515` | `#fbe3e0` |
| blue | `#152030` | `#e1ecfb` |
| orange | `#2d1f10` | `#fdeed7` |
| grey | `#26262a` | `#ececef` |

### Mappatura per la dashboard finanziaria 🔶

| Concetto | Colore |
|---|---|
| Entrate / positivo | `--green` (classe `.pos`, già nel linguaggio GoldGest) |
| Uscite / negativo | `--red` (classe `.neg`) |
| Risparmio / patrimonio / obiettivi | `--accent` — il dato "prezioso" |
| Budget in esaurimento / scadenze | `#f59e0b` |
| Ricorrenti / previsti (rate, abbonamenti) | `--blue` |
| Mesi chiusi / archiviato | `#9ca3af` |

---

## 3. Tipografia (stack v2.256+)

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

| Font | Ruolo | Dove |
|---|---|---|
| **Space Grotesk** | display | titoli pagina (28px, w800, ls −0.5px), titoli modale (20px, w700), logo, pill contatore |
| **Inter** | testo e UI | body, bottoni, form, tabelle (13–14px) |
| **JetBrains Mono** | numeri e codici | importi, contatori hero, date (w700, tabular) |

Scala di riferimento: 10–11 (label uppercase, letter-spacing 1.5–2px, muted) · 12–13 (tabelle, badge) · 13–14 (UI) · 20 (titolo modale) · 28 (titolo pagina e valore card statistica).

### Numeri e denaro (regola centrale)

```css
/* v2.86 — cifre tabulari ovunque ci siano numeri incolonnati */
.stat-card-val, .num, .col-num, .badge, td.importo {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
/* v2.151 — contatori e importi in evidenza */
.hero-num, .stat-card-val {
  font-family: 'JetBrains Mono', sans-serif;
  font-weight: 700;
  letter-spacing: 0;
}
.pos { color: var(--green); }
.neg { color: var(--red); }
```

- Formattazione con **una sola utility** condivisa (lezione GoldGest: mai parser/formatter monetari duplicati):

```js
const fmtEUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
```

- Segno + colore insieme: `+120,00 €` verde, `−45,90 €` rosso.
- 🔶 **Modalità riservata** — toggle che applica `filter: blur(6px)` a `.amount` per usare l'app in pubblico.

---

## 4. Layout e ritmo

- **Ritmo 12/18** (v2.314): gap tra card `12px`, margini di sezione `18px`. Padding card `20px`, padding contenuto desktop `32px 28px`, mobile `10px`.
- **Famiglia dei raggi:** card/nav `12` (`--radius`) · badge/bottoni/input `8` · toast `10` · modale `16` · sidebar sospesa `24`.
- **Breakpoint:** ≤640 mobile (drawer/rail, `html,body{overflow-x:clip}`) · 641–1024 tablet · >1024 desktop. Contenuto `max-width: 1400px` centrato.
- **Griglia statistiche:** `repeat(auto-fit, minmax(220px, 1fr))`.
- **Sidebar** 212px fissa; da 641px in su diventa **pannello sospeso**: staccato 10px dai bordi, raggio 24, `box-shadow: 0 10px 30px rgba(0,0,0,.35)` (chiaro: `rgba(31,29,24,.10)`). Altezza esplicita in `dvh`, **mai ancoraggio top+bottom** (quirk WebKit).
- **Nav a chip** (v2.320): icona in un quadratino arrotondato (28px, raggio 9) su `--surface2`; voce attiva → chip **oro con glifo nero**. Niente barrette laterali: lo stato lo racconta la chip.
- **Scrollbar custom:** 6px, thumb `--border` raggio 3.
- **Transizione cambio tema:** `background-color .25s, color .25s, border-color .25s` sugli elementi tematizzati.

---

## 5. Scala z-index (unica fonte, in cima al CSS)

| Livello | Uso |
|---|---|
| 0–200 | layout (sticky, sidebar, badge, testate) |
| 900 | copertura safe-area / Dynamic Island |
| 1000 | `.modal-overlay` |
| 4000 | dialoghi di conferma |
| 6000 | barra "aggiornamento disponibile" (SOPRA le modali: sempre tappabile) |
| 9000 | stato sync |
| 9500 | `#toast` |
| 9999 | overlay di login (copre TUTTO, toast compresi) |

**Un livello nuovo? Va inserito qui, non inventato sul posto.**

---

## 6. Componenti

**Card statistica** — `--surface`, bordo 1px `--border`, raggio 12, padding 20. Struttura: label 11px uppercase muted → valore 28px JetBrains Mono 700 tabular → sottotitolo 12px muted. Colore del valore = semantica (`.stat-green`, `.stat-red`, oro…).

**Badge** — raggio 8 ("in famiglia con le card"), padding 3px 10px, 11px w500, fondo tinta + testo colore pieno (tabelle §2).

**Bottoni**

- Primario: `--accent` + testo `#000`, hover → `--accent2`. `min-height: 44px`.
- Ghost: `--surface2` + bordo `--border`; hover → bordo e testo oro.
- Danger: fondo tinta rossa scura `#2a1515`, testo `--red`, bordo `#3d1f1f` (non rosso pieno).
- `@media (pointer:coarse) { .btn:not(.btn-sm){ min-height:44px } }` — target 44pt su touch.
- `:disabled { opacity:.55 }`.

**Form** — input/select/textarea: `--surface2`, bordo `--border`, raggio 8, padding 10px 12px, 13px Inter; focus → bordo oro. Griglia `form-grid` 2 colonne gap 14 (1 colonna su mobile); `form-actions` allineate a destra con divisore sopra (mobile: colonna invertita, primario in basso vicino al pollice).

**Tabelle** — 13px; le tabelle larghe scorrono **dentro** `.table-wrap` (`overflow-x:auto` + `-webkit-overflow-scrolling:touch`), mai spingono in fuori il layout. Colonne numeriche a destra, tabular.

**Modale** — overlay `rgba(0,0,0,.7)` + `backdrop-filter: blur(4px)`, `touch-action:none`; corpo raggio 16, padding 28, `max-width:600px`, `max-height:90vh`, animazione `translateY(20px)→0` in .2s, `overscroll-behavior:contain`.

**Toast** — fisso in basso a destra (24/24), `--surface` + bordo, raggio 10, 13px; nascosto `translateY(80px)+opacity:0`, `.show` visibile; success/error = bordo verde/rosso. **`pointer-events:none` sempre** (è solo informativo — e da nascosto non deve mai bloccare i tap: bug vissuto su iOS).

**Skeleton** — sagome neutre al caricamento, sostituite dai dati reali (niente spinner a pagina intera).

---

## 7. Interazione e feedback

- **`withBusy(btn, fn)` obbligatorio** su ogni azione che scrive: disabilita, spinner, riabilita. Su GoldGest la sua assenza ha prodotto fatture duplicate da doppio tap; qui produrrebbe movimenti duplicati.
- **Hover solo dove esiste**: `@media (hover:none)` azzera gli effetti hover delle card; al tocco si usa il **press-state** `:active { transform: scale(.97) }`.
- Focus tastiera: `:focus-visible { outline:2px solid var(--accent); outline-offset:2px }` (non tocca mouse/tocco).
- Feedback coerente: "Salva" → toast "Salvato". Gli errori dicono cosa è successo e cosa fare.
- Date: **una sola** utility `oggiISO()` in ora locale — mai `toISOString().slice(0,10)` sparso (bug fusi orari).
- 🔶 Consigliato in più: rispettare `prefers-reduced-motion`.

---

## 8. Regole iOS / PWA (lezioni sul campo)

1. `overflow-x: clip` (non `hidden`) su `html,body` mobile: non rompe `position:sticky` interni.
2. Viewport GoldGest: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover` — è questo che permette input a 13px senza zoom iOS. Se nel nuovo progetto si vuole lasciare lo zoom utente, gli input devono salire a **16px**.
3. `theme-color` allineato a `--bg` (`#0f0f0f`); aggiornarlo via JS al cambio tema.
4. Safe area ovunque conti: `padding-top: calc(X + env(safe-area-inset-top))` su sidebar/main, idem bottom sulle barre.
5. **Context suspension**: quando la PWA apre share sheet / download / va in background, i fetch in corso possono morire → le scritture su DB si completano **prima**, l'export/download è sempre l'ultima operazione.
6. Service worker: cache **solo se `res.ok`** (mai cachare errori); a ogni release bump versione app + nome cache; barra "aggiornamento disponibile" a z-index 6000, sopra tutto il resto tranne login.
7. Altezze: `100dvh` accanto a `100vh` come fallback.

---

## 9. Grafici (proposta per la dashboard) 🔶

- Sfondo = `--surface`, griglia = `--border`, label = `--muted` Inter 11–12px, valori in JetBrains Mono tabular.
- Serie principale (saldo/patrimonio): **oro**. Entrate/uscite: `--green` / `--red`. Max 5–6 colori, poi "Altro" grigio.
- Tooltip = mini-card (`--surface2`, bordo, raggio 8).
- Barre con raggio 4 in cima; niente gradienti decorativi né 3D.

---

## 10. Cosa NON fare

- ❌ `#000` / `#fff` come sfondi (il nero è riservato al testo su oro).
- ❌ Oro `#e8c547` su tema chiaro: lì l'accento è `#b8941f`.
- ❌ Testo bianco sui bottoni oro.
- ❌ Due formatter monetari, due utility data.
- ❌ Numeri incolonnati senza `tabular-nums`.
- ❌ Colore come unico portatore di significato.
- ❌ `z-index` inventati fuori dalla scala documentata.
- ❌ Hover come unico affordance; overlay nascosti senza `pointer-events:none`.
- ❌ Scritture senza `withBusy`; distruttive senza conferma.

---

## 11. Checklist qualità (pre-release)

- [ ] Provato su iPhone in PWA standalone, tema scuro **e** chiaro
- [ ] Target touch ≥ 44px; `:focus-visible` visibile ovunque
- [ ] Doppio tap rapido su ogni "Salva" → un solo record
- [ ] Tutti gli importi da `fmtEUR`, tutti incolonnati tabular
- [ ] Contrasto ≥ 4.5:1 (attenzione a `--muted` sui 12px e all'oro su chiaro)
- [ ] Nessuno scroll orizzontale della pagina (le tabelle scorrono nei loro wrap)
- [ ] Versione app + cache SW aggiornate insieme
