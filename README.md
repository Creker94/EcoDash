# EcoDash

Dashboard PWA per la gestione finanziaria personale: entrate, uscite, scadenze fiscali (IMU, TARI, INPS, cedolare secca), patrimonio (conti e beni), debiti, piani di accumulo e obiettivi.

## Stack

- **Frontend**: PWA vanilla — HTML, CSS, JavaScript (nessun framework, nessun build step)
- **Backend**: Supabase (Postgres + Auth, RLS attiva su tutte le tabelle)
- **Deploy**: Netlify (statico)
- **Design**: [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) — derivata da GoldGest v2.347

## Struttura

```
├── index.html            # shell dell'app (login, nav, viste, modali)
├── css/style.css         # design system + componenti
├── js/
│   ├── config.js         # endpoint Supabase
│   ├── utils.js          # fmtEUR, oggiISO, withBusy, toast (UNICHE utility)
│   ├── db.js             # client Supabase + accesso dati
│   └── app.js            # bootstrap, auth, viste
├── manifest.webmanifest  # PWA
├── docs/STYLE_GUIDE.md   # guida di stile (fonte di verità)
└── CLAUDE.md             # istruzioni operative per Claude
```

## Moduli (roadmap)

1. **Conti + Movimenti** ← *Fase 1, in corso*
2. **Dashboard** — saldo hero, entrate/uscite mese, grafico andamento
3. **Scadenze e ricorrenti** — IMU, TARI, INPS, cedolare, rate, abbonamenti
4. **Patrimonio** — conti + beni (orologi, ecc.)
5. **Debiti** — piani di rientro e prioritizzazione
6. **PAC e obiettivi** — versamenti programmati, proiezioni
