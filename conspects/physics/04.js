(function () {
/* Рисунки темы 04 «Законы сохранения».
   Ракета — закон сохранения импульса для каждой выброшенной порции; брусок на пружине —
   численное интегрирование с сухим трением; горка — уравнения Лагранжа для двух координат.
   Ни одна модель не использует проверяемую формулу: импульс и энергия только сверяются. */

const H = 1e-4;
// шаг РК4 для системы y' = fn(y), y — массив
function rk4v(y, h, fn) {
  const k1 = fn(y), y2 = y.map((v, i) => v + h / 2 * k1[i]), k2 = fn(y2);
  const y3 = y.map((v, i) => v + h / 2 * k2[i]), k3 = fn(y3), y4 = y.map((v, i) => v + h * k3[i]), k4 = fn(y4);
  return y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/* ——— 1.1 Ракета, выбрасывающая топливо порциями ——— */
const BURN = 4;                                                  // время работы двигателя в анимации, с
FIG('rocket', {
  label: 'Ракета разгоняется, выбрасывая топливо порциями',
  dt: 0.01, h: w => Math.min(170, w * 0.36),
  params: [
    { id: 'u', label: 'скорость истечения u', min: 0.5, max: 4, step: 0.1, val: 2, unit: 'км/с' },
    { id: 'z', label: 'отношение масс m₀/m', min: 1.2, max: 10, step: 0.1, val: 4.5 },
    { id: 'n', label: 'число порций', val: '10000', opts: [['1', '1'], ['3', '3'], ['10', '10'], ['100', '100'], ['10000', '10 000']] },
  ],
  init(f) {
    f.N = +f.p.n; f.dm = (1 - 1 / f.p.z) / f.N; f.m = 1; f.v = 0; f.k = 0; f.T = 0; f.hist = [[0, 0]];
    // та же сумма, посчитанная заранее одной формулой: Δv = u·Σ δm/(m_i − δm)
    f.vSum = 0; for (let i = 0; i < f.N; i++) f.vSum += f.p.u * f.dm / (1 - i * f.dm - f.dm);
  },
  tick(f) {
    f.T += this.dt;
    const target = Math.min(f.N, Math.floor(f.N * f.T / BURN + 1e-9));
    while (f.k < target) {                                       // ЗСИ в системе ракеты для порции dm
      f.v += f.p.u * f.dm / (f.m - f.dm); f.m -= f.dm; f.k++;
      if (f.N <= 100 || f.k % 50 === 0) f.hist.push([Math.log(1 / f.m), f.v]);
    }
    if (f.k >= f.N) { f.hist.push([Math.log(1 / f.m), f.v]); return false; }
  },
  draw(f, ctx, w, h, C) {
    const y = h / 2, x = 40 + (w - 120) * Math.min(f.T / BURN, 1);
    ctx.beginPath(); ctx.moveTo(x + 30, y); ctx.lineTo(x - 10, y - 10); ctx.lineTo(x - 10, y + 10); ctx.closePath();
    ctx.fillStyle = C.accent; ctx.fill();
    for (let i = 1; i <= Math.min(f.k, 8); i++) D.circ(ctx, x - 10 - i * 9, y + (i % 2 ? 3 : -3), 3, C.warm);
    D.text(ctx, `v = ${F(f.v, 3)} км/с`, w - 12, 20, C.fg, 13, 'right', 'alphabetic', 600);
    D.text(ctx, `выброшено порций: ${f.k} из ${f.N}`, w - 12, 38, C.muted, 11, 'right');
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      const L = Math.log(f.p.z);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: L, ymin: 0, ymax: Math.max(f.p.u * L, f.vSum) * 1.05, xl: 'ln(m₀/m)', yl: 'v, км/с',
        series: [{ pts: [[0, 0], [L, f.p.u * L]], color: C.ok, lw: 4 }, { pts: f.hist, color: C.accent, lw: 1.5, step: f.N <= 100, dots: f.N <= 10 ? 4 : 0 }],
      });
    },
  },
  readout(f) {
    const L = Math.log(1 / f.m), fine = f.N >= 10000;
    const row = cmp('скорость (порциями)', f.v, f.p.u * L, 'км/с', '1.3');
    if (!fine) row[3] = undefined;                               // крупные порции и не должны совпасть с логарифмом
    return [row,
            ...(f.k >= f.N ? [cmp('та же сумма одной формулой', f.v, f.vSum, 'км/с', 'Σ δm/(m − δm)')] : [])];
  },
  note: () => 'Зелёная прямая — формула Циолковского. При одной порции ракета получает u·(m₀ − m)/m — больше логарифма: выброшенное разом топливо ещё не разогнано вместе с ракетой. Галочка в первой строке — только для 10 000 порций.',
});

