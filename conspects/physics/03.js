(function () {
/* Рисунки темы 03 «Динамика».
   Все модели интегрируют второй закон Ньютона численно; формулы из конспекта используются
   только для сверки в таблице. Шаг интегрирования H = 1e-4 с; на кадр (spec.dt = 0,01 с реального
   времени) приходится dt·SPEED/H шагов. Моменты событий (остановка, возврат, провисание нити)
   уточняются бисекцией внутри шага. */

const H = 1e-4;
// один шаг РК4 для x'' = acc(x, v); x и v — числа
function rk4(x, v, h, acc) {
  const a1 = acc(x, v), x2 = x + h / 2 * v, v2 = v + h / 2 * a1, a2 = acc(x2, v2);
  const x3 = x + h / 2 * v2, v3 = v + h / 2 * a2, a3 = acc(x3, v3);
  const x4 = x + h * v3, v4 = v + h * a3, a4 = acc(x4, v4);
  return [x + h / 6 * (v + 2 * v2 + 2 * v3 + v4), v + h / 6 * (a1 + 2 * a2 + 2 * a3 + a4)];
}

/* ——— 6.1 Шайба на шероховатой наклонной плоскости ——— */
FIG('incline', {
  label: 'Шайбу толкают вверх по наклонной плоскости с трением',
  dt: 0.01, h: w => Math.min(230, w * 0.5),
  params: [
    { id: 'v0', label: 'начальная скорость v₀', min: 1, max: 10, step: 0.5, val: 6, unit: 'м/с' },
    { id: 'al', label: 'угол наклона α', min: 5, max: 60, step: 1, val: 30, unit: '°' },
    { id: 'mu', label: 'коэффициент трения μ', min: 0, max: 1, step: 0.05, val: 0.3 },
  ],
  init(f) {
    const a = f.p.al * Math.PI / 180;
    f.sa = Math.sin(a); f.ca = Math.cos(a);
    f.x = 0; f.v = f.p.v0; f.T = 0; f.phase = 'up'; f.hist = [[0, f.p.v0]];
    f.aUp = G * (f.sa + f.p.mu * f.ca); f.aDn = G * (f.sa - f.p.mu * f.ca);
    f.sTh = f.p.v0 ** 2 / (2 * f.aUp); f.tTh = f.p.v0 / f.aUp;
    f.top = null; f.back = null;
  },
  tick(f) {
    if (f.phase === 'rest' || f.phase === 'end') return false;
    const n = Math.round(this.dt / H);
    for (let i = 0; i < n; i++) {
      const acc = f.phase === 'up' ? () => -f.aUp : () => -f.aDn;   // трение против скорости; ось — вверх по склону
      const [x1, v1] = rk4(f.x, f.v, H, acc);
      if (f.phase === 'up' && v1 <= 0) {                       // остановка внутри шага
        const tau = root(t => rk4(f.x, f.v, t, acc)[1], 0, H);
        [f.x] = rk4(f.x, f.v, tau, acc); f.v = 0; f.T += tau;
        f.top = { s: f.x, t: f.T };
        if (f.sa <= f.p.mu * f.ca + 1e-12) { f.phase = 'rest'; break; }
        f.phase = 'down'; continue;
      }
      if (f.phase === 'down' && x1 <= 0) {                     // вернулась к началу
        const tau = root(t => rk4(f.x, f.v, t, acc)[0], 0, H);
        f.v = rk4(f.x, f.v, tau, acc)[1]; f.x = 0; f.T += tau;
        f.back = { v: -f.v, t: f.T }; f.phase = 'end'; break;
      }
      f.x = x1; f.v = v1; f.T += H;
    }
    f.hist.push([f.T, f.v]);
  },
  draw(f, ctx, w, h, C) {
    const pad = 24, smax = Math.max(f.sTh, 0.5);
    const k = Math.min((w - 2 * pad) / (smax * f.ca * 1.15), (h - 50) / (smax * f.sa * 1.15 + 0.01));
    const x0 = pad, y0 = h - 22, X = s => x0 + s * f.ca * k, Y = s => y0 - s * f.sa * k;
    D.line(ctx, x0, y0, w - pad, y0, C.line, 1.5);
    D.line(ctx, X(0), Y(0), X(smax * 1.15), Y(smax * 1.15), C.fg, 2.5);
    if (f.top) D.circ(ctx, X(f.top.s), Y(f.top.s) - 7, 3, C.ok);
    D.circ(ctx, X(f.x) - 7 * f.sa, Y(f.x) - 7 * f.ca, 7, C.warm);
    const s = 9;                                                // пикселей на 1 м/с
    if (Math.abs(f.v) > 1e-6) D.arrow(ctx, X(f.x) - 7 * f.sa, Y(f.x) - 7 * f.ca, X(f.x) - 7 * f.sa + f.v * s * f.ca, Y(f.x) - 7 * f.ca - f.v * s * f.sa, C.accent, 2);
    const msg = f.phase === 'rest' ? 'остановилась: tg α ≤ μ' : f.phase === 'end' ? 'вернулась' : f.phase === 'down' ? 'соскальзывает' : 'поднимается';
    D.text(ctx, msg, w - pad, 18, C.muted, 12, 'right');
    D.text(ctx, `tg α = ${F(f.sa / f.ca, 2)}, μ = ${F(f.p.mu, 2)}`, w - pad, 36, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      const tEnd = Math.max(f.T, f.tTh * 1.2);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: tEnd, ymin: -f.p.v0, ymax: f.p.v0 * 1.05, xl: 't, с', yl: 'v, м/с',
        series: [{ pts: f.hist, color: C.accent, lw: 2 }],
        hlines: [{ y: 0, color: C.line }],
      });
    },
  },
  readout(f) {
    if (!f.top) return [['путь вверх', '—', `(расчёт): ${F(f.sTh, 3)} м`]];
    const r = [cmp('путь вверх', f.top.s, f.sTh, 'м', 'расчёт'), cmp('время подъёма', f.top.t, f.tTh, 'с', 'расчёт')];
    if (f.phase === 'rest') r.push(['дальше', 'покоится', `tg α = ${F(f.sa / f.ca, 3)} ≤ μ`, true]);
    if (f.back) r.push(cmp('скорость возврата', f.back.v, Math.sqrt(2 * f.aDn * f.sTh), 'м/с', '6.2'));
    return r;
  },
  note: () => 'Время реальное. Зелёная точка — где шайба остановилась. Если tg α ≤ μ, трение покоя удерживает её на месте.',
});

