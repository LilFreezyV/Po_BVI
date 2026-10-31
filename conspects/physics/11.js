(function () {
/* Рисунки темы 11 «Постоянный ток».
   Мост и куб решаются общим методом узловых потенциалов (Гаусс) — без формул конспекта;
   мощность — перебором нагрузок; RC — пошаговым расчётом тока. */

function gauss(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const k = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= k * M[i][c]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
// потенциалы узлов: edges [a, b, R], fixed {узел: потенциал}
function potentials(n, edges, fixed) {
  const free = [...Array(n).keys()].filter(i => !(i in fixed)), ix = {}; free.forEach((v, k) => (ix[v] = k));
  const A = free.map(() => Array(free.length).fill(0)), b = Array(free.length).fill(0);
  for (const [a, c, R] of edges) for (const [u, v] of [[a, c], [c, a]]) {
    if (!(u in ix)) continue;
    A[ix[u]][ix[u]] += 1 / R;
    if (v in ix) A[ix[u]][ix[v]] -= 1 / R; else b[ix[u]] += fixed[v] / R;
  }
  const x = gauss(A, b), phi = { ...fixed }; free.forEach((v, k) => (phi[v] = x[k])); return phi;
}

/* ——— 2.1 Мост Уитстона ——— */
const BR = { R1: 10, R2: 20, R3: 15, R5: 7, U: 10 };
FIG('bridge', {
  label: 'Мост Уитстона: ток через диагональ',
  h: w => Math.min(240, w * 0.55),
  params: [{ id: 'R4', label: 'переменный резистор R₄', min: 5, max: 60, step: 0.5, val: 20, unit: 'Ом' }],
  init() {},
  calc(f) {
    // A = 0 (U), B = 1, D = 2, C = 3 (0 В); R1: A–B, R2: B–C, R3: A–D, R4: D–C, R5: B–D
    const phi = potentials(4, [[0, 1, BR.R1], [1, 3, BR.R2], [0, 2, BR.R3], [2, 3, f.p.R4], [1, 2, BR.R5]], { 0: BR.U, 3: 0 });
    return { phi, Ig: (phi[1] - phi[2]) / BR.R5, bal: BR.R2 * BR.R3 / BR.R1 };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), cx = w / 2, cy = h / 2, a = Math.min(w * 0.3, h * 0.4);
    const P = { A: [cx - a, cy], C: [cx + a, cy], B: [cx, cy - a * 0.8], D: [cx, cy + a * 0.8] };
    [['A', 'B', 'R₁ = 10'], ['B', 'C', 'R₂ = 20'], ['A', 'D', 'R₃ = 15'], ['D', 'C', `R₄ = ${F(f.p.R4, 1)}`]].forEach(([u, v, t]) => {
      D.line(ctx, ...P[u], ...P[v], C.fg, 2);
      D.text(ctx, t, (P[u][0] + P[v][0]) / 2 + (u === 'A' ? -8 : 8), (P[u][1] + P[v][1]) / 2, C.muted, 11, u === 'A' ? 'right' : 'left');
    });
    const g = Math.min(Math.abs(r.Ig) / 0.05, 1);
    D.line(ctx, ...P.B, ...P.D, D.alpha(C.red, 0.25 + 0.75 * g), 2 + 3 * g);
    Object.entries(P).forEach(([k, p]) => { D.circ(ctx, p[0], p[1], 4, C.fg); D.text(ctx, `${k} ${F(r.phi[{ A: 0, B: 1, D: 2, C: 3 }[k]], 2)} В`, p[0], p[1] + (k === 'D' ? 18 : -9), C.fg, 11, 'center'); });
    D.text(ctx, `ток диагонали ${F(r.Ig * 1000, 2)} мА`, 10, 16, C.red, 12);
  },
  readout(f) {
    const r = this.calc(f), bal = Math.abs(f.p.R4 - r.bal) < 1e-9;
    return [['ток через диагональ', `${F(r.Ig * 1000, 4)} мА`, `ноль при R₄ = R₂R₃/R₁ = ${F(r.bal, 1)} Ом (2.2)`, bal ? Math.abs(r.Ig) < 1e-12 : undefined]];
  },
  note: () => 'Напряжение 10 В между A и C, диагональ 7 Ом. Поставьте R₄ = 30 Ом — ток диагонали исчезнет: мост сбалансирован.',
});

/* ——— 5.1 Куб из резисторов ——— */
const CV = [];
for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) CV.push([x, y, z]);
const CE = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (CV[i].reduce((s, v, k) => s + Math.abs(v - CV[j][k]), 0) === 1) CE.push([i, j, 1]);
FIG('cube', {
  label: 'Куб из резисторов: сопротивление между вершинами',
  h: w => Math.min(260, w * 0.6),
  params: [{ id: 'pair', label: 'между какими вершинами', val: '7', opts: [['1', 'ребро'], ['3', 'диаг. грани'], ['7', 'диаг. куба']] }],
  init() {},
  calc(f) {
    const b = +f.p.pair, phi = potentials(8, CE, { 0: 1, [b]: 0 });
    const I = CE.reduce((s, [u, v, R]) => s + (u === 0 ? (phi[u] - phi[v]) / R : v === 0 ? (phi[v] - phi[u]) / R : 0), 0);
    return { phi, R: 1 / I, th: { 1: 7 / 12, 3: 3 / 4, 7: 5 / 6 }[b] };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), s = Math.min(w * 0.45, (h - 50) / 1.35), cx = w / 2 - s * 0.7, cy = h / 2 + s * 0.675;   // куб по центру, с полями
    const Pt = ([x, y, z]) => [cx + x * s + z * s * 0.45, cy - y * s - z * s * 0.35];
    CE.forEach(([i, j]) => D.line(ctx, ...Pt(CV[i]), ...Pt(CV[j]), C.line, 2));
    CV.forEach((v, i) => {
      const p = Pt(v), t = r.phi[i];
      D.circ(ctx, p[0], p[1], 9, `hsl(${Math.round(240 * (1 - t))}, 70%, 55%)`);
      D.text(ctx, F(t, 3), p[0] + 12, p[1] - 8, C.fg, 10);
    });
    D.text(ctx, 'цвет — потенциал (1 В на входе, 0 на выходе)', 10, h - 6, C.muted, 10);
  },
  readout(f) { const r = this.calc(f); return [cmp('сопротивление (R = 1 Ом)', r.R, r.th, 'Ом', 'симметрия')]; },
  note: () => 'Одинаковый цвет и одинаковые числа — у вершин с равным потенциалом: их можно склеить, как в решении 5.Р1.',
});

