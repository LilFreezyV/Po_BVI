(function () {
/* Рисунки темы 07 «Механические колебания».
   Во всех трёх моделях интегрируется уравнение движения (РК4, шаг H); период измеряется как
   время между двумя прохождениями положения равновесия в одну сторону, момент прохождения
   уточняется бисекцией внутри шага. Формулы периода используются только для сверки. */

const H = 1e-4;
function rk4(x, v, h, acc) {
  const a1 = acc(x, v), x2 = x + h / 2 * v, v2 = v + h / 2 * a1, a2 = acc(x2, v2);
  const x3 = x + h / 2 * v2, v3 = v + h / 2 * a2, a3 = acc(x3, v3);
  const x4 = x + h * v3, v4 = v + h * a3, a4 = acc(x4, v4);
  return [x + h / 6 * (v + 2 * v2 + 2 * v3 + v4), v + h / 6 * (a1 + 2 * a2 + 2 * a3 + a4)];
}
// общий шаг: продвигает (x, v) на n шагов, отмечает прохождения нуля снизу вверх и наибольшее |x|
function advance(f, n, acc, speed = 1) {
  for (let i = 0; i < n; i++) {
    const [x1, v1] = rk4(f.x, f.v, H, acc);
    if (f.x < 0 && x1 >= 0) f.cross.push(f.T + root(t => rk4(f.x, f.v, t, acc)[0], 0, H));
    f.x = x1; f.v = v1; f.T += H; f.amp = Math.max(f.amp, Math.abs(f.x));
  }
}
const measured = f => (f.cross.length >= 2 ? f.cross[f.cross.length - 1] - f.cross[f.cross.length - 2] : null);

/* ——— 1.1 Фазовая диаграмма ——— */
FIG('phase', {
  label: 'Груз на пружине и его фазовая диаграмма',
  dt: 0.01, h: w => Math.min(220, w * 0.5),
  params: [
    { id: 'w', label: 'циклическая частота ω', min: 1, max: 10, step: 0.5, val: 5, unit: 'рад/с' },
    { id: 'x0', label: 'начальное смещение x₀', min: -5, max: 5, step: 0.5, val: 3, unit: 'см' },
    { id: 'v0', label: 'начальная скорость v₀', min: -40, max: 40, step: 2, val: 20, unit: 'см/с' },
  ],
  init(f) { f.x = f.p.x0; f.v = f.p.v0; f.T = 0; f.cross = []; f.amp = Math.abs(f.x); f.trail = []; },
  tick(f) {
    if (f.T > 12) return false;
    const w2 = f.p.w ** 2;
    advance(f, Math.round(this.dt / H), x => -w2 * x);
    f.trail.push([f.x, f.v / f.p.w]); if (f.trail.length > 600) f.trail.shift();
  },
  draw(f, ctx, w, h, C) {
    const A = Math.hypot(f.p.x0, f.p.v0 / f.p.w) || 1, R = Math.min(w * 0.2, h * 0.4), k = R / A;
    // слева — груз на пружине, справа — фазовая плоскость
    const cy = h / 2, base = 20, mx = w * 0.3 + f.x * k * 0.9;
    D.line(ctx, base, cy - 18, base, cy + 18, C.fg, 3);
    ctx.beginPath(); ctx.moveTo(base, cy);
    for (let i = 1; i < 12; i++) ctx.lineTo(base + (mx - 14 - base) * i / 12, cy + (i % 2 ? -7 : 7));
    ctx.lineTo(mx - 14, cy); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();
    D.rect(ctx, mx - 14, cy - 14, 28, 28, C.warm);
    D.line(ctx, w * 0.3, cy + 22, w * 0.3, cy + 30, C.fg, 1.5);
    const px = w * 0.75, py = cy;
    D.line(ctx, px - R - 10, py, px + R + 10, py, C.line, 1); D.line(ctx, px, py - R - 10, px, py + R + 10, C.line, 1);
    D.circ(ctx, px, py, R, null, C.ok, 1.5, [4, 3]);
    if (f.trail.length > 1) { ctx.beginPath(); f.trail.forEach((p, i) => (i ? ctx.lineTo(px + p[0] * k, py - p[1] * k) : ctx.moveTo(px + p[0] * k, py - p[1] * k))); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke(); }
    D.circ(ctx, px + f.x * k, py - f.v / f.p.w * k, 5, C.accent);
    D.text(ctx, 'x', px + R + 12, py - 4, C.muted, 11); D.text(ctx, 'v/ω', px + 4, py - R - 8, C.muted, 11);
  },
  readout(f) {
    const A = Math.hypot(f.p.x0, f.p.v0 / f.p.w), T = measured(f), r = [];
    if (f.T > 2 * Math.PI / f.p.w) r.push(cmp('амплитуда', f.amp, A, 'см', '1.2'));
    r.push(T ? cmp('период', T, 2 * Math.PI / f.p.w, 'с', '2π/ω') : ['период', '—', `2π/ω = ${F(2 * Math.PI / f.p.w, 3)} с`]);
    return r;
  },
  note: () => 'Пунктир — окружность радиуса A из (1.2). Точка на фазовой плоскости обходит её по часовой стрелке с угловой скоростью ω.',
});

/* ——— 2.1 Маятник с большой амплитудой ——— */
FIG('pendulum', {
  label: 'Математический маятник: период от амплитуды',
  dt: 0.01, h: w => Math.min(240, w * 0.55),
  params: [
    { id: 'th0', label: 'начальный угол θ₀', min: 5, max: 170, step: 5, val: 30, unit: '°' },
    { id: 'L', label: 'длина L', min: 0.25, max: 2, step: 0.25, val: 1, unit: 'м' },
  ],
  // отпускаем из крайнего положения; координата — угол
  init(f) { f.x = f.p.th0 * Math.PI / 180; f.v = 0; f.T = 0; f.cross = []; f.amp = f.x; },
  tick(f) {
    if (f.cross.length >= 3) return false;
    advance(f, Math.round(this.dt / H), th => -G / f.p.L * Math.sin(th));
  },
  draw(f, ctx, w, h, C) {
    const L = f.p.L, k = Math.min(w * 0.4, h * 0.45) / L, cx = w / 2, cy = h * 0.48;
    ctx.beginPath(); ctx.setLineDash([3, 4]); ctx.arc(cx, cy, L * k, 0, 2 * Math.PI); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    const bx = cx + L * k * Math.sin(f.x), by = cy + L * k * Math.cos(f.x);
    D.line(ctx, cx, cy, bx, by, C.fg, 2); D.circ(ctx, cx, cy, 3, C.fg); D.circ(ctx, bx, by, 9, C.accent);
    D.text(ctx, `t = ${F(f.T, 2)} с`, w - 10, 16, C.muted, 11, 'right');
  },
  readout(f) {
    const T = measured(f), t0 = 2 * Math.PI * Math.sqrt(f.p.L / G), th = f.p.th0 * Math.PI / 180;
    if (!T) return [['период', '—', `малые колебания: ${F(t0, 3)} с`]];
    return [['период (интегрирование)', `${F(T, 4)} с`, `малые колебания 2π√(L/g) = ${F(t0, 4)} с, больше на ${F((T / t0 - 1) * 100, 2)} %`],
            cmp('с поправкой (1 + θ₀²/16)', T, t0 * (1 + th * th / 16), 'с', 'поправка', 0.5).slice(0, 3).concat([f.p.th0 <= 40 ? pct(T, t0 * (1 + th * th / 16)) <= 0.5 : undefined])];
  },
  note: () => 'Время реальное. Поправка 1 + θ₀²/16 хороша до 40° (расхождение меньше 0,5 %); при больших углах период растёт быстрее, а у 180° — неограниченно.',
});

/* ——— 3.1 Бусинка на натянутой струне ——— */
const SPEED_STR = 0.1;
FIG('string', {
  label: 'Бусинка на натянутой струне',
  dt: 0.01, h: w => Math.min(170, w * 0.4),
  params: [
    { id: 'T0', label: 'натяжение T₀', min: 10, max: 100, step: 5, val: 50, unit: 'Н' },
    { id: 'm', label: 'масса бусинки', min: 0.02, max: 0.5, step: 0.02, val: 0.1, unit: 'кг' },
    { id: 'a', label: 'амплитуда (доля половины длины)', min: 0.01, max: 1, step: 0.01, val: 0.05 },
  ],
  init(f) { f.l = 0.5; f.x = f.p.a * f.l; f.v = 0; f.T = 0; f.cross = []; f.amp = f.x; },
  tick(f) {
    if (f.cross.length >= 3) return false;
    const { T0, m } = f.p, l = f.l;
    advance(f, Math.round(this.dt * SPEED_STR / H), x => -2 * T0 * x / Math.sqrt(l * l + x * x) / m);
  },
  draw(f, ctx, w, h, C) {
    const k = (w - 40) / (2 * f.l), cy = h / 2, x0 = 20, x1 = w - 20, mx = (x0 + x1) / 2, my = cy - f.x * k;
    D.line(ctx, x0, cy, mx, my, C.fg, 1.5); D.line(ctx, mx, my, x1, cy, C.fg, 1.5);
    D.circ(ctx, x0, cy, 4, C.fg); D.circ(ctx, x1, cy, 4, C.fg); D.circ(ctx, mx, my, 7, C.warm);
    D.line(ctx, x0, cy, x1, cy, C.line, 1, [3, 4]);
    D.text(ctx, `замедлено в ${F(1 / SPEED_STR, 0)} раз`, w - 10, 16, C.muted, 11, 'right');
  },
  readout(f) {
    const T = measured(f), th = 2 * Math.PI * Math.sqrt(f.p.m * f.l / (2 * f.p.T0)), small = f.p.a <= 0.05;
    if (!T) return [['период', '—', `энергетическая формула: ${F(th, 4)} с`]];
    const row = cmp('период', T, th, 'с', '2π√(ml/2T₀)', 0.1);
    if (!small) row[3] = undefined;                               // при большой амплитуде и не должно совпасть
    return [row];
  },
  note: () => 'Длина струны 1 м. При амплитуде до 5 % от половины длины период совпадает с формулой малых колебаний; при большой — растёт: возвращающая сила уже не пропорциональна смещению.',
});
})();
