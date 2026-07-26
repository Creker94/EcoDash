# CLAUDE.md — EcoDash

Istruzioni operative per lavorare su questo progetto. **La fonte di verità per il design è `docs/STYLE_GUIDE.md`**: leggerla prima di toccare la UI.

## Cos'è

Dashboard PWA (mobile-first, iPhone standalone) per la gestione finanziaria personale di un singolo utente. Lingua UI: italiano. Valuta: EUR (formato it-IT).

## Stack e infrastruttura

- Frontend: vanilla HTML/CSS/JS, nessun framework, nessun build step
- Backend: Supabase — progetto **EcoDash**, ref `zznyhifatcpctkpeubtj`, regione `eu-central-1`
- Auth: Supabase Auth (email + password), RLS attiva su tutte le tabelle
- Repo: `Creker94/EcoDash` (pubblico) · Deploy: Netlify — https://ecodash-app.netlify.app (auto-deploy da `main`)

## Schema DB (via migrazioni Supabase)

- `conti` — nome, tipo (corrente/risparmio/contanti/carta/investimento), saldo_iniziale, archiviato
- `categorie` — nome, tipo (entrata/uscita), colore
- `movimenti` — conto_id, categoria_id, **importo numeric(12,2) con segno** (entrate +, uscite −), descrizione, data (`date`), note
- `scadenze` — nome, importo con segno, data_scadenza, ricorrenza (nessuna/mensile/bimestrale/trimestrale/semestrale/annuale), conto_id, categoria_id, archiviata. **Modello "prossima occorrenza"**: la registrazione crea un movimento e fa avanzare la data (o archivia se una tantum)
- Tutte con `user_id default auth.uid()` + policy RLS `user_id = auth.uid()`

## Regole non negoziabili (lezioni GoldGest)

1. **Un solo formatter monetario** `fmtEUR` in `js/utils.js` — mai duplicarlo (`fmtNum` è solo per i tick di scala dei grafici, non è monetario)
2. **Una sola casa per le utility data** in `js/utils.js`: `oggiISO()`, `addMesi()`, `dataIT()` — mai `toISOString().slice(0,10)`
3. **`withBusy(btn, fn)` su ogni scrittura** — anti doppio-tap, previene record duplicati
4. **Cifre tabulari** su ogni numero incolonnato
5. **z-index solo dalla scala** documentata in `docs/STYLE_GUIDE.md` §5 — mai inventati
6. Colore mai unico portatore di significato: sempre segno/testo accanto
7. Azioni distruttive o che scrivono da una riga → sempre conferma (`confirmAsk(msg, okLabel, okDanger)`); feedback via toast, stesso verbo dall'inizio alla fine ("Salva" → "Salvato", "Registra" → "Registrata")
8. Toast sempre `pointer-events:none`; hover solo dentro `@media (hover:hover)`
9. **Identità Estoril Blue**: accent `#3d7dd8` su tema scuro (glifo NERO sull'accent), `#1f5cb0` su tema chiaro (glifo BIANCO sull'accent). Mai invertire i glifi tra i temi.
10. Mai `#000`/`#fff` come sfondi

## Convenzioni

- Nomi tabelle/colonne DB: italiano, snake_case
- Componente-firma: **saldo hero a display** (pannello `--surface2` con ombra inset + numero JetBrains Mono Estoril con glow)
- Modalità riservata: `body.privacy` → `blur(6px)` su `.amount` (vale anche per i valori nei tooltip dei grafici)
- Grafici: **SVG vanilla in `js/charts.js`** (niente librerie), regole in STYLE_GUIDE §9
- Stati scadenze: Scaduta = rosso · In arrivo (≤30 gg) = arancio `#f59e0b` · Programmata = `--blue`
- Chiavi in `js/config.js`: URL + publishable key (sicure lato client: la protezione è la RLS)
- Testo utente in `innerHTML` sempre passato da `esc()`
- `--blue` semantico (ricorrenti/programmate) ≠ accent: se in uso diventa ambiguo, valutare colore alternativo (vedi nota in STYLE_GUIDE §2)

## Roadmap moduli

1. ✅ Conti + Movimenti (Fase 1)
2. ✅ Dashboard con grafici — andamento saldo, entrate/uscite 6 mesi, uscite per categoria (Fase 2)
3. ✅ Scadenze e ricorrenti — stati colorati, registrazione con avanzamento automatico (Fase 3)
4. Patrimonio (beni: orologi, ecc.)
5. Debiti e piani di rientro
6. PAC e obiettivi