/* ——— 5.1 Брусок на пружине с сухим трением ——— */
FIG('springfric', {
  label: 'Брусок на пружине по шероховатому столу',
  dt: 0.01, h: w => Math.min(170, w * 0.36),
  params: [
    { id: 'k', label: 'жёсткость k', min: 20, max: 200, step: 10, val: 100, unit: 'Н/м' },
    { id: 'mu', label: 'коэффициент трения μ', min: 0, max: 0.5, step: 0.02, val: 0.2 },
    { id: 'x0', label: 'начальное растяжение', min: 0.05, max: 0.3, step: 0.01, val: 0.1, unit: 'м' },
  ],
  init(f) {
    const { k, mu, x0 } = f.p, d = 2 * mu * G / k;               // m = 1 кг
    f.x = x0; f.v = 0; f.T = 0; f.path = 0; f.stops = []; f.rest = false; f.hist = [[0, x0]];
    f.dir = mu * G >= k * x0 ? 0 : -1;                            // 0 — даже не сдвинется
    if (!f.dir) f.rest = true;
    // теория: каждая остановка ближе к нулю на 2μmg/k и по другую сторону
    f.thStop = i => (i % 2 ? 1 : -1) * (x0 - (i + 1) * d);
  },
  tick(f) {
    if (f.rest) return false;
    if (f.p.mu === 0 && f.T > 8) return false;
    const { k, mu } = f.p, n = Math.round(this.dt / H);
    for (let i = 0; i < n; i++) {
      const fn = y => [y[1], -k * y[0] - f.dir * mu * G];       // трение против направления движения
      const y1 = rk4v([f.x, f.v], H, fn);
      if (y1[1] * f.dir <= 0 && f.v !== 0) {                     // скорость обратилась в ноль внутри шага
        const tau = root(t => rk4v([f.x, f.v], t, fn)[1], 0, H);
        const y = rk4v([f.x, f.v], tau, fn);
        f.path += Math.abs(y[0] - f.x); f.x = y[0]; f.v = 0; f.T += tau;
        f.stops.push(f.x);
        if (k * Math.abs(f.x) <= mu * G + 1e-9) { f.rest = true; break; }
        f.dir = f.x > 0 ? -1 : 1; continue;
      }
      f.path += Math.abs(y1[0] - f.x); f.x = y1[0]; f.v = y1[1]; f.T += H;
    }
    f.hist.push([f.T, f.x]);
  },
  draw(f, ctx, w, h, C) {
    const cx = w * 0.55, k = (w * 0.38) / f.p.x0, y = h * 0.55;
    D.line(ctx, 20, y + 14, w - 20, y + 14, C.fg, 2);
    D.line(ctx, 30, y - 20, 30, y + 14, C.fg, 3);
    const bx = cx + f.x * k, coils = 12;                          // пружина зигзагом
    ctx.beginPath(); ctx.moveTo(30, y);
    for (let i = 1; i < coils; i++) ctx.lineTo(30 + (bx - 46) * i / coils, y + (i % 2 ? -7 : 7));
    ctx.lineTo(bx - 16, y); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();
    D.rect(ctx, bx - 16, y - 14, 32, 28, C.warm);
    D.line(ctx, cx, y + 18, cx, y + 28, C.fg, 1.5);
    D.text(ctx, 'x = 0', cx, y + 40, C.muted, 10, 'center');
    f.stops.forEach(s => D.line(ctx, cx + s * k, y - 22, cx + s * k, y - 16, C.ok, 2));
    D.text(ctx, f.rest ? 'остановился: k|x| ≤ μmg' : 'движется', w - 12, 16, C.muted, 11, 'right');
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      const x0 = f.p.x0, b = f.p.mu * G / f.p.k;
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: Math.max(f.T, 1), ymin: -x0 * 1.05, ymax: x0 * 1.05, xl: 't, с', yl: 'x, м',
        series: [{ pts: f.hist, color: C.warm, lw: 2 }],
        hlines: b > 0 ? [{ y: b, color: C.ok, dash: [4, 3] }, { y: -b, color: C.ok, dash: [4, 3], label: 'зона застоя ±μmg/k' }] : [],
      });
    },
  },
  readout(f) {
    const { k, mu, x0 } = f.p;
    if (!f.stops.length) return [['первая остановка', '—', f.rest ? 'брусок не сдвинется: kx₀ ≤ μmg' : `теория: ${F(f.thStop(0), 3)} м`]];
    const i = f.stops.length - 1;
    const r = [cmp(`остановка № ${i + 1}`, f.stops[i], f.thStop(i), 'м', 'x₀ − 2nμmg/k')];
    // убыль механической энергии (с кинетической, пока брусок едет) — против работы трения
    if (mu > 0) r.push(cmp('тепло = μmg·путь', k * (x0 * x0 - f.x * f.x) / 2 - f.v * f.v / 2, mu * G * f.path, 'Дж', '5.2'));
    return r;
  },
  note: () => 'Масса бруска 1 кг, время реальное. Зелёные засечки — точки остановок; пунктир на графике — зона, где сила пружины меньше трения покоя: остановившись в ней, брусок замирает.',
});

