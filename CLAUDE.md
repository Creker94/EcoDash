# CLAUDE.md — EcoDash · Passaporto del progetto

Istruzioni operative per lavorare su questo progetto. **La fonte di verità per il design è `docs/STYLE_GUIDE.md`**: leggere quella e questo file per intero prima di toccare codice o UI.

## Stato — aggiornato al 26/07/2026

- **Roadmap completata: tutte e 6 le fasi sono in produzione** su https://ecodash-app.netlify.app, più la **5.1** (periodicità e prossima rata sui debiti) e la **5.2** (ricorrenze ancorate a un giorno fisso)
- Ogni push su `main` va online automaticamente (statico, nessun build step)
- Connettori necessari per operare: **GitHub** (`Creker94/EcoDash`), **Supabase** (ref `zznyhifatcpctkpeubtj`), **Netlify** (progetto `ecodash-app`, siteId `1aef73da-701a-4e01-9472-723d9988ce99`)
- Lo schema DB si modifica **solo via migrazioni Supabase** (`apply_migration`), mai a mano

### Dati reali caricati

**Conto**: Banco BPM c/c 00227227. ⚠️ Il `saldo_iniziale` è ancora **0**: va impostato al saldo reale, altrimenti hero, grafico andamento e patrimonio partono sbagliati. È l'unico dato mancante che rende finti i numeri a schermo.

**Debiti** — residuo totale 161.105,47 €, tutti allineati ai pagamenti al 26/07/2026:

| Debito | Residuo | Rata | Periodicità |
|---|---|---|---|
| Mutuo BPM Privati ordinario n.4944997 | 53.641,84 | 981,67 · 1,76% | mensile, 31 |
| Mutuo BPM Casa n.5315691 | 47.766,15 | 285,46 · 0,98% | mensile, 31 |
| Immobiliare Nano | 42.500,00 | 2.500,00 · senza interessi | mensile, 15, fino al 15/12/2027 |
| Rateazione AdE com. 07/2024 | 11.093,68 | 913,10 · 3,5% | trimestrale, 31 |
| Rateazione AdE avviso 02/2025 (anno 2022) | 6.103,80 | 427,13 · 3,5% | trimestrale, 31 |

Nei mutui le rate sono scese di 2,00 € da maggio 2026 (sparite le spese di incasso): 981,67 e 285,46, non 983,67 e 287,46.

**Scadenze ricorrenti** (10 attive):

| Voce | Importo | Ricorrenza | Equivalente mese |
|---|---|---|---|
| Stipendio | +3.000,00 | mensile, 30 | +3.000,00 |
| Affitto Lavanderia | +1.723,00 | mensile, 15 | +1.723,00 |
| Affitto Locali Via Ariosto | +1.000,00 | mensile, 15 | +1.000,00 |
| Affitto Box | +500,00 | mensile, 30 | +500,00 |
| INPS gestione commercianti | −1.137,50 | trimestrale, ancora 16 | −379,17 |
| Spese condominiali | −2.000,00 | annuale, 1 giugno | −166,67 |
| Bolletta luce | −135,00 | bimestrale, 9 | −67,50 |
| Fastweb · internet | −48,88 | mensile, 5 | −48,88 |
| Premio assicurativo | −433,05 | annuale, 25 marzo | −36,09 |
| TARI | −424,00 | annuale, 31 luglio | −35,33 |

**Quadro mensile equivalente**: entrate 6.223,00 − debiti 4.213,87 − altre uscite ricorrenti 733,64 = **margine +1.275,49 €**, al lordo delle spese variabili e delle imposte non ancora inserite.

**Esclusioni volute — non reinserirle, sarebbe doppio conteggio o rumore:**
- **Gas e acqua**: comprese nelle spese condominiali
- **Carburante**: pagato con carta aziendale, non transita dal conto personale
- **Spese variabili** (spesa, svago, salute): vanno registrate come movimenti, non come scadenze

