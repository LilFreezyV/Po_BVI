(function () {
/* Рисунки темы 12 «Магнетизм и электромагнитная индукция».
   Поле контуров — прямое суммирование Био — Савара по малым отрезкам; движение частицы,
   перемычка и RL-цепь — пошаговое интегрирование. Формулы конспекта — только для сверки. */

const MU0 = 4 * Math.PI * 1e-7, I0 = 10, RC = 0.1;

/* ——— 1.1 Поле в центре контура ——— */
// ломаная → поле Bz в начале координат (контур в плоскости xy)
function bz(pts) {
  let B = 0;
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1], mx = (x1 + x2) / 2, my = (y1 + y2) / 2, r = Math.hypot(mx, my);
    B += MU0 * I0 / (4 * Math.PI) * ((x2 - x1) * (-my) - (y2 - y1) * (-mx)) / r ** 3;
  }
  return B;
}
const SHAPES = {
  loop: { name: 'виток', th: MU0 * I0 / (2 * RC), pts: () => [...Array(4001).keys()].map(k => [RC * Math.cos(2 * Math.PI * k / 4000), RC * Math.sin(2 * Math.PI * k / 4000)]) },
  square: { name: 'квадрат', th: 2 * Math.SQRT2 * MU0 * I0 / (Math.PI * 2 * RC), pts: () => {
    const c = [[RC, RC], [-RC, RC], [-RC, -RC], [RC, -RC], [RC, RC]], out = [];
    for (let s = 0; s < 4; s++) for (let k = 0; k < 1000; k++) out.push([c[s][0] + (c[s + 1][0] - c[s][0]) * k / 1000, c[s][1] + (c[s + 1][1] - c[s][1]) * k / 1000]);
    out.push(c[4]); return out;
  } },
  hair: { name: 'шпилька', th: MU0 * I0 / (4 * RC) * (1 + 2 / Math.PI), pts: () => {
    // провод: из бесконечности по y = R, полукольцо через x > 0, обратно по y = −R; прямые обрезаны на 100 R
    const out = [], Lf = 100 * RC;
    for (let k = 0; k <= 4000; k++) out.push([-Lf + Lf * k / 4000, RC]);
    for (let k = 1; k <= 2000; k++) { const a = Math.PI / 2 - Math.PI * k / 2000; out.push([RC * Math.cos(a), RC * Math.sin(a)]); }
    for (let k = 1; k <= 4000; k++) out.push([-Lf * k / 4000, -RC]);
    return out;
  } },
};
FIG('biot', {
  label: 'Поле в центре контура с током по закону Био — Савара',
  h: w => Math.min(220, w * 0.5),
  params: [{ id: 'shape', label: 'контур', val: 'loop', opts: [['loop', 'виток'], ['square', 'квадрат'], ['hair', 'шпилька']] }],
  init() {},
  calc(f) { const s = SHAPES[f.p.shape]; return { B: Math.abs(bz(s.pts())), th: s.th }; },
  draw(f, ctx, w, h, C) {
    const s = SHAPES[f.p.shape], k = Math.min(w, h) * 0.35 / RC, cx = w / 2, cy = h / 2;
    ctx.beginPath();
    s.pts().filter((_, i) => i % 20 === 0).forEach((p, i) => { const x = cx + Math.max(-w, p[0] * k), y = cy - p[1] * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = C.warm; ctx.lineWidth = 3; ctx.stroke();
    D.circ(ctx, cx, cy, 5, null, C.accent, 2); D.circ(ctx, cx, cy, 1.5, C.accent);
    D.text(ctx, `B = ${F(this.calc(f).B * 1e5, 3)}·10⁻⁵ Тл`, w - 10, 16, C.fg, 12, 'right');
  },
  readout(f) { const r = this.calc(f); return [cmp('поле в центре', r.B * 1e5, r.th * 1e5, '·10⁻⁵ Тл', '1.2')]; },
  note: () => 'Ток 10 А, радиус (полусторона) 10 см. Точка с кружком — поле направлено на нас. Длинные провода шпильки обрезаны на 100 радиусах.',
});

/* ——— 3.1 Скрещённые поля ——— */
FIG('crossed', {
  label: 'Заряд в скрещённых полях: циклоида и дрейф',
  dt: 0.01, h: w => Math.min(240, w * 0.55),
  params: [
    { id: 'E', label: 'электрическое поле E', min: 0.2, max: 2, step: 0.1, val: 1, unit: 'усл.' },
    { id: 'B', label: 'магнитное поле B', min: 0.5, max: 3, step: 0.1, val: 1, unit: 'усл.' },
    { id: 'v0', label: 'начальная скорость вдоль x', min: -2, max: 4, step: 0.25, val: 0, unit: 'усл.' },
  ],
  init(f) { f.x = 0; f.y = 0; f.vx = f.p.v0; f.vy = 0; f.T = 0; f.trace = [[0, 0]]; f.ymax = 0; f.vmax = Math.abs(f.p.v0); },
  tick(f) {
    const { E, B } = f.p, h = 2 * Math.PI / B / 100;              // q = m = 1; ускорение: E·ŷ + v × B·ẑ
    const acc = (vx, vy) => [vy * B, E - vx * B];
    for (let s = 0; s < 3; s++) {
      const a1 = acc(f.vx, f.vy), v2 = [f.vx + h / 2 * a1[0], f.vy + h / 2 * a1[1]], a2 = acc(...v2);
      const v3 = [f.vx + h / 2 * a2[0], f.vy + h / 2 * a2[1]], a3 = acc(...v3), v4 = [f.vx + h * a3[0], f.vy + h * a3[1]], a4 = acc(...v4);
      f.x += h / 6 * (f.vx + 2 * v2[0] + 2 * v3[0] + v4[0]); f.y += h / 6 * (f.vy + 2 * v2[1] + 2 * v3[1] + v4[1]);
      f.vx += h / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]); f.vy += h / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]); f.T += h;
      f.ymax = Math.max(f.ymax, Math.abs(f.y)); f.vmax = Math.max(f.vmax, Math.hypot(f.vx, f.vy));
    }
    f.trace.push([f.x, f.y]);
    if (f.T > 3 * 2 * Math.PI / f.p.B) return false;              // три периода вращения
  },
  draw(f, ctx, w, h, C) {
    const { E, B } = f.p, u = E / B, R = Math.abs(f.p.v0 - u) / B;
    const span = Math.max(u * 6 * Math.PI / B + 2 * R, 1), k = Math.min((w - 30) / span, (h - 40) / Math.max(4 * R, 0.5));
    const X = x => 15 + (x + R) * k, Y = y => h / 2 - y * k;
    ctx.beginPath(); f.trace.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
    D.circ(ctx, X(f.x), Y(f.y), 5, C.red);
    D.arrow(ctx, w - 30, h - 20, w - 30, h - 50, C.red, 2); D.text(ctx, 'E', w - 22, h - 42, C.red, 11);
    D.circ(ctx, w - 60, h - 35, 6, null, C.blue, 1.5); D.circ(ctx, w - 60, h - 35, 1.5, C.blue); D.text(ctx, 'B', w - 74, h - 32, C.blue, 11);
    D.text(ctx, `дрейф E/B = ${F(u, 2)}`, 10, 16, C.muted, 11);
  },
  readout(f) {
    const { E, B, v0 } = f.p, u = E / B, rows = [];
    if (f.T >= 2 * Math.PI / B) {
      rows.push(cmp('наибольшая скорость', f.vmax, u + Math.abs(u - v0), 'усл.', 'E/B + |E/B − v₀|'));
      rows.push(cmp('наибольшее смещение по E', f.ymax, 2 * Math.abs(u - v0) / B, 'усл.', '2|E/B − v₀|/B'));
    } else rows.push(['наибольшая скорость', '—', 'сверка после одного периода вращения']);
    return rows;
  },
  note: () => 'q = m = 1. В системе, движущейся со скоростью E/B, электрического поля нет — частица там просто вращается со скоростью |v₀ − E/B|. При v₀ = E/B она летит прямо (фильтр скоростей).',
});

