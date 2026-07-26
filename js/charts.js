// ============================================================
// EcoDash — grafici SVG vanilla (regole: docs/STYLE_GUIDE.md §9)
// Sfondo surface, griglia border, label muted, valori mono tabular.
// Serie principale Estoril, entrate/uscite verde/rosso, barre r4.
// ============================================================

const Charts = (() => {

  // Passo "pulito" per i tick dell'asse Y
  function niceStep(raw) {
    const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
    for (const m of [1, 2, 2.5, 5, 10]) { if (m * mag >= raw) return m * mag; }
    return mag * 10;
  }

  function scaleInfo(minV, maxV) {
    if (minV === maxV) maxV = minV + 1;
    const step = niceStep((maxV - minV) / 3);
    const y0 = Math.floor(minV / step) * step;
    const y1 = Math.ceil(maxV / step) * step;
    const ticks = [];
    for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(v);
    return { y0, y1, ticks };
  }

  function gridAndY(ticks, Y, W, P) {
    let g = '';
    for (const t of ticks) {
      const y = Y(t);
      g += `<line x1="${P.l}" y1="${y}" x2="${W - P.r}" y2="${y}" class="ch-grid"/>`;
      g += `<text x="${P.l - 8}" y="${y + 3}" class="ch-lbl ch-num" text-anchor="end">${fmtNum.format(t)}</text>`;
    }
    return g;
  }

  // Tooltip = mini-card (surface2, bordo, raggio 8) — §9
  function bindTip(el, items) {
    const box = el.querySelector('.chart-box');
    const tip = el.querySelector('.chart-tip');
    if (!box || !tip || !items.length) return;
    box.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      const rx = (e.clientX - r.left) / r.width;
      let best = 0, bd = 1e9;
      items.forEach((it, i) => {
        const d = Math.abs(it.cx - rx);
        if (d < bd) { bd = d; best = i; }
      });
      const it = items[best];
      tip.innerHTML = `<div class="tip-t">${it.label}</div>` +
        it.rows.map(([k, v, c]) =>
          `<div class="tip-r"><span>${k}</span><span class="num amount ${c || ''}">${v}</span></div>`).join('');
      tip.hidden = false;
      tip.style.left = Math.min(Math.max(it.cx * r.width, 70), r.width - 70) + 'px';
    });
    box.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  // ---- Linea: andamento saldo (serie Estoril + area tinta) ----
  // series: [{ x: 'YYYY-MM-DD', y: numero }]
  function line(el, series) {
    if (!series.length) {
      el.innerHTML = '<div class="empty">Il grafico si popola con i primi movimenti</div>';
      return;
    }
    const W = 600, H = 220, P = { t: 14, r: 14, b: 26, l: 58 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const ys = series.map(p => p.y);
    const { y0, y1, ticks } = scaleInfo(Math.min(0, ...ys), Math.max(...ys));
    const X = i => P.l + (series.length === 1 ? iw / 2 : i * (iw / (series.length - 1)));
    const Y = v => P.t + ih - ((v - y0) / (y1 - y0)) * ih;

    let g = gridAndY(ticks, Y, W, P);
    const xi = [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])];
    for (const i of xi) {
      g += `<text x="${X(i)}" y="${H - 8}" class="ch-lbl ch-num" text-anchor="middle">${dataIT(series[i].x)}</text>`;
    }
    const pts = series.map((p, i) => `${X(i)},${Y(p.y)}`).join(' ');
    g += `<polygon points="${P.l},${P.t + ih} ${pts} ${X(series.length - 1)},${P.t + ih}" class="ch-area"/>`;
    g += `<polyline points="${pts}" class="ch-line"/>`;
    const last = series.length - 1;
    g += `<circle cx="${X(last)}" cy="${Y(series[last].y)}" r="3.5" class="ch-dot"/>`;

    el.innerHTML = `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}" class="chart" aria-hidden="true">${g}</svg><div class="chart-tip" hidden></div></div>`;
    bindTip(el, series.map((p, i) => ({
      cx: X(i) / W,
      label: dataIT(p.x),
      rows: [['Saldo', fmtEUR.format(p.y), '']]
    })));
  }

  // Barra con raggio 4 solo in cima (§9)
  function roundedBar(x, yTop, w, yBase, cls) {
    const h = yBase - yTop;
    if (h <= 0.5) return '';
    const r = Math.min(4, h / 2, w / 2);
    return `<path d="M${x},${yBase} L${x},${yTop + r} Q${x},${yTop} ${x + r},${yTop} L${x + w - r},${yTop} Q${x + w},${yTop} ${x + w},${yTop + r} L${x + w},${yBase} Z" class="${cls}"/>`;
  }

  // ---- Barre: entrate vs uscite per mese ----
  // data: [{ label: 'lug', entrate: n, uscite: n }] (uscite in positivo)
  function bars(el, data) {
    if (!data.some(d => d.entrate || d.uscite)) {
      el.innerHTML = '<div class="empty">Ancora nessun dato mensile</div>';
      return;
    }
    const W = 600, H = 220, P = { t: 14, r: 14, b: 26, l: 58 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const maxV = Math.max(...data.map(d => Math.max(d.entrate, d.uscite)), 1);
    const { y0, y1, ticks } = scaleInfo(0, maxV);
    const Y = v => P.t + ih - ((v - y0) / (y1 - y0)) * ih;
    const gw = iw / data.length;
    const bw = Math.min(18, gw * 0.28);
    const yBase = P.t + ih;

    let g = gridAndY(ticks, Y, W, P);
    const items = [];
    data.forEach((d, i) => {
      const cx = P.l + gw * i + gw / 2;
      g += roundedBar(cx - bw - 2, Y(d.entrate), bw, yBase, 'ch-green');
      g += roundedBar(cx + 2, Y(d.uscite), bw, yBase, 'ch-red');
      g += `<text x="${cx}" y="${H - 8}" class="ch-lbl" text-anchor="middle">${d.label}</text>`;
      items.push({
        cx: cx / W,
        label: d.label,
        rows: [
          ['Entrate', fmtEUR.format(d.entrate), 'pos'],
          ['Uscite', fmtEUR.format(-d.uscite), 'neg']
        ]
      });
    });

    el.innerHTML = `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}" class="chart" aria-hidden="true">${g}</svg><div class="chart-tip" hidden></div></div>`;
    bindTip(el, items);
  }

  // ---- Barre orizzontali: uscite per categoria ----
  // data: [{ nome, val }] ordinati, val positivi
  function hbars(el, data) {
    if (!data.length) {
      el.innerHTML = '<div class="empty">Nessuna uscita questo mese</div>';
      return;
    }
    const max = data[0].val;
    el.innerHTML = data.map(d => `
      <div class="hbar">
        <div class="hbar-top">
          <span class="hbar-name">${esc(d.nome)}</span>
          <span class="num amount neg">${fmtEUR.format(-d.val)}</span>
        </div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(2, (d.val / max) * 100)}%"></div></div>
      </div>`).join('');
  }

  return { line, bars, hbars };
})();
