(function () {
/* Рисунки темы 05 «Удары».
   Удар через пружину интегрируется численно; бильярд и шары Гальперина считаются «по событиям»:
   момент следующего касания находится точно, удар — по законам сохранения вдоль линии центров.
   Проверяемые формулы конспекта (4.1), (4.2), (5.1), теорема 6.2 используются только для сверки. */

/* ——— 4.1 Удар через пружину ——— */
const HS = 1e-5, SPEED_S = 0.2, L0 = 0.3;                        // шаг, замедление, длина пружины, м
function rk4v(y, h, fn) {
  const k1 = fn(y), y2 = y.map((v, i) => v + h / 2 * k1[i]), k2 = fn(y2);
  const y3 = y.map((v, i) => v + h / 2 * k2[i]), k3 = fn(y3), y4 = y.map((v, i) => v + h * k3[i]), k4 = fn(y4);
  return y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
FIG('springhit', {
  label: 'Брусок налетает на брусок с пружиной',
  dt: 0.01, h: w => Math.min(150, w * 0.32),
  params: [
    { id: 'm1', label: 'масса налетающего m₁', min: 0.5, max: 3, step: 0.5, val: 1, unit: 'кг' },
    { id: 'm2', label: 'масса покоящегося m₂', min: 0.5, max: 5, step: 0.5, val: 3, unit: 'кг' },
    { id: 'v', label: 'скорость v', min: 1, max: 6, step: 0.5, val: 4, unit: 'м/с' },
    { id: 'k', label: 'жёсткость k', min: 100, max: 1000, step: 50, val: 300, unit: 'Н/м' },
  ],
  init(f) {
    // y = [x₁ (передний край первого), v₁, x₂ (конец пружины второго), v₂]
    f.y = [-0.6, f.p.v, 0, 0]; f.T = 0; f.t0 = null; f.t1 = null; f.cmax = 0;
    const { m1, m2, v, k } = f.p, mu = m1 * m2 / (m1 + m2), vc = m1 * v / (m1 + m2);
    f.th = { c: v * Math.sqrt(mu / k), tau: Math.PI * Math.sqrt(mu / k), u1: 2 * vc - v, u2: 2 * vc };
  },
  rhs(f, y) { const F = f.p.k * Math.max(y[0] - y[2], 0); return [y[1], -F / f.p.m1, y[3], F / f.p.m2]; },
  tick(f) {
    if (f.t1 !== null && f.T - f.t1 > 0.5) return false;
    const n = Math.round(this.dt * SPEED_S / HS), fn = y => this.rhs(f, y);
    for (let i = 0; i < n; i++) {
      const y1 = rk4v(f.y, HS, fn), c0 = f.y[0] - f.y[2], c1 = y1[0] - y1[2];
      if (f.t0 === null && c0 < 0 && c1 >= 0) f.t0 = f.T + root(t => { const z = rk4v(f.y, t, fn); return z[0] - z[2]; }, 0, HS);
      if (f.t0 !== null && f.t1 === null && c0 > 0 && c1 <= 0) f.t1 = f.T + root(t => { const z = rk4v(f.y, t, fn); return z[0] - z[2]; }, 0, HS);
      f.y = y1; f.T += HS; f.cmax = Math.max(f.cmax, c1);
    }
  },
  draw(f, ctx, w, h, C) {
    const k = (w - 40) / 2.2, ox = w * 0.4, y = h * 0.55, X = x => ox + x * k;
    const c = Math.max(f.y[0] - f.y[2], 0), bw = 34;
    D.line(ctx, 10, y + 18, w - 10, y + 18, C.fg, 2);
    D.rect(ctx, X(f.y[0]) - bw, y - 16, bw, 32, C.warm);
    const tip = X(f.y[2]), base = X(f.y[2] + L0);
    D.rect(ctx, base, y - 16, bw, 32, C.accent);
    ctx.beginPath(); ctx.moveTo(base, y);
    const left = Math.max(tip, X(f.y[0]));
    for (let i = 1; i < 10; i++) ctx.lineTo(base + (left - base) * i / 10, y + (i % 2 ? -8 : 8));
    ctx.lineTo(left, y); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();
    D.text(ctx, `сжатие ${F(c * 100, 1)} см`, w - 10, 16, C.muted, 11, 'right');
    D.text(ctx, `замедлено в ${F(1 / SPEED_S, 0)} раз`, 10, 16, C.muted, 11);
  },
  readout(f) {
    const th = f.th, r = [];
    r.push(f.cmax > 0 && (f.t1 !== null || f.y[1] < f.y[3]) ? cmp('наибольшее сжатие', f.cmax, th.c, 'м', '4.1') : ['наибольшее сжатие', '—', `(4.1): ${F(th.c, 3)} м`]);
    if (f.t1 !== null) r.push(cmp('время контакта', f.t1 - f.t0, th.tau, 'с', '4.2'), cmp('v₁ после', f.y[1], th.u1, 'м/с', '1.1'), cmp('v₂ после', f.y[3], th.u2, 'м/с', '1.1'));
    return r;
  },
  note: () => 'Наибольшее сжатие — в момент, когда скорости брусков равны; после расхождения скорости такие же, как при упругом ударе.',
});

/* ——— 5.1 Нецентральный упругий удар ——— */
const RB = 0.1;                                                  // радиус шаров, м
FIG('billiard', {
  label: 'Нецентральный упругий удар шаров',
  dt: 0.01, h: w => Math.min(260, w * 0.55),
  params: [
    { id: 'b', label: 'прицельное расстояние b / 2R', min: 0, max: 0.95, step: 0.05, val: 0.5 },
    { id: 'm2', label: 'масса покоящегося (m₁ = 1 кг)', min: 0.25, max: 3, step: 0.25, val: 1, unit: 'кг' },
  ],
  init(f) {
    const b = f.p.b * 2 * RB;
    f.P = [[-0.9, b], [0, 0]]; f.V = [[1, 0], [0, 0]]; f.T = 0; f.hit = null;
    // момент касания: |p₁ + v t − p₂| = 2R, точно из квадратного уравнения
    const dx = f.P[0][0] - f.P[1][0], dy = f.P[0][1] - f.P[1][1];
    const B = dx, Cc = dx * dx + dy * dy - 4 * RB * RB;           // v = (1, 0)
    f.tHit = -B - Math.sqrt(B * B - Cc);
  },
  tick(f) {
    if (f.T > f.tHit + 0.8) return false;                         // чтобы шары не улетели за край
    const t1 = f.T + this.dt;
    if (!f.hit && t1 >= f.tHit) {
      const tau = f.tHit - f.T;
      f.P.forEach((p, i) => { p[0] += f.V[i][0] * tau; p[1] += f.V[i][1] * tau; });
      const m1 = 1, m2 = f.p.m2, d = [f.P[1][0] - f.P[0][0], f.P[1][1] - f.P[0][1]], L = Math.hypot(...d), n = [d[0] / L, d[1] / L];
      const vr = (f.V[0][0] - f.V[1][0]) * n[0] + (f.V[0][1] - f.V[1][1]) * n[1];
      const J = 2 * m1 * m2 / (m1 + m2) * vr;                     // упругость вдоль линии центров
      f.V[0] = [f.V[0][0] - J / m1 * n[0], f.V[0][1] - J / m1 * n[1]];
      f.V[1] = [f.V[1][0] + J / m2 * n[0], f.V[1][1] + J / m2 * n[1]];
      f.hit = { P: f.P.map(p => p.slice()) };
      f.P.forEach((p, i) => { p[0] += f.V[i][0] * (t1 - f.tHit); p[1] += f.V[i][1] * (t1 - f.tHit); });
    } else f.P.forEach((p, i) => { p[0] += f.V[i][0] * this.dt; p[1] += f.V[i][1] * this.dt; });
    f.T = t1;
  },
  draw(f, ctx, w, h, C) {
    const k = Math.min(w / 2.4, h / 1.6), cx = w * 0.42, cy = h / 2, X = x => cx + x * k, Y = y => cy - y * k;
    D.line(ctx, X(-0.9), Y(f.p.b * 2 * RB), X(0.9), Y(f.p.b * 2 * RB), C.line, 1, [3, 4]);
    D.circ(ctx, X(f.P[0][0]), Y(f.P[0][1]), RB * k, C.warm);
    D.circ(ctx, X(f.P[1][0]), Y(f.P[1][1]), RB * k, C.accent);
    if (f.hit) f.V.forEach((v, i) => D.arrow(ctx, X(f.P[i][0]), Y(f.P[i][1]), X(f.P[i][0]) + v[0] * k * 0.4, Y(f.P[i][1]) - v[1] * k * 0.4, C.fg, 1.5));
    D.text(ctx, 'v₁ = 1 м/с, m₁ = 1 кг', 10, 16, C.muted, 11);
  },
  readout(f) {
    if (!f.hit) return [['угол разлёта', '—', f.p.m2 === 1 ? '(5.1): 90°' : 'зависит от масс']];
    const [a, b] = f.V, m2 = f.p.m2;
    const ang = (u, v) => Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]) * 180 / Math.PI;   // точнее, чем arccos
    const r = [];
    if (f.p.b > 0 && m2 === 1) r.push(cmp('угол разлёта', ang(a, b), 90, '°', '5.1'));
    // угол отклонения налетающего через угол рассеяния χ = π − 2·arcsin(b/2R) в системе центра масс
    const chi = Math.PI - 2 * Math.asin(f.p.b), th1 = f.p.b === 0 ? (m2 > 1 ? 180 : 0) : Math.atan2(Math.sin(chi), Math.cos(chi) + 1 / m2) * 180 / Math.PI;
    if (Math.hypot(...a) > 1e-9) r.push(cmp('отклонение налетающего', ang([1, 0], a), Math.abs(th1), '°', 'система ЦМ'));
    r.push(['импульс', `(${F(a[0] + m2 * b[0], 6)}; ${F(a[1] + m2 * b[1], 6)})`, 'до удара (1; 0)', Math.abs(a[0] + m2 * b[0] - 1) < 1e-9 && Math.abs(a[1] + m2 * b[1]) < 1e-9]);
    r.push(cmp('энергия', (a[0] ** 2 + a[1] ** 2 + m2 * (b[0] ** 2 + b[1] ** 2)) / 2, 0.5, 'Дж', 'до удара'));
    return r;
  },
  note: () => 'Пунктир — линия движения налетающего шара. Импульс передаётся вдоль линии центров в момент касания. При b = 0 удар центральный.',
});

/* ——— 6.1 Бильярд Гальперина ——— */
const SPEED_G = 0.6;
FIG('galperin', {
  label: 'Тяжёлый шар толкает лёгкий к стенке: число ударов',
  dt: 0.01, h: w => Math.min(130, w * 0.3),
  params: [{ id: 'ratio', label: 'отношение масс M/m', val: '100', opts: [['1', '1'], ['100', '100'], ['10000', '10 000']] }],
  init(f) {
    f.M = +f.p.ratio; f.X = 2; f.V = -1; f.x = 1; f.v = 0; f.T = 0; f.n = 0; f.clock = 0; f.last = 0;
    f.expect = { 1: 3, 100: 31, 10000: 314 }[f.M];
  },
  next(f) {                                                      // время до следующего удара и его тип
    let t = Infinity, kind = null;
    if (f.V < f.v) { t = (f.X - f.x) / (f.v - f.V); kind = 'balls'; }
    if (f.v < 0 && f.x / -f.v < t) { t = f.x / -f.v; kind = 'wall'; }
    return [t, kind];
  },
  tick(f) {
    f.clock += this.dt * SPEED_G;
    for (;;) {
      const [t, kind] = this.next(f);
      if (!kind || f.T + t > f.clock) break;
      f.X += f.V * t; f.x += f.v * t; f.T += t; f.n++; f.last = f.T;
      if (kind === 'wall') { f.v = -f.v; f.x = 0; }
      else { const M = f.M, V = f.V, v = f.v; f.V = ((M - 1) * V + 2 * v) / (M + 1); f.v = ((1 - M) * v + 2 * M * V) / (M + 1); f.x = f.X; }
    }
    const dt = f.clock - f.T; f.X += f.V * dt; f.x += f.v * dt; f.T = f.clock;
    if (!this.next(f)[1] && f.T - f.last > 2.5) return false;
  },
  draw(f, ctx, w, h, C) {
    const k = (w - 60) / 4, X = x => 40 + x * k, y = h * 0.6;
    D.line(ctx, 40, 12, 40, h - 12, C.fg, 4);
    D.line(ctx, 40, y + 16, w - 10, y + 16, C.fg, 1.5);
    if (X(f.X) < w + 30) D.circ(ctx, X(f.X) + 14, y, 14, C.accent);
    D.circ(ctx, X(f.x) + 5, y + 9, 5, C.warm);
    D.text(ctx, `ударов: ${f.n}`, w - 10, 20, C.fg, 15, 'right', 'alphabetic', 700);
  },
  readout(f) {
    const E = f.M * f.V * f.V + f.v * f.v;
    const done = !this.next(f)[1];
    return [done ? ['число ударов', String(f.n), `теорема 6.2: ${f.expect}`, f.n === f.expect] : ['число ударов', String(f.n), `теорема 6.2: ${f.expect}`],
            cmp('энергия M V² + m v²', E, f.M, 'ед.', 'в начале')];
  },
  note: () => 'Шары считаются точками (размер на рисунке — для наглядности). При M/m = 10 000 лёгкий шар мечется так быстро, что сливается в полосу.',
});
})();
