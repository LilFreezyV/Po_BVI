(function () {
/* Рисунки темы 01 «Кинематика».
   Пять моделей из шести решают уравнения точно (аналитика из конспекта), погоня — РК4.
   Шаг модельного времени фиксирован и не зависит от частоты кадров: движок вызывает tick
   каждые spec.dt секунд реального времени, а модельное время продвигается на spec.dt·SPEED.
   В таблице под рисунком: численное значение, теория со ссылкой на формулу, расхождение. */

/* ——— 1.1 Встреча двух тел ——— */
FIG('meet', {
  label: 'Два тела движутся навстречу по прямой',
  dt: 0.01, h: w => Math.min(150, w * 0.32),
  params: [
    { id: 'v1', label: 'v₁', min: 1, max: 20, step: 0.5, val: 8, unit: 'м/с' },
    { id: 'v2', label: 'v₂ (навстречу)', min: 1, max: 20, step: 0.5, val: 5, unit: 'м/с' },
    { id: 'L', label: 'L', min: 50, max: 400, step: 10, val: 200, unit: 'м' },
  ],
  init(f) {
    const { v1, v2, L } = f.p;
    f.T = 0; f.met = null; f.hist = [];
    f.tTh = L / (v1 + v2); f.xTh = v1 * f.tTh; // (1.2)
    f.tEnd = 1.35 * f.tTh;
  },
  tick(f) {
    const { v1, v2, L } = f.p, h = this.dt;
    const t0 = f.T, t1 = t0 + h;
    const d0 = (L - v2 * t0) - v1 * t0, d1 = (L - v2 * t1) - v1 * t1;
    if (f.met === null && d0 > 0 && d1 <= 0) {           // встреча внутри шага: интерполяция
      const tm = t0 + h * d0 / (d0 - d1);                // движение линейно — интерполяция точна
      f.met = { t: tm, x: v1 * tm };
    }
    f.T = t1; f.hist.push([t1, v1 * t1, L - v2 * t1]);
    if (f.T >= f.tEnd) return false;
  },
  draw(f, ctx, w, h, C) {
    const { v1, v2, L } = f.p, pad = 24, k = (w - 2 * pad) / L, y = h * 0.52;
    D.line(ctx, pad, y, w - pad, y, C.line, 2);
    const x1 = v1 * f.T, x2 = L - v2 * f.T;
    D.circ(ctx, pad + x1 * k, y, 8, C.accent); D.circ(ctx, pad + x2 * k, y, 8, C.warm);
    D.text(ctx, '1', pad + x1 * k, y - 14, C.accent, 12, 'center', 'alphabetic', 700);
    D.text(ctx, '2', pad + x2 * k, y - 14, C.warm, 12, 'center', 'alphabetic', 700);
    if (f.met) D.line(ctx, pad + f.met.x * k, y - 26, pad + f.met.x * k, y + 26, C.ok, 1.5, [4, 3]);
    scaleBar(ctx, pad, h - 14, k, C);
    D.text(ctx, `t = ${F(f.T, 2)} с`, w - pad, 18, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(210, w * 0.45),
    draw(f, ctx, w, h, C) {
      const { L } = f.p;
      D.plot(ctx, { x: 48, y: 18, w: w - 66, h: h - 52 }, {
        xmin: 0, xmax: f.tEnd, ymin: 0, ymax: L, xl: 't, с', yl: 'x, м',
        series: [
          { pts: f.hist.map(r => [r[0], r[1]]), color: C.accent, lw: 2 },
          { pts: f.hist.map(r => [r[0], r[2]]), color: C.warm, lw: 2 },
          ...(f.met ? [{ pts: [[f.met.t, f.met.x]], color: C.ok, dots: 5 }] : []),
        ],
        hlines: [{ y: f.xTh, color: C.ok, label: 'x встречи по (1.2)' }],
      });
    },
  },
  readout(f) {
    if (!f.met) return [['t встречи', '—', `(1.2): ${F(f.tTh, 3)} с`]];
    return [cmp('t встречи', f.met.t, f.tTh, 'с', '1.2'), cmp('x встречи', f.met.x, f.xTh, 'м', '1.2')];
  },
  note: () => 'Время в анимации реальное. Движение задано точно формулой (1.1); момент встречи найден линейной интерполяцией внутри шага 0,01 с — для линейного движения она точна.',
});

/* ——— 4.1 Минимальное расстояние в системе отсчёта корабля ——— */
const SPEED_REL = 10;
FIG('relative', {
  label: 'Два корабля: вид с берега и вид с первого корабля',
  dt: 0.01, h: w => Math.min(300, w * 0.6),
  params: [
    { id: 'v1', label: 'v₁ (на восток)', min: 2, max: 20, step: 1, val: 10, unit: 'м/с' },
    { id: 'v2', label: 'v₂', min: 2, max: 20, step: 1, val: 10, unit: 'м/с' },
    { id: 'phi', label: 'угол курса 2 к курсу 1', min: 0, max: 180, step: 5, val: 90, unit: '°' },
    { id: 'r0', label: 'начальное расстояние (2 южнее 1)', min: 300, max: 2000, step: 50, val: 1000, unit: 'м' },
  ],
  init(f) {
    const { v1, v2, phi, r0 } = f.p, a = phi * Math.PI / 180;
    f.vr = [v2 * Math.cos(a) - v1, v2 * Math.sin(a)];  // v₂ − v₁
    f.R0 = [0, -r0];
    const vv = f.vr[0] ** 2 + f.vr[1] ** 2;
    f.still = vv < 1e-9;                                 // одинаковые скорости: расстояние не меняется
    f.tStar = f.still ? 0 : -(f.R0[0] * f.vr[0] + f.R0[1] * f.vr[1]) / vv;            // (4.1)
    if (Math.abs(f.tStar) < 1e-9) f.tStar = 0;           // шум округления (например, sin 180°)
    f.dTh = f.still || f.tStar <= 0 ? r0 : Math.abs(f.R0[0] * f.vr[1] - f.R0[1] * f.vr[0]) / Math.sqrt(vv); // (4.1)
    f.tEnd = f.still ? 30 : Math.max(2 * f.tStar, r0 / Math.sqrt(vv)) + 20;
    f.T = 0; f.dMin = r0; f.tMin = 0; f.hist = [[0, r0]];
  },
  tick(f) {
    const h = this.dt * SPEED_REL, n = f.hist.length;
    f.T += h;
    const x = f.R0[0] + f.vr[0] * f.T, y = f.R0[1] + f.vr[1] * f.T, d = Math.hypot(x, y);
    f.hist.push([f.T, d]);
    // Минимум найден, когда расстояние пошло вверх. Квадрат расстояния — точная парабола по t,
    // поэтому вершина параболы через три последних шага даёт минимум без ошибки дискретизации.
    if (n >= 2 && f.dMin === f.p.r0 && d > f.hist[n - 1][1] && f.hist[n - 1][1] <= f.hist[n - 2][1]) {
      const [[t0, a], [t1, b], [t2, c]] = [f.hist[n - 2], f.hist[n - 1], f.hist[n]].map(([t, r]) => [t, r * r]);
      const A = ((c - b) / (t2 - t1) - (b - a) / (t1 - t0)) / (t2 - t0), B = (b - a) / (t1 - t0) - A * (t0 + t1);
      f.tMin = -B / (2 * A); f.dMin = Math.sqrt(Math.max(0, a + (b - a) / (t1 - t0) * (f.tMin - t0) + A * (f.tMin - t0) * (f.tMin - t1)));
    }
    if (f.T >= f.tEnd) return false;
  },
  draw(f, ctx, w, h, C) {
    const { v1, v2, phi, r0 } = f.p, a = phi * Math.PI / 180, half = w / 2;
    const span = Math.max(r0 * 1.3, 1);
    const k = Math.min((half - 30) / (2 * span), (h - 50) / (2 * span));
    // левая панель — берег; начало координат в центре панели
    const o1 = [half / 2, h / 2 - 6];
    const P = (o, x, y) => [o[0] + x * k, o[1] - y * k];
    D.text(ctx, 'С берега', 12, 18, C.muted, 12);
    const s1 = [v1 * f.T, 0], s2 = [v2 * Math.cos(a) * f.T, -r0 + v2 * Math.sin(a) * f.T];
    D.line(ctx, ...P(o1, 0, 0), ...P(o1, s1[0], s1[1]), D.alpha(C.accent, 0.5), 1.5, [4, 3]);
    D.line(ctx, ...P(o1, 0, -r0), ...P(o1, s2[0], s2[1]), D.alpha(C.warm, 0.5), 1.5, [4, 3]);
    D.circ(ctx, ...P(o1, s1[0], s1[1]), 6, C.accent); D.circ(ctx, ...P(o1, s2[0], s2[1]), 6, C.warm);
    D.line(ctx, ...P(o1, s1[0], s1[1]), ...P(o1, s2[0], s2[1]), D.alpha(C.fg, 0.3), 1);
    // правая панель — система корабля 1
    D.line(ctx, half, 8, half, h - 8, C.line, 1);
    const o2 = [half + half / 2, h / 2 - 6];
    D.text(ctx, 'С корабля 1', half + 12, 18, C.muted, 12);
    const rel = [f.R0[0] + f.vr[0] * f.T, f.R0[1] + f.vr[1] * f.T];
    const far = [f.R0[0] + f.vr[0] * f.tEnd, f.R0[1] + f.vr[1] * f.tEnd];
    D.line(ctx, ...P(o2, f.R0[0], f.R0[1]), ...P(o2, far[0], far[1]), D.alpha(C.warm, 0.35), 1.5, [4, 3]);
    if (f.tStar > 0) {
      const foot = [f.R0[0] + f.vr[0] * f.tStar, f.R0[1] + f.vr[1] * f.tStar];
      D.line(ctx, ...P(o2, 0, 0), ...P(o2, foot[0], foot[1]), C.ok, 1.5);
      D.text(ctx, `d min = ${F(f.dTh, 0)} м`, P(o2, foot[0], foot[1])[0] + 6, P(o2, foot[0], foot[1])[1] - 6, C.ok, 11);
    }
    D.circ(ctx, ...P(o2, 0, 0), 6, C.accent); D.circ(ctx, ...P(o2, rel[0], rel[1]), 6, C.warm);
    scaleBar(ctx, 14, h - 12, k, C, 90);
    D.text(ctx, `t = ${F(f.T, 1)} с`, w - 12, h - 10, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      D.plot(ctx, { x: 56, y: 18, w: w - 74, h: h - 52 }, {
        xmin: 0, xmax: f.tEnd, ymin: 0, ymax: f.p.r0 * 1.6, xl: 't, с', yl: 'расстояние, м',
        series: [{ pts: f.hist, color: C.warm, lw: 2 }],
        hlines: [{ y: f.dTh, color: C.ok, label: 'd min по (4.1)' }],
      });
    },
  },
  readout(f) {
    if (f.still) return [['относительная скорость', '0 м/с', 'скорости равны: расстояние не меняется и равно начальному']];
    if (f.tStar <= 0) return [['t*', F(f.tStar, 2) + ' с', 'минимум сейчас или уже прошёл: ближе начального не будет']];
    if (f.T < f.tStar) return [['d min', '—', `(4.1): ${F(f.dTh, 2)} м — ждём минимума`]];
    return [cmp('d min', f.dMin, f.dTh, 'м', '4.1', 0.01), cmp('момент минимума t*', f.tMin, f.tStar, 'с', '4.1', 0.2)];
  },
  note: () => `Модельное время ускорено в ${SPEED_REL} раз (шаг 0,1 с). Положения точные по (1.1); минимум уточняется параболой через три шага — квадрат расстояния точно квадратичен по времени.`,
});

/* ——— 6.1 Тело, брошенное вертикально вверх ——— */
FIG('uniacc', {
  label: 'Тело, брошенное вертикально вверх, и графики y(t), v(t)',
  dt: 0.005, h: w => Math.min(280, w * 0.55),
  params: [{ id: 'v0', label: 'v₀', min: 2, max: 30, step: 0.5, val: 15, unit: 'м/с' }],
  init(f) {
    const v0 = f.p.v0;
    f.T = 0; f.y = 0; f.vy = v0; f.hMax = 0; f.tTop = null; f.tFall = null; f.hist = [[0, 0, v0]];
    f.hTh = v0 * v0 / (2 * G); f.tTopTh = v0 / G; f.tFallTh = 2 * v0 / G;   // (6.3), (6.1)
  },
  tick(f) {
    const v0 = f.p.v0, h = this.dt, t = f.T + h;
    const Y = s => v0 * s - G * s * s / 2;                                     // (6.2)
    const y = Y(t), vy = v0 - G * t;                                           // (6.1)
    if (f.vy > 0 && vy <= 0) { f.tTop = root(s => v0 - G * s, f.T, t); f.hMax = Y(f.tTop); }
    if (y < 0) { f.tFall = root(Y, f.T, t); f.T = f.tFall; f.y = 0; f.vy = v0 - G * f.tFall; f.hist.push([f.T, 0, f.vy]); return false; }
    f.T = t; f.y = y; f.vy = vy; f.hist.push([t, y, vy]);
  },
  draw(f, ctx, w, h, C) {
    const top = f.hTh * 1.12 + 0.5, k = (h - 40) / top, base = h - 22, x = w * 0.32;
    D.line(ctx, 20, base, w - 20, base, C.line, 2);
    D.line(ctx, x - 40, base - f.hTh * k, x + 40, base - f.hTh * k, C.ok, 1.2, [4, 3]);
    D.text(ctx, `h по (6.3) = ${F(f.hTh, 2)} м`, x + 46, base - f.hTh * k + 4, C.ok, 11);
    const yy = base - f.y * k;
    D.circ(ctx, x, yy, 8, C.accent);
    const kv = 3;                                                            // масштаб стрелки: 1 м/с = 3 px
    if (Math.abs(f.vy) > 0.05) D.arrow(ctx, x, yy, x, yy - f.vy * kv, C.warm, 2);
    legend(ctx, w - 190, 18, [{ color: C.warm, label: `скорость: 1 м/с = ${kv} px` }], w, C);
    scaleBar(ctx, 20, h - 6, k, C, 90);
    D.text(ctx, `t = ${F(f.T, 2)} с   y = ${F(f.y, 2)} м   v = ${F(f.vy, 2)} м/с`, w - 20, 40, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      const half = (w - 20) / 2, T = f.tFallTh * 1.05, v0 = f.p.v0;
      D.plot(ctx, { x: 46, y: 18, w: half - 60, h: h - 52 }, {
        xmin: 0, xmax: T, ymin: 0, ymax: f.hTh * 1.15 + 0.1, xl: 't, с', yl: 'y, м',
        series: [{ pts: f.hist.map(r => [r[0], r[1]]), color: C.accent, lw: 2 }],
      });
      D.plot(ctx, { x: half + 46, y: 18, w: half - 60, h: h - 52 }, {
        xmin: 0, xmax: T, ymin: -v0 * 1.1, ymax: v0 * 1.1, xl: 't, с', yl: 'v, м/с',
        series: [{ pts: f.hist.map(r => [r[0], r[2]]), color: C.warm, lw: 2 }],
        hlines: [{ y: 0, color: C.muted }],
      });
    },
  },
  readout(f) {
    const rows = [];
    if (f.tTop !== null) { rows.push(cmp('высота подъёма', f.hMax, f.hTh, 'м', '6.3', 0.01)); rows.push(cmp('время подъёма', f.tTop, f.tTopTh, 'с', '6.1', 0.01)); }
    if (f.tFall !== null) rows.push(cmp('время полёта', f.tFall, f.tFallTh, 'с', '6.1', 0.01));
    return rows.length ? rows : [['высота подъёма', '—', `(6.3): ${F(f.hTh, 3)} м`]];
  },
  note: () => 'Время реальное, g = 9,81 м/с². Положение — точно по (6.2); моменты вершины (v = 0) и падения (y = 0) уточняются бисекцией внутри шага 0,005 с.',
});

/* ——— 8.1 Бросок под углом и окружность кривизны ——— */
const SPEED_PROJ = 0.5;
FIG('projectile', {
  label: 'Бросок под углом к горизонту с векторами скорости и ускорения',
  dt: 0.01, h: w => Math.min(300, w * 0.58),
  params: [
    { id: 'v0', label: 'v₀', min: 5, max: 30, step: 0.5, val: 18, unit: 'м/с' },
    { id: 'al', label: 'α', min: 5, max: 85, step: 1, val: 50, unit: '°' },
  ],
  init(f) {
    const v0 = f.p.v0, a = f.p.al * Math.PI / 180;
    f.c = Math.cos(a); f.s = Math.sin(a);
    f.Tth = 2 * v0 * f.s / G; f.Lth = v0 * v0 * Math.sin(2 * a) / G; f.Hth = (v0 * f.s) ** 2 / (2 * G); // (8.3)
    f.rhoTopTh = (v0 * f.c) ** 2 / G;                                                                // (14.2)
    f.T = 0; f.hMax = 0; f.L = null; f.rhoTop = null; f.hist = [];
  },
  pos(f, t) { const v0 = f.p.v0; return [v0 * f.c * t, v0 * f.s * t - G * t * t / 2, v0 * f.c, v0 * f.s - G * t]; }, // (8.1)
  tick(f) {
    const h = this.dt * SPEED_PROJ, prev = this.pos(f, f.T), t = f.T + h, cur = this.pos(f, t);
    if (prev[3] > 0 && cur[3] <= 0) {                   // вершина внутри шага — ищем v_y = 0
      const tt = root(s => this.pos(f, s)[3], f.T, t), p = this.pos(f, tt);
      const v2 = p[2] ** 2 + p[3] ** 2, an = G * Math.abs(p[2]) / Math.sqrt(v2); // a_n = |v × g| / v
      f.rhoTop = v2 / an; f.hMax = p[1];
    }
    if (cur[1] < 0) {                                    // падение внутри шага — ищем y = 0
      const tt = root(s => this.pos(f, s)[1], f.T, t);
      f.T = tt; f.L = this.pos(f, tt)[0]; f.hist.push([tt, 0, this.pos(f, tt)[3]]); return false;
    }
    f.T = t; f.hist.push([t, cur[1], cur[3]]);
  },
  draw(f, ctx, w, h, C) {
    const pad = 26, base = h - 26;
    const k = Math.min((w - 2 * pad) / Math.max(f.Lth, 1), (base - 26) / Math.max(f.Hth * 1.25, 1));
    const P = (x, y) => [pad + x * k, base - y * k];
    D.line(ctx, pad - 10, base, w - pad + 10, base, C.line, 2);
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const p = this.pos(f, f.Tth * i / 80), q = P(p[0], p[1]); i ? ctx.lineTo(...q) : ctx.moveTo(...q); }
    ctx.strokeStyle = D.alpha(C.muted, 0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    const p = this.pos(f, f.T), q = P(p[0], p[1]);
    // окружность кривизны: центр смещён от точки на ρ вдоль нормали к скорости, в сторону вогнутости
    const v = Math.hypot(p[2], p[3]), an = G * Math.abs(p[2]) / v, rho = v * v / an;
    const nx = p[3] / v, ny = -p[2] / v;                 // нормаль, повёрнутая к центру (вниз-вправо для v_x>0)
    const cx = p[0] + rho * nx * Math.sign(p[2]), cy = p[1] + rho * ny * Math.sign(p[2]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, base); ctx.clip();
    D.circ(ctx, ...P(cx, cy), rho * k, null, D.alpha(C.violet, 0.75), 1.2, [5, 4]);
    ctx.restore();
    D.circ(ctx, ...q, 6.5, C.accent);
    const kv = 2.5, ka = 3;                               // px на 1 м/с и на 1 м/с²
    D.arrow(ctx, ...q, q[0] + p[2] * kv, q[1] - p[3] * kv, C.warm, 2);
    D.arrow(ctx, ...q, q[0], q[1] + G * ka, C.red, 2);
    const ly = legend(ctx, pad, 16, [{ color: C.warm, label: `v: 1 м/с = ${kv} px` }, { color: C.red, label: `g: 1 м/с² = ${ka} px` }, { color: C.violet, label: 'окружность кривизны', dash: [5, 4] }], w, C);
    scaleBar(ctx, w - pad - 110, base + 16, k, C, 100);
    D.text(ctx, `t = ${F(f.T, 2)} с   ρ = ${F(rho, 1)} м`, w - pad, ly + 20, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      const half = (w - 20) / 2, v0 = f.p.v0, T = f.Tth * 1.05;
      D.plot(ctx, { x: 46, y: 18, w: half - 60, h: h - 52 }, {
        xmin: 0, xmax: T, ymin: 0, ymax: f.Hth * 1.2 + 0.1, xl: 't, с', yl: 'y, м',
        series: [{ pts: f.hist.map(r => [r[0], r[1]]), color: C.accent, lw: 2 }],
      });
      D.plot(ctx, { x: half + 46, y: 18, w: half - 60, h: h - 52 }, {
        xmin: 0, xmax: T, ymin: -v0 * f.s * 1.15, ymax: v0 * f.s * 1.15, xl: 't, с', yl: 'v_y, м/с',
        series: [{ pts: f.hist.map(r => [r[0], r[2]]), color: C.warm, lw: 2 }],
        hlines: [{ y: 0, color: C.muted }],
      });
    },
  },
  readout(f) {
    const rows = [];
    if (f.rhoTop !== null) rows.push(cmp('ρ в вершине', f.rhoTop, f.rhoTopTh, 'м', '14.2', 0.01), cmp('высота H', f.hMax, f.Hth, 'м', '8.3', 0.01));
    if (f.L !== null) rows.push(cmp('дальность L', f.L, f.Lth, 'м', '8.3', 0.01), cmp('время T', f.T, f.Tth, 'с', '8.3', 0.01));
    return rows.length ? rows : [['дальность L', '—', `(8.3): ${F(f.Lth, 3)} м`]];
  },
  note: () => `Модельное время замедлено в ${F(1 / SPEED_PROJ, 0)} раза, g = 9,81 м/с². Координаты точные по (8.1); моменты вершины и падения уточняются бисекцией внутри шага.`,
});

/* ——— 12.1 Парабола безопасности ——— */
const ANG = [10, 20, 30, 40, 50, 60, 70, 80];
FIG('envelope', {
  label: 'Семейство траекторий с одной скоростью и парабола безопасности',
  dt: 0.01, h: w => Math.min(300, w * 0.6),
  params: [{ id: 'v0', label: 'v₀', min: 6, max: 25, step: 0.5, val: 14, unit: 'м/с' }],
  init(f) {
    f.T = 0; f.i = 0; f.landed = [];
    const v0 = f.p.v0; f.R = v0 * v0 / G; f.Hm = v0 * v0 / (2 * G);
    if (!f.tgt) f.tgt = [0.55 * f.R, 0.35 * f.Hm];
    f.tgt = [Math.min(f.tgt[0], f.R * 1.05), Math.min(f.tgt[1], f.Hm * 1.2)];
  },
  tick(f) {
    const v0 = f.p.v0, a = ANG[f.i] * Math.PI / 180, T = 2 * v0 * Math.sin(a) / G;
    f.T += this.dt * 0.6;                                    // замедлено в 1,7 раза
    if (f.T >= T) { f.landed.push(f.i); f.i++; f.T = 0; if (f.i >= ANG.length) return false; }
  },
  view(w, h, f) { const pad = 26, base = h - 26, k = Math.min((w - 2 * pad) / (f.R * 1.1), (base - 30) / (f.Hm * 1.3)); return { pad, base, k }; },
  draw(f, ctx, w, h, C) {
    const v0 = f.p.v0, { pad, base, k } = this.view(w, h, f); f.vw = { pad, base, k };
    const P = (x, y) => [pad + x * k, base - y * k];
    D.line(ctx, pad - 10, base, w - pad + 10, base, C.line, 2);
    const traj = (deg, tEnd, col, lw) => {
      const a = deg * Math.PI / 180; ctx.beginPath();
      for (let j = 0; j <= 60; j++) { const t = tEnd * j / 60, q = P(v0 * Math.cos(a) * t, v0 * Math.sin(a) * t - G * t * t / 2); j ? ctx.lineTo(...q) : ctx.moveTo(...q); }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    };
    f.landed.forEach(i => traj(ANG[i], 2 * v0 * Math.sin(ANG[i] * Math.PI / 180) / G, D.alpha(C.accent, 0.45), 1.3));
    if (f.i < ANG.length) {
      traj(ANG[f.i], f.T, C.accent, 2);
      const a = ANG[f.i] * Math.PI / 180;
      D.circ(ctx, ...P(v0 * Math.cos(a) * f.T, v0 * Math.sin(a) * f.T - G * f.T * f.T / 2), 5.5, C.accent);
    }
    ctx.beginPath();                                          // (12.1)
    for (let j = 0; j <= 80; j++) { const x = f.R * j / 80, q = P(x, f.Hm - G * x * x / (2 * v0 * v0)); j ? ctx.lineTo(...q) : ctx.moveTo(...q); }
    ctx.strokeStyle = C.warm; ctx.lineWidth = 2.2; ctx.setLineDash([7, 4]); ctx.stroke(); ctx.setLineDash([]);
    const t = P(...f.tgt); D.circ(ctx, ...t, 8, null, C.red, 2); D.circ(ctx, ...t, 2.5, C.red);
    legend(ctx, pad, 16, [{ color: C.accent, label: 'траектории' }, { color: C.warm, label: 'огибающая (12.1)', dash: [7, 4] }, { color: C.red, label: 'мишень (тащите)' }], w, C);
    scaleBar(ctx, w - pad - 110, base + 16, k, C, 100);
  },
  hit(f, x, y) { if (!f.vw) return -1; const { pad, base, k } = f.vw; return Math.hypot(x - (pad + f.tgt[0] * k), y - (base - f.tgt[1] * k)) < 18 ? 0 : -1; },
  drag(f, i, x, y) { const { pad, base, k } = f.vw; f.tgt = [Math.max(0.2, (x - pad) / k), Math.max(0, (base - y) / k)]; },
  readout(f) {
    const v0 = f.p.v0, [x, y] = f.tgt, r = Math.hypot(x, y);
    const vmin = Math.sqrt(G * (y + r));                                           // (11.1)
    let best = Infinity;                                                           // перебор углов
    for (let j = 1; j < 4000; j++) {
      const a = Math.PI / 2 * j / 4000, den = 2 * Math.cos(a) ** 2 * (x * Math.tan(a) - y);
      if (den > 0) best = Math.min(best, Math.sqrt(G * x * x / den));
    }
    const yEnv = v0 * v0 / (2 * G) - G * x * x / (2 * v0 * v0);
    const yEnvMin = vmin * vmin / (2 * G) - G * x * x / (2 * vmin * vmin);           // (12.1) при v_min
    return [
      cmp('v min до мишени (перебор углов)', best, vmin, 'м/с', '11.1', 0.01),
      ['мишень при v_min', `высота огибающей ${F(yEnvMin, 3)} м`, `мишень на ${F(y, 3)} м — лежит на огибающей (12.1)`, Math.abs(yEnvMin - y) < 1e-6 * Math.max(1, y)],
      ['достижима при v₀?', v0 >= vmin ? 'да' : 'нет', `огибающая над мишенью: ${F(yEnv, 2)} м, мишень ${F(y, 2)} м`],
    ];
  },
  note: () => 'Модельное время замедлено в 1,7 раза, g = 9,81 м/с². Траектории — точно по (8.2), снаряды выпускаются по очереди под 10°…80°.',
});

/* ——— 15.1 Собака и заяц ——— */
const H_RK = 1e-3;
FIG('pursuit', {
  label: 'Собака всё время бежит на зайца, заяц — по прямой',
  dt: 0.01, h: w => Math.min(300, w * 0.6),
  params: [
    { id: 'u', label: 'u (собака)', min: 2, max: 15, step: 0.5, val: 10, unit: 'м/с' },
    { id: 'v', label: 'v (заяц)', min: 1, max: 15, step: 0.5, val: 6, unit: 'м/с' },
    { id: 'L', label: 'L', min: 10, max: 60, step: 1, val: 32, unit: 'м' },
  ],
  init(f) {
    const { u, v, L } = f.p;
    f.T = 0; f.d = [0, 0]; f.path = [[0, 0]]; f.hist = [[0, L]]; f.caught = null;
    f.tTh = u > v ? u * L / (u * u - v * v) : Infinity;                           // (15.3)
    f.tEnd = u > v ? f.tTh * 1.05 + 0.5 : 8 * L / v;
  },
  rhs(f, t, d) { const { u, v, L } = f.p, dx = L - d[0], dy = v * t - d[1], r = Math.hypot(dx, dy); return [u * dx / r, u * dy / r]; },
  tick(f) {
    const { u, v, L } = f.p, n = Math.round(this.dt / H_RK);                    // 10 подшагов РК4 на шаг
    for (let s = 0; s < n; s++) {
      const t = f.T, d = f.d, h = H_RK;
      const k1 = this.rhs(f, t, d);
      const k2 = this.rhs(f, t + h / 2, [d[0] + h / 2 * k1[0], d[1] + h / 2 * k1[1]]);
      const k3 = this.rhs(f, t + h / 2, [d[0] + h / 2 * k2[0], d[1] + h / 2 * k2[1]]);
      const k4 = this.rhs(f, t + h, [d[0] + h * k3[0], d[1] + h * k3[1]]);
      f.d = [d[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), d[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
      f.T += h;
      const r = Math.hypot(L - f.d[0], v * f.T - f.d[1]);
      if (r < u * h) {                                    // ближе шага не подойти; в конце собака
        f.caught = f.T + r / (u - v); f.hist.push([f.T, r]); return false;     // бежит вслед: сближение u − v
      }
    }
    f.path.push([...f.d]); f.hist.push([f.T, Math.hypot(L - f.d[0], v * f.T - f.d[1])]);
    if (f.T >= f.tEnd) return false;
  },
  draw(f, ctx, w, h, C) {
    const { v, L } = f.p, pad = 26, ymax = Math.max(v * f.tEnd, L * 0.3);
    const k = Math.min((w - 2 * pad) / (L * 1.15), (h - 40) / ymax);
    const P = (x, y) => [pad + x * k, h - 18 - y * k];
    D.line(ctx, ...P(L, 0), ...P(L, ymax), D.alpha(C.warm, 0.4), 1.2, [4, 4]);
    ctx.beginPath(); f.path.forEach((p, i) => { const q = P(...p); i ? ctx.lineTo(...q) : ctx.moveTo(...q); });
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
    const dq = P(...f.d), hq = P(L, v * f.T);
    D.line(ctx, ...dq, ...hq, D.alpha(C.fg, 0.25), 1);
    D.circ(ctx, ...dq, 6.5, C.accent); D.circ(ctx, ...hq, 6.5, C.warm);
    legend(ctx, pad, 16, [{ color: C.accent, label: 'собака' }, { color: C.warm, label: 'заяц' }], w, C);
    scaleBar(ctx, w - pad - 110, h - 6, k, C, 100);
    D.text(ctx, `t = ${F(f.T, 2)} с`, w - pad, 18, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      const { u, v, L } = f.p;
      D.plot(ctx, { x: 46, y: 18, w: w - 64, h: h - 52 }, {
        xmin: 0, xmax: f.tEnd, ymin: 0, ymax: L * 1.05, xl: 't, с', yl: 'расстояние, м',
        series: [{ pts: f.hist, color: C.accent, lw: 2 }],
        hlines: u === v ? [{ y: L / 2, color: C.ok, label: 'L/2 — предел при u = v' }] : [],
      });
    },
  },
  readout(f) {
    const { u, v, L } = f.p;
    if (u > v) {
      if (f.caught === null) return [['время поимки', '—', `(15.3): ${F(f.tTh, 3)} с`]];
      return [cmp('время поимки (РК4)', f.caught, f.tTh, 'с', '15.3', 0.1), cmp('путь собаки', u * f.caught, u * f.tTh, 'м', '15.3', 0.1)];
    }
    const r = f.hist[f.hist.length - 1][1];
    if (u === v) return [['расстояние сейчас', `${F(r, 3)} м`, `предел L/2 = ${F(L / 2, 3)} м (задача 15.С3); расхождение ${F(pct(r, L / 2), 2)} %`]];
    return [['поимка', 'нет', 'при u < v собака не догонит: расстояние растёт']];
  },
  note: () => 'Время реальное. Уравнение движения собаки решается методом Рунге — Кутты 4-го порядка с шагом 0,001 с (10 подшагов на шаг анимации). Поимка — когда до зайца меньше одного шага собаки u·Δt.',
});
})();
