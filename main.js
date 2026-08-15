/* Firearms Tech Tree — chart host. No dependencies. */
(() => {
  "use strict";

  const DATA = window.FIREARM_DATA;
  const LORE = window.FIREARM_LORE || { ships: {}, edges: {} };
  const WIKI = "https://en.wikipedia.org/wiki/";
  const GROK = "https://grokipedia.com/page/";

  const STATUS = {
    us: { label: "United States", cls: "us" },
    su: { label: "USSR / Russia", cls: "su" },
    eu: { label: "Europe", cls: "eu" },
    rw: { label: "Elsewhere", cls: "rw" },
    hub: { label: "program", cls: "rw" }
  };

  const nodesById = new Map(DATA.nodes.map(n => [n.id, n]));

  // ---------- timeline scale ----------
  // piecewise-linear x scale over first-flight calendar years
  const T_STOPS = [
    [1860, 0], [1886, 420], [1900, 830], [1914, 1230], [1918, 1430],
    [1935, 1920], [1945, 2380], [1955, 2840], [1965, 3290], [1975, 3690],
    [1985, 4040], [1995, 4340], [2010, 4740], [2026, 5050]
  ];
  const MX = 140, Y0 = 260, ROW_H = 190;
  function xOf(t) {
    const s = T_STOPS;
    if (t <= s[0][0]) return MX + s[0][1];
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i][0]) {
        const f = (t - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
        return MX + s[i - 1][1] + f * (s[i][1] - s[i - 1][1]);
      }
    }
    return MX + s[s.length - 1][1];
  }
  const ERAS = [
    { label: "Cartridge revolution", t0: 1860, t1: 1886 },
    { label: "Smokeless era", t0: 1886, t1: 1914 },
    { label: "World War I", t0: 1914, t1: 1918 },
    { label: "Interwar", t0: 1918, t1: 1939 },
    { label: "World War II", t0: 1939, t1: 1945 },
    { label: "Early Cold War", t0: 1945, t1: 1965 },
    { label: "Assault rifle era", t0: 1965, t1: 1985 },
    { label: "Polymer era", t0: 1985, t1: 2005 },
    { label: "Modular era", t0: 2005, t1: 2026 }
  ];
  const TL_TOP = 40;
  const MAX_ROW = Math.max(...DATA.nodes.map(n => n.row || 0));
  const TL_BOTTOM = Y0 + MAX_ROW * ROW_H + 150;

  // image sizing + node placement
  const SPR = window.FIREARM_IMGS || {};
  const IMG_MAX = 130;
  for (const n of DATA.nodes) {
    if (typeof n.t === "number") {
      n.x = Math.round(xOf(n.t));
      n.y = Y0 + n.row * ROW_H;
    }
    const s = SPR[n.id];
    if (s && !n.sub) {
      const k = IMG_MAX / Math.max(s[0], s[1]);
      n.dw = Math.round(s[0] * k); n.dh = Math.round(s[1] * k);
    }
  }

  // distance from node center at which edges should stop
  function nodeRadius(n) {
    if (n.st === "hub") return 105;
    if (n.sub) return 52;
    return n.dw ? Math.max(n.dw, n.dh) / 2 + 8 : 16;
  }

  // ---------- SVG scaffolding ----------
  const NS = "http://www.w3.org/2000/svg";
  const stage = document.getElementById("stage");
  for (const old of stage.querySelectorAll(":scope > svg")) old.remove(); // idempotent rebuild
  const svg = document.createElementNS(NS, "svg");
  stage.appendChild(svg);

  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML =
    '<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#6fb6e8"/></marker>';
  svg.appendChild(defs);

  const gBands = document.createElementNS(NS, "g");
  const gEdges = document.createElementNS(NS, "g");
  const gNodes = document.createElementNS(NS, "g");
  svg.appendChild(gBands);
  svg.appendChild(gEdges);
  svg.appendChild(gNodes);

  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const COLOR = { us: cssVar("--c-us"), su: cssVar("--c-su"), eu: cssVar("--c-eu"), rw: cssVar("--c-rw"), hub: "#5f7d9c" };

  // ---------- era bands + Battle of Yavin marker ----------
  for (let i = 0; i < ERAS.length; i++) {
    const e = ERAS[i];
    const x0 = xOf(e.t0), x1 = xOf(e.t1);
    if (i % 2 === 0) {
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", x0); r.setAttribute("y", TL_TOP);
      r.setAttribute("width", x1 - x0); r.setAttribute("height", TL_BOTTOM - TL_TOP);
      r.setAttribute("fill", "rgba(255,255,255,0.022)");
      gBands.appendChild(r);
    }
    const edge = document.createElementNS(NS, "line");
    edge.setAttribute("x1", x0); edge.setAttribute("x2", x0);
    edge.setAttribute("y1", TL_TOP); edge.setAttribute("y2", TL_BOTTOM);
    edge.setAttribute("stroke", "#2a2a30"); edge.setAttribute("stroke-width", "1");
    gBands.appendChild(edge);
    for (const y of [TL_TOP + 40, TL_BOTTOM - 24]) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", (x0 + x1) / 2); t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("class", "era-label");
      t.textContent = e.label;
      gBands.appendChild(t);
    }
  }
  {
    const yx = xOf(1886);
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", yx); line.setAttribute("x2", yx);
    line.setAttribute("y1", TL_TOP + 66); line.setAttribute("y2", TL_BOTTOM - 44);
    line.setAttribute("stroke", "#e4e4e7"); line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-dasharray", "3 7");
    line.setAttribute("opacity", "0.55");
    gBands.appendChild(line);
    for (const y of [TL_TOP + 84, TL_BOTTOM - 48]) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", yx); t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("class", "yavin-label");
      t.textContent = "◆ 1886 · SMOKELESS POWDER · EVERYTHING BEFORE IS OBSOLETE";
      gBands.appendChild(t);
    }
  }

  // ---------- edges ----------
  // fan-out index: separates multiple edges leaving one node in the same direction
  const outIdx = new Map();
  {
    const groups = new Map();
    for (const e of DATA.edges) {
      const a = nodesById.get(e.f), b = nodesById.get(e.t);
      if (!a || !b) continue;
      const key = e.f + (b.x >= a.x ? ">" : "<");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    for (const list of groups.values()) {
      list.sort((p, q) => {
        const bp = nodesById.get(p.t), bq = nodesById.get(q.t);
        return Math.abs(bq.y - nodesById.get(q.f).y) - Math.abs(bp.y - nodesById.get(p.f).y) || bp.x - bq.x;
      });
      list.forEach((e, i) => outIdx.set(e, i));
    }
  }

  // Global orthogonal ("menorah") router. Long horizontal travel happens only
  // in the empty channels between lanes, on allocated tracks so no two runs
  // at the same height overlap in x. Verticals are placed in gaps between
  // nodes and globally staggered so none coincide. Arrivals at a shared
  // target fan out across slightly offset entry heights.
  const rowOf = n => Math.round((n.y - Y0) / ROW_H);
  const byRow = new Map();
  for (const n of DATA.nodes) {
    const r = rowOf(n);
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r).push(n);
  }
  const hwOf = n => n.sub ? 60 : Math.max((n.dw || 90) / 2, 64) + 10;
  const blockerAt = (row, x, skip) =>
    (byRow.get(row) || []).find(o => !skip.includes(o) && Math.abs(x - o.x) < hwOf(o));
  const laneClear = (row, x1, x2, skip) => {
    const lo = Math.min(x1, x2) + 6, hi = Math.max(x1, x2) - 6;
    return !(byRow.get(row) || []).some(o => !skip.includes(o) && o.x + hwOf(o) > lo && o.x - hwOf(o) < hi);
  };

  // channel track allocator: gap g sits between lane g and lane g+1
  const chans = new Map();
  const TRACK_ORDER = [2, 3, 1, 4, 0, 5];
  const chanY = (g, k) => Y0 + g * ROW_H + 86 + k * 11;
  function alloc(g, x1, x2) {
    if (x2 < x1) { const t = x1; x1 = x2; x2 = t; }
    if (!chans.has(g)) chans.set(g, [[], [], [], [], [], []]);
    const tracks = chans.get(g);
    for (const k of TRACK_ORDER) {
      if (!tracks[k].some(iv => x1 - 24 < iv[1] && x2 + 24 > iv[0])) {
        tracks[k].push([x1, x2]);
        return chanY(g, k);
      }
    }
    tracks[2].push([x1, x2]);
    return chanY(g, 2);
  }

  // vertical placement: dodge nodes in crossed rows, stagger vs other verticals
  const verts = [];
  function placeVert(x, ya, yb, dir, rows, skip) {
    const y1 = Math.min(ya, yb), y2 = Math.max(ya, yb);
    for (let guard = 0; guard < 60; guard++) {
      const nb = rows.map(r => blockerAt(r, x, skip)).find(Boolean);
      if (nb) { x = nb.x + (hwOf(nb) + 8) * dir; continue; }
      if (verts.some(v => Math.abs(v.x - x) < 9 && y1 - 4 < v.y2 && y2 + 4 > v.y1)) { x += 9 * dir; continue; }
      break;
    }
    verts.push({ x, y1, y2 });
    return x;
  }

  // rounded orthogonal path through corner points
  const R = 14;
  function ortho(pts) {
    let s = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let k = 1; k < pts.length - 1; k++) {
      const [px, py] = pts[k - 1], [cx2, cy2] = pts[k], [nx2, ny2] = pts[k + 1];
      const r1 = Math.min(R, Math.hypot(cx2 - px, cy2 - py) / 2);
      const r2 = Math.min(R, Math.hypot(nx2 - cx2, ny2 - cy2) / 2);
      const r = Math.min(r1, r2);
      const inx = cx2 - Math.sign(cx2 - px) * r, iny = cy2 - Math.sign(cy2 - py) * r;
      const outx = cx2 + Math.sign(nx2 - cx2) * r, outy = cy2 + Math.sign(ny2 - cy2) * r;
      s += ` L ${inx} ${iny} Q ${cx2} ${cy2}, ${outx} ${outy}`;
    }
    const last = pts[pts.length - 1];
    s += ` L ${last[0]} ${last[1]}`;
    return s;
  }

  // fan-in: spread arrivals when several edges enter one node
  const inCount = new Map(), inSeen = new Map();
  for (const e of DATA.edges) if (nodesById.get(e.t)) inCount.set(e.t, (inCount.get(e.t) || 0) + 1);
  const FAN = [0, -8, 8, -16, 16, -24, 24];

  const edgeEls = [];
  for (const e of DATA.edges) {
    const a = nodesById.get(e.f), b = nodesById.get(e.t);
    if (!a || !b) continue;
    const ra = rowOf(a), rb = rowOf(b);
    const sx = b.x >= a.x ? 1 : -1;
    const i = outIdx.get(e) || 0;
    const seen = inSeen.get(e.t) || 0; inSeen.set(e.t, seen + 1);
    const fanOff = (inCount.get(e.t) > 1 ? FAN[seen % FAN.length] : 0) * (b.sub ? 0.5 : 1);
    const ax = a.x + (nodeRadius(a) + 2) * sx, ay = a.y;
    const ex = b.x - (nodeRadius(b) + 2) * sx, ey = b.y + fanOff;
    let pts = null, d;

    if (ra === rb) {
      if (laneClear(ra, a.x, b.x, [a, b])) {
        d = `M ${ax} ${ay} L ${ex} ${b.y}`;
        pts = [[ax, ay], [ex, b.y]];
      } else {
        // bump over intermediate nodes through the channel above
        const g = ra - 1;
        const x1 = placeVert(ax + (22 + i * 24) * sx, ay, chanY(g, 5), sx, [], [a, b]);
        const x2 = placeVert(ex - 30 * sx, ey, chanY(g, 5), -sx, [], [a, b]);
        const yC = alloc(g, x1, x2);
        pts = [[ax, ay], [x1, ay], [x1, yC], [x2, yC], [x2, ey], [ex, ey]];
        d = ortho(pts);
      }
    } else {
      // Cross-lane edges get at most 2 turns wherever physically possible:
      // one horizontal run, one vertical run, one horizontal run. The channel
      // staircase survives only as a last resort for blocked long-haul edges.
      const down = rb > ra;
      const rowsBetween = [];
      for (let r = Math.min(ra, rb) + 1; r < Math.max(ra, rb); r++) rowsBetween.push(r);

      // A: branch just after the parent, run the length of the child's lane
      {
        const xm = placeVert(ax + (22 + i * 24) * sx, ay, ey, sx, rowsBetween, [a, b]);
        if ((xm - ax) * sx > 0 && (xm - ax) * sx < 260 && (ex - xm) * sx > 40 &&
            laneClear(rb, xm + 8 * sx, b.x, [a, b])) {
          pts = [[ax, ay], [xm, ay], [xm, ey], [ex, ey]];
        }
      }
      // B: run along the parent's lane, drop just before the child
      if (!pts) {
        const xm = placeVert(ex - 26 * sx, ay, ey, -sx, rowsBetween, [a, b]);
        if ((xm - ax) * sx > 40 && (ex - xm) * sx > 0 &&
            laneClear(ra, a.x, xm, [a, b]) && laneClear(rb, xm + 8 * sx, b.x, [a, b])) {
          pts = [[ax, ay], [xm, ay], [xm, ey], [ex, ey]];
        }
      }
      // C: run the parent's lane all the way, drop onto the child's top (1 turn)
      if (!pts && down && laneClear(ra, a.x, b.x, [a, b])) {
        const xm = placeVert(b.x + fanOff, ay, b.y, sx, rowsBetween, [a, b]);
        if (Math.abs(xm - b.x) < (b.sub ? 36 : (b.dw || 96) / 2 - 6)) {
          const eyv = b.y - (b.sub ? 16 : (b.dh || 60) / 2 + 3);
          pts = [[ax, ay], [xm, ay], [xm, eyv]];
        }
      }
      // fallback (extreme cases): one vertical near the parent straight down to
      // the channel beside the child's lane, one run, one drop — 4 corners max
      if (!pts) {
        const g2 = down ? rb - 1 : rb;
        const x1 = placeVert(ax + (22 + i * 24) * sx, ay, chanY(g2, 2), sx, rowsBetween, [a, b]);
        const want = ex - 26 * sx;
        const sib = blockerAt(rb, want, [a, b]);
        let xW, eyv = null;
        if (sib && down) {
          xW = b.x + fanOff;
          eyv = b.y - (b.sub ? 14 : (b.dh || 60) / 2 + 3);
        } else {
          xW = placeVert(want, chanY(g2, 2), ey, -sx, [], [a, b]);
        }
        const yC = alloc(g2, x1, xW);
        pts = [[ax, ay], [x1, ay], [x1, yC]].concat(eyv === null
          ? [[xW, yC], [xW, ey], [ex, ey]]
          : [[xW, yC], [xW, eyv]]);
      }
      d = ortho(pts);
    }

    // "?" marker sits at the midpoint of the longest horizontal run
    let qx = (ax + ex) / 2, qy = ay - 7, best = 0;
    for (let k = 1; k < pts.length; k++) {
      const [p1x, p1y] = pts[k - 1], [p2x, p2y] = pts[k];
      if (p1y === p2y && Math.abs(p2x - p1x) > best) {
        best = Math.abs(p2x - p1x);
        qx = (p1x + p2x) / 2; qy = p1y - 7;
      }
    }

    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "edge");
    path.setAttribute("stroke", "#6fb6e8");
    path.setAttribute("marker-end", "url(#arr)");
    if (e.type === "l") { path.setAttribute("stroke-dasharray", "6 6"); path.setAttribute("stroke-width", "1.4"); }
    else if (e.type === "c") { path.setAttribute("stroke-dasharray", "12 5 2 5"); path.setAttribute("stroke-width", "1.6"); }
    else path.setAttribute("stroke-width", "2.2");
    path.setAttribute("opacity", e.type === "d" ? "0.95" : e.type === "c" ? "0.6" : "0.45");
    gEdges.appendChild(path);
    const hit = document.createElementNS(NS, "path");
    hit.setAttribute("d", path.getAttribute("d"));
    hit.setAttribute("class", "edge-hit");
    hit.dataset.key = `${e.f}->${e.t}`;
    gEdges.appendChild(hit);
    let qEl = null;
    if (e.q) {
      qEl = document.createElementNS(NS, "text");
      qEl.setAttribute("x", qx);
      qEl.setAttribute("y", qy);
      qEl.setAttribute("text-anchor", "middle");
      qEl.setAttribute("class", "edge-q");
      qEl.textContent = "?";
      gEdges.appendChild(qEl);
    }
    edgeEls.push({ e, path, qEl, hit });
  }
  const edgesByKey = new Map(edgeEls.map(x => [`${x.e.f}->${x.e.t}`, x]));

  // ---------- nodes ----------
  const nodeEls = new Map();
  for (const n of DATA.nodes) {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "node");
    g.setAttribute("data-id", n.id);

    if (n.st === "hub") {
      const r = document.createElementNS(NS, "rect");
      const w = 190, h = 46;
      r.setAttribute("x", n.x - w / 2); r.setAttribute("y", n.y - h / 2);
      r.setAttribute("width", w); r.setAttribute("height", h);
      r.setAttribute("rx", 8);
      r.setAttribute("fill", "#17171b");
      r.setAttribute("stroke", "#3f3f46");
      r.setAttribute("stroke-width", "1.5");
      g.appendChild(r);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", n.x); t.setAttribute("y", n.y - 3);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "13");
      t.setAttribute("font-weight", "700");
      t.textContent = "Imperial Classified";
      const t2 = document.createElementNS(NS, "text");
      t2.setAttribute("x", n.x); t2.setAttribute("y", n.y + 13);
      t2.setAttribute("text-anchor", "middle");
      t2.setAttribute("font-size", "13");
      t2.setAttribute("font-weight", "700");
      t2.textContent = "Flight Yards";
      g.appendChild(t); g.appendChild(t2);
    } else {
      let labelY;
      if (n.sub) {
        labelY = n.y + 4;
      } else if (n.dw) {
        const img = document.createElementNS(NS, "image");
        img.setAttribute("href", SPR[n.id][2]);
        img.setAttribute("x", n.x - n.dw / 2);
        img.setAttribute("y", n.y - n.dh / 2);
        img.setAttribute("width", n.dw);
        img.setAttribute("height", n.dh);
        g.appendChild(img);
        labelY = n.y + n.dh / 2 + 18;
      } else {
        // no artwork on the original chart — it shows a "?" placeholder
        const q = document.createElementNS(NS, "text");
        q.setAttribute("x", n.x); q.setAttribute("y", n.y + 10);
        q.setAttribute("text-anchor", "middle");
        q.setAttribute("font-size", "40");
        q.setAttribute("font-weight", "700");
        q.setAttribute("fill", "#71717a");
        q.textContent = "?";
        g.appendChild(q);
        labelY = n.y + 42;
      }

      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", n.x); t.setAttribute("y", labelY);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", n.sub ? "13.5" : "15");
      t.setAttribute("font-weight", "600");
      t.textContent = n.n;
      g.appendChild(t);

      const date = n.dl || n.dc;
      if (date) {
        const d = document.createElementNS(NS, "text");
        d.setAttribute("x", n.x); d.setAttribute("y", labelY + (n.sub ? 15 : 18));
        d.setAttribute("text-anchor", "middle");
        d.setAttribute("font-size", n.sub ? "10.5" : "12");
        d.setAttribute("class", "n-date");
        d.textContent = date + (n.dc && n.dl ? ` · ${n.dc} (canon)` : "");
        g.appendChild(d);
      }

      // continuity dot beside the label (identity channel; legend explains it)
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cy", labelY - 5);
      dot.setAttribute("r", 4.5);
      dot.setAttribute("fill", COLOR[n.st]);
      dot.setAttribute("stroke", "#08080a");
      dot.setAttribute("stroke-width", "1.5");
      g.appendChild(dot);
      requestAnimationFrame(() => {
        try { dot.setAttribute("cx", n.x - t.getComputedTextLength() / 2 - 12); }
        catch (_) { dot.setAttribute("cx", n.x - 60); }
      });

      // selection ring + invisible hit target
      const halfW = n.sub ? 52 : Math.max(n.dw ? n.dw / 2 : 40, 55);
      const topY = n.sub ? n.y - 14 : (n.dw ? n.y - n.dh / 2 : n.y - 25);
      const ring = document.createElementNS(NS, "rect");
      ring.setAttribute("class", "sel-ring");
      ring.setAttribute("x", n.x - halfW - 6); ring.setAttribute("y", topY - 6);
      ring.setAttribute("width", (halfW + 6) * 2);
      ring.setAttribute("height", labelY + 20 - topY + 6);
      ring.setAttribute("rx", 8);
      g.appendChild(ring);
      const hit = document.createElementNS(NS, "rect");
      hit.setAttribute("x", n.x - halfW); hit.setAttribute("y", topY - 4);
      hit.setAttribute("width", halfW * 2);
      hit.setAttribute("height", labelY + 18 - topY + 4);
      hit.setAttribute("fill", "transparent");
      g.appendChild(hit);
    }
    gNodes.appendChild(g);
    nodeEls.set(n.id, g);
  }

  // group labels
  for (const grp of DATA.groups) {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", grp.x); t.setAttribute("y", grp.y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("class", grp.caption ? "section-caption" : "section-label");
    t.textContent = grp.caption ? `— ${grp.label} —` : grp.label;
    gNodes.appendChild(t);
  }

  // ---------- viewBox pan/zoom ----------
  const PAD = 120;
  const xs = DATA.nodes.map(n => n.x).concat([xOf(-70), xOf(140)]);
  const ys = DATA.nodes.map(n => n.y).concat([TL_TOP, TL_BOTTOM]);
  const world = {
    x: Math.min(...xs) - PAD, y: Math.min(...ys) - PAD,
    w: Math.max(...xs) - Math.min(...xs) + PAD * 2,
    h: Math.max(...ys) - Math.min(...ys) + PAD * 2
  };
  let vb = { ...world };

  function fit() {
    const ar = stage.clientWidth / Math.max(1, stage.clientHeight);
    const war = world.w / world.h;
    if (war > ar) { vb = { x: world.x, w: world.w, h: world.w / ar, y: world.y - (world.w / ar - world.h) / 2 }; }
    else { vb = { y: world.y, h: world.h, w: world.h * ar, x: world.x - (world.h * ar - world.w) / 2 }; }
    apply();
  }
  function apply() { svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }

  function zoomAt(cx, cy, k) {
    const rect = stage.getBoundingClientRect();
    const wx = vb.x + (cx - rect.left) / rect.width * vb.w;
    const wy = vb.y + (cy - rect.top) / rect.height * vb.h;
    const minW = 300, maxW = world.w * 2.5;
    const nw = Math.min(maxW, Math.max(minW, vb.w * k));
    const nk = nw / vb.w;
    vb = { x: wx - (wx - vb.x) * nk, y: wy - (wy - vb.y) * nk, w: vb.w * nk, h: vb.h * nk };
    apply();
  }

  stage.addEventListener("wheel", ev => {
    ev.preventDefault();
    zoomAt(ev.clientX, ev.clientY, ev.deltaY > 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  // pan starts only after real movement, so clicks/taps on ships/links always land;
  // two touch pointers = pinch zoom
  let pan = null;
  let pinch = null;
  const pointers = new Map();

  stage.addEventListener("pointerdown", ev => {
    if (ev.target.closest(".detail") || ev.target.closest("a")) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      pan = null;
      stage.classList.remove("panning");
    } else if (pointers.size === 1 && (ev.button === 0 || ev.pointerType !== "mouse")) {
      pan = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y, moved: false, id: ev.pointerId };
    }
  });
  stage.addEventListener("pointermove", ev => {
    if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 20 && pinch.d > 20) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.d / d);
      pinch.d = d;
      return;
    }
    if (!pan || ev.pointerId !== pan.id) return;
    if (!pan.moved) {
      if (Math.abs(ev.clientX - pan.x) + Math.abs(ev.clientY - pan.y) < 7) return;
      pan.moved = true;
      stage.classList.add("panning");
      try { stage.setPointerCapture(pan.id); } catch (_) {}
    }
    const rect = stage.getBoundingClientRect();
    const dx = (ev.clientX - pan.x) / rect.width * vb.w;
    const dy = (ev.clientY - pan.y) / rect.height * vb.h;
    vb.x = pan.vx - dx; vb.y = pan.vy - dy;
    apply();
  });
  for (const evName of ["pointerup", "pointercancel"]) {
    stage.addEventListener(evName, ev => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      stage.classList.remove("panning");
      setTimeout(() => { pan = null; }, 0);
    });
  }

  document.getElementById("btnZoomIn").addEventListener("click", () => {
    const r = stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.3);
  });
  document.getElementById("btnZoomOut").addEventListener("click", () => {
    const r = stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.3);
  });
  document.getElementById("btnFit").addEventListener("click", fit);
  window.addEventListener("resize", fit);

  function centerOn(n) {
    vb.x = n.x - vb.w / 2; vb.y = n.y - vb.h / 2;
    if (vb.w > 1400) { const k = 1200 / vb.w, r = stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, k); vb.x = n.x - vb.w / 2; vb.y = n.y - vb.h / 2; }
    apply();
  }

  // ---------- Variants toggle ----------
  let showVariants = true;
  const btnLegends = document.getElementById("btnLegends");
  const countEl = document.getElementById("shipCount");

  function refreshVisibility() {
    let visible = 0;
    for (const n of DATA.nodes) {
      const hide = !showVariants && n.sub;
      nodeEls.get(n.id).classList.toggle("dim", hide);
      if (!hide && n.st !== "hub") visible++;
    }
    for (const { e, path, qEl, hit } of edgeEls) {
      const hide = !showVariants &&
        (nodesById.get(e.f).sub || nodesById.get(e.t).sub);
      path.classList.toggle("dim", hide);
      hit.classList.toggle("dim", hide);
      if (qEl) qEl.classList.toggle("dim", hide);
    }
    countEl.textContent = `${visible} firearms`;
    btnLegends.classList.toggle("active", showVariants);
    btnLegends.textContent = showVariants ? "Variants: on" : "Variants: off";
    if (selected && !showVariants && nodesById.get(selected).sub) clearSelection();
  }
  btnLegends.addEventListener("click", () => { showVariants = !showVariants; refreshVisibility(); });

  // ---------- tooltip ----------
  const tip = document.getElementById("tooltip");
  function tipHtml(n) {
    const s = STATUS[n.st];
    const dates = [n.dl && `${n.dl}${n.dc ? " (Legends)" : ""}`, n.dc && `${n.dc}${n.dl ? " (Canon)" : ""}`].filter(Boolean).join(" · ");
    return `<div class="t-name">${esc(n.n)}${n.alt ? ` <span class="t-dates">/ ${esc(n.alt)}</span>` : ""}</div>` +
      `<div class="t-status status-chip ${s.cls}">${s.label}</div>` +
      (dates ? `<div class="t-dates">${esc(dates)}</div>` : "") +
      (n.mfr ? `<div class="t-dates">${esc(n.mfr)}</div>` : "") +
      `<div class="t-hint">click to select — links &amp; notes appear in the side panel</div>`;
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // ---------- selection / detail card ----------
  const detail = document.getElementById("detail");
  let selected = null;

  const tabDetail = document.getElementById("tabDetail");
  const detailPanelBody = document.getElementById("detailPanelBody");

  function activateTab(name) {
    for (const t of document.querySelectorAll(".tab")) {
      t.classList.toggle("active", t.dataset.tab === name);
      t.setAttribute("aria-selected", t.dataset.tab === name ? "true" : "false");
    }
    for (const p of document.querySelectorAll(".panel")) {
      p.classList.toggle("active", p.id === "panel-" + name);
    }
  }

  function clearSelection() {
    selected = null;
    detail.classList.remove("show");
    for (const g of nodeEls.values()) g.classList.remove("selected");
    for (const { path } of edgeEls) path.classList.remove("selected");
    if (!tabDetail.hidden) {
      const wasActive = tabDetail.classList.contains("active");
      tabDetail.hidden = true;
      if (wasActive) activateTab("about");
    }
  }

  function loreHtml(text) {
    if (!text) return "";
    return `<div class="d-sum">${text.split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join("")}</div>`;
  }

  function showPanels(html) {
    document.getElementById("detailBody").innerHTML = html;
    detailPanelBody.innerHTML = html;
    detail.classList.add("show");
    tabDetail.hidden = false;
    activateTab("detail");
    detailPanelBody.closest(".panel-scroll").scrollTop = 0;
  }

  function edgeTypeLabel(e) {
    const t = e.type === "l" ? "influence / loose link"
      : e.type === "c" ? "license production / copy"
      : "direct development";
    return t + (e.q ? " · disputed or informal" : "");
  }

  function selectEdge(x) {
    const { e, path } = x;
    clearSelection();
    path.classList.add("selected");
    const a = nodesById.get(e.f), b = nodesById.get(e.t);
    const lore = LORE.edges[`${e.f}->${e.t}`];
    showPanels(
      `<h3>${esc(a.n)} <span style="color:#8fb300">→</span> ${esc(b.n)}</h3>` +
      `<div class="d-status" style="color:#c98500">${edgeTypeLabel(e)}</div>` +
      (e.note ? `<div class="d-note">${esc(e.note)}</div>` : "") +
      (lore ? loreHtml(lore) : `<div class="d-note">No write-up for this link yet.</div>`) +
      `<div class="d-edge-ships">` +
      `<button type="button" data-ship="${a.id}">◂ ${esc(a.n)}</button>` +
      `<button type="button" data-ship="${b.id}">${esc(b.n)} ▸</button>` +
      `</div>`
    );
  }

  function select(n) {
    clearSelection();
    selected = n.id;
    for (const [id, g] of nodeEls) g.classList.toggle("selected", id === n.id);
    const s = STATUS[n.st];
    const dates = [n.dl && `${n.dl}${n.dc ? " (Legends)" : ""}`, n.dc && `${n.dc}${n.dl ? " (Canon)" : ""}`].filter(Boolean).join(" · ");
    const links = [];
    if (n.wc) {
      links.push(`<a href="${WIKI}${n.wc}" target="_blank" rel="noopener noreferrer">Wikipedia ↗</a>`);
      links.push(`<a href="${GROK}${n.gk || n.wc}" target="_blank" rel="noopener noreferrer">Grokipedia ↗</a>`);
    }
    const img = SPR[n.id];
    const html =
      (img ? `<img class="d-ship" src="${img[2]}" alt="" />` : "") +
      `<h3>${esc(n.n)}${n.alt ? ` <span style="font-weight:400;color:#5f7d9c">/ ${esc(n.alt)}</span>` : ""}</h3>` +
      `<div class="d-status status-chip ${s.cls}">${s.label}${n.nat ? ` · ${esc(n.nat)}` : ""}</div>` +
      (n.mfr ? `<div class="d-dates">${esc(n.mfr)}</div>` : "") +
      (dates ? `<div class="d-dates">${esc(dates)}</div>` : "") +
      (n.note ? `<div class="d-note">${esc(n.note)}</div>` : "") +
      (n.dsg ? `<div class="d-note"><strong>Operator designations:</strong> ${esc(n.dsg)}</div>` : "") +
      `<div class="d-links">${links.join("")}</div>` +
      loreHtml(LORE.ships[n.id]) +
      (img && img[3] ? `<div class="d-note" style="margin-top:0.6rem;font-size:0.66rem">Photo: ${esc(img[3])} · <a href="${img[4]}" target="_blank" rel="noopener noreferrer">source</a></div>` : "");
    showPanels(html);
  }

  for (const el of [document.getElementById("detailBody"), detailPanelBody]) {
    el.addEventListener("click", ev => {
      const b = ev.target.closest("[data-ship]");
      if (!b) return;
      const n = nodesById.get(b.dataset.ship);
      select(n);
      centerOn(n);
    });
  }

  detail.addEventListener("pointerdown", ev => ev.stopPropagation());
  document.getElementById("detailClose").addEventListener("click", clearSelection);
  document.getElementById("detailPanelClose").addEventListener("click", clearSelection);
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") clearSelection(); });

  gNodes.addEventListener("pointermove", ev => {
    if (ev.pointerType !== "mouse") return;
    const g = ev.target.closest(".node");
    if (!g || g.classList.contains("dim")) { tip.classList.remove("show"); return; }
    const n = nodesById.get(g.dataset.id);
    if (n.st === "hub") {
      tip.innerHTML = `<div class="t-name">${esc(n.n)}</div><div class="t-note">${esc(n.note)}</div>`;
    } else {
      tip.innerHTML = tipHtml(n);
    }
    const r = stage.getBoundingClientRect();
    tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 310) + "px";
    tip.style.top = (ev.clientY - r.top + 14) + "px";
    tip.classList.add("show");
  });
  gNodes.addEventListener("pointerleave", () => tip.classList.remove("show"));

  // edge hover + click
  let hoveredEdge = null;
  gEdges.addEventListener("pointermove", ev => {
    if (ev.pointerType !== "mouse") return;
    const h = ev.target.closest(".edge-hit");
    if (hoveredEdge && (!h || edgesByKey.get(h.dataset.key) !== hoveredEdge)) {
      hoveredEdge.path.classList.remove("hovered");
      hoveredEdge = null;
    }
    if (!h) { tip.classList.remove("show"); return; }
    const x = edgesByKey.get(h.dataset.key);
    hoveredEdge = x;
    x.path.classList.add("hovered");
    const a = nodesById.get(x.e.f), b = nodesById.get(x.e.t);
    tip.innerHTML =
      `<div class="t-name">${esc(a.n)} → ${esc(b.n)}</div>` +
      `<div class="t-status" style="color:#c98500">${edgeTypeLabel(x.e)}</div>` +
      `<div class="t-hint">click for what changed between them</div>`;
    const r = stage.getBoundingClientRect();
    tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 310) + "px";
    tip.style.top = (ev.clientY - r.top + 14) + "px";
    tip.classList.add("show");
  });
  gEdges.addEventListener("pointerleave", () => {
    if (hoveredEdge) { hoveredEdge.path.classList.remove("hovered"); hoveredEdge = null; }
    tip.classList.remove("show");
  });
  gEdges.addEventListener("click", ev => {
    if (pan && pan.moved) return;
    const h = ev.target.closest(".edge-hit");
    if (!h) return;
    selectEdge(edgesByKey.get(h.dataset.key));
  });

  gNodes.addEventListener("click", ev => {
    if (pan && pan.moved) return;
    const g = ev.target.closest(".node");
    if (!g || g.classList.contains("dim")) { clearSelection(); return; }
    const n = nodesById.get(g.dataset.id);
    select(n);
  });
  // clicking empty map space (incl. era bands) closes the In Detail tab
  svg.addEventListener("click", ev => {
    if (pan && pan.moved) return;
    if (ev.target.closest(".node") || ev.target.closest(".edge-hit")) return;
    clearSelection();
  });
  stage.addEventListener("dblclick", ev => {
    ev.preventDefault();
    zoomAt(ev.clientX, ev.clientY, 1 / 1.6);
  });

  // ---------- tabs ----------
  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  }
  const app = document.querySelector(".app");
  const btnInfo = document.getElementById("btnInfo");
  if (btnInfo) btnInfo.addEventListener("click", () => app.classList.toggle("show-info"));
  document.getElementById("sidebarClose").addEventListener("click", () => app.classList.remove("show-info"));

  // ---------- boot ----------
  refreshVisibility();
  fit();
})();