/* ——— 8.1 Бросок вверх с вязким сопротивлением ——— */
FIG('drag', {
  label: 'Бросок вверх: с сопротивлением и без',
  dt: 0.01, h: w => Math.min(260, w * 0.55),
  params: [
    { id: 'v0', label: 'начальная скорость v₀', min: 2, max: 30, step: 1, val: 15, unit: 'м/с' },
    { id: 'km', label: 'k/m (сопротивление)', min: 0, max: 2, step: 0.05, val: 0.4, unit: '1/с' },
  ],
  init(f) {
    f.T = 0; f.y = 0; f.v = f.p.v0; f.land = null; f.hist = [[0, 0, 0]];
    f.tFree = 2 * f.p.v0 / G; f.hmax = 0;
  },
  tick(f) {
    if (f.land) {                                               // досмотреть свободный бросок
      f.T = Math.min(f.T + this.dt, f.tFree);
      f.hist.push([f.T, 0, Math.max(f.p.v0 * f.T - G * f.T * f.T / 2, 0)]);
      if (f.T >= f.tFree) return false;
      return;
    }
    const acc = (y, v) => -G - f.p.km * v, n = Math.round(this.dt / H);
    for (let i = 0; i < n; i++) {
      const [y1, v1] = rk4(f.y, f.v, H, acc);
      if (f.T > 0.01 && y1 <= 0) {
        const tau = root(t => rk4(f.y, f.v, t, acc)[0], 0, H);
        f.v = rk4(f.y, f.v, tau, acc)[1]; f.y = 0; f.T += tau;
        f.land = { t: f.T, v: -f.v }; break;
      }
      f.y = y1; f.v = v1; f.T += H; f.hmax = Math.max(f.hmax, f.y);
    }
    const yf = Math.max(f.p.v0 * f.T - G * f.T * f.T / 2, 0);
    f.hist.push([f.T, f.y, yf]);
  },
  draw(f, ctx, w, h, C) {
    const top = f.p.v0 ** 2 / (2 * G), k = (h - 50) / top, gy = h - 22;
    const yf = Math.max(f.p.v0 * f.T - G * f.T * f.T / 2, 0);
    D.line(ctx, 20, gy, w - 20, gy, C.fg, 2);
    D.circ(ctx, w * 0.35, gy - f.y * k, 8, C.warm);
    D.circ(ctx, w * 0.65, gy - yf * k, 8, null, C.accent, 2);
    D.text(ctx, 'с сопротивлением', w * 0.35, gy + 16, C.warm, 11, 'center');
    D.text(ctx, 'без', w * 0.65, gy + 16, C.accent, 11, 'center');
    scaleBar(ctx, 20, 20, k, C);
    D.text(ctx, `t = ${F(f.T, 2)} с`, w - 20, 18, C.muted, 12, 'right');
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: f.tFree * 1.05, ymin: 0, ymax: f.p.v0 ** 2 / (2 * G) * 1.05, xl: 't, с', yl: 'y, м',
        series: [{ pts: f.hist.map(r => [r[0], r[1]]), color: C.warm, lw: 2 }, { pts: f.hist.map(r => [r[0], r[2]]), color: C.accent, lw: 1.5, dash: [5, 4] }],
      });
    },
  },
  readout(f) {
    if (!f.land) return [['время полёта', '—', '(8.3): (v₀ + v₁)/g'], ['без сопротивления', `${F(f.tFree, 3)} с`, '2v₀/g']];
    return [cmp('время полёта', f.land.t, (f.p.v0 + f.land.v) / G, 'с', '8.3'),
            ['скорость возврата v₁', `${F(f.land.v, 3)} м/с`, `меньше v₀ = ${F(f.p.v0, 1)} м/с`, f.land.v <= f.p.v0 + 1e-9],
            ['высота подъёма', `${F(f.hmax, 3)} м`, `без сопротивления ${F(f.p.v0 ** 2 / (2 * G), 3)} м`, f.hmax <= f.p.v0 ** 2 / (2 * G) + 1e-9]];
  },
  note: () => 'Время реальное. Сплошная линия — с сопротивлением, пунктир — без. Подъём с сопротивлением короче спуска, а всё время полёта точно равно (v₀ + v₁)/g.',
});