/* ——— 6.1 Перемычка на рельсах ——— */
FIG('rails', {
  label: 'Перемычку тянут по рельсам в магнитном поле',
  dt: 0.01, h: w => Math.min(150, w * 0.32),
  params: [
    { id: 'F', label: 'сила F', min: 0.02, max: 0.3, step: 0.01, val: 0.1, unit: 'Н' },
    { id: 'B', label: 'поле B', min: 0.1, max: 0.5, step: 0.05, val: 0.2, unit: 'Тл' },
    { id: 'R', label: 'сопротивление R', min: 0.2, max: 3, step: 0.1, val: 1, unit: 'Ом' },
  ],
  init(f) {
    f.v = 0; f.x = 0; f.T = 0; f.half = null; f.hist = [[0, 0]];
    const L = 0.5, m = 0.1;
    f.vu = f.p.F * f.p.R / (f.p.B * L) ** 2; f.tau = m * f.p.R / (f.p.B * L) ** 2;
  },
  tick(f) {
    const L = 0.5, m = 0.1, h = f.tau / 200;                       // 4 шага за тик: 6τ — около 3 с
    for (let s = 0; s < 4; s++) {
      const a = v => (f.p.F - (f.p.B * L) ** 2 * v / f.p.R) / m;
      const k1 = a(f.v), k2 = a(f.v + h / 2 * k1), k3 = a(f.v + h / 2 * k2), k4 = a(f.v + h * k3);
      const vn = f.v + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
      if (f.half === null && f.v < f.vu / 2 && vn >= f.vu / 2) f.half = f.T + h * (f.vu / 2 - f.v) / (vn - f.v);
      f.x += (f.v + vn) / 2 * h; f.v = vn; f.T += h;
    }
    f.hist.push([f.T / f.tau, f.v]);
    if (f.T > 6 * f.tau) return false;
  },
  draw(f, ctx, w, h, C) {
    const y1 = 20, y2 = h - 20, px = 30 + ((f.x / Math.max(f.vu * 6 * f.tau, 1e-9)) * (w - 60)) % (w - 60);
    D.line(ctx, 10, y1, w - 10, y1, C.fg, 2); D.line(ctx, 10, y2, w - 10, y2, C.fg, 2);
    D.line(ctx, 10, y1, 10, y2, C.warm, 3); D.text(ctx, 'R', 16, h / 2, C.warm, 12);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const xx = 60 + i * (w - 90) / 5, yy = y1 + (j + 1) * (y2 - y1) / 3; D.text(ctx, '×', xx, yy + 4, C.line, 12, 'center'); }
    D.line(ctx, px, y1 - 4, px, y2 + 4, C.accent, 5);
    D.arrow(ctx, px, h / 2, px + 30, h / 2, C.red, 2);
    D.text(ctx, `v = ${F(f.v, 2)} м/с`, w - 10, h / 2 + 4, C.fg, 12, 'right');
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 6, ymin: 0, ymax: f.vu * 1.1, xl: 't / τ', yl: 'v, м/с',
        series: [{ pts: f.hist, color: C.accent, lw: 2 }],
        hlines: [{ y: f.vu, color: C.ok, dash: [4, 3], label: 'FR/B²ℓ²' }],
      });
    },
  },
  readout(f) {
    const r = [];
    if (f.half !== null) r.push(cmp('время до половины v_уст', f.half, f.tau * Math.LN2, 'с', 'τ ln 2'));
    if (f.T > 6 * f.tau) r.push(cmp('скорость в конце', f.v, f.vu * (1 - Math.exp(-6)), 'м/с', '6.2'));
    if (!r.length) r.push(['установившаяся скорость', '—', `(6.2): ${F(f.vu, 2)} м/с`]);
    return r;
  },
  note: () => 'Перемычка 0,5 м, масса 0,1 кг; поле направлено от нас (×). Время на графике в единицах τ = mR/B²ℓ²; за 6τ скорость доходит до 99,75 % установившейся. Перемычка на рисунке «перескакивает» в начало, когда доезжает до края.',
});

