(() => {
  const D = JSON.parse(document.getElementById('hub-data').textContent);
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app'), nav = $('#nav'), q = $('#q');
  const SEC = Object.fromEntries(D.sections.map(s => [s.id, s]));
  const WL = D.watchlist || [];
  const WLM = Object.fromEntries(WL.map(w => [w.symbol, w]));
  const HOME = {id: 'top', name: 'Home', full_name: "Frank's Hub", accent: '#e5202e', accent2: '#ffcc00', icon: '★'};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const K = s => `--k:${s.accent};--k2:${s.accent2}`;
  const NYf = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'});
  const X_ICON = '<svg viewBox="0 0 24 24"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.4 22H3.3l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg>';

  // ---------- helpers ----------
  function rel(iso, short) {
    if (!iso) return '';
    const s = (Date.now() - new Date(iso)) / 1000;
    const f = (n, u, l) => short ? `${n}${u}` : `${n}${u} ago`;
    if (s < 60) return 'now';
    if (s < 3600) return f(Math.floor(s / 60), 'm');
    if (s < 86400) return f(Math.floor(s / 3600), 'h');
    if (s < 7 * 86400) return f(Math.floor(s / 86400), 'd');
    return new Date(iso).toLocaleDateString('en-US', {timeZone:'America/New_York', month:'short', day:'numeric', year: s > 300 * 86400 ? 'numeric' : undefined});
  }
  const fresh = iso => iso && Date.now() - new Date(iso) < 3 * 3600e3;
  const tm = (iso, short) => iso ? `<time class="${fresh(iso) ? 'fresh' : ''}" datetime="${iso}" data-short="${short ? 1 : ''}" title="${esc(NYf.format(new Date(iso)))}">${rel(iso, short)}</time>` : '';
  const meta = it => `<div class="meta"><span class="src">${esc(it.source)}</span>${it.published ? '<span class="dot"></span>' + tm(it.published) : ''}</div>`;
  const kick = (s, solid) => `<span class="kicker${solid ? ' solid' : ''}" style="--k:${s.accent}">${esc(s.name)}</span>`;
  const ext = 'target="_blank" rel="noopener"';
  const dataText = it => `data-text="${esc((it.title + ' ' + it.source).toLowerCase())}"`;
  function img(it, s) {
    const fb = `<div class="fb"><span class="fb-k">${esc(s.name)}</span><span class="fb-src">${esc(it.source)}</span><span class="fb-ic">${esc(s.icon || '')}</span></div>`;
    return `<div class="img">${fb}${it.thumb ? `<img loading="lazy" src="${esc(it.thumb)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div>`;
  }
  const md = t => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|#\/)[^)\s]+)\)/g, (m, l, u) => `<a href="${u}"${u.startsWith('#') ? '' : ' ' + ext}>${l}</a>`)
    .replace(/\[([^\]]+)\]\(ref:[^)]*\)/g, '$1');
  const fmt = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});
  const big = n => n == null ? '—' : n >= 1e12 ? (n / 1e12).toFixed(3) + 'T' : n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : fmt(n, 0);
  const dir = w => w.change > 0 ? 'up' : w.change < 0 ? 'down' : 'flat';
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
  const allItems = () => D.sections.flatMap(s => s.items.map(it => ({it, s}))).filter(x => x.it.published).sort((a, b) => new Date(b.it.published) - new Date(a.it.published));

  // ---------- components ----------
  const hcard = (it, s, bigc) => `<a class="hcard${bigc ? ' big' : ''}" style="${K(s)}" href="${esc(it.link)}" ${ext} ${dataText(it)}>${img(it, s)}
      <div class="cap">${kick(s, true)}<h2>${esc(it.title)}</h2>${meta(it)}</div></a>`;
  const card = (it, s, withKick = true) => `<a class="card" style="${K(s)}" href="${esc(it.link)}" ${ext} ${dataText(it)}>${img(it, s)}
      ${withKick ? kick(s) : ''}<h3>${esc(it.title)}</h3>${it.summary ? `<p>${esc(it.summary)}</p>` : ''}${meta(it)}</a>`;
  const mini = (it, s) => `<a class="mini" style="${K(s)}" href="${esc(it.link)}" ${ext} ${dataText(it)}>${img(it, s)}<div><h4>${esc(it.title)}</h4>${meta(it)}</div></a>`;
  const trow = (it, s, withKick = true) => `<a class="trow" style="${K(s)}" href="${esc(it.link)}" ${ext} ${dataText(it)}><div>${withKick ? kick(s) : ''}<h4>${esc(it.title)}</h4>${meta(it)}</div></a>`;

  function briefing(b, s, compact) {
    if (!b || !b.items || !b.items.length) return '';
    const items = b.items.map(x => {
      const xs = x.section && SEC[x.section];
      const tag = xs ? `<span class="kicker solid" style="--k:${xs.accent}">${esc(x.tag || xs.name)}</span>` : '';
      const xchip = [].concat(x.x || []).map(hd => `<a class="xchip" href="https://x.com/${esc(hd)}" ${ext} title="Open @${esc(hd)} on X">${X_ICON}@${esc(hd)}</a>`).join('');
      return `<li style="${xs ? '--kk:' + xs.accent : ''}"><div><h3>${tag}${esc(x.head)}${xchip}</h3><p>${md(x.text)}</p></div></li>`;
    }).join('');
    const when = D.briefings && D.briefings.written_at ? `Written ${esc(D.briefings.written_at)}` : '';
    return `<section class="brief${compact ? ' compact' : ''} fade" style="${K(s)}">
      <div class="brief-top"><h2>${compact ? `<em>${esc(s.name)}</em> briefing` : `Today's <em>Briefing</em>`}</h2><span class="when">${when}</span></div>
      ${b.dek ? `<p class="dek">${esc(b.dek)}</p>` : ''}<ol>${items}</ol></section>`;
  }

  function spark(w, W = 84, H = 34) {
    const pts = w.spark || [];
    if (pts.length < 2 || w.prev_close == null) return `<svg class="spark" viewBox="0 0 ${W} ${H}"></svg>`;
    const ys = pts.map(p => p[1]).concat([w.prev_close]);
    const mn = Math.min(...ys), mx = Math.max(...ys), pad = 2;
    const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
    const X = t => pad + (t - t0) / (t1 - t0 || 1) * (W - 2 * pad), Y = v => pad + (mx - v) / (mx - mn || 1) * (H - 2 * pad);
    const line = pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    const by = Y(w.prev_close).toFixed(1), id = 'c' + w.symbol + Math.random().toString(36).slice(2, 6);
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs><clipPath id="${id}a"><rect x="0" y="0" width="${W}" height="${by}"/></clipPath><clipPath id="${id}b"><rect x="0" y="${by}" width="${W}" height="${H}"/></clipPath></defs>
      <line x1="0" x2="${W}" y1="${by}" y2="${by}" stroke="#8a8a96" stroke-width="1" stroke-dasharray="1.5 2.5"/>
      <polyline points="${line}" fill="none" stroke="var(--up)" stroke-width="1.6" stroke-linejoin="round" clip-path="url(#${id}a)"/>
      <polyline points="${line}" fill="none" stroke="var(--down)" stroke-width="1.6" stroke-linejoin="round" clip-path="url(#${id}b)"/></svg>`;
  }
  function watchlist(skip) {
    if (!WL.length) return '';
    const rows = WL.filter(w => w.symbol !== skip).map(w => w.price != null ? `<li><a class="row" href="#/stock/${esc(w.symbol)}">
        <div><div class="sym">${esc(w.symbol)}</div><div class="nm" title="${esc(w.name)}">${esc(w.name)}</div></div>${spark(w)}
        <div><div class="px">${fmt(w.price)}</div><div class="chg ${dir(w)}">${sgn(w.change)} (${sgn(w.pct)}%)</div></div></a></li>`
      : `<li><a class="row" href="${esc(w.url)}" ${ext}><div><div class="sym">${esc(w.symbol)}</div><div class="nm">Quote unavailable ↗</div></div><span></span><span></span></a></li>`).join('');
    const a = WL.find(w => w.as_of);
    return `<section class="rail wl" style="--k:var(--blue)"><div class="rail-h"><i></i>My Watchlist<span class="sub">Nasdaq data</span></div><ul class="rows">${rows}</ul>
      <div class="asof">${a ? 'As of ' + esc(a.as_of) : 'Quotes unavailable at build time'} · dotted line = previous close</div></section>`;
  }
  function latestRail(list, title = 'Latest', n = 12) {
    return `<section class="rail"><div class="rail-h"><i></i>${esc(title)}</div><ul class="latest">${list.slice(0, n).map(({it, s}) =>
      `<li><a href="${esc(it.link)}" ${ext} style="${K(s)}" ${dataText(it)}>${tm(it.published, true)}<div>${kick(s)}<h5>${esc(it.title)}</h5></div></a></li>`).join('')}</ul></section>`;
  }
  const XF = (D.xfeed && D.xfeed.posts) || [];
  function xpost(p) {
    const h = p.handle.replace(/^@/, '');
    const when = p.approx ? esc(p.time_label) : tm(p.published, false);
    return `<li class="xp" data-text="${esc((p.handle + ' ' + p.summary).toLowerCase())}"><div class="xp-top"><a class="acct" href="https://x.com/${esc(h)}" ${ext}>${X_ICON.replace('<svg', '<svg width="9" height="9" fill="#fff"')}@${esc(h)}</a><span class="xp-t">${when}</span></div>
      <p>${esc(p.summary)}</p><a class="xp-link" href="${esc(p.url)}" ${ext}>View post ↗</a></li>`;
  }
  function xFeed(secId, n) {
    if (!XF.length) return '';
    const cap = D.xfeed.captured_at ? new Date(D.xfeed.captured_at) : null;
    const sub = cap ? `captured ${esc(NYf.format(cap))}` : '';
    let body = '';
    if (secId) {
      const posts = XF.filter(p => p.sections.includes(secId)).slice(0, n || 5);
      if (!posts.length) return '';
      body = `<ul class="xl">${posts.map(xpost).join('')}</ul>`;
    } else {
      body = D.sections.map(s => {
        const posts = XF.filter(p => p.sections[0] === s.id || (p.sections.includes(s.id) && !D.sections.some(o => o.id === p.sections[0]))).slice(0, n || 3);
        return posts.length ? `<div class="xg" style="${K(s)}"><a class="xg-h" href="#/${s.id}"><i></i>${esc(s.name)}<span>${XF.filter(p => p.sections.includes(s.id)).length}</span></a><ul class="xl">${posts.map(xpost).join('')}</ul></div>` : '';
      }).join('');
    }
    return `<section class="rail xfeed" style="--k:#fff"><div class="rail-h">${X_ICON.replace('<svg', '<svg width="14" height="14" fill="#fff"')}From your X feed<span class="sub">${sub}</span></div>${body}</section>`;
  }
  function vband(videos, s, label) {
    if (!videos || !videos.length) return '';
    const ch = new Set(videos.map(v => v.source)).size;
    return `<section class="vband fade" style="${K(s)}"><div class="wrap"><div class="vh"><h2><span class="yt"></span>${esc(label || 'Videos')}</h2><span class="sub">${videos.length} videos · ${ch} channel${ch > 1 ? 's' : ''}</span>
      <div class="arrows"><button data-dir="-1" aria-label="Previous">‹</button><button data-dir="1" aria-label="Next">›</button></div></div>
      <div class="vrow">${videos.map(v => `<a class="vcard" href="${esc(v.link)}" ${ext} ${dataText(v)}><div class="img">${img(v, s)}<span class="pl"></span></div><h4>${esc(v.title)}</h4>${meta(v)}</a>`).join('')}</div></div></section>`;
  }
  const split = items => [items.filter(i => i.thumb), items.filter(i => !i.thumb)];

  // ---------- pages ----------
  function pageHome() {
    const all = allItems();
    const withImg = all.filter(x => x.it.thumb);
    const used = new Set(), heroes = [];
    for (const x of withImg) { if (heroes.length >= 3) break; if (heroes.some(h => h.s.id === x.s.id)) continue; heroes.push(x); used.add(x.it.link); }
    const allV = D.sections.flatMap(s => (s.videos || []).map(v => ({v, s}))).filter(x => x.v.published).sort((a, b) => new Date(b.v.published) - new Date(a.v.published));
    const seen = new Set(), vids = [];
    for (const x of allV) { if (seen.has(x.v.link)) continue; seen.add(x.v.link); vids.push(Object.assign({}, x.v, {source: x.v.source})); if (vids.length >= 14) break; }
    let h = `<div class="wrap">`;
    if (heroes.length) h += `<section class="hero fade">${hcard(heroes[0].it, heroes[0].s, true)}<div class="hero-side">${heroes.slice(1).map(x => hcard(x.it, x.s)).join('')}</div></section>`;
    h += `<div class="cols"><div class="main">${briefing(D.briefings && D.briefings.top, HOME)}</div>
      <aside class="side">${watchlist()}${latestRail(all.filter(x => !used.has(x.it.link)), 'Latest', 9)}</aside></div></div>`;
    h += vband(vids, HOME, 'Latest from your YouTube subs');
    h += `<div class="wrap"><div class="cols"><div class="main">`;
    for (const s of D.sections) {
      const items = s.items.filter(i => !used.has(i.link));
      const [im, tx] = split(items);
      const lead = im[0] || items[0]; if (!lead) continue;
      const two = im.filter(i => i !== lead).slice(0, 2);
      const rest = items.filter(i => i !== lead && !two.includes(i)).slice(0, 3);
      h += `<section class="block fade" style="${K(s)}"><div class="sec-h"><h2><span class="ic">${esc(s.icon)}</span>${esc(s.full_name)}</h2><a class="more" href="#/${s.id}">See all ${s.items.length} →</a></div>
        <div class="block-grid"><div class="block-lead">${card(lead, s, false)}</div><div class="block-right">${two.map(i => mini(i, s)).join('')}
        <ul class="tlist">${rest.map(i => `<li><a href="${esc(i.link)}" ${ext} ${dataText(i)}><h4>${esc(i.title)}</h4>${meta(i)}</a></li>`).join('')}</ul></div></div></section>`;
    }
    h += `</div><aside class="side">${xFeed(null, 3)}</aside></div></div>`;
    return h;
  }

  function pageSection(s) {
    const b = D.briefings && D.briefings.sections && D.briefings.sections[s.id];
    const [im, tx] = split(s.items);
    const heroes = im.slice(0, 3);
    const rest = s.items.filter(i => !heroes.includes(i));
    const [rim, rtx] = split(rest);
    const srcs = Object.entries(s.items.reduce((a, i) => (a[i.source] = (a[i.source] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
    let h = `<div class="wrap" style="${K(s)}"><header class="shead fade"><h1><span>${esc(s.icon)}</span> ${esc(s.full_name)}</h1>
      <span class="sub">${s.items.length} stories${s.videos && s.videos.length ? ` · ${s.videos.length} videos` : ''} · newest first</span>
      <div class="chips">${srcs.map(([n, c]) => `<span class="chip">${esc(n)} · ${c}</span>`).join('')}</div></header>`;
    if (heroes.length) h += `<section class="hero fade">${hcard(heroes[0], s, true)}<div class="hero-side">${heroes.slice(1).map(i => hcard(i, s)).join('')}</div></section>`;
    h += `<div class="cols"><div class="main">${briefing(b, s, true)}</div><aside class="side">${s.watchlist ? watchlist() : ''}${latestRail(allItems().filter(x => x.s.id !== s.id), 'Elsewhere on the hub', 6)}</aside></div></div>`;
    h += vband(s.videos, s, s.video_label || `${s.name} videos`);
    (s.video_strips || []).forEach(x => { h += vband(x.videos, s, x.label); });
    h += `<div class="wrap" style="${K(s)}"><div class="cols"><div class="main">
      ${rim.length ? `<div class="sec-h" style="--k:${s.accent}"><h2>Top stories</h2></div><div class="grid">${rim.map(i => card(i, s, false)).join('')}</div>` : ''}
      ${rtx.length ? `<section class="more-h"><div class="sec-h" style="--k:${s.accent}"><h2>More headlines</h2></div><div class="tcols">${rtx.map(i => trow(i, s, false)).join('')}</div></section>` : ''}
      </div><aside class="side">${xFeed(s.id, 6)}${s.watchlist ? '' : watchlist()}</aside></div></div>`;
    return h;
  }

  function pageStock(sym) {
    const w = WLM[sym];
    if (!w) return `<div class="wrap"><p>Unknown ticker.</p></div>`;
    const fin = SEC.finance || HOME;
    const news = (D.stock_news && D.stock_news[sym]) || [];
    const sn = news.map(it => ({it, s: D.sections.find(s => s.items.includes(it)) || fin}));
    const stat = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
    const day = w.low != null ? `${fmt(w.low)} – ${fmt(w.high)}` : '—';
    const wk = w.wk52_low != null ? `${fmt(w.wk52_low)} – ${fmt(w.wk52_high)}` : '—';
    let h = `<div class="wrap"><div class="stock-top fade"><div><a class="back" href="#/finance">← Finance</a><h1>${esc(w.symbol)}<small>${esc(w.name || '')}${w.exchange ? ' · ' + esc(w.exchange) : ''}</small></h1></div>
      ${w.price != null ? `<div class="bigpx"><div class="p">${fmt(w.price)}</div><div class="c ${dir(w)}">${sgn(w.change)} (${sgn(w.pct)}%)</div><div class="t">At close: ${esc(w.as_of)}</div></div>` : `<div class="bigpx"><a href="${esc(w.url)}" ${ext}>Quote unavailable, open on Yahoo Finance ↗</a></div>`}</div>
      <div class="cols"><div class="main">
        <div class="ranges" id="ranges">${['1D', '5D', '1M', '6M', '1Y', '5Y'].map(r => `<button data-r="${r}" class="${r === '1D' ? 'on' : ''}">${r}</button>`).join('')}</div>
        <div class="chartbox"><span class="note" id="cnote"></span><div id="chart"></div><div class="tip" id="tip"></div></div>
        <div class="stats">${stat('Previous close', fmt(w.prev_close))}${stat('Open', fmt(w.open))}${stat("Day's range", day)}${stat('52-week range', wk)}${stat('Volume', w.volume != null ? fmt(w.volume, 0) : '—')}${stat('Avg. volume', w.avg_volume != null ? fmt(w.avg_volume, 0) : '—')}${stat('Market cap', big(w.market_cap))}${stat(w.pe ? esc(w.pe.label) : 'P/E', w.pe ? fmt(w.pe.value) : '—')}${stat('1-yr target', esc(w.target || '—'))}</div>
        <div class="sec-h" style="--k:var(--blue)"><h2>${esc(w.symbol)} news</h2><a class="more" href="${esc(w.url)}" ${ext}>Yahoo Finance ↗</a></div>
        ${sn.length ? `<div class="grid">${sn.filter(x => x.it.thumb).map(x => card(x.it, x.s)).join('')}</div><div class="tcols" style="margin-top:20px">${sn.filter(x => !x.it.thumb).map(x => trow(x.it, x.s)).join('')}</div>` : '<p class="chip">No ticker news in this build.</p>'}
      </div><aside class="side">${watchlist(sym)}</aside></div></div>`;
    setTimeout(() => drawChart(w, '1D'), 0);
    return h;
  }

  function drawChart(w, r) {
    const box = $('#chart'); if (!box) return;
    document.querySelectorAll('#ranges button').forEach(b => b.classList.toggle('on', b.dataset.r === r));
    const pts = (w.ranges && w.ranges[r]) || [];
    $('#cnote').textContent = r === '1D' ? `Fri session · 9:30 AM–4:00 PM ET · 2-min` : r === '5D' ? `5 sessions · ${w.range_notes && w.range_notes['5D'] || ''}` : r === '5Y' ? 'weekly closes' : 'daily closes';
    if (pts.length < 2) { box.innerHTML = '<p style="padding:40px;color:var(--dim)">No chart data for this range.</p>'; return; }
    const W = 860, H = 340, L = 8, R = 62, T = 14, B = 28;
    const base = r === '1D' ? w.prev_close : pts[0][1];
    const ys = pts.map(p => p[1]).concat(r === '1D' && base != null ? [base] : []);
    let mn = Math.min(...ys), mx = Math.max(...ys); const padv = (mx - mn) * .08 || 1; mn -= padv; mx += padv;
    const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
    const idx = r === '5D' || r !== '1D'; // use index spacing for non-intraday to skip weekends
    const X = (p, i) => L + (idx ? i / (pts.length - 1) : (p[0] - t0) / (t1 - t0)) * (W - L - R);
    const Y = v => T + (mx - v) / (mx - mn) * (H - T - B);
    const up = pts[pts.length - 1][1] >= base;
    const col = up ? 'var(--up)' : 'var(--down)';
    const line = pts.map((p, i) => `${X(p, i).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    const area = `M${X(pts[0], 0).toFixed(1)},${H - B} L${line.replace(/ /g, ' L')} L${X(pts[pts.length - 1], pts.length - 1).toFixed(1)},${H - B} Z`;
    const ticks = 4, grid = [];
    for (let i = 0; i <= ticks; i++) { const v = mn + (mx - mn) * i / ticks; grid.push(`<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ffffff10"/><text x="${W - R + 8}" y="${Y(v) + 4}" fill="#8a8a96" font-size="11">${fmt(v)}</text>`); }
    const tf = r === '1D' ? {hour:'numeric', minute:'2-digit'} : r === '5D' || r === '1M' ? {month:'short', day:'numeric'} : r === '5Y' ? {year:'numeric'} : {month:'short', year:'2-digit'};
    const xl = [0, .25, .5, .75, 1].map(f => { const i = Math.round(f * (pts.length - 1)); return `<text x="${X(pts[i], i)}" y="${H - 8}" fill="#8a8a96" font-size="11" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}">${new Date(pts[i][0]).toLocaleString('en-US', {timeZone:'America/New_York', ...tf})}</text>`; }).join('');
    const bl = r === '1D' && base != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(base)}" y2="${Y(base)}" stroke="#b8b8c4" stroke-dasharray="2 4"/><text x="${W - R + 8}" y="${Y(base) - 6}" fill="#b8b8c4" font-size="10.5">Prev ${fmt(base)}</text>` : '';
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" id="csvg"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${up ? '#1fc16b' : '#ff4d4f'}" stop-opacity=".28"/><stop offset="1" stop-color="${up ? '#1fc16b' : '#ff4d4f'}" stop-opacity="0"/></linearGradient></defs>
      ${grid.join('')}${bl}<path d="${area}" fill="url(#ag)"/><polyline points="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>${xl}
      <line id="cx" y1="${T}" y2="${H - B}" stroke="#fff5" visibility="hidden"/><circle id="cd" r="4" fill="${col}" stroke="#000" visibility="hidden"/></svg>`;
    const svg = $('#csvg'), tip = $('#tip');
    svg.onmousemove = e => {
      const rc = svg.getBoundingClientRect(), sx = (e.clientX - rc.left) / rc.width * W;
      let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.abs(X(p, i) - sx); if (d < bd) { bd = d; bi = i; } });
      const p = pts[bi], x = X(p, bi), y = Y(p[1]);
      $('#cx', svg).setAttribute('x1', x); $('#cx', svg).setAttribute('x2', x); $('#cx', svg).setAttribute('visibility', 'visible');
      $('#cd', svg).setAttribute('cx', x); $('#cd', svg).setAttribute('cy', y); $('#cd', svg).setAttribute('visibility', 'visible');
      const ch = p[1] - base;
      tip.style.display = 'block'; tip.style.left = (x / W * rc.width + 10) + 'px'; tip.style.top = (y / H * rc.height + 14) + 'px';
      tip.innerHTML = `<b>${fmt(p[1])}</b> <span class="${ch >= 0 ? 'up' : 'down'}">${sgn(ch)} (${sgn(ch / base * 100)}%)</span><br><span style="color:#8a8a96">${new Date(p[0]).toLocaleString('en-US', {timeZone:'America/New_York', month:'short', day:'numeric', year: r === '1Y' || r === '5Y' ? 'numeric' : undefined, hour: r === '1D' || (r === '5D' && pts.length > 10) ? 'numeric' : undefined, minute: r === '1D' || (r === '5D' && pts.length > 10) ? '2-digit' : undefined})} ET</span>`;
    };
    svg.onmouseleave = () => { tip.style.display = 'none'; $('#cx', svg).setAttribute('visibility', 'hidden'); $('#cd', svg).setAttribute('visibility', 'hidden'); };
    document.querySelectorAll('#ranges button').forEach(b => b.onclick = () => drawChart(w, b.dataset.r));
  }

  // ---------- chrome ----------
  function renderNav(active) {
    nav.innerHTML = [HOME, ...D.sections].map(s => `<a href="#/${s.id}" class="${s.id === active ? 'active' : ''}" style="--c:${s.accent}">${esc(s.id === 'top' ? 'Home' : s.name)}</a>`).join('');
    const el = $('a.active', nav); if (el && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, el.offsetLeft - nav.clientWidth / 2 + el.offsetWidth / 2);
  }
  function renderTicker() {
    const items = allItems().slice(0, 24).map(({it, s}) => `<a href="${esc(it.link)}" ${ext} style="--c:${s.accent}"><b>${esc(s.name)}</b>${esc(it.title)}</a>`).join('');
    $('#ticker').innerHTML = items + items;
  }
  function setAccent(s) {
    document.documentElement.style.setProperty('--a', s.accent);
    document.documentElement.style.setProperty('--b', s.accent2 || '#ffcc00');
  }
  function bindRails() {
    document.querySelectorAll('.vband').forEach(b => b.querySelectorAll('.arrows button').forEach(btn => btn.onclick = () => {
      const row = $('.vrow', b); row.scrollBy({left: row.clientWidth * Number(btn.dataset.dir) * .75});
    }));
  }
  function route() {
    const hsh = location.hash;
    const m = hsh.match(/^#\/stock\/([A-Z.]+)/i);
    const id = (hsh.match(/^#\/(\w+)/) || [])[1] || 'top';
    if (m) { renderNav('finance'); setAccent(SEC.finance || HOME); app.innerHTML = pageStock(m[1].toUpperCase()); }
    else if (SEC[id]) { renderNav(id); setAccent(SEC[id]); app.innerHTML = pageSection(SEC[id]); }
    else { renderNav('top'); setAccent(HOME); app.innerHTML = pageHome(); }
    bindRails(); applyFilter(); window.scrollTo({top: 0});
  }
  function applyFilter() {
    const v = q.value.trim().toLowerCase();
    document.querySelectorAll('#app [data-text]').forEach(el => el.classList.toggle('hidden', !!v && !el.dataset.text.includes(v)));
  }
  q.addEventListener('input', applyFilter);
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); } if (e.key === 'Escape') { q.value = ''; applyFilter(); q.blur(); } });
  window.addEventListener('hashchange', route);
  setInterval(() => document.querySelectorAll('time[datetime]').forEach(t => t.textContent = rel(t.getAttribute('datetime'), t.dataset.short)), 60e3);
  const ok = D.feeds.filter(f => f.ok).length;
  $('#feedstat').textContent = `${ok}/${D.feeds.length} feeds OK · ${D.images ? D.images.with_image + '/' + D.images.total + ' stories with images' : ''}`;
  renderTicker(); route();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', {scope: './'}).catch(() => {}));
  }
})();