/* ——— 11.1 Брусок на подвижном клине ——— */
const SPEED_W = 0.5, FACE = 1;                                  // длина грани, м
// Гаусс для системы 4×4: брусок (ax, ay), клин A, реакция N
function solve4(A, b) {
  const M = A.map((r, i) => [...r, b[i]]), n = 4;
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const k = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= k * M[i][c]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
FIG('wedge', {
  label: 'Брусок соскальзывает с подвижного клина',
  dt: 0.01, h: w => Math.min(240, w * 0.5),
  params: [
    { id: 'M', label: 'масса клина M', min: 0.5, max: 6, step: 0.5, val: 3, unit: 'кг' },
    { id: 'm', label: 'масса бруска m', min: 0.5, max: 4, step: 0.5, val: 1, unit: 'кг' },
    { id: 'al', label: 'угол клина α', min: 15, max: 60, step: 5, val: 30, unit: '°' },
  ],
  init(f) {
    const { M, m } = f.p, a = f.p.al * Math.PI / 180, s = Math.sin(a), c = Math.cos(a);
    f.s = s; f.c = c; f.T = 0; f.done2 = false;
    // брусок на вершине грани, клин — вершиной вправо: грань поднимается вправо от X−FACE·c до X
    f.X = 0; f.V = 0; f.bx = 0; f.by = FACE * s; f.vx = 0; f.vy = 0;
    f.E0 = m * G * f.by;
    f.Ath = m * G * s * c / (M + m * s * s);
  },
  tick(f) {
    if (f.done2) return false;
    const { M, m } = f.p, s = f.s, c = f.c;
    const sol = solve4([[m, 0, 0, s], [0, m, 0, -c], [0, 0, M, -s], [-s, c, s, 0]], [0, -m * G, 0, 0]);
    f.N = sol[3];
    const n = Math.round(this.dt * SPEED_W / H);
    for (let i = 0; i < n; i++) {
      // ускорения на шаге постоянны — обновляем точно, как для равноускоренного движения
      f.bx += f.vx * H + sol[0] * H * H / 2; f.by += f.vy * H + sol[1] * H * H / 2; f.X += f.V * H + sol[2] * H * H / 2;
      f.vx += sol[0] * H; f.vy += sol[1] * H; f.V += sol[2] * H; f.T += H;
      if (f.by <= 0) { f.done2 = true; break; }
    }
    f.A = sol[2];
  },
  draw(f, ctx, w, h, C) {
    const s = f.s, c = f.c, k = Math.min((w - 60) / (FACE * c * 2.2), (h - 50) / (FACE * s * 1.2));
    const gy = h - 24, ox = w * 0.62, X = x => ox + x * k, Y = y => gy - y * k;
    D.line(ctx, 10, gy, w - 10, gy, C.fg, 2);
    ctx.beginPath(); ctx.moveTo(X(f.X - FACE * c), Y(0)); ctx.lineTo(X(f.X), Y(FACE * s)); ctx.lineTo(X(f.X), Y(0)); ctx.closePath();
    ctx.fillStyle = C.glass; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    D.line(ctx, X(0), Y(0) + 6, X(0), Y(0) + 14, C.muted, 1.5);
    D.text(ctx, 'старт клина', X(0), Y(0) + 18, C.muted, 10, 'center', 'top');
    // брусок — квадратик, прижатый к грани
    ctx.save(); ctx.translate(X(f.bx), Y(f.by)); ctx.rotate(-Math.atan2(s, c));
    ctx.fillStyle = C.warm; ctx.fillRect(-9, -14, 18, 14); ctx.restore();
    if (f.T > 0) D.arrow(ctx, X(f.X), Y(FACE * s / 2), X(f.X) + Math.sign(f.V) * Math.min(Math.abs(f.V) * 40, 80), Y(FACE * s / 2), C.accent, 2);
    D.text(ctx, `замедлено в ${F(1 / SPEED_W, 0)} раза`, w - 10, 16, C.muted, 11, 'right');
  },
  readout(f) {
    if (!f.T) return [['ускорение клина', '—', '(11.1)']];
    const { M, m } = f.p, aSim = f.V / f.T;
    const p = m * f.vx + M * f.V, E = m * G * f.by + (m * (f.vx ** 2 + f.vy ** 2) + M * f.V ** 2) / 2;
    const relX = f.bx - f.X;                                     // смещение бруска по горизонтали относительно клина
    return [cmp('ускорение клина (ΔV/t)', aSim, f.Ath, 'м/с²', '11.1'),
            ['горизонтальный импульс', `${F(p, 6)} кг·м/с`, 'ноль: внешних горизонтальных сил нет', Math.abs(p) < 1e-6],
            cmp('энергия', E, f.E0, 'Дж', 'mgh в начале'),
            cmp('сдвиг клина', f.X, -m * relX / (M + m), 'м', '16.2')];
  },
  note: () => 'Брусок стартует с верхнего конца грани длиной 1 м. Клин уезжает в сторону, противоположную бруску; их общий центр масс по горизонтали остаётся на месте.',
});

/* ——— 14.1 Груз на нити в вертикальной окружности ——— */
// косинус бывает около нуля, и относительное расхождение там теряет смысл — сравниваем разность
const cmpAbs = (name, num, th, ref) => [name, F(num, 5), `(${ref}): ${F(th, 5)}; разность ${F(Math.abs(num - th), 6)}`, Math.abs(num - th) < 1e-4];
FIG('loop', {
  label: 'Груз на нити: качание, полный оборот или провисание',
  dt: 0.01, h: w => Math.min(300, w * 0.75),
  params: [
    { id: 'v0', label: 'скорость в нижней точке v₀', min: 1, max: 9, step: 0.1, val: 6, unit: 'м/с' },
    { id: 'L', label: 'длина нити L', min: 0.5, max: 1.5, step: 0.1, val: 1, unit: 'м' },
  ],
  init(f) {
    const { v0, L } = f.p;
    f.T = 0; f.th = 0; f.om = v0 / L; f.free = false; f.slack = null; f.trace = []; f.Tmin = Infinity; f.thMax = 0; f.overTop = false; f.turned = false;
    f.mode = v0 * v0 >= 5 * G * L ? 'loop' : v0 * v0 <= 2 * G * L ? 'swing' : 'slack';
    f.cosSlack = (2 * G * L - v0 * v0) / (3 * G * L);
  },
  tens(f, th, om) { return f.p.L * om * om + G * Math.cos(th); },  // натяжение на единицу массы
  tick(f) {
    if (f.T > 6) return false;
    const L = f.p.L, n = Math.round(this.dt / H);
    const acc = (th) => -G / L * Math.sin(th);
    for (let i = 0; i < n; i++) {
      if (!f.free) {
        const [t1, o1] = rk4(f.th, f.om, H, acc);
        if (this.tens(f, t1, o1) < 0) {                       // нить провисает внутри шага
          const tau = root(t => { const [a, b] = rk4(f.th, f.om, t, acc); return this.tens(f, a, b); }, 0, H);
          [f.th, f.om] = rk4(f.th, f.om, tau, acc); f.T += tau;
          if (!f.slack) f.slack = { th: f.th };
          f.free = true;
          f.px = L * Math.sin(f.th); f.py = -L * Math.cos(f.th);
          f.vx = L * f.om * Math.cos(f.th); f.vy = L * f.om * Math.sin(f.th);
          continue;
        }
        if (o1 * f.om <= 0 && f.om !== 0) f.turned = true;     // точка поворота качания
        f.th = t1; f.om = o1; f.T += H;
        f.Tmin = Math.min(f.Tmin, this.tens(f, f.th, f.om));
        if (Math.abs(f.th) >= Math.PI) f.overTop = true;
        f.thMax = Math.max(f.thMax, Math.abs(f.th));
      } else {                                                  // свободный полёт до натяжения нити
        f.vy -= G * H; f.px += f.vx * H; f.py += f.vy * H; f.T += H;
        if (Math.hypot(f.px, f.py) >= L) {                      // рывок: радиальная скорость гасится
          f.th = Math.atan2(f.px, -f.py);
          f.om = (f.vx * Math.cos(f.th) + f.vy * Math.sin(f.th)) / L; f.free = false;
        }
      }
    }
    const pos = f.free ? [f.px, f.py] : [L * Math.sin(f.th), -L * Math.cos(f.th)];
    f.trace.push(pos); if (f.trace.length > 400) f.trace.shift();
  },
  draw(f, ctx, w, h, C) {
    const L = f.p.L, k = Math.min(w, h) * 0.4 / L, cx = w / 2, cy = h / 2;
    ctx.beginPath(); ctx.setLineDash([3, 4]); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.arc(cx, cy, L * k, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    if (f.trace.length > 1) {
      ctx.beginPath(); ctx.strokeStyle = C.warm; ctx.lineWidth = 1.2;
      f.trace.forEach((p, i) => (i ? ctx.lineTo(cx + p[0] * k, cy - p[1] * k) : ctx.moveTo(cx + p[0] * k, cy - p[1] * k)));
      ctx.stroke();
    }
    const p = f.free ? [f.px, f.py] : [L * Math.sin(f.th), -L * Math.cos(f.th)];
    if (f.free) {                                               // провисшая нить — ломаная
      const mx = (cx + cx + p[0] * k) / 2 + 10, my = (cy + cy - p[1] * k) / 2 + 10;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(mx, my, cx + p[0] * k, cy - p[1] * k); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();
    } else D.line(ctx, cx, cy, cx + p[0] * k, cy - p[1] * k, C.fg, 2);
    D.circ(ctx, cx, cy, 3, C.fg);
    D.circ(ctx, cx + p[0] * k, cy - p[1] * k, 8, C.accent);
    if (f.slack) { const s = f.slack.th; D.circ(ctx, cx + L * Math.sin(s) * k, cy + L * Math.cos(s) * k, 4, C.red); }
    const label = { loop: 'полный оборот: v₀² ≥ 5gL', swing: 'качание: v₀² ≤ 2gL', slack: 'нить провиснет: 2gL < v₀² < 5gL' }[f.mode];
    D.text(ctx, label, 12, 18, C.muted, 12);
  },
  readout(f) {
    const { v0, L } = f.p;
    if (f.mode === 'slack') {
      if (!f.slack) return [['угол провисания (от низа)', '—', `теория: ${F(Math.acos(f.cosSlack) * 180 / Math.PI, 2)}°`]];
      return [cmpAbs('cos угла провисания', Math.cos(f.slack.th), f.cosSlack, '14.1')];
    }
    if (f.mode === 'loop' && !f.overTop) return [['наименьшее T/m (вверху)', '—', `(14.1): v₀²/L − 5g = ${F(v0 * v0 / L - 5 * G, 3)} м/с²`]];
    if (f.mode === 'swing' && !f.turned) return [['cos наибольшего угла', '—', `энергия: ${F(1 - v0 * v0 / (2 * G * L), 5)}`]];
    if (f.mode === 'loop') return [cmp('наименьшее T/m (вверху)', f.Tmin, v0 * v0 / L - 5 * G, 'м/с²', '14.1', 0.1)];
    return [cmpAbs('cos наибольшего угла', Math.cos(f.thMax), 1 - v0 * v0 / (2 * G * L), 'энергия')];
  },
  note: () => 'Время реальное, 6 с. Красная точка — где нить провисла; после этого груз летит по параболе, пока нить снова не натянется (при рывке радиальная скорость гасится).',
});
})();