/* ——— 10.1 RL-цепь с ключом ——— */
const EL = 12, R1 = 2, R2 = 4, LL = 0.1;
FIG('rl', {
  label: 'Катушка в цепи: замыкание и размыкание ключа',
  dt: 0.01, h: w => Math.min(80, w * 0.2),
  params: [{ id: 'L', label: 'индуктивность L', min: 0.02, max: 0.5, step: 0.02, val: 0.1, unit: 'Гн' }],
  init(f) { f.I = 0; f.T = 0; f.on = true; f.tOff = null; f.hist = [[0, 0, 0]]; f.peak = 0; f.Q = 0; f.Ioff = 0; },
  tick(f) {
    const L = f.p.L, tauOn = L / (R1 * R2 / (R1 + R2)), tauOff = L / R2, h = Math.min(tauOn, tauOff) / 400;
    for (let s = 0; s < 20; s++) {
      let U;                                                       // напряжение на катушке (= на R₂)
      if (f.on) { U = (EL / R1 - f.I) / (1 / R1 + 1 / R2); }        // узел: (E − U)/R₁ = U/R₂ + I
      else U = -f.I * R2;
      f.peak = Math.max(f.peak, Math.abs(U));
      // средняя точка
      const Im = f.I + U / L * h / 2, Um = f.on ? (EL / R1 - Im) / (1 / R1 + 1 / R2) : -Im * R2;
      if (!f.on) f.Q += Im * Im * R2 * h;                          // тепло по току средней точки
      f.I += Um / L * h; f.T += h;
      if (f.on && f.T > 8 * tauOn) { f.on = false; f.tOff = f.T; f.Ioff = f.I; f.peak = f.I * R2; }
    }
    f.hist.push([f.T, f.I, f.on ? (EL / R1 - f.I) / (1 / R1 + 1 / R2) : f.I * R2]);
    if (!f.on && f.T - f.tOff > 8 * tauOff) return false;
  },
  draw(f, ctx, w, h, C) {
    D.text(ctx, `${f.on ? 'ключ замкнут' : 'ключ разомкнут'}: ток катушки ${F(f.I, 3)} А`, 10, h / 2 + 5, C.fg, 13);
  },
  graph: {
    h: w => Math.min(220, w * 0.48),
    draw(f, ctx, w, h, C) {
      const tmax = Math.max(f.T, 1e-3);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: tmax, ymin: 0, ymax: 26, xl: 't, с', yl: 'I, А; U₂, В',
        series: [{ pts: f.hist.map(r => [r[0], r[1]]), color: C.accent, lw: 2 }, { pts: f.hist.map(r => [r[0], r[2]]), color: C.red, lw: 1.5 }],
        hlines: [{ y: EL, color: C.muted, dash: [3, 3], label: 'ЭДС 12 В' }],
      });
      legend(ctx, 56, 26, [{ label: 'ток катушки', color: C.accent }, { label: 'напряжение на R₂', color: C.red }], w, C);
    },
  },
  readout(f) {
    const r = [];
    if (f.tOff !== null) {
      r.push(cmp('ток перед размыканием', f.Ioff, EL / R1, 'А', 'катушка — провод'));
      r.push(cmp('напряжение на R₂ сразу после', f.peak, f.Ioff * R2, 'В', '10.1'));
      if (f.T - f.tOff > 8 * f.p.L / R2) r.push(cmp('тепло в R₂ после размыкания', f.Q, f.p.L * f.Ioff ** 2 / 2, 'Дж', 'LI²/2', 0.1));
    } else r.push(['ток сразу после замыкания', '0 А', 'катушка — разрыв; ток источника E/(R₁ + R₂) = 2 А']);
    return r;
  },
  note: () => 'ЭДС 12 В, R₁ = 2 Ом, R₂ = 4 Ом. Ключ у источника размыкается автоматически, когда ток установился. После этого ток катушки идёт через R₂, и напряжение на нём вдвое больше ЭДС.',
});
})();
