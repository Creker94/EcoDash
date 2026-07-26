# CLAUDE.md — EcoDash

Istruzioni operative per lavorare su questo progetto. **La fonte di verità per il design è `docs/STYLE_GUIDE.md`**: leggerla prima di toccare la UI.

## Cos'è

Dashboard PWA (mobile-first, iPhone standalone) per la gestione finanziaria personale di un singolo utente. Lingua UI: italiano. Valuta: EUR (formato it-IT).

## Stack e infrastruttura

- Frontend: vanilla HTML/CSS/JS, nessun framework, nessun build step
- Backend: Supabase — progetto **EcoDash**, ref `zznyhifatcpctkpeubtj`, regione `eu-central-1`
- Auth: Supabase Auth (email + password), RLS attiva su tutte le tabelle
- Repo: `Creker94/EcoDash` · Deploy: Netlify (statico)

## Schema DB (via migrazioni Supabase)

- `conti` — nome, tipo (corrente/risparmio/contanti/carta/investimento), saldo_iniziale, archiviato
- `categorie` — nome, tipo (entrata/uscita), colore
- `movimenti` — conto_id, categoria_id, **importo numeric(12,2) con segno** (entrate +, uscite −), descrizione, data (`date`), note
- Tutte con `user_id default auth.uid()` + policy RLS `user_id = auth.uid()`

## Regole non negoziabili (lezioni GoldGest)

1. **Un solo formatter monetario** `fmtEUR` in `js/utils.js` — mai duplicarlo
2. **Una sola utility data** `oggiISO()` in ora locale — mai `toISOString().slice(0,10)`
3. **`withBusy(btn, fn)` su ogni scrittura** — anti doppio-tap, previene record duplicati
4. **Cifre tabulari** su ogni numero incolonnato
5. **z-index solo dalla scala** documentata in `docs/STYLE_GUIDE.md` §5 — mai inventati
6. Colore mai unico portatore di significato: sempre segno/testo accanto
7. Azioni distruttive → sempre conferma; feedback sempre via toast, stesso verbo dall'inizio alla fine ("Salva" → "Salvato")
8. Toast sempre `pointer-events:none`; hover solo dentro `@media (hover:hover)`
9. Oro `#e8c547` solo su tema scuro; su chiaro l'accento è `#b8941f`; testo sui bottoni oro sempre nero
10. Mai `#000`/`#fff` come sfondi

## Convenzioni

- Nomi tabelle/colonne DB: italiano, snake_case
- Componente-firma: **saldo hero a display** (pannello `--surface2` con ombra inset + numero JetBrains Mono oro con glow)
- Modalità riservata: `body.privacy` → `blur(6px)` su `.amount`
- Chiavi in `js/config.js`: URL + publishable key (sicure lato client: la protezione è la RLS)
- Testo utente in `innerHTML` sempre passato da `esc()`

## Roadmap moduli

1. ✅ Conti + Movimenti (Fase 1)
2. Dashboard con grafico andamento
3. Scadenze e ricorrenti (IMU, TARI, INPS, cedolare, rate)
4. Patrimonio (beni: orologi, ecc.)
5. Debiti e piani di rientro
6. PAC e obiettivi
