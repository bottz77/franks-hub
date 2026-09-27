(() => {
  const D = JSON.parse(document.getElementById('hub-data').textContent);
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app'), nav = $('#nav'), q = $('#q');
  const SEC = Object.fromEntries(D.sections.map(s => [s.id, s]));
  const WL = D.watchlist || [];
  const WLM = Object.fromEntries(WL.map(w => [w.symbol, w]));
  const EXT = window.FH_EXT_TABS || [];  // optional add-on tabs registered by separately built scripts
  let extActive = null;
  const WATCH = D.watch && D.watch.sections && D.watch.sections.some(x => x.items.length) ? {id: 'watch', name: 'Watch', full_name: 'Movies & TV', accent: '#F5C518', accent2: '#E50914', icon: '🎬'} : null;
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
  const meta = it => `<div class="meta">${it.tag ? `<span class="tagb">${esc(it.tag)}</span>` : ''}<span class="src">${esc(it.source)}</span>${it.published ? '<span class="dot"></span>' + tm(it.published) : ''}</div>`;
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
    return `<section class="rail wl" style="--k:var(--blue)"><div class="rail-h"><i></i>My Watchlist${goalChip()}<span class="sub">Nasdaq data</span></div><ul class="rows">${rows}</ul>
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
    if (s.watchlist) h += goalPanel(false);
    h += `<div class="cols"><div class="main">${briefing(b, s, true)}</div><aside class="side">${s.watchlist ? watchlist() : ''}${latestRail(allItems().filter(x => x.s.id !== s.id), 'Elsewhere on the hub', 6)}</aside></div></div>`;
    h += vband(s.videos, s, s.video_label || `${s.name} videos`);
    (s.video_strips || []).forEach(x => { h += vband(x.videos, s, x.label); });
    h += `<div class="wrap" style="${K(s)}"><div class="cols"><div class="main">
      ${rim.length ? `<div class="sec-h" style="--k:${s.accent}"><h2>Top stories</h2></div><div class="grid">${rim.map(i => card(i, s, false)).join('')}</div>` : ''}
      ${rtx.length ? `<section class="more-h"><div class="sec-h" style="--k:${s.accent}"><h2>More headlines</h2></div><div class="tcols">${rtx.map(i => trow(i, s, false)).join('')}</div></section>` : ''}
      </div><aside class="side">${xFeed(s.id, 6)}${s.watchlist ? '' : watchlist()}</aside></div></div>`;
    return h;
  }


  // ---------- Watch (Movies & TV) ----------
  const SVC = {netflix: 'Netflix', prime: 'Prime Video', peacock: 'Peacock', max: 'Max'};
  const MDf = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric'});
  const MDs = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'});
  const wDate = (d, short) => d ? (short ? MDs : MDf).format(new Date(d + 'T12:00:00Z')) : '';
  const msClass = n => n == null ? 'tbd' : n >= 61 ? 'good' : n >= 40 ? 'mixed' : 'bad';
  function daysOut(d) {
    const t = new Date(new Date().toLocaleDateString('en-CA', {timeZone: 'America/New_York'}) + 'T12:00:00Z');
    const n = Math.round((new Date(d + 'T12:00:00Z') - t) / 864e5);
    return n < 0 ? 'Out now' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`;
  }
  function wcard(i, soon) {
    const svc = i.svc || 'other', svcName = i.service || '';
    const ms = i.metascore != null ? `<span class="ms ${msClass(i.metascore)}" title="Metascore">${i.metascore}</span>`
      : i.metascore_text ? `<span class="ms tbd" title="Metascore not available yet">${esc(i.metascore_text)}</span>` : '';
    const when = soon && i.date ? `<span class="wdate"><b>${esc(wDate(i.date, true))}</b> · ${esc(daysOut(i.date))}</span>`
      : i.date ? `<span class="wdate">${esc(wDate(i.date))}</span>` : i.year ? `<span class="wdate">${i.year}</span>` : '';
    const watchName = SVC[svc] || svcName;
    const links = [i.metacritic_url ? `<a class="wl mc" href="${esc(i.metacritic_url)}" ${ext}>Metacritic ↗</a>` : '',
      i.service_url ? `<a class="wl go svc-${svc}" href="${esc(i.service_url)}" ${ext}>${watchName ? 'Watch on ' + esc(watchName) : 'Watch'} ↗</a>` : ''].join('');
    const tile = `<div class="wtile svc-${svc}"><span class="wt-svc">${esc(svcName || 'Streaming')}</span><span class="wt-title">${esc(i.title)}</span></div>`;
    return `<article class="wcard" data-svc="${esc(svc)}" data-text="${esc((i.title + ' ' + svcName + ' ' + (i.description || '')).toLowerCase())}">
      <div class="wimg">${tile}${i.poster ? `<img loading="lazy" src="${esc(i.poster)}" alt="" onerror="this.remove()">` : ''}${svcName ? `<span class="wbadge svc-${svc}">${esc(svcName)}</span>` : ''}${ms}</div>
      <div class="wbody"><h3>${esc(i.title)}</h3>
        <div class="wmeta">${i.rating ? `<span class="wrate">${esc(i.rating)}</span>` : ''}${when}</div>
        ${i.date_note ? `<div class="wnote-d">${esc(i.date_note)}</div>` : ''}
        ${i.description ? `<p>${esc(i.description)}</p>` : ''}
        ${i.content_note ? `<div class="wcn"><span>Content</span>${esc(i.content_note)}</div>` : ''}
        ${links ? `<div class="wlinks">${links}</div>` : ''}</div></article>`;
  }
  function pageWatch() {
    const W = D.watch, all = W.sections.flatMap(x => x.items);
    const counts = all.reduce((a, i) => (a[i.svc || 'other'] = (a[i.svc || 'other'] || 0) + 1, a), {});
    const order = ['netflix', 'prime', 'peacock', 'max', 'other'].filter(k => counts[k]);
    const chips = `<div class="wchips" role="group" aria-label="Filter by service"><button class="wchip on" data-svc="">All <b>${all.length}</b></button>${order.map(k => `<button class="wchip svc-${k}" data-svc="${k}">${esc(SVC[k] || 'Other')} <b>${counts[k]}</b></button>`).join('')}</div>`;
    let h = `<div class="wrap watch" style="${K(WATCH)}"><header class="shead fade"><h1><span>🎬</span> Movies &amp; TV</h1>
      <span class="sub">${all.length} picks · Metascores from Metacritic${W.updated ? ' · list updated ' + esc(rel(W.updated)) : ''}${W.stale ? ' · (showing last good copy)' : ''}</span></header>${chips}`;
    W.sections.forEach(x => {
      if (!x.items.length) return;
      const soon = x.id === 'coming_soon';
      h += `<section class="wsec" data-sec="${esc(x.id)}"><div class="sec-h" style="--k:${WATCH.accent}"><h2>${esc(x.name)}</h2><span class="wcount"></span></div>
        <div class="wgrid">${x.items.map(i => wcard(i, soon)).join('')}</div><p class="wempty hidden">Nothing from this service here.</p></section>`;
    });
    h += `<p class="wfoot">Ratings, Metascores, dates and streaming links come from the Watch Guide list; posters are Metacritic artwork. Streaming links are shown only when verified.</p></div>`;
    return h;
  }
  function bindWatch() {
    const upd = () => document.querySelectorAll('.wsec').forEach(sec => {
      const vis = [...sec.querySelectorAll('.wcard')].filter(c => !c.classList.contains('hidden') && !c.classList.contains('svc-off')).length;
      sec.querySelector('.wempty').classList.toggle('hidden', vis > 0);
    });
    document.querySelectorAll('.wcn').forEach(c => c.onclick = () => c.classList.toggle('open'));
    document.querySelectorAll('.wchip').forEach(b => b.onclick = () => {
      document.querySelectorAll('.wchip').forEach(x => x.classList.toggle('on', x === b));
      const k = b.dataset.svc;
      document.querySelectorAll('.wcard').forEach(c => c.classList.toggle('svc-off', !!k && c.dataset.svc !== k));
      upd();
    });
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
    const tabs = [HOME, ...D.sections];
    if (WATCH) { const i = tabs.findIndex(t => t.id === 'music'); tabs.splice(i < 0 ? tabs.length : i + 1, 0, WATCH); }
    nav.innerHTML = [...tabs, ...EXT].map(s => `<a href="#/${s.id}" class="${s.id === active ? 'active' : ''}" style="--c:${s.accent}">${esc(s.id === 'top' ? 'Home' : s.name)}</a>`).join('');
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
  // ---------- selling-goal tracker (settings live ONLY in this browser's localStorage) ----------
  const GKEY = 'fh_goal_v1';
  const CAR_IMG = 'img/model-yl-white.jpg';
  const CAR_CREDIT = '<a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_Y_L_Premium_Long_Range_AWD_Pearl_White_Multi-Coat_01.jpg" target="_blank" rel="noopener">Photo: Ethan Llamas, CC BY-SA 4.0</a>';
  const CAR_SVG = '<svg viewBox="0 0 64 24" width="30" height="12" fill="currentColor" aria-hidden="true"><path d="M8 17c-3 0-5-1-5-3.5S5 10 9 9.5L17 5c3-1.6 7-2 12-2 6 0 10 1 14 3.5l6 3.5c6 .5 11 2 11 5s-2 3-5 3h-3a6 6 0 0 0-11.5 0H22.5A6 6 0 0 0 11 17zm9-9.5 5-2.5h8v3.5zm16-2.5h4c3 0 5 .8 7 2.5l-11 1z"/><circle cx="16.8" cy="18" r="4.3"/><circle cx="46.2" cy="18" r="4.3"/></svg>';
  const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  function gLoad() { try { return JSON.parse(localStorage.getItem(GKEY)) || null; } catch (e) { return null; } }
  function gSave(g) { localStorage.setItem(GKEY, JSON.stringify(g)); }
  function gClean(g) {
    const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
    const H = {};
    Object.entries(g.holdings || {}).forEach(([s, h]) => { s = String(s).toUpperCase().trim(); if (s && num(h.shares) > 0) H[s] = {shares: num(h.shares), cost_basis_total: num(h.cost_basis_total), term: ['long', 'short'].includes(h.term) ? h.term : null}; });
    const t = g.tax || {};
    return {label: String(g.label || 'Selling goal').slice(0, 40), car: String(g.car || '').slice(0, 30), image: g.image === 'model-yl' ? 'model-yl' : '',
      target: num(g.target) || 0, target_type: g.target_type === 'gross' ? 'gross' : 'net', holdings: H,
      tax: {federal_long: num(t.federal_long), federal_short: num(t.federal_short), state: num(t.state), niit: num(t.niit)}};
  }
  const etDate = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'});
  function closesOf(w) {
    const m = {};
    ['6M', '1M'].forEach(r => ((w.ranges || {})[r] || []).forEach(([ts, px]) => { m[etDate.format(new Date(ts))] = px; }));
    if (w.price != null && w.as_of_date) m[w.as_of_date] = w.price;
    return m;
  }
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  function goalCompute(g) {  // mirrors goal.py
    const syms = Object.keys(g.holdings);
    if (!syms.length || !(g.target > 0)) return {err: 'Add at least one holding and a target.'};
    const miss = syms.filter(s => !WLM[s] || WLM[s].price == null);
    if (miss.length) return {err: `No price data for ${miss.join(', ')} (tracker supports the watchlist tickers: ${WL.map(w => w.symbol).join(', ')}).`};
    const tax = g.tax, C = {}, st = [];
    let gross = 0;
    syms.forEach(s => { C[s] = closesOf(WLM[s]); });
    const latest = syms.map(s => WLM[s].as_of_date).sort().pop();
    syms.forEach(s => {
      const w = WLM[s], n = g.holdings[s].shares, v = w.price * n; gross += v;
      const h = g.holdings[s], fed = h.term === 'long' ? tax.federal_long : h.term === 'short' ? tax.federal_short : null;
      st.push({symbol: s, shares: n, price: w.price, pct: w.pct, date: w.as_of_date, value: v, dayv: (w.change || 0) * n, basis: h.cost_basis_total,
        rate: fed == null || tax.state == null ? null : (fed + tax.state + (tax.niit || 0)) / 100});
    });
    const why = [];
    if (st.some(x => x.basis == null)) why.push('cost basis');
    if (st.some(x => x.rate == null)) why.push('holding term & tax rates');
    const netOk = !why.length;
    const netAt = m => st.reduce((a, x) => a + x.value * m - Math.max(0, x.value * m - x.basis) * x.rate, 0);
    const estTax = netOk ? st.reduce((a, x) => a + Math.max(0, x.value - x.basis) * x.rate, 0) : null;
    const net = netOk ? gross - estTax : null;
    let mult, basis, pv;
    if (g.target_type === 'net' && netOk) { let lo = 0, hi = 100; for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (netAt(mid) < g.target) lo = mid; else hi = mid; } mult = hi; basis = 'net'; pv = net; }
    else { mult = g.target / gross; basis = 'gross'; pv = gross; }
    st.forEach(x => { x.weight = x.value / gross * 100; x.tp = x.price * mult; });
    const dow = new Date(latest + 'T12:00:00Z').getUTCDay();
    const monday = addDays(latest, -((dow + 6) % 7));
    const common = Object.keys(C[syms[0]]).filter(d => syms.every(s => d in C[s])).sort();
    const prevOf = (c, d) => Object.keys(c).filter(x => x < d).sort().pop();
    const week = [0, 1, 2, 3, 4].map(i => {
      const d = addDays(monday, i), row = {date: d, stocks: {}, total: null};
      syms.forEach(s => { const c = C[s]; if (d in c && d <= latest) { const p = prevOf(c, d); row.stocks[s] = {close: c[d], pct: p ? (c[d] / c[p] - 1) * 100 : null, value: c[d] * g.holdings[s].shares}; } });
      if (common.includes(d) && d <= latest) { row.total = syms.reduce((a, s) => a + C[s][d] * g.holdings[s].shares, 0); const p = common.filter(x => x < d).pop(); if (p) row.tpct = (row.total / syms.reduce((a, s) => a + C[s][p] * g.holdings[s].shares, 0) - 1) * 100; }
      return row;
    });
    const month = common.filter(d => d > addDays(latest, -31)).map(d => ({date: d, total: syms.reduce((a, s) => a + C[s][d] * g.holdings[s].shares, 0)}));
    const mv = [...st].sort((a, b) => (a.pct || 0) - (b.pct || 0)), top = [...st].sort((a, b) => b.weight - a.weight)[0];
    return {g, st, gross, net, estTax, netOk, why, basis, pv, mult, pct: pv / g.target * 100, remaining: Math.max(0, g.target - pv), extra: Math.max(0, pv - g.target),
      grossNeeded: gross * mult, rise: Math.max(0, (mult - 1) * 100), dayv: st.reduce((a, x) => a + x.dayv, 0), latest, week, month, best: mv[mv.length - 1], worst: mv[0], top,
      asOf: (WL.find(w => w.as_of_date === latest) || {}).as_of};
  }
  const $$ = v => '$' + Math.round(v).toLocaleString('en-US');
  const $k = v => '$' + (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : Math.round(v).toLocaleString('en-US'));
  const pc = (v, d = 2) => v == null ? '' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`;
  const cls = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
  const GCOL = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#a855f7', '#22d3ee'];
  function goalChip() {
    const g = gLoad(); if (!g) return '';
    const r = goalCompute(g); if (r.err) return '';
    return `<a class="gchip${r.pct >= 100 ? ' done' : ''}" href="#/finance" title="${esc(g.label)} (${r.basis}${r.basis === 'gross' ? ', before taxes' : ', after est. tax'})">${g.image ? CAR_SVG : ''}${$k(r.pv)} / ${$k(g.target)}</a>`;
  }
  function goalChart(pts, needed) {
    if (pts.length < 2) return `<div class="gc-empty">Chart fills in as the week trades.</div>`;
    const W = 560, Hh = 150, P = 6, ys = pts.map(p => p.total);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    const showN = needed && needed < hi + (hi - lo + 1) * 1.5 && needed > lo - (hi - lo + 1) * 1.5;
    if (showN) { lo = Math.min(lo, needed); hi = Math.max(hi, needed); }
    const pad = (hi - lo) * 0.12 || hi * 0.01; lo -= pad; hi += pad;
    const x = i => P + i * (W - 2 * P) / (pts.length - 1), y = v => Hh - P - (v - lo) / (hi - lo) * (Hh - 2 * P);
    const up = ys[ys.length - 1] >= ys[0];
    const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
    return `<svg class="gchart" viewBox="0 0 ${W} ${Hh + 18}" preserveAspectRatio="none" role="img" aria-label="Combined value">
      ${showN ? `<line x1="0" x2="${W}" y1="${y(needed)}" y2="${y(needed)}" class="gneed"/><text x="${W - 4}" y="${y(needed) - 4}" text-anchor="end" class="glab">needed ${$k(needed)}</text>` : ''}
      <polygon points="${x(0)},${Hh - P} ${line} ${x(pts.length - 1)},${Hh - P}" class="garea ${up ? 'up' : 'down'}"/><polyline points="${line}" class="gline ${up ? 'up' : 'down'}"/>
      ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.total)}" r="${pts.length > 8 ? 0 : 3.5}" class="gdot"><title>${p.date}: ${$$(p.total)}</title></circle>`).join('')}
      <text x="${P}" y="${Hh + 14}" class="glab">${pts[0].date.slice(5)}</text><text x="${W - P}" y="${Hh + 14}" text-anchor="end" class="glab">${pts[pts.length - 1].date.slice(5)}</text></svg>`;
  }
  function goalForm(g) {
    g = g || {label: '', car: '', image: '', target: '', target_type: 'net', holdings: {}, tax: {}};
    const rows = Object.entries(g.holdings); while (rows.length < 4) rows.push(['', {}]);
    const opts = sel => `<option value="">—</option>` + WL.map(w => `<option ${w.symbol === sel ? 'selected' : ''}>${esc(w.symbol)}</option>`).join('');
    const v = x => x == null ? '' : esc(x), t = g.tax || {};
    return `<form class="gform" id="gform" autocomplete="off">
      <p class="gpriv">🔒 Stored only in this browser (localStorage). Nothing you enter is sent anywhere or published.</p>
      <div class="gf-grid">
        <label>Goal name<input name="label" value="${v(g.label)}" placeholder="e.g. New car fund"></label>
        <label>Target amount ($)<input name="target" inputmode="decimal" value="${v(g.target)}" placeholder="e.g. 50000"></label>
        <label>Target is<select name="target_type"><option value="net" ${g.target_type !== 'gross' ? 'selected' : ''}>Net (after tax)</option><option value="gross" ${g.target_type === 'gross' ? 'selected' : ''}>Gross (before tax)</option></select></label>
        <label>Car hero image<select name="image"><option value="">None</option><option value="model-yl" ${g.image === 'model-yl' ? 'selected' : ''}>White Tesla Model Y L</option></select></label>
        <label>Car name (for “% to your …”)<input name="car" value="${v(g.car)}" placeholder="e.g. Model YL"></label>
      </div>
      <table class="gf-h"><thead><tr><th>Ticker</th><th>Shares</th><th>Cost basis total ($, optional)</th><th>Held</th></tr></thead><tbody>
      ${rows.map(([s, h]) => `<tr><td><select name="sym">${opts(s)}</select></td><td><input name="shares" inputmode="decimal" value="${v(h.shares)}"></td>
        <td><input name="basis" inputmode="decimal" value="${v(h.cost_basis_total)}" placeholder="unknown"></td>
        <td><select name="term"><option value="">?</option><option value="long" ${h.term === 'long' ? 'selected' : ''}>Long</option><option value="short" ${h.term === 'short' ? 'selected' : ''}>Short</option></select></td></tr>`).join('')}
      </tbody></table>
      <div class="gf-grid tax"><label>Federal long-term %<input name="federal_long" inputmode="decimal" value="${v(t.federal_long)}" placeholder="e.g. 15"></label>
        <label>Federal short-term %<input name="federal_short" inputmode="decimal" value="${v(t.federal_short)}" placeholder="your bracket"></label>
        <label>State %<input name="state" inputmode="decimal" value="${v(t.state)}" placeholder="e.g. 5"></label>
        <label>NIIT % (optional)<input name="niit" inputmode="decimal" value="${v(t.niit)}" placeholder="3.8 if it applies"></label></div>
      <div class="gf-act"><button type="submit" class="gbtn pri">Save goal</button><button type="button" class="gbtn" data-goal="cancel">Cancel</button>
        <span class="sp"></span><button type="button" class="gbtn" data-goal="import">Import code</button></div>
      <div class="gimp" hidden><textarea id="gimp" placeholder="Paste a setup code or setup link"></textarea><button type="button" class="gbtn" data-goal="doimport">Import</button></div>
    </form>`;
  }
  function goalPanel(editing) {
    const g = gLoad();
    if (editing) return `<section class="goal edit" id="goal"><div class="g-h"><h2>${g ? 'Edit goal' : 'Set up my goal'}</h2></div>${goalForm(g)}</section>`;
    if (!g) return `<section class="goal empty" id="goal"><div class="g-empty"><div><h2>Track a selling goal</h2><p>Pick shares from your watchlist and a target amount. It shows progress, this week's closes and the price moves you need. Everything stays private on this device.</p></div>
      <button class="gbtn pri" data-goal="edit">Set up my goal</button></div></section>`;
    const r = goalCompute(g);
    if (r.err) return `<section class="goal" id="goal"><div class="g-h"><h2>${esc(g.label)}</h2></div><p class="gnote">${esc(r.err)}</p><div class="gf-act"><button class="gbtn" data-goal="edit">Edit goal</button></div></section>`;
    const P = Math.max(0, Math.min(100, r.pct)), done = r.pct >= 100, car = g.car || 'goal';
    const basisTxt = r.basis === 'net' ? 'after estimated tax' : 'gross, before taxes';
    const segs = r.st.map((x, i) => `<i style="width:${x.value / Math.max(r.gross, g.target) * 100}%;background:${GCOL[i % 6]}" title="${x.symbol} ${$$(x.value)}"></i>`).join('');
    const hero = g.image === 'model-yl' ? `<div class="g-car${done ? ' done' : ''}" style="--p:${P}%">
        <div class="g-img"><img class="bw" src="${CAR_IMG}" alt=""><img class="col" src="${CAR_IMG}" alt="White Tesla Model Y L"><i class="seam"></i></div>
        <div class="g-shade"></div>
        <div class="g-cap"><div class="g-t">${CAR_SVG} ${esc(g.label)}</div><div class="g-big">${done ? `Goal reached! 🎉` : `${P.toFixed(1).replace(/\.0$/, '')}% to your ${esc(car)}`}</div>
          <div class="g-sub">${$$(r.pv)} ${r.basis === 'net' ? 'net (est.)' : 'gross'} of ${$$(g.target)} ${g.target_type === 'net' ? 'net goal' : 'goal'} · ${done ? `${$$(r.extra)} extra for accessories` : `${$$(r.remaining)} to go`}</div></div>
        ${done ? '<div class="confetti">' + Array.from({length: 18}, (_, i) => `<b style="--i:${i}"></b>`).join('') + '</div>' : ''}
        <span class="credit">${CAR_CREDIT}</span></div>` :
      `<div class="g-h"><h2>${esc(g.label)}</h2><div class="g-big sm">${done ? 'Goal reached! 🎉' : `${P.toFixed(1)}% to goal`}</div></div>`;
    const road = `<div class="road" style="--p:${P}%"><div class="lane"></div><div class="fill"></div><span class="marker">${CAR_SVG}</span><span class="flag">🏁</span></div>`;
    const weekRows = r.week.map(w => `<tr${w.total == null ? ' class="blank"' : ''}><th>${new Date(w.date + 'T12:00:00Z').toLocaleDateString('en-US', {weekday: 'short', timeZone: 'UTC'})}<small>${w.date.slice(5).replace('-', '/')}</small></th>
      ${r.st.map(x => { const c = w.stocks[x.symbol]; return c ? `<td><b>${c.close.toFixed(2)}</b><small class="${cls(c.pct)}">${pc(c.pct)}</small><small class="pv">${$$(c.value)}</small></td>` : '<td class="na">—</td>'; }).join('')}
      <td class="tot">${w.total != null ? `<b>${$$(w.total)}</b><small class="${cls(w.tpct)}">${pc(w.tpct)}</small>` : '—'}</td></tr>`).join('');
    const weekPts = r.week.filter(w => w.total != null).map(w => ({date: w.date, total: w.total}));
    return `<section class="goal${done ? ' reached' : ''}" id="goal">${hero}
      ${road}
      <div class="g-stats">
        <div><span>${r.basis === 'net' ? 'Net (est.)' : 'Gross value'}</span><b>${$$(r.pv)}</b><small class="${cls(r.dayv)}">${r.dayv >= 0 ? '+' : '−'}${$$(Math.abs(r.dayv))} today (gross)</small></div>
        <div><span>Target</span><b>${$$(g.target)}</b><small>${g.target_type === 'net' ? 'net, after tax' : 'gross'}</small></div>
        <div><span>${done ? 'Extra' : 'Remaining'}</span><b>${$$(done ? r.extra : r.remaining)}</b><small>${done ? 'for accessories' : (100 - r.pct).toFixed(2) + '% to go'}</small></div>
        <div><span>Rise needed</span><b>${done ? '0%' : pc(r.rise)}</b><small>all together (gross ${$k(r.grossNeeded)})</small></div>
      </div>
      <div class="gbar">${segs}<span class="gmark" style="left:${g.target / Math.max(r.gross, g.target) * 100}%"></span></div>
      <ul class="glegend">${r.st.map((x, i) => `<li><i style="background:${GCOL[i % 6]}"></i><a href="#/stock/${esc(x.symbol)}">${esc(x.symbol)}</a> ${$$(x.value)} <em>${x.weight.toFixed(1)}%</em></li>`).join('')}</ul>
      <p class="gnote">${r.basis === 'net' ? `Est. tax ${$$(r.estTax)} on gains → net ${$$(r.net)} from ${$$(r.gross)} gross. Estimate only, not tax advice.` :
        `<b>Gross, before taxes.</b> ${g.target_type === 'net' ? `Add ${r.why.join(' and ')} to see after-tax progress.` : ''}`}</p>
      <div class="g-cols">
        <div class="g-card"><div class="g-ch"><h3>This week</h3><span>closes · ${esc(r.latest)}</span></div>
          <div class="gtw"><table class="gweek"><thead><tr><th></th>${r.st.map(x => `<th>${esc(x.symbol)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${weekRows}</tbody></table></div>
          <div class="g-ch"><h3>Combined value</h3><div class="gseg"><button class="on" data-goal="rng" data-r="w">Week</button><button data-goal="rng" data-r="m">1M</button></div></div>
          <div class="gcw" data-w='${esc(JSON.stringify(weekPts))}' data-m='${esc(JSON.stringify(r.month))}' data-n="${r.grossNeeded}">${goalChart(weekPts, r.grossNeeded)}</div></div>
        <div class="g-card"><div class="g-ch"><h3>Target prices</h3><span>equal-% move</span></div>
          <table class="gtp"><thead><tr><th></th><th>Now</th><th>Target</th><th>Move</th></tr></thead><tbody>
          ${r.st.map(x => `<tr><th><a href="#/stock/${esc(x.symbol)}">${esc(x.symbol)}</a></th><td>${x.price.toFixed(2)}</td><td><b>${x.tp.toFixed(2)}</b></td><td class="${done ? 'up' : ''}">${pc((x.tp / x.price - 1) * 100)}</td></tr>`).join('')}</tbody></table>
          <div class="gmov"><div><span>Best today</span><b class="${cls(r.best.pct)}">${esc(r.best.symbol)} ${pc(r.best.pct)}</b></div><div><span>Worst today</span><b class="${cls(r.worst.pct)}">${esc(r.worst.symbol)} ${pc(r.worst.pct)}</b></div></div>
          <p class="gnote">${esc(r.top.symbol)} drives ~${r.top.weight.toFixed(0)}% of the total, so a 1% move in ${esc(r.top.symbol)} is worth ~${$$(r.top.value / 100)}. ${done ? '' : `Everything rising ${r.rise.toFixed(1)}% together gets you there.`}</p></div>
      </div>
      <div class="g-foot"><span>${esc(r.asOf || '')} · ${basisTxt}. Private: computed in this browser.</span>
        <span class="sp"></span><button class="gbtn" data-goal="edit">Edit</button><button class="gbtn" data-goal="export">Setup link</button><button class="gbtn" data-goal="clear">Remove</button></div>
      <div class="gexp" hidden></div></section>`;
  }
  function goalFromForm(f) {
    const fd = n => [...f.querySelectorAll(`[name="${n}"]`)].map(e => e.value);
    const H = {}, sy = fd('sym'), sh = fd('shares'), ba = fd('basis'), te = fd('term');
    sy.forEach((s, i) => { if (s) H[s] = {shares: sh[i], cost_basis_total: ba[i], term: te[i]}; });
    const one = n => (f.querySelector(`[name="${n}"]`) || {}).value;
    return gClean({label: one('label'), car: one('car'), image: one('image'), target: one('target'), target_type: one('target_type'), holdings: H,
      tax: {federal_long: one('federal_long'), federal_short: one('federal_short'), state: one('state'), niit: one('niit')}});
  }
  function goalRerender(editing) { const el = document.getElementById('goal'); if (el) el.outerHTML = goalPanel(editing); }
  function goalImport(txt) {
    const m = String(txt).match(/setup=([\w-]+)/); const code = m ? m[1] : String(txt).trim();
    const g = gClean(b64d(code)); gSave(g); return g;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-goal]'); if (!b) return;
    const a = b.dataset.goal;
    if (a === 'edit') goalRerender(true);
    else if (a === 'cancel') goalRerender(false);
    else if (a === 'clear') { if (confirm('Remove your goal settings from this device?')) { localStorage.removeItem(GKEY); goalRerender(false); } }
    else if (a === 'import') { const x = document.querySelector('.gimp'); x.hidden = !x.hidden; }
    else if (a === 'doimport') { try { goalImport(document.getElementById('gimp').value); goalRerender(false); } catch (err) { alert('That setup code could not be read.'); } }
    else if (a === 'export') {
      const x = document.querySelector('.gexp'), link = location.href.split('#')[0] + '#/finance?setup=' + b64e(gLoad());
      x.hidden = !x.hidden;
      x.innerHTML = `<p>Private setup link: opening it on another device saves these settings there. The part after # never reaches a server, but anyone you send it to can see the numbers.</p><input readonly value="${esc(link)}" onclick="this.select()"><button class="gbtn" data-goal="copy">Copy</button>`;
    } else if (a === 'copy') { const i = document.querySelector('.gexp input'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(() => b.textContent = 'Copied', () => document.execCommand('copy')); }
    else if (a === 'rng') {
      const w = b.closest('.g-card').querySelector('.gcw');
      b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      w.innerHTML = goalChart(JSON.parse(w.dataset[b.dataset.r]), +w.dataset.n);
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'gform') return;
    e.preventDefault();
    const g = goalFromForm(e.target);
    if (!Object.keys(g.holdings).length || !(g.target > 0)) { alert('Add at least one ticker with shares, and a target amount.'); return; }
    gSave(g); goalRerender(false);
  });
  (function takeSetupLink() {  // #/finance?setup=<base64url> → save locally, then scrub it from the address bar
    const m = location.hash.match(/^#\/finance\?(?:.*&)?setup=([\w-]+)/);
    if (!m) return;
    try { goalImport(m[1]); } catch (e) { console.warn('bad setup code'); }
    history.replaceState(null, '', location.pathname + location.search + '#/finance');
  })();

  function route() {
    const hsh = location.hash;
    const m = hsh.match(/^#\/stock\/([A-Z.]+)/i);
    const id = (hsh.match(/^#\/(\w+)/) || [])[1] || 'top';
    if (extActive && extActive.unmount) extActive.unmount();
    extActive = null;
    const ext = EXT.find(t => t.id === id);
    if (ext) { renderNav(id); setAccent(ext); app.innerHTML = '<div class="wrap ext-root"></div>'; extActive = ext; ext.render(app.firstChild); window.scrollTo({top: 0}); return; }
    if (m) { renderNav('finance'); setAccent(SEC.finance || HOME); app.innerHTML = pageStock(m[1].toUpperCase()); }
    else if (id === 'watch' && WATCH) { renderNav('watch'); setAccent(WATCH); app.innerHTML = pageWatch(); bindWatch(); }
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
