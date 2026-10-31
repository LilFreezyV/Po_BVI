(function () {
/* Рисунки темы 02 «Кинематические связи».
   Положения тел во всех трёх моделях заданы точно — геометрией связи (нить, качение, палочка).
   Скорости в таблице — не формулы: это центральная разность положений за шаг DT_DIFF, а с ней
   сверяется теория из конспекта. Так видно, что формула следует из связи, а не вложена в модель. */

const DT_DIFF = 1e-4;   // шаг разностной производной, с (0,005 с давал до 3 % у палочки возле пола)
const diff = (pos, t) => { const a = pos(t - DT_DIFF), b = pos(t + DT_DIFF); return [(b[0] - a[0]) / (2 * DT_DIFF), (b[1] - a[1]) / (2 * DT_DIFF)]; };

/* ——— 1.1 Лодку подтягивают к берегу ——— */
FIG('boat', {
  label: 'Лодку подтягивают за верёвку через блок на берегу',
  dt: 0.01, h: w => Math.min(240, w * 0.5),
  params: [
    { id: 'u', label: 'скорость выбирания u', min: 0.2, max: 2, step: 0.1, val: 1, unit: 'м/с' },
    { id: 'hh', label: 'высота блока h', min: 2, max: 10, step: 0.5, val: 6, unit: 'м' },
    { id: 'x0', label: 'начальное расстояние', min: 10, max: 30, step: 1, val: 20, unit: 'м' },
  ],
  init(f) {
    const { hh, x0 } = f.p;
    f.T = 0; f.l0 = Math.hypot(x0, hh); f.hist = [];
    f.xEnd = 0.3 * hh;                                   // ближе к берегу скорость слишком велика
    f.tEnd = (f.l0 - Math.hypot(f.xEnd, hh)) / f.p.u;     // время остановки — точно, без перескока
  },
  pos(f, t) { const l = f.l0 - f.p.u * t; return [Math.sqrt(Math.max(l * l - f.p.hh ** 2, 0)), 0]; },
  tick(f) {
    f.T = Math.min(f.T + this.dt, f.tEnd);
    const x = this.pos(f, f.T)[0];
    const v = -diff(t => this.pos(f, t), f.T)[0], l = f.l0 - f.p.u * f.T;
    f.hist.push([f.T, v, f.p.u * l / x]);
    if (f.T >= f.tEnd) return false;
  },
  draw(f, ctx, w, h, C) {
    const { hh, x0, u } = f.p, pad = 26, k = Math.min((w - 2 * pad - 30) / x0, (h - 60) / hh);
    const X = m => pad + 30 + m * k, wy = h - 34, Y = m => wy - m * k;
    D.rect(ctx, pad, Y(hh) - 4, 30, wy - Y(hh) + 34, C.line);                 // берег
    D.line(ctx, X(0), wy, w - pad, wy, C.blue, 2);                             // вода
    D.circ(ctx, X(0), Y(hh), 5, C.card, C.fg, 2);                              // блок
    const x = this.pos(f, f.T)[0], l = f.l0 - u * f.T;
    D.line(ctx, X(0), Y(hh), X(x), wy, C.fg, 1.5);                             // верёвка
    D.rect(ctx, X(x) - 4, wy - 6, 34, 10, C.warm);
    const s = 34 / Math.max(u, 0.2), v = u * l / x;                            // пикселей на 1 м/с
    D.arrow(ctx, X(x), wy - 14, X(x) - v * s, wy - 14, C.accent, 2.5);
    const ex = -x / l, ey = hh / l;                                            // вдоль верёвки к блоку
    D.arrow(ctx, X(x), wy, X(x) + ex * u * s, wy - ey * u * s, C.violet, 2);
    legend(ctx, pad, 16, [{ label: 'скорость лодки', color: C.accent }, { label: 'скорость верёвки u', color: C.violet }], w, C);
    scaleBar(ctx, w - pad - 110, h - 10, k, C);
    D.text(ctx, `x = ${F(x, 2)} м`, X(x) + 14, wy + 22, C.muted, 11, 'center');
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      const vmax = Math.max(...f.hist.map(r => r[2]), f.p.u * 1.5);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: Math.max(f.T, 1), ymin: 0, ymax: vmax * 1.05, xl: 't, с', yl: 'v, м/с',
        series: [
          { pts: f.hist.map(r => [r[0], r[2]]), color: C.ok, lw: 4 },
          { pts: f.hist.map(r => [r[0], r[1]]), color: C.accent, lw: 1.5 },
        ],
        hlines: [{ y: f.p.u, color: C.violet, dash: [4, 3], label: 'u' }],
      });
    },
  },
  readout(f) {
    if (!f.hist.length) return [['скорость лодки', '—', '(1.4): u / cos α']];
    const x = this.pos(f, f.T)[0], l = f.l0 - f.p.u * f.T;
    const v = -diff(t => this.pos(f, t), f.T)[0];
    const da = 0.01;                                     // для второй разности шаг крупнее: иначе округление
    const a = -(this.pos(f, f.T + da)[0] - 2 * x + this.pos(f, f.T - da)[0]) / da ** 2;
    return [cmp('скорость лодки', v, f.p.u * l / x, 'м/с', '1.4'),
            cmp('ускорение к берегу', a, (f.p.u * f.p.hh) ** 2 / x ** 3, 'м/с²', 'расчёт')];
  },
  note: () => 'Время реальное. Толстая зелёная линия на графике — теория (1.4), тонкая — скорость, найденная по изменению координаты лодки. Ускорение — вторая разность координаты, сверка с расчётом u²h²/x³ из конспекта.',
});