/* ——— 7.1 Шайба на подвижной горке ——— */
const HILL = 0.5, WID = 0.45, S0 = 2.8;                          // высота и ширина горки, старт шайбы, м
const hf = s => HILL * Math.exp(-s * s / (2 * WID * WID));
const hf1 = s => -s / (WID * WID) * hf(s);
const hf2 = s => (s * s / WID ** 4 - 1 / WID ** 2) * hf(s);
FIG('hill', {
  label: 'Шайба въезжает на подвижную гладкую горку',
  dt: 0.01, h: w => Math.min(220, w * 0.46),
  params: [
    { id: 'v0', label: 'скорость шайбы v₀', min: 1, max: 6, step: 0.1, val: 3, unit: 'м/с' },
    { id: 'm', label: 'масса шайбы m', min: 0.5, max: 3, step: 0.5, val: 1, unit: 'кг' },
    { id: 'M', label: 'масса горки M', min: 0.5, max: 6, step: 0.5, val: 2, unit: 'кг' },
  ],
  init(f) {
    const { v0, m, M } = f.p;
    f.y = [-S0, v0, 0]; f.T = 0; f.ymax = 0; f.out = null;        // s (шайба относительно горки), ṡ, X (горка)
    f.P = m * v0; f.E0 = m * v0 * v0 / 2 + m * G * hf(-S0);
    f.hTh = M / (M + m) * v0 * v0 / (2 * G);
    f.pass = f.hTh > HILL;
  },
  // уравнения Лагранжа: импульс P = m(Ẋ + ṡ) + MẊ сохраняется, остаётся уравнение для s
  rhs(f, y) {
    const { m, M } = f.p, s = y[0], sd = y[1], d1 = hf1(s), d2 = hf2(s);
    const sdd = -(d1 * d2 * sd * sd + G * d1) / (M / (M + m) + d1 * d1);
    return [sd, sdd, (f.P - m * sd) / (M + m)];
  },
  tick(f) {
    if (f.out) return false;
    const n = Math.round(this.dt / H), fn = y => this.rhs(f, y);
    for (let i = 0; i < n; i++) {
      f.y = rk4v(f.y, H, fn); f.T += H;
      f.ymax = Math.max(f.ymax, hf(f.y[0]));
      if (Math.abs(f.y[0]) > S0 && f.T > 0.05) {
        const V = (f.P - f.p.m * f.y[1]) / (f.p.M + f.p.m);
        f.out = { u: V + f.y[1], V }; break;
      }
    }
  },
  vel(f) { const V = (f.P - f.p.m * f.y[1]) / (f.p.M + f.p.m); return [V + f.y[1], V]; },
  draw(f, ctx, w, h, C) {
    const k = (w - 30) / (2 * S0 + 1), gy = h - 26, X = f.y[2], cx = w / 2;   // камера следит за горкой
    const sx = x => cx + (x - X) * k, sy = yy => gy - yy * k;
    D.line(ctx, 0, gy, w, gy, C.fg, 2);
    for (let t = Math.floor(X - 6); t <= X + 6; t++) D.line(ctx, sx(t), gy, sx(t), gy + 6, C.muted, 1);
    ctx.beginPath();
    for (let s = -S0; s <= S0 + 1e-9; s += 0.05) { const px = sx(X + s), py = sy(hf(s)); s === -S0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    ctx.lineTo(sx(X + S0), gy); ctx.lineTo(sx(X - S0), gy); ctx.closePath();
    ctx.fillStyle = C.glass; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    const s = f.y[0];
    D.circ(ctx, sx(X + s), sy(hf(s)) - 7, 7, C.warm);
    if (f.ymax > 0.001) D.line(ctx, sx(X) - 60, sy(f.ymax), sx(X) + 60, sy(f.ymax), C.ok, 1, [4, 3]);
    const [u, V] = this.vel(f);
    D.text(ctx, `шайба ${F(u, 2)} м/с, горка ${F(V, 2)} м/с`, 10, 33, C.muted, 11);
    D.text(ctx, f.pass ? 'перевалит: v₀² > 2gH(M+m)/M' : 'не перевалит, скатится назад', 10, 16, C.muted, 11);
  },
  readout(f) {
    const { v0, m, M } = f.p, [u, V] = this.vel(f);
    const E = m * (u * u + (hf1(f.y[0]) * f.y[1]) ** 2) / 2 + M * V * V / 2 + m * G * hf(f.y[0]);
    const r = [cmp('энергия', E, f.E0, 'Дж', 'в начале')];
    if (!f.pass && f.T > 0 && (f.out || f.y[1] < 0)) r.unshift(cmp('наибольшая высота', f.ymax, f.hTh, 'м', '7.1'));
    if (f.out && !f.pass) r.push(cmp('скорость шайбы после', f.out.u, (m - M) / (m + M) * v0, 'м/с', '7.2'), cmp('скорость горки после', f.out.V, 2 * m / (m + M) * v0, 'м/с', '7.2'));
    if (f.out && f.pass) r.push(cmp('скорость шайбы после', f.out.u, v0, 'м/с', 'перевал'));
    return r;
  },
  note: () => `Высота горки ${F(HILL, 1)} м. Камера едет вместе с горкой — засечки на полу показывают, что она движется. Пунктир — наибольшая высота подъёма шайбы.`,
});
})();
