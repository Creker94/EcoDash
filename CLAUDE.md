# CLAUDE.md — EcoDash · Passaporto del progetto

Istruzioni operative per lavorare su questo progetto. **La fonte di verità per il design è `docs/STYLE_GUIDE.md`**: leggere quella e questo file per intero prima di toccare codice o UI.

## Stato — aggiornato al 26/07/2026

- **Roadmap completata: tutte e 6 le fasi sono in produzione** su https://ecodash-app.netlify.app, più la **Fase 5.1** (periodicità e prossima rata sui debiti)
- Ogni push su `main` va online automaticamente (statico, nessun build step)
- Connettori necessari per operare: **GitHub** (`Creker94/EcoDash`), **Supabase** (ref `zznyhifatcpctkpeubtj`), **Netlify** (progetto `ecodash-app`, siteId `1aef73da-701a-4e01-9472-723d9988ce99`)
- Lo schema DB si modifica **solo via migrazioni Supabase** (`apply_migration`), mai a mano
- **Dati reali caricati**: conto Banco BPM, 5 debiti (2 mutui BPM, 2 rateazioni Agenzia Entrate, 1 privato), 1 scadenza annuale (premio assicurativo). Il `saldo_iniziale` del conto è ancora a 0: va impostato al saldo reale, altrimenti hero e grafici partono sbagliati.
- Prossime evoluzioni candidate: in fondo a questo file

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
- `debiti` — importo_iniziale, residuo, tasso (per avalanche), rata, **periodicita** (mensile→annuale), **prossima_rata** (date), **quota_capitale** (se valorizzata, il residuo scende solo di quella; il movimento resta l'intera rata — corretto per i mutui), estinto
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
11. **Safe area su ogni colonna che tocca il bordo**: `.main`, `.sidebar` e gli overlay hanno `env(safe-area-inset-top/bottom)` nel padding; la striscia fissa a z 900 (`body::before`) copre la Dynamic Island sopra il contenuto ma non sopra il rail

## Convenzioni

- Nomi tabelle/colonne DB: italiano, snake_case
- Componente-firma: **saldo hero a display**; sotto, riga "Patrimonio complessivo" (liquidità + beni + accantonato)
- Modalità riservata: `body.privacy` → `blur(6px)` su `.amount` (anche tooltip grafici)
- Grafici: **SVG vanilla in `js/charts.js`** (niente librerie), regole in STYLE_GUIDE §9
- Stati data (`statoData`, unica fonte per scadenze e rate): Scaduta = rosso · In arrivo (≤30 gg) = arancio `#f59e0b` · Programmata = `--blue`
- `addMesi` è **ancorata a fine mese**: se la data di partenza è l'ultimo giorno del mese, il risultato resta l'ultimo giorno (31/07 → 31/08 → 30/09 → 31/10). Senza questa regola le rate del 31 scivolavano al 30 e non risalivano più.
- Debiti: ordinamento **avalanche** (tasso desc) o **snowball** (residuo asc); badge "priorità" arancio sul primo attivo; barra `.prog` = % rimborsato in accent
- Debiti con rata non mensile: la card "Impegno · mese" usa `rataMensileEquiv()` (rata ÷ mesi di periodicità), così una trimestrale non viene contata come mensile. Registrare la rata scala `quota_capitale` **e** fa avanzare `prossima_rata` di `MESI_RIC[periodicita]`.
- Dashboard "Prossimi impegni" = scadenze **+** rate dei debiti (`prossimiImpegni()`), ordinate per data, le rate con badge accent. Le rate NON stanno anche in `scadenze`: duplicarle significherebbe registrare due volte lo stesso movimento.
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
   - ✅ 5.1 — periodicità, prossima rata che avanza, piano di rientro stimato, impegni in dashboard
6. ✅ Obiettivi e PAC — versamenti, proiezioni (Fase 6)

**Roadmap completata.** Prossime evoluzioni candidate, in ordine di valore stimato:

1. **Trasferimenti tra conti** (oggi un giroconto richiede due movimenti manuali)
2. **Service worker + offline** seguendo le regole §8 della guida (cache solo `res.ok`, bump versione+cache insieme, barra aggiornamento a z 6000)
3. **Piano di ammortamento reale** per i mutui (tabella `rate`): oggi `quota_capitale` è fissa, mentre nei mutui cresce ogni mese — le "rate residue" sono quindi una stima per eccesso
4. **Storico valutazioni beni** (tabella `beni_valori`) per il grafico del patrimonio nel tempo
5. **Export dati** (CSV) — ricordare la regola §8.5: le scritture su DB si completano prima, l'export è sempre l'ultima operazione
6. **Icone PWA** nel manifest + notifiche per le scadenze in arrivo
7. Modifica movimenti e scadenze esistenti (oggi solo elimina/ricrea)