/* ——— 2.1 Качение колеса и циклоида ——— */
const SPEED_ROLL = 0.5;
FIG('rolling', {
  label: 'Колесо катится без проскальзывания',
  dt: 0.01, h: w => Math.min(270, w * 0.55),
  params: [
    { id: 'vc', label: 'скорость центра v_c', min: 0.5, max: 4, step: 0.5, val: 2, unit: 'м/с' },
    { id: 'R', label: 'радиус R', min: 0.2, max: 1, step: 0.1, val: 0.5, unit: 'м' },
    { id: 'psi', label: 'начальное положение точки (0 — внизу)', min: 0, max: 180, step: 15, val: 0, unit: '°' },
  ],
  init(f) { f.T = 0; f.trace = []; f.hist = []; },
  // материальная точка обода с начальным углом psi (от нижней точки по ходу вращения)
  rim(f, t, psi) {
    const { vc, R } = f.p, a = vc * t / R + psi;
    return [vc * t - R * Math.sin(a), R - R * Math.cos(a)];
  },
  tick(f) {
    f.T += this.dt * SPEED_ROLL;
    const { vc, R } = f.p, psi = f.p.psi * Math.PI / 180;
    const p = this.rim(f, f.T, psi), v = Math.hypot(...diff(t => this.rim(f, t, psi), f.T));
    f.trace.push(p);
    f.hist.push([f.T, v, vc / R * Math.hypot(p[0] - vc * f.T, p[1])]);       // ω·|AP|, P = (x_c, 0)
    if (vc * f.T >= 2 * Math.PI * R) return false;                             // один оборот — одна арка
  },
  draw(f, ctx, w, h, C) {
    const { vc, R } = f.p, pad = 20, gy = h - 30;
    const k = Math.min((w - 2 * pad) / (2 * Math.PI * R + 2 * R), (h - 70) / (2 * R));
    const X = m => pad + (m + R) * k, Y = m => gy - m * k, xc = vc * f.T, w0 = vc / R;
    D.line(ctx, pad, gy, w - pad, gy, C.fg, 2);
    D.circ(ctx, X(xc), Y(R), R * k, null, C.fg, 2);
    if (f.trace.length > 1) {
      ctx.beginPath(); ctx.strokeStyle = C.warm; ctx.lineWidth = 1.5;
      f.trace.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
      ctx.stroke();
    }
    const s = 0.55 * R * k / vc;                                                // пикселей на 1 м/с
    for (let i = 0; i < 8; i++) {                                               // v = v_c + ω × r
      const a = i * Math.PI / 4, rx = R * Math.sin(a), ry = -R * Math.cos(a);
      const vx = vc + w0 * ry, vy = -w0 * rx;
      if (Math.hypot(vx, vy) > 1e-9) D.arrow(ctx, X(xc + rx), Y(R + ry), X(xc + rx) + vx * s, Y(R + ry) - vy * s, C.accent, 1.8);
      D.line(ctx, X(xc), gy, X(xc + rx), Y(R + ry), C.line, 1, [3, 3]);
    }
    D.circ(ctx, X(xc), gy, 4, C.ok);                                            // мгновенный центр
    const p = f.trace.length ? f.trace[f.trace.length - 1] : this.rim(f, 0, f.p.psi * Math.PI / 180);
    D.circ(ctx, X(p[0]), Y(p[1]), 5, C.warm);
    legend(ctx, pad, 16, [{ label: 'скорости точек', color: C.accent }, { label: 'циклоида', color: C.warm }, { label: 'к мгновенному центру', color: C.line, dash: [3, 3] }], w, C);
    D.text(ctx, `замедлено в ${F(1 / SPEED_ROLL, 0)} раза`, w - pad, h - 8, C.muted, 11, 'right');
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      const { vc, R } = f.p;
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 2 * Math.PI * R / vc, ymin: 0, ymax: 2.1 * vc, xl: 't, с', yl: 'v точки, м/с',
        series: [
          { pts: f.hist.map(r => [r[0], r[2]]), color: C.ok, lw: 4 },
          { pts: f.hist.map(r => [r[0], r[1]]), color: C.warm, lw: 1.5 },
        ],
        hlines: [{ y: 2 * vc, color: C.accent, dash: [4, 3], label: '2v_c' }],
      });
    },
  },
  readout(f) {
    if (!f.hist.length) return [['скорость точки', '—', '(2.2): ω·|AP|']];
    const r = f.hist[f.hist.length - 1], { vc, R } = f.p;
    const top = Math.PI - vc * f.T / R;                                         // точка, которая сейчас наверху
    const vTop = Math.hypot(...diff(t => this.rim(f, t, top), f.T));
    return [cmp('скорость выбранной точки', r[1], r[2], 'м/с', '2.2'), cmp('скорость верхней точки', vTop, 2 * vc, 'м/с', '2.2')];
  },
  note: () => 'Положение точки — точно по (2.3); её скорость — разность положений за 0,0001 с. Пунктиры от точек обода сходятся в точке касания: каждая стрелка им перпендикулярна.',
});