/* ——— 9.1 Мощность на нагрузке ——— */
FIG('power', {
  label: 'Мощность на нагрузке и КПД источника',
  h: w => Math.min(80, w * 0.2),
  params: [
    { id: 'E', label: 'ЭДС E', min: 1, max: 24, step: 1, val: 12, unit: 'В' },
    { id: 'r', label: 'внутреннее сопротивление r', min: 0.5, max: 10, step: 0.5, val: 2, unit: 'Ом' },
    { id: 'R', label: 'нагрузка R', min: 0.1, max: 20, step: 0.1, val: 4, unit: 'Ом' },
  ],
  init() {},
  calc(f) {
    const { E, r } = f.p, P = R => E * E * R / (R + r) ** 2;
    let best = [0, 0];
    for (let k = 1; k <= 4000; k++) { const R = 20 * k / 4000; if (P(R) > best[0]) best = [P(R), R]; }
    let lo = best[1] - 0.005, hi = best[1] + 0.005;                  // уточнение троичным поиском
    for (let k = 0; k < 80; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (P(m1) < P(m2)) lo = m1; else hi = m2; }
    best = [P((lo + hi) / 2), (lo + hi) / 2];
    return { P, best };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), { R } = f.p;
    D.text(ctx, `P = ${F(r.P(R), 2)} Вт,  КПД = ${F(R / (R + f.p.r) * 100, 1)} %`, 10, h / 2 + 5, C.fg, 13);
  },
  graph: {
    h: w => Math.min(220, w * 0.48),
    draw(f, ctx, w, h, C) {
      const r = this.calc(f), pts = [], eta = [], Pm = f.p.E ** 2 / (4 * f.p.r);
      for (let k = 1; k <= 200; k++) { const R = 20 * k / 200; pts.push([R, r.P(R)]); eta.push([R, Pm * R / (R + f.p.r)]); }
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 20, ymin: 0, ymax: Pm * 1.1, xl: 'R, Ом', yl: 'P, Вт',
        series: [{ pts, color: C.red, lw: 2.5 }, { pts: eta, color: C.ok, lw: 1.5, dash: [5, 4] }, { pts: [[f.p.R, r.P(f.p.R)]], color: C.fg, dots: 5 }],
        hlines: [{ y: Pm, color: C.muted, dash: [3, 3], label: 'E²/4r' }],
      });
      legend(ctx, 56, 26, [{ label: 'мощность', color: C.red }, { label: 'КПД (в масштабе P_max)', color: C.ok, dash: [5, 4] }], w, C);
    },
  },
  readout(f) {
    const r = this.calc(f);
    return [cmp('наибольшая мощность', r.best[0], f.p.E ** 2 / (4 * f.p.r), 'Вт', '9.2'), cmp('при нагрузке', r.best[1], f.p.r, 'Ом', 'R = r')];
  },
  note: () => 'Перебор 4000 нагрузок от 0 до 20 Ом и уточнение максимума. Максимум мощности — при R = r, но КПД там лишь 50 %; при больших R КПД растёт, а мощность падает.',
});

