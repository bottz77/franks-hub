(() => {
  const D = JSON.parse(document.getElementById('hub-data').textContent);
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app'), nav = $('#nav'), q = $('#q');
  const SEC = Object.fromEntries(D.sections.map(s => [s.id, s]));
  /* (private feature removed from the public build) */
  const EXT = window.FH_EXT_TABS || [];  // optional add-on tabs registered by separately built scripts
  let extActive = null;
  const PRIV = {};  // private-only features (stripped from the public build)
  const P = (name, ...a) => PRIV[name] ? PRIV[name](...a) : '';
  let WATCH = null;
  /* (private feature removed from the public build) */
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
    return `<div class="img">${fb}${it.thumb ? `<img loading="lazy" src="${esc(it.thumb)}" alt="" referrerpolicy="no-referrer">` : ''}</div>`;
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
  /* (private feature removed from the public build) */
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


  // ---------- Rangers Game Center (NHL schedule API, fetched at build time; the API has no CORS so no live refresh) ----------
  const ETd = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'});
  const ETday = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric'});
  const ETtime = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit'});
  const gState = g => {
    const t = new Date(g.start).getTime(), now = Date.now();
    if (!g.start || isNaN(t)) return 'tbd';
    if (now >= t + 4 * 3600e3) return 'played';      // over, but the final score arrives with the next build
    if (now >= t) return 'live';
    return ETd.format(new Date(t)) === ETd.format(new Date()) ? 'today' : 'future';
  };
  const logo = (src, alt, cls = '') => src ? `<img class="nhl-logo ${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : `<span class="nhl-logo ph ${cls}">${esc(alt)}</span>`;
  const tvChips = g => (g.tv || []).slice(0, 4).map(n => `<span class="tv">${esc(n)}</span>`).join('');
  function rangersCard() {
    const N = D.nhl; if (!N) return '';
    const up = (N.next || []).filter(g => gState(g) !== 'played');
    const played = (N.next || []).filter(g => gState(g) === 'played');
    const nx = up[0], L = N.last;
    const when = g => `${ETday.format(new Date(g.start))} · ${ETtime.format(new Date(g.start))} ET`;
    let h = `<section class="nhl fade" style="--k:#0038A8;--k2:#CE1126"><div class="nhl-h"><h2><span class="nhl-dot"></span>Rangers Game Center</h2>
      <a class="nhl-more" href="${esc(N.schedule_url)}" ${ext}>Full schedule ↗</a></div><div class="nhl-body">`;
    if (nx) {
      const st = gState(nx), badge = st === 'today' ? '<span class="nhl-badge gd">Game day</span>' : st === 'live' ? '<span class="nhl-badge live">Live now</span>' : '';
      h += `<a class="nhl-next${st === 'today' || st === 'live' ? ' hot' : ''}" href="${esc(nx.link || N.schedule_url)}" ${ext}>
        <div class="nhl-k">Next game${nx.type && nx.type !== 'Regular season' ? ` · <b>${esc(nx.type)}</b>` : ''}${badge}</div>
        <div class="nhl-mu">${logo(nx.logo, 'NYR')}<span class="nhl-vs">${nx.home ? 'vs' : '@'}</span>${logo(nx.opp.logo, nx.opp.abbrev)}
          <div class="nhl-opp"><b>${nx.home ? 'vs' : '@'} ${esc(nx.opp.name)}</b><span>${esc(when(nx))}${nx.venue ? ' · ' + esc(nx.venue) : ''}</span></div></div>
        ${nx.tv && nx.tv.length ? `<div class="nhl-tv"><span>Watch</span>${tvChips(nx)}</div>` : ''}
        ${st === 'live' ? '<div class="nhl-note">In progress: tap for the live score on NHL.com</div>' : ''}</a>`;
    } else h += `<div class="nhl-next"><div class="nhl-k">Next game</div><p class="nhl-note">No upcoming games on the schedule.</p></div>`;
    const side = [];
    if (played.length) side.push(`<div class="nhl-last"><div class="nhl-k">Just played</div>${played.slice(-1).map(g => `<a class="nhl-row" href="${esc(g.link || N.schedule_url)}" ${ext}>${logo(g.opp.logo, g.opp.abbrev, 'sm')}<span><b>${g.home ? 'vs' : '@'} ${esc(g.opp.abbrev)}</b> · ${esc(ETday.format(new Date(g.start)))}</span><em>Final score on NHL.com ↗</em></a>`).join('')}</div>`);
    if (L && L.score) {
      const res = L.result || '', rcls = res === 'W' ? 'w' : res === 'OTL' ? 'otl' : 'l';
      side.push(`<div class="nhl-last"><div class="nhl-k">Last result${L.type && L.type !== 'Regular season' ? ` · ${esc(L.type)}` : ''}</div>
        <a class="nhl-res" href="${esc(L.link || N.schedule_url)}" ${ext}><span class="nhl-wl ${rcls}">${esc(res)}</span>
        <span class="nhl-sc">${L.score.us}–${L.score.them}${L.decided_in ? ` <small>${esc(L.decided_in)}</small>` : ''}</span>${logo(L.opp.logo, L.opp.abbrev, 'sm')}
        <span class="nhl-ro"><b>${L.home ? 'vs' : '@'} ${esc(L.opp.name)}</b><span>${esc(ETday.format(new Date(L.start)))}</span></span></a></div>`);
    }
    const more = up.slice(1, 5);
    if (more.length) side.push(`<div class="nhl-up"><div class="nhl-k">Coming up</div><ul>${more.map(g => `<li><a class="nhl-row" href="${esc(g.link || N.schedule_url)}" ${ext}>${logo(g.opp.logo, g.opp.abbrev, 'sm')}
      <span><b>${g.home ? 'vs' : '@'} ${esc(g.opp.abbrev)}</b>${g.type === 'Preseason' ? ' <i class="pre">Pre</i>' : ''}</span><span class="d">${esc(when(g))}</span><span class="t">${esc((g.tv || []).slice(0, 2).join(' · '))}</span></a></li>`).join('')}</ul></div>`);
    h += `<div class="nhl-side">${side.join('')}</div></div>
      <div class="nhl-foot">Schedule, scores and TV listings from the NHL's public API · updated ${esc(rel(N.fetched))}${N.stale ? ' (cached copy)' : ''}</div></section>`;
    return h;
  }

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
    h += `<div class="cols"><div class="main">${rangersCard()}${briefing(D.briefings && D.briefings.top, HOME)}</div>
      <aside class="side">${P('watchlist')}${latestRail(all.filter(x => !used.has(x.it.link)), 'Latest', 9)}</aside></div></div>`;
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
      <div class="chips">${srcs.map(([n, c]) => `<span class="chip">${esc(n)} · ${c}</span>`).join('')}</div></header>${s.id === 'rangers' ? rangersCard() : ''}`;
    if (heroes.length) h += `<section class="hero fade">${hcard(heroes[0], s, true)}<div class="hero-side">${heroes.slice(1).map(i => hcard(i, s)).join('')}</div></section>`;
    /* (private feature removed from the public build) */
    h += `<div class="cols"><div class="main">${briefing(b, s, true)}</div><aside class="side">${s.watchlist ? P('watchlist') : ''}${latestRail(allItems().filter(x => x.s.id !== s.id), 'Elsewhere on the hub', 6)}</aside></div></div>`;
    h += vband(s.videos, s, s.video_label || `${s.name} videos`);
    (s.video_strips || []).forEach(x => { h += vband(x.videos, s, x.label); });
    h += `<div class="wrap" style="${K(s)}"><div class="cols"><div class="main">
      ${rim.length ? `<div class="sec-h" style="--k:${s.accent}"><h2>Top stories</h2></div><div class="grid">${rim.map(i => card(i, s, false)).join('')}</div>` : ''}
      ${rtx.length ? `<section class="more-h"><div class="sec-h" style="--k:${s.accent}"><h2>More headlines</h2></div><div class="tcols">${rtx.map(i => trow(i, s, false)).join('')}</div></section>` : ''}
      </div><aside class="side">${xFeed(s.id, 6)}${s.watchlist ? '' : P('watchlist')}</aside></div></div>`;
    return h;
  }


  /* (private feature removed from the public build) */
  // ---------- chrome ----------
  function renderNav(active) {
    const tabs = [HOME, ...D.sections];
    /* (private feature removed from the public build) */
    nav.innerHTML = [...tabs, ...EXT].map(s => `<a href="#/${s.id}" class="${s.id === active ? 'active' : ''}" style="--c:${s.accent}">${esc(s.id === 'top' ? 'Home' : s.name)}</a>`).join('')
      + (D.private_url ? `<a class="nav-lock" href="${esc(D.private_url)}" rel="noopener" title="Frank's private pages (login required)">🔒 My stuff</a>` : '');
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
  /* (private feature removed from the public build) */

  function route() {
    const hsh = location.hash;
    /* (private feature removed from the public build) */
    const id = (hsh.match(/^#\/(\w+)/) || [])[1] || 'top';
    if (extActive && extActive.unmount) extActive.unmount();
    extActive = null;
    const ext = EXT.find(t => t.id === id);
    if (ext) { renderNav(id); setAccent(ext); app.innerHTML = '<div class="wrap ext-root"></div>'; extActive = ext; ext.render(app.firstChild); window.scrollTo({top: 0}); return; }
    if (false) { /* no-op */ }
    /* (private feature removed from the public build) */
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
  // broken thumbnails: drop the <img> so the styled fallback tile shows (no inline handlers, CSP-friendly)
  document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest('#app')) t.remove(); }, true);
  if (D.private) {  // private site: no service worker at all (never cache gated content); remove any old one
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  } else if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', {scope: './'}).catch(() => {}));
  }
})();
