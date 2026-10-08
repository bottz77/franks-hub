(() => {
  const D = JSON.parse(document.getElementById('hub-data').textContent);
  // Public site: the first public builds (Sep 27, 2026) kept the old selling-goal / Finance tracker settings in this
  // browser's localStorage (fh_goal_*). The public site stores nothing now, so clear any leftovers on every load.
  // (Only fh_goal_* keys: other pages on the shared github.io origin are left alone; the private site is untouched.)
  if (!D.private) { try { Object.keys(localStorage).filter(k => /^fh_goal/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app'), nav = $('#nav'), q = $('#q');
  const SEC = Object.fromEntries(D.sections.map(s => [s.id, s]));
  /* (private feature removed from the public build) */
  const EXT = window.FH_EXT_TABS || [];  // optional add-on tabs registered by separately built scripts
  let extActive = null;
  const PRIV = {};  // private-only features (stripped from the public build)
  const P = (name, ...a) => PRIV[name] ? PRIV[name](...a) : '';
  let WATCH = null;
  let BOOKMARKS = null;
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
  function nhlPlace(n) {
    if (n == null) return '';
    const s = n % 100, suf = (s >= 11 && s <= 13) ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th');
    return n + suf;
  }
  function nhlStandingsStrip(S) {
    if (!S) return '';
    const gd = S.goal_diff, gdTxt = gd == null ? '—' : (gd > 0 ? '+' : '') + gd;
    const place = S.division_rank != null ? `${nhlPlace(S.division_rank)} in ${esc(S.division || 'Metro')}` : '';
    return `<div class="nhl-strip" title="Season standings from the NHL API">
      <span class="nhl-strip-k">Season</span>
      ${place ? `<span class="nhl-strip-place">${place}</span>` : ''}
      <span class="nhl-strip-rec"><b>${esc(S.record)}</b> · ${S.points} pts</span>
      <span class="nhl-strip-gp">GP ${S.games_played}</span>
      <span class="nhl-strip-gd">GD ${esc(gdTxt)}</span>
      ${S.streak ? `<span class="nhl-strip-st ${esc((S.streak_code || '').toLowerCase())}">${esc(S.streak)}</span>` : ''}
    </div>`;
  }
  function nhlSeasonSection() {
    const N = D.nhl, S = N && N.standings; if (!S) return '';
    const gd = S.goal_diff, gdTxt = gd == null ? '—' : (gd > 0 ? '+' : '') + gd;
    const peers = (S.division_peers || []).map(p => {
      const me = p.abbrev === (N.team || 'NYR');
      return `<tr class="${me ? 'me' : ''}"><td class="rk">${p.division_rank}</td><td class="tm">${me ? '<b>' : ''}${esc(p.abbrev)}${me ? '</b>' : ''}</td>
        <td>${esc(p.record)}</td><td class="pts">${p.points}</td><td class="gp">${p.games_played}</td>
        <td class="gd">${p.goal_diff == null ? '—' : ((p.goal_diff > 0 ? '+' : '') + p.goal_diff)}</td>
        <td class="st">${esc(p.streak || '—')}</td></tr>`;
    }).join('');
    return `<section class="nhl-season fade" style="--k:#0038A8;--k2:#CE1126">
      <div class="nhl-season-h"><h2><span class="nhl-dot"></span>Season standings</h2>
        <a class="nhl-more" href="${esc(S.standings_url || 'https://www.nhl.com/standings/division')}" ${ext}>Full standings ↗</a></div>
      <div class="nhl-season-hero">
        <div class="nhl-season-place"><em>${nhlPlace(S.division_rank)}</em><span>${esc(S.division || 'Metropolitan')}</span></div>
        <div class="nhl-season-stats">
          <div><span>Record</span><b>${esc(S.record)}</b></div>
          <div><span>Points</span><b>${S.points}</b></div>
          <div><span>Games</span><b>${S.games_played}</b></div>
          <div><span>Goal diff</span><b class="${gd > 0 ? 'up' : gd < 0 ? 'down' : ''}">${esc(gdTxt)}</b></div>
          <div><span>Streak</span><b class="st-${esc((S.streak_code || '').toLowerCase())}">${esc(S.streak || '—')}</b></div>
          <div><span>Conference</span><b>${nhlPlace(S.conference_rank)} ${esc(S.conference || '')}</b></div>
        </div>
      </div>
      ${peers ? `<div class="nhl-season-table-wrap"><table class="nhl-season-table"><thead><tr><th>#</th><th>Team</th><th>W-L-OTL</th><th>PTS</th><th>GP</th><th>GD</th><th>Streak</th></tr></thead><tbody>${peers}</tbody></table></div>` : ''}
      <div class="nhl-foot">Standings from the NHL's public API · updated ${esc(rel(S.fetched || N.fetched))}${S.stale ? ' (cached copy)' : ''}</div>
    </section>`;
  }
  function rangersCard() {
    const N = D.nhl; if (!N) return '';
    const up = (N.next || []).filter(g => gState(g) !== 'played');
    const played = (N.next || []).filter(g => gState(g) === 'played');
    const nx = up[0], L = N.last;
    const when = g => `${ETday.format(new Date(g.start))} · ${ETtime.format(new Date(g.start))} ET`;
    let h = `<section class="nhl fade" style="--k:#0038A8;--k2:#CE1126"><div class="nhl-h"><h2><span class="nhl-dot"></span>Rangers Game Center</h2>
      <a class="nhl-more" href="${esc(N.schedule_url)}" ${ext}>Full schedule ↗</a></div>
      ${nhlStandingsStrip(N.standings)}
      <div class="nhl-body">`;
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

  // ---------- John Jay Hockey Club (JJPUCK.com / Crossbar team pages, scraped at build time by jjpuck.py) ----------
  const JJ_SITE = 'https://www.jjpuck.com/';
  function jjCredit(J) {
    const sched = (J && J.schedule_url) || 'https://www.jjpuck.com/schedule';
    const prog = (J && J.program_url) || 'https://www.jjpuck.com/program/2026-john-jay-hockey/6240';
    return `<div class="jj-credit"><span class="jj-credit-k">Source</span>
      <span class="jj-credit-t">Schedules &amp; club info from <a href="${esc((J && J.site) || JJ_SITE)}" ${ext}><b>JJPUCK.com</b></a> · John Jay Hockey Club (JJHC), Wappingers · HVHSIHA</span>
      <span class="jj-credit-l"><a href="${esc(sched)}" ${ext}>Club schedule ↗</a><a href="${esc(prog)}" ${ext}>2026 program ↗</a></span></div>`;
  }
  const jjEnded = e => { const t = new Date(e.end || e.start).getTime(); return !isNaN(t) && t < Date.now(); };
  const jjTime = e => {
    if (!e.start) return 'Time TBA';
    const a = ETtime.format(new Date(e.start)), b = e.end ? ETtime.format(new Date(e.end)) : '';
    const am = s => s.slice(-2); return b ? (am(a) === am(b) ? a.slice(0, -3) : a) + '–' + b : a;
  };
  function jjRow(e, T) {
    const d = new Date(e.start || e.date), today = ETd.format(d) === ETd.format(new Date());
    const g = e.kind === 'game';
    const what = g ? `<b>${e.opponent ? `${e.home === false ? '@' : 'vs'} ${esc(e.opponent)}` : esc(e.type)}</b>${e.score ? ` <span class="jj-score">${esc(e.score)}</span>` : ''}`
      : (e.kind === 'practice' ? '' : `<b>${esc(e.type)}</b>`) + (e.shared_with ? `<span class="jj-with">shared with ${esc(e.shared_with === 'Junior Varsity' ? 'JV' : e.shared_with)}</span>` : '');
    const venue = e.venue ? (e.map ? `<a href="${esc(e.map)}" ${ext}>${esc(e.venue)}</a>` : esc(e.venue)) + (e.town ? ` · ${esc(e.town)}` : '') : '';
    return `<li class="jj-ev${g ? ' game' : ''}${today ? ' today' : ''}" data-end="${esc(e.end || e.start || '')}">
      <div class="jj-date"><span>${esc(ETday.format(d).split(',')[0])}</span><b>${esc(new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', day: 'numeric'}).format(d))}</b><i>${esc(new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', month: 'short'}).format(d))}</i></div>
      <div class="jj-main"><div class="jj-what"><span class="jj-pill ${g ? 'g' : 'p'}">${g ? 'Game' : esc(e.kind === 'practice' ? 'Practice' : e.type)}</span>${what}${today ? '<span class="jj-today">Today</span>' : ''}</div>
        <div class="jj-sub"><span class="jj-time">${esc(jjTime(e))}</span>${venue ? `<span class="jj-venue">${venue}</span>` : ''}</div></div></li>`;
  }
  function jjTeam(T, J, on) {
    const games = (T.upcoming_games || []).filter(e => !jjEnded(e));
    const other = (T.upcoming_other || []).filter(e => !jjEnded(e));
    const n = 10, shownG = games.slice(0, 6), shownO = other.slice(0, Math.max(4, n - shownG.length));
    const gHtml = shownG.length ? `<div class="jj-k">Upcoming games</div><ul class="jj-list">${shownG.map(e => jjRow(e, T)).join('')}</ul>`
      : `<div class="jj-empty"><b>No games posted yet.</b> ${T.counts && T.counts.games ? 'No more games on the schedule.' : 'JJHC games go up on JJPUCK.com as the HVHSIHA season nears (late October to mid-February).'}</div>`;
    const oHtml = shownO.length ? `<div class="jj-k">${shownG.length ? 'Practices' : 'Next on the ice'}</div><ul class="jj-list">${shownO.map(e => jjRow(e, T)).join('')}</ul>` : '';
    return `<div class="jj-panel" data-jj-panel="${T.id}"${on ? '' : ' hidden'}>${gHtml}${oHtml}
      <div class="jj-tfoot"><span>${T.counts ? `${T.counts.upcoming} upcoming of ${T.counts.total} posted (${T.counts.games} games · ${T.counts.practices} practices)` : ''}${T.season ? ` · ${esc(T.season)}` : ''}</span>
      <a href="${esc(T.schedule_url)}" ${ext}>${esc(T.name)} schedule on JJPUCK.com ↗</a></div></div>`;
  }
  function jjCard() {
    const J = D.jjpuck, teams = (J && J.teams) || [];
    let h = `<section class="jj fade"><div class="jj-h"><h2><span class="jj-dot"></span>JJHC Schedule</h2>
      <a class="jj-more" href="${esc((J && J.schedule_url) || 'https://www.jjpuck.com/schedule')}" ${ext}>Full schedule on JJPUCK.com ↗</a></div>${jjCredit(J)}`;
    if (!teams.length) return h + `<p class="jj-empty" style="margin:0 18px 16px">Schedule unavailable right now: see <a href="https://www.jjpuck.com/schedule" ${ext}>JJPUCK.com</a>.</p></section>`;
    h += `<div class="jj-tabs" role="tablist">${teams.map((T, i) => `<button type="button" role="tab" class="jj-tab${i ? '' : ' on'}" data-jj-tab="${T.id}" aria-selected="${i ? 'false' : 'true'}">${esc(T.label || T.name)}<small>${(T.upcoming_games || []).filter(e => !jjEnded(e)).length ? (T.upcoming_games || []).filter(e => !jjEnded(e)).length + ' games' : ((T.upcoming_other || []).filter(e => !jjEnded(e)).length ? 'practices' : '')}</small></button>`).join('')}</div>`;
    h += teams.map((T, i) => jjTeam(T, J, !i)).join('');
    const stale = teams.some(T => T.stale), f = teams.map(T => T.fetched).sort()[0];
    return h + `<div class="jj-foot">Read from the public Crossbar team pages on JJPUCK.com at each Hub rebuild (twice daily) · updated ${esc(rel(f))}${stale ? ' (cached copy)' : ''} · times ET; check JJPUCK.com for last-minute changes</div></section>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-jj-tab]'); if (!b) return;
    const card = b.closest('.jj');
    card.querySelectorAll('[data-jj-tab]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
    card.querySelectorAll('[data-jj-panel]').forEach(p => { p.hidden = p.dataset.jjPanel !== b.dataset.jjTab; });
  });

  // ---------- JJHC Varsity practice plans (built from /workspace/coachy/plans at build time) ----------
  const jjPlanByDate = () => {
    const m = {};
    ((D.jjplans && D.jjplans.plans) || []).forEach(p => { m[p.date] = p; });
    return m;
  };
  const jjPlanDateLabel = date => {
    try {
      return new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'})
        .format(new Date(date + 'T12:00:00-04:00'));
    } catch (e) { return date; }
  };
  function jjPlansList() {
    const P = D.jjplans; if (!P || !(P.plans || []).length) return '';
    const next = P.next_date, today = P.today;
    const rows = P.plans.map(p => {
      const isNext = p.date === next;
      const isTonight = p.date === today;
      const badge = isTonight ? '<span class="jjp-badge tonight">Tonight</span>'
        : (isNext ? '<span class="jjp-badge next">Next</span>' : '');
      const d = new Date(p.date + 'T12:00:00-04:00');
      const day = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', weekday: 'short'}).format(d);
      const num = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', day: 'numeric'}).format(d);
      const mon = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', month: 'short'}).format(d);
      return `<li><a class="jjp-row${isNext || isTonight ? ' hot' : ''}" href="#/johnjay/practice/${esc(p.date)}">
        <div class="jj-date"><span>${esc(day)}</span><b>${esc(num)}</b><i>${esc(mon)}</i></div>
        <div class="jjp-main"><div class="jjp-top"><span class="jjp-focus">${esc(p.focus)}</span>${badge}</div>
          <div class="jjp-meta"><span>${esc(p.time || '')}</span>${p.rink ? `<span>${esc(p.rink)}</span>` : ''}</div></div>
        <span class="jjp-go" aria-hidden="true">→</span></a></li>`;
    }).join('');
    const drill = P.drill_library
      ? `<a class="jjp-drill-link" href="#/johnjay/drills">Drill library${P.drill_library.count ? ` · ${P.drill_library.count} drills` : ''} →</a>`
      : '';
    return `<section class="jjp fade" id="practice-plans"><div class="jjp-h"><h2><span class="jj-dot"></span>Practice plans</h2>
      <span class="jjp-sub">${P.count} Varsity plans · ADM 60-min${next ? ` · next <a href="#/johnjay/practice/${esc(next)}">${esc(jjPlanDateLabel(next))}</a>` : ''}</span></div>
      <p class="jjp-dek">Full timed blocks, station directions, and video links for every JJHC Varsity practice. Tap a row to open the plan.</p>
      <ul class="jjp-list">${rows}</ul>
      <div class="jjp-foot">${drill}<span>Plans refresh with the Hub build when files remain under coachy/plans</span></div></section>`;
  }
  function pageJjPlan(date) {
    const s = SEC.johnjay || {id: 'johnjay', name: 'John Jay', full_name: 'John Jay Hockey', accent: '#aaf7fd', accent2: '#2b4f9e', icon: '🏒'};
    const p = jjPlanByDate()[date];
    if (!p) {
      return `<div class="wrap" style="${K(s)}"><div class="jjp-detail fade"><a class="back" href="#/johnjay">← John Jay</a>
        <h1>Plan not found</h1><p>No practice plan for <code>${esc(date)}</code>. <a href="#/johnjay">Back to John Jay</a>.</p></div></div>`;
    }
    const P = D.jjplans || {};
    const dates = (P.plans || []).map(x => x.date);
    const ix = dates.indexOf(date);
    const prev = ix > 0 ? dates[ix - 1] : null;
    const nxt = ix >= 0 && ix < dates.length - 1 ? dates[ix + 1] : null;
    const isTonight = date === P.today, isNext = date === P.next_date;
    const badge = isTonight ? '<span class="jjp-badge tonight">Tonight</span>'
      : (isNext ? '<span class="jjp-badge next">Next practice</span>' : '');
    return `<div class="wrap" style="${K(s)}"><article class="jjp-detail fade">
      <div class="jjp-nav"><a class="back" href="#/johnjay">← Practice plans</a>
        <span class="jjp-pn">${prev ? `<a href="#/johnjay/practice/${esc(prev)}">← Prev</a>` : '<span></span>'}
        ${nxt ? `<a href="#/johnjay/practice/${esc(nxt)}">Next →</a>` : '<span></span>'}</span></div>
      <header class="jjp-dh"><div class="jjp-dh-t"><h1>${esc(p.title)}</h1>${badge}</div>
        <div class="jjp-chips">${p.focus ? `<span class="jjp-chip focus">${esc(p.focus)}</span>` : ''}
          ${p.time ? `<span class="jjp-chip">${esc(p.time)}</span>` : ''}
          ${p.rink ? `<span class="jjp-chip">${esc(p.rink)}</span>` : ''}
          ${p.shared_with ? `<span class="jjp-chip">Shared with ${esc(p.shared_with)}</span>` : ''}</div></header>
      <div class="jjp-body">${p.html || ''}</div>
      <div class="jjp-detail-foot"><a href="#/johnjay">← All practice plans</a>
        ${P.drill_library ? `<a href="#/johnjay/drills">Drill library →</a>` : ''}</div>
    </article></div>`;
  }
  function pageJjDrills() {
    const s = SEC.johnjay || {id: 'johnjay', name: 'John Jay', full_name: 'John Jay Hockey', accent: '#aaf7fd', accent2: '#2b4f9e', icon: '🏒'};
    const Dlib = D.jjplans && D.jjplans.drill_library;
    if (!Dlib) {
      return `<div class="wrap" style="${K(s)}"><div class="jjp-detail fade"><a class="back" href="#/johnjay">← John Jay</a>
        <h1>Drill library</h1><p>Not included in this build.</p></div></div>`;
    }
    return `<div class="wrap" style="${K(s)}"><article class="jjp-detail fade">
      <a class="back" href="#/johnjay">← John Jay</a>
      <header class="jjp-dh"><h1>${esc(Dlib.title || 'Drill library')}</h1>
        ${Dlib.count ? `<p class="jjp-dek">${Dlib.count} drills with setup notes and video links.</p>` : ''}</header>
      <div class="jjp-body">${Dlib.html || ''}</div>
      <div class="jjp-detail-foot"><a href="#/johnjay">← Practice plans</a></div>
    </article></div>`;
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
    /* (private feature removed from the public build) */
    const b = D.briefings && D.briefings.sections && D.briefings.sections[s.id];
    const [im, tx] = split(s.items);
    const heroes = im.slice(0, 3);
    const rest = s.items.filter(i => !heroes.includes(i));
    const [rim, rtx] = split(rest);
    const srcs = Object.entries(s.items.reduce((a, i) => (a[i.source] = (a[i.source] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
    let h = `<div class="wrap" style="${K(s)}"><header class="shead fade"><h1><span>${esc(s.icon)}</span> ${esc(s.full_name)}</h1>
      <span class="sub">${s.items.length} stories${s.videos && s.videos.length ? ` · ${s.videos.length} videos` : ''} · newest first${s.id === 'johnjay' ? ` · club info &amp; schedules from <a class="jj-src" href="https://www.jjpuck.com/" ${ext}>JJPUCK.com</a>` : ''}</span>
      <div class="chips">${srcs.map(([n, c]) => `<span class="chip">${esc(n)} · ${c}</span>`).join('')}</div></header>${s.id === 'rangers' ? rangersCard() + nhlSeasonSection() : ''}${s.id === 'johnjay' ? jjCard() + jjPlansList() : ''}`;
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
    const jjPractice = hsh.match(/^#\/johnjay\/practice\/(\d{4}-\d{2}-\d{2})\/?$/);
    const jjDrills = /^#\/johnjay\/drills\/?$/.test(hsh);
    const id = (hsh.match(/^#\/(\w+)/) || [])[1] || 'top';
    if (extActive && extActive.unmount) extActive.unmount();
    extActive = null;
    const ext = EXT.find(t => t.id === id);
    if (ext) { renderNav(id); setAccent(ext); app.innerHTML = '<div class="wrap ext-root"></div>'; extActive = ext; ext.render(app.firstChild); window.scrollTo({top: 0}); return; }
    if (false) { /* no-op */ }
    /* (private feature removed from the public build) */
    else if (jjPractice && SEC.johnjay) { renderNav('johnjay'); setAccent(SEC.johnjay); app.innerHTML = pageJjPlan(jjPractice[1]); }
    else if (jjDrills && SEC.johnjay) { renderNav('johnjay'); setAccent(SEC.johnjay); app.innerHTML = pageJjDrills(); }
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