/* ——— 15.1 Зарядка конденсатора ——— */
FIG('rc', {
  label: 'Зарядка конденсатора через резистор',
  dt: 0.01, h: w => Math.min(80, w * 0.2),
  params: [
    { id: 'E', label: 'ЭДС E', min: 1, max: 20, step: 1, val: 10, unit: 'В' },
    { id: 'R', label: 'сопротивление R', min: 1, max: 100, step: 1, val: 10, unit: 'кОм' },
    { id: 'C', label: 'ёмкость C', min: 10, max: 500, step: 10, val: 100, unit: 'мкФ' },
  ],
  init(f) { f.q = 0; f.time = 0; f.hist = [[0, 0]]; f.tau = f.p.R * 1e3 * f.p.C * 1e-6; },
  tick(f) {
    const R = f.p.R * 1e3, Cc = f.p.C * 1e-6, h = f.tau / 1000;
    for (let s = 0; s < 40; s++) {                                // средняя точка
      const I1 = (f.p.E - f.q / Cc) / R, qm = f.q + I1 * h / 2, I = (f.p.E - qm / Cc) / R;
      f.q += I * h; f.time += h;
    }
    f.hist.push([f.time / f.tau, f.q / Cc]);
    if (f.time >= 5 * f.tau - 1e-12) return false;
  },
  draw(f, ctx, w, h, C) {
    D.text(ctx, `U_C = ${F(f.q / (f.p.C * 1e-6), 3)} В,  t = ${F(f.time, 3)} с,  τ = ${F(f.tau, 3)} с`, 10, h / 2 + 5, C.fg, 13);
  },
  graph: {
    h: w => Math.min(220, w * 0.48),
    draw(f, ctx, w, h, C) {
      const th = []; for (let k = 0; k <= 100; k++) th.push([5 * k / 100, f.p.E * (1 - Math.exp(-5 * k / 100))]);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 5, ymin: 0, ymax: f.p.E * 1.05, xl: 't / τ', yl: 'U_C, В',
        series: [{ pts: th, color: C.ok, lw: 4 }, { pts: f.hist, color: C.accent, lw: 1.5 }],
        hlines: [{ y: f.p.E * (1 - Math.exp(-1)), color: C.muted, dash: [3, 3], label: '63 % при t = τ' }],
      });
    },
  },
  readout(f) {
    const U = f.q / (f.p.C * 1e-6);
    return [cmp('напряжение сейчас', U, f.p.E * (1 - Math.exp(-f.time / f.tau)), 'В', '15.1')];
  },
  note: () => 'Анимация всегда длится около секунды: время на графике — в единицах τ, а в строке над ним — настоящее. Толстая зелёная — экспонента (15.1), тонкая — пошаговый расчёт тока.',
});
})();