/* ——— 3.1 Палочка у стены ——— */
FIG('ladder', {
  label: 'Палочка скользит концами по полу и стене',
  dt: 0.01, h: w => Math.min(280, w * 0.6),
  params: [
    { id: 'L', label: 'длина L', min: 2, max: 6, step: 0.5, val: 5, unit: 'м' },
    { id: 'u', label: 'скорость нижнего конца u', min: 0.2, max: 1.5, step: 0.1, val: 0.6, unit: 'м/с' },
    { id: 'x0', label: 'начальное расстояние от стены (не больше 0,7 L)', min: 0.2, max: 2, step: 0.1, val: 0.6, unit: 'м' },
  ],
  init(f) { f.X0 = Math.min(f.p.x0, 0.7 * f.p.L); f.T = 0; f.hist = []; f.xEnd = f.p.L * Math.cos(5 * Math.PI / 180); f.tEnd = (f.xEnd - f.X0) / f.p.u; },
  top(f, t) { const x = f.X0 + f.p.u * t; return [0, Math.sqrt(Math.max(f.p.L ** 2 - x * x, 0))]; },
  mid(f, t) { const x = f.X0 + f.p.u * t; return [x / 2, Math.sqrt(Math.max(f.p.L ** 2 - x * x, 0)) / 2]; },
  tick(f) {
    f.T = Math.min(f.T + this.dt, f.tEnd);
    const { L, u } = f.p, x = f.X0 + u * f.T, y = Math.sqrt(L * L - x * x);
    f.hist.push([f.T, Math.hypot(...diff(t => this.top(f, t), f.T)), u * x / y]);
    if (f.T >= f.tEnd) return false;
  },
  draw(f, ctx, w, h, C) {
    const { L, u } = f.p, pad = 30, k = Math.min((w - 2 * pad) / L, (h - 50) / L) * 0.95;
    const ox = pad, oy = h - 26, X = m => ox + m * k, Y = m => oy - m * k;
    const x = Math.min(f.X0 + u * f.T, f.xEnd), y = Math.sqrt(L * L - x * x);
    D.line(ctx, ox, oy, w - pad, oy, C.fg, 2); D.line(ctx, ox, oy, ox, 10, C.fg, 2);
    ctx.beginPath(); ctx.setLineDash([3, 4]); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.arc(X(0), Y(0), L / 2 * k, -Math.PI / 2, 0); ctx.stroke(); ctx.setLineDash([]);
    D.line(ctx, X(x), Y(0), X(0), Y(y), C.warm, 4);
    D.line(ctx, X(x), Y(0), X(x), Y(y), C.ok, 1, [4, 3]); D.line(ctx, X(0), Y(y), X(x), Y(y), C.ok, 1, [4, 3]);
    D.circ(ctx, X(x), Y(y), 4, C.ok);                                           // мгновенный центр
    D.text(ctx, 'МЦС', X(x) + 7, Y(y) - 6, C.ok, 11);
    const s = 50 / u, vt = u * x / y, vm = u * L / (2 * y), phi = Math.atan2(y, x);
    D.arrow(ctx, X(x), Y(0), X(x) + u * s, Y(0), C.accent, 2.5);
    D.arrow(ctx, X(0), Y(y), X(0), Y(y) + Math.min(vt * s, h), C.accent, 2.5);
    D.arrow(ctx, X(x / 2), Y(y / 2), X(x / 2) + vm * s * Math.sin(phi), Y(y / 2) + vm * s * Math.cos(phi), C.violet, 2);
    legend(ctx, pad + 10, 16, [{ label: 'скорости концов', color: C.accent }, { label: 'середина', color: C.violet }], w, C);
    D.text(ctx, `φ = ${F(phi * 180 / Math.PI, 1)}°`, w - pad, 34, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      const { L, u } = f.p, tEnd = f.tEnd;
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: tEnd, ymin: 0, ymax: Math.min(u * f.xEnd / Math.sqrt(L * L - f.xEnd ** 2), 8 * u), xl: 't, с', yl: 'v верха, м/с',
        series: [
          { pts: f.hist.map(r => [r[0], r[2]]), color: C.ok, lw: 4 },
          { pts: f.hist.map(r => [r[0], r[1]]), color: C.accent, lw: 1.5 },
        ],
        hlines: [{ y: u, color: C.violet, dash: [4, 3], label: 'u' }],
      });
    },
  },
  readout(f) {
    if (!f.hist.length) return [['скорость верхнего конца', '—', '(3.1): u·ctg φ']];
    const { L, u } = f.p, x = f.X0 + u * f.T, y = Math.sqrt(L * L - x * x);
    const vm = Math.hypot(...diff(t => this.mid(f, t), f.T)), r = f.hist[f.hist.length - 1];
    return [cmp('скорость верхнего конца', r[1], r[2], 'м/с', '3.1'), cmp('скорость середины', vm, u * L / (2 * y), 'м/с', '3.2'),
            ['расстояние середины до угла', `${F(Math.hypot(x / 2, y / 2), 3)} м`, `L/2 = ${F(L / 2, 3)} м`, Math.abs(Math.hypot(x, y) - L) < 1e-9]];
  },
  note: () => 'Время реальное. Движение останавливается при φ = 5°: у пола скорость верхнего конца неограниченно растёт, а в жизни конец раньше отрывается от стены.',
});
})();
