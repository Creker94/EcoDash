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

- `conti` — nome, tipo, saldo_iniziale, archiviato
- `categorie` — nome, tipo (entrata/uscita), colore
- `movimenti` — conto_id, categoria_id, **importo numeric(12,2) con segno** (entrate +, uscite −), descrizione, data, note
- `scadenze` — modello "prossima occorrenza": la registrazione crea un movimento e fa avanzare la data (o archivia se una tantum)
- `beni` — valore_stimato, prezzo_acquisto (delta), venduto (grigio, fuori dai totali)
- `debiti` — importo_iniziale, residuo, tasso (per avalanche), rata, **quota_capitale** (se valorizzata, il residuo scende solo di quella; il movimento resta l'intera rata — corretto per i mutui), estinto
- `obiettivi` — target, versato, rata_mensile (per la proiezione), conto_id preferito, archiviato
- Tutte con `user_id default auth.uid()` + policy RLS `user_id = auth.uid()`

## Regole non negoziabili (lezioni GoldGest)

1. **Un solo formatter monetario** `fmtEUR` in `js/utils.js` — mai duplicarlo (`fmtNum` è solo per tick di scala e percentuali, non è monetario)
2. **Una sola casa per le utility data** in `js/utils.js`: `oggiISO()`, `addMesi()`, `dataIT()` — mai `toISOString().slice(0,10)`
3. **`withBusy(btn, fn)` su ogni scrittura** — anti doppio-tap, previene record duplicati
4. **Cifre tabulari** su ogni numero incolonnato
5. **z-index solo dalla scala** documentata in `docs/STYLE_GUIDE.md` §5 — mai inventati
6. Colore mai unico portatore di significato: sempre segno/testo accanto
7. Azioni distruttive o che scrivono da una riga → sempre conferma (`confirmAsk(msg, okLabel, okDanger)`); feedback via toast, stesso verbo dall'inizio alla fine ("Salva" → "Salvato", "Registra" → "Registrata", "Versa" → "Versato")
8. Toast sempre `pointer-events:none`; hover solo dentro `@media (hover:hover)`
9. **Identità Estoril Blue**: accent `#3d7dd8` su tema scuro (glifo NERO sull'accent), `#1f5cb0` su tema chiaro (glifo BIANCO sull'accent). Mai invertire i glifi tra i temi.
10. Mai `#000`/`#fff` come sfondi

## Convenzioni

- Nomi tabelle/colonne DB: italiano, snake_case
- Componente-firma: **saldo hero a display**; sotto, riga "Patrimonio complessivo" (liquidità + beni + accantonato)
- Modalità riservata: `body.privacy` → `blur(6px)` su `.amount` (anche tooltip grafici)
- Grafici: **SVG vanilla in `js/charts.js`** (niente librerie), regole in STYLE_GUIDE §9
- Stati scadenze: Scaduta = rosso · In arrivo (≤30 gg) = arancio `#f59e0b` · Programmata = `--blue`
- Debiti: ordinamento **avalanche** (tasso desc) o **snowball** (residuo asc); badge "priorità" arancio sul primo attivo; barra `.prog` = % rimborsato in accent
- Obiettivi: "Versa" crea movimento in uscita dal conto + incrementa `versato` (liquidità ↓, accantonato ↑, patrimonio coerente); proiezione traguardo da `rata_mensile` via `addMesi`
- Chiavi in `js/config.js`: URL + publishable key (sicure lato client: la protezione è la RLS)
- Testo utente in `innerHTML` sempre passato da `esc()`
- `--blue` semantico ≠ accent: se in uso diventa ambiguo, valutare colore alternativo (STYLE_GUIDE §2)

## Roadmap moduli

1. ✅ Conti + Movimenti (Fase 1)
2. ✅ Dashboard con grafici (Fase 2)
3. ✅ Scadenze e ricorrenti (Fase 3)
4. ✅ Patrimonio (Fase 4)
5. ✅ Debiti — avalanche/snowball, rata con quota capitale (Fase 5)
6. ✅ Obiettivi e PAC — versamenti, proiezioni (Fase 6)

**Roadmap completata.** Prossime evoluzioni candidate: trasferimenti tra conti, service worker + offline (regole §8), storico valutazioni beni, export dati, notifiche scadenze.