**Ancora da inserire**: IRPEF sugli affitti (arriverà una dichiarazione dei redditi da cui ricavare le imposte), IMU se dovuta, beni per il patrimonio (orologi).

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
- `scadenze` — modello "prossima occorrenza": la registrazione crea un movimento e fa avanzare la data (o archivia se una tantum). **giorno_ancora** (1–31) = giorno fisso della ricorrenza
- `beni` — valore_stimato, prezzo_acquisto (delta), venduto (grigio, fuori dai totali)
- `debiti` — importo_iniziale, residuo, tasso (per avalanche), rata, **periodicita** (mensile→annuale), **prossima_rata**, **giorno_ancora**, **quota_capitale** (se valorizzata, il residuo scende solo di quella; il movimento resta l'intera rata — corretto per i mutui), estinto
- `obiettivi` — target, versato, rata_mensile (per la proiezione), conto_id preferito, archiviato
- Tutte con `user_id default auth.uid()` + policy RLS `user_id = auth.uid()`

⚠️ Inserendo dati via `execute_sql` (fuori dall'app) `auth.uid()` è NULL: il `user_id` va passato esplicitamente. L'utente è `c60dd1ef-9350-4dce-831a-3e6adeab9129`.

## Regole non negoziabili (lezioni GoldGest)

1. **Un solo formatter monetario** `fmtEUR` in `js/utils.js` — mai duplicarlo (`fmtNum` è solo per tick di scala e percentuali, non è monetario)
2. **Una sola casa per le utility data** in `js/utils.js`: `oggiISO()`, `addMesi()`, `prossimaData()`, `giornoDi()`, `dataIT()` — mai `toISOString().slice(0,10)`
3. **`withBusy(btn, fn)` su ogni scrittura** — anti doppio-tap, previene record duplicati
4. **Cifre tabulari** su ogni numero incolonnato
5. **z-index solo dalla scala** documentata in `docs/STYLE_GUIDE.md` §5 — mai inventati
6. Colore mai unico portatore di significato: sempre segno/testo accanto
7. Azioni distruttive o che scrivono da una riga → sempre conferma (`confirmAsk(msg, okLabel, okDanger)`); feedback via toast, stesso verbo dall'inizio alla fine ("Salva" → "Salvato", "Registra" → "Registrata", "Versa" → "Versato")
8. Toast sempre `pointer-events:none`; hover solo dentro `@media (hover:hover)`
9. **Identità Estoril Blue**: accent `#3d7dd8` su tema scuro (glifo NERO sull'accent), `#1f5cb0` su tema chiaro (glifo BIANCO sull'accent). Mai invertire i glifi tra i temi.
10. Mai `#000`/`#fff` come sfondi
11. **Safe area su ogni colonna che tocca il bordo**: `.main`, `.sidebar` e gli overlay hanno `env(safe-area-inset-top/bottom)` nel padding; la striscia fissa a z 900 (`body::before`) copre la Dynamic Island sopra il contenuto ma non sopra il rail
12. **Le ricorrenze avanzano con `prossimaData(iso, mesi, giorno_ancora)`, mai con `addMesi`.** `addMesi` tronca il giorno al mese di arrivo e passando da febbraio la deriva è permanente (30/01 → 28/02 → 28/03). `addMesi` resta solo per proiezioni una tantum (traguardo obiettivi).

## Convenzioni

- Nomi tabelle/colonne DB: italiano, snake_case
- Componente-firma: **saldo hero a display**; sotto, riga "Patrimonio complessivo" (liquidità + beni + accantonato)
- Modalità riservata: `body.privacy` → `blur(6px)` su `.amount` (anche tooltip grafici)
- Grafici: **SVG vanilla in `js/charts.js`** (niente librerie), regole in STYLE_GUIDE §9
- Stati data (`statoData`, unica fonte per scadenze e rate): Scaduta = rosso · In arrivo (≤30 gg) = arancio `#f59e0b` · Programmata = `--blue`
- `giorno_ancora` si ricava dalla data scelta nel form (`giornoDi`), ma può differire: l'INPS ha scadenza slittata al 20/08 e ancora 16, così le rate successive tornano al 16. In modifica di un debito l'ancora si conserva se la data non è cambiata.
- Debiti: ordinamento **avalanche** (tasso desc) o **snowball** (residuo asc); badge "priorità" arancio sul primo attivo; barra `.prog` = % rimborsato in accent
- Debiti con rata non mensile: la card "Impegno · mese" usa `rataMensileEquiv()` (rata ÷ mesi di periodicità), così una trimestrale non viene contata come mensile. Registrare la rata scala `quota_capitale` **e** fa avanzare `prossima_rata`.
- Dashboard "Prossimi impegni" = scadenze **+** rate dei debiti (`prossimiImpegni()`), ordinate per data, le rate con badge accent. Le rate NON stanno anche in `scadenze`: duplicarle significherebbe registrare due volte lo stesso movimento.
- Obiettivi: "Versa" crea movimento in uscita dal conto + incrementa `versato` (liquidità ↓, accantonato ↑, patrimonio coerente); proiezione traguardo da `rata_mensile`
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
   - ✅ 5.2 — `giorno_ancora` su scadenze e debiti, `prossimaData()` al posto di `addMesi` nelle ricorrenze
6. ✅ Obiettivi e PAC — versamenti, proiezioni (Fase 6)

## Prossimo passo — Fase 7: collegamento bancario (Enable Banking)

Discussa il 26/07/2026, **non ancora avviata**. Il proprietario l'ha già fatta su GoldGest, quindi ha esperienza diretta: **prima di progettare, chiedergli cosa è andato storto lì** (in particolare scadenza del consenso e deduplica).

Due nodi architetturali emersi:

1. **Serve un pezzo lato server.** Enable Banking firma le richieste con un JWT RS256 generato dalla chiave RSA privata dell'applicazione (TTL max 24 h) e quel token non va mai esposto al client: identifica l'applicazione e dà accesso a tutte le sue sessioni. La chiave NON può stare in `js/config.js`. Casa giusta: **Supabase Edge Function**, chiave nei secret del progetto. Il piano "Restricted Production" è gratuito ma solo sui conti che l'utente collega in prima persona — che è esattamente questo caso.
2. **Doppio conteggio.** Oggi il ✓ su scadenze e debiti *crea* il movimento; se anche la banca importa la stessa operazione, ogni rata compare due volte. Direzione proposta: la banca diventa fonte di verità, `movimenti` prende `fonte` (manuale/banca) e `external_id` univoco per la deduplica, `conti` prende IBAN e id esterno, e il ✓ diventa **"concilia"** — propone il movimento importato che corrisponde per importo e finestra di date, l'utente conferma, la scadenza avanza e il residuo scala.

Da mettere in conto: rinnovo SCA del consenso ogni pochi mesi (l'app deve mostrare "consenso scaduto", non fallire in silenzio), storico bancario tipicamente limitato a ~90 giorni, copertura di Banco BPM da verificare.

**Primo passo concreto**: solo sandbox, una Edge Function che elenca gli ASPSP italiani e conferma la presenza di Banco BPM. Nessuna migrazione di schema prima di quella verifica.

### Altre evoluzioni candidate

1. **Modulo fiscale** dalla dichiarazione dei redditi: IRPEF sugli affitti, acconti e saldo, con le scadenze di giugno/luglio e novembre
2. **Trasferimenti tra conti** (oggi un giroconto richiede due movimenti manuali)
3. **Service worker + offline** seguendo le regole §8 della guida (cache solo `res.ok`, bump versione+cache insieme, barra aggiornamento a z 6000)
4. **Piano di ammortamento reale** per i mutui (tabella `rate`): oggi `quota_capitale` è fissa, mentre nei mutui cresce ogni mese — le "rate residue" sono quindi una stima per eccesso (mutuo privati: 60 stimate contro 57 reali)
5. **Slittamento ai giorni lavorativi** per le scadenze fiscali (l'INPS slitta al primo giorno lavorativo: oggi la data va corretta a mano)
6. **Storico valutazioni beni** (tabella `beni_valori`) per il grafico del patrimonio nel tempo
7. **Export dati** (CSV) — ricordare la regola §8.5: le scritture su DB si completano prima, l'export è sempre l'ultima operazione
8. **Icone PWA** nel manifest + notifiche per le scadenze in arrivo
9. Modifica movimenti e scadenze esistenti (oggi solo elimina/ricrea)
