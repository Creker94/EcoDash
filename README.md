# EcoDash

Dashboard PWA per la gestione finanziaria personale: entrate, uscite, scadenze fiscali (IMU, TARI, INPS, cedolare secca), patrimonio (conti, orologi e beni), debiti con prioritizzazione e piani di accumulo.

**App live**: https://ecodash-app.netlify.app · PWA installabile da Safari (Condividi → Aggiungi a schermata Home)

## Stack

- **Frontend**: PWA vanilla — HTML, CSS, JavaScript (nessun framework, nessun build step)
- **Backend**: Supabase (Postgres + Auth, RLS attiva su tutte le tabelle)
- **Deploy**: Netlify — auto-deploy da `main`
- **Design**: [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) — derivata da GoldGest v2.347, identità **Estoril Blue**
- **Grafici**: SVG vanilla ([js/charts.js](js/charts.js)), zero librerie

## Struttura

```
├── index.html            # shell dell'app (login, nav, viste, modali)
├── css/style.css         # design system + componenti
├── js/
│   ├── config.js         # endpoint Supabase
│   ├── utils.js          # fmtEUR, oggiISO, addMesi, withBusy, toast (UNICHE utility)
│   ├── db.js             # client Supabase + accesso dati
│   ├── charts.js         # grafici SVG (linea, barre, barre orizzontali, tooltip)
│   └── app.js            # bootstrap, auth, viste
├── manifest.webmanifest  # PWA
├── docs/STYLE_GUIDE.md   # guida di stile (fonte di verità)
└── CLAUDE.md             # passaporto operativo del progetto
```

## Moduli — roadmap completata

1. ✅ **Conti + Movimenti** — entrate/uscite con segno, categorie precaricate
2. ✅ **Dashboard** — saldo hero a display (componente-firma), andamento saldo 3 mesi, entrate/uscite 6 mesi, uscite per categoria
3. ✅ **Scadenze e ricorrenti** — stati colorati (scaduta/in arrivo/programmata), registrazione con avanzamento automatico della ricorrenza
4. ✅ **Patrimonio** — beni con valore stimato, delta su prezzo d'acquisto, stato venduto
5. ✅ **Debiti** — prioritizzazione avalanche/snowball, rata con quota capitale, avanzamento rimborso
6. ✅ **Obiettivi e PAC** — versamenti dal conto, proiezione del traguardo

Funzioni trasversali: tema scuro/chiaro, **modalità riservata** (blur sugli importi), anti doppio-tap su ogni scrittura, conferme sulle azioni distruttive.

## Sviluppo

Per riprendere lo sviluppo: leggere **[CLAUDE.md](CLAUDE.md)** (passaporto operativo: infrastruttura, regole, convenzioni, stato) e **[docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md)** prima di toccare qualsiasi cosa.
