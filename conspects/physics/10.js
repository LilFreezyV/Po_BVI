(function () {
/* Рисунки темы 10 «Электростатика».
   Кольцо — прямое суммирование полей точечных зарядов; сближение зарядов и электрон в
   конденсаторе — интегрирование уравнений движения; перезарядка — пошаговый ток через резистор.
   Проверяемые формулы конспекта используются только для сверки. */

const K = 9e9, E0 = 8.85e-12, QE = 1.6e-19, ME = 9.11e-31;

/* ——— 3.1 Поле на оси кольца ——— */
const RR = 0.1, QR = 1e-8;
FIG('ringfield', {
  label: 'Поле на оси кольца из точечных зарядов',
  h: w => Math.min(240, w * 0.55),
  params: [
    { id: 'N', label: 'число зарядов на кольце', min: 2, max: 60, step: 1, val: 12 },
    { id: 'z', label: 'точка на оси z', min: 0, max: 0.4, step: 0.005, val: 0.07, unit: 'м' },
  ],
  init() {},
  calc(f) {
    const N = f.p.N, z = f.p.z; let Ex = 0, Ey = 0, Ez = 0;
    for (let i = 0; i < N; i++) {                                 // кольцо в плоскости xy, точка (0, 0, z)
      const a = 2 * Math.PI * i / N, dx = -RR * Math.cos(a), dy = -RR * Math.sin(a), r = Math.hypot(dx, dy, z);
      const c = K * QR / N / r ** 3; Ex += c * dx; Ey += c * dy; Ez += c * z;
    }
    return { Ez, Et: Math.hypot(Ex, Ey), th: K * QR * z / (RR * RR + z * z) ** 1.5 };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), cx = w * 0.3, cy = h / 2, k = Math.min(w * 0.6 / 0.45, h * 0.4 / RR);
    // вид сбоку: кольцо — эллипс, ось z — вправо
    ctx.beginPath(); ctx.ellipse(cx, cy, RR * k * 0.3, RR * k, 0, 0, 2 * Math.PI); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < f.p.N; i++) { const a = 2 * Math.PI * i / f.p.N; D.circ(ctx, cx + RR * k * 0.3 * Math.cos(a), cy - RR * k * Math.sin(a), 3.5, C.red); }
    D.line(ctx, cx, cy, w - 10, cy, C.muted, 1, [4, 3]);
    const px = cx + f.p.z * k; D.circ(ctx, px, cy, 4, C.fg);
    const sc = 40 / 3464;                                          // пикселей на В/м: максимум ≈ 40 px
    D.arrow(ctx, px, cy, px + r.Ez * sc, cy, C.accent, 2.5);
    D.text(ctx, `E = ${F(r.Ez, 0)} В/м`, px, cy - 12, C.accent, 11, 'center');
  },
  readout(f) {
    const r = this.calc(f), rows = [cmp('осевое поле (сумма зарядов)', r.Ez, r.th, 'В/м', '3.1', f.p.N >= 20 ? 0.1 : 100)];
    if (f.p.N < 20) rows[0][3] = undefined;                        // при малом числе зарядов вблизи кольца и не обязано совпасть
    rows.push(['поперечная составляющая', `${F(r.Et, 6)} В/м`, 'ноль по симметрии (при N ≥ 2)', r.Et < 1e-6 * Math.max(r.Ez, 1)]);
    return rows;
  },
  note: () => 'Кольцо радиусом 10 см, полный заряд 10 нКл делится поровну между N точками. Вдали от кольца уже несколько зарядов дают почти ту же картину, что сплошное кольцо; совпадение проверяется при N ≥ 20.',
});

/* ——— 9.1 Сближение двух зарядов ——— */
const QQ = 1e-6, X0 = 3, SPEED_A = 0.1;                            // заряды, начальное расстояние (м), замедление
FIG('approach', {
  label: 'Заряженный шарик налетает на свободный',
  dt: 0.01, h: w => Math.min(130, w * 0.3),
  params: [
    { id: 'v', label: 'скорость налетающего', min: 2, max: 20, step: 1, val: 10, unit: 'м/с' },
    { id: 'M', label: 'масса второго (первый 1 г)', min: 0.5, max: 10, step: 0.5, val: 1, unit: 'г' },
  ],
  init(f) { f.x1 = 0; f.x2 = X0; f.v1 = f.p.v; f.v2 = 0; f.T = 0; f.rmin = X0; f.done2 = false; },
  tick(f) {
    if (f.done2) return false;
    const m = 1e-3, M = f.p.M * 1e-3, kq = K * QQ * QQ;
    const rhs = y => { const F = kq / (y[2] - y[0]) ** 2; return [y[1], -F / m, y[3], F / M]; };
    const target = f.T + this.dt * SPEED_A;                      // замедленное время
    while (f.T < target - 1e-12) {
      const r = f.x2 - f.x1, h = Math.min(1e-3, 2e-3 * r / (Math.abs(f.v1 - f.v2) + 1), target - f.T);   // мельче при сближении
      let y = [f.x1, f.v1, f.x2, f.v2];
      const k1 = rhs(y), y2 = y.map((q, i) => q + h / 2 * k1[i]), k2 = rhs(y2), y3 = y.map((q, i) => q + h / 2 * k2[i]), k3 = rhs(y3), y4 = y.map((q, i) => q + h * k3[i]), k4 = rhs(y4);
      y = y.map((q, i) => q + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
      [f.x1, f.v1, f.x2, f.v2] = y; f.T += h; f.rmin = Math.min(f.rmin, f.x2 - f.x1);
      if (f.v1 < f.v2 && f.x2 - f.x1 > 1.5 * f.rmin) { f.done2 = true; break; }
    }
  },
  draw(f, ctx, w, h, C) {
    const cm = (1e-3 * f.x1 + f.p.M * 1e-3 * f.x2) / (1e-3 + f.p.M * 1e-3);   // камера — центр масс
    const k = (w - 40) / (X0 * 1.3), X = x => w / 2 + (x - cm) * k, y = h / 2;
    D.line(ctx, 10, y + 14, w - 10, y + 14, C.line, 1);
    D.circ(ctx, X(f.x1), y, 8, C.red); D.circ(ctx, X(f.x2), y, 6 + Math.min(f.p.M, 8), C.red);
    D.text(ctx, '+', X(f.x1), y + 4, C.card, 11, 'center'); D.text(ctx, '+', X(f.x2), y + 4, C.card, 11, 'center');
    D.text(ctx, `расстояние ${F(f.x2 - f.x1, 3)} м`, w - 10, 16, C.muted, 11, 'right');
    D.text(ctx, 'замедлено в 10 раз', 10, 16, C.muted, 11);
  },
  readout(f) {
    const m = 1e-3, M = f.p.M * 1e-3, mu = m * M / (m + M), kq = K * QQ * QQ;
    const th = kq / (mu * f.p.v ** 2 / 2 + kq / X0);              // с учётом энергии на старте с 3 м
    if (!f.done2) return [['наименьшее расстояние', '—', `теорема 9.1: ${F(th, 4)} м`]];
    return [cmp('наименьшее расстояние', f.rmin, th, 'м', '9.1')];
  },
  note: () => 'Заряды по 1 мкКл, старт с 3 м — поэтому в теорию добавлена начальная энергия взаимодействия kq²/3 м. Камера следит за центром масс.',
});

/* ——— 14.1 Электрон в плоском конденсаторе ——— */
const LP = 0.05, DP = 0.01;
FIG('deflect', {
  label: 'Электрон отклоняется в конденсаторе',
  dt: 0.01, h: w => Math.min(200, w * 0.45),
  params: [
    { id: 'U', label: 'напряжение U', min: 0, max: 40, step: 1, val: 20, unit: 'В' },
    { id: 'v', label: 'начальная скорость', min: 0.5, max: 2, step: 0.1, val: 1, unit: '10⁷ м/с' },
  ],
  init(f) { f.x = 0; f.y = 0; f.vx = f.p.v * 1e7; f.vy = 0; f.trace = [[0, 0]]; f.hit = false; f.out = false; },
  tick(f) {
    if (f.hit || f.out) return false;
    const a = QE * f.p.U / DP / ME, h = LP / f.vx / 1000;          // тысяча шагов на пролёт
    for (let s = 0; s < 20; s++) {
      f.x += f.vx * h; f.y += f.vy * h + a * h * h / 2; f.vy += a * h;
      if (f.y >= DP / 2) { f.hit = true; break; }
      if (f.x >= LP) { f.out = true; break; }
    }
    f.trace.push([f.x, f.y]);
  },
  draw(f, ctx, w, h, C) {
    const k = Math.min((w - 40) / LP, (h - 40) / DP * 0.5), x0 = 20, y0 = h / 2, X = x => x0 + x * k, Y = y => y0 - y * k * 2;
    ctx.fillStyle = D.alpha(C.red, 0.25); ctx.fillRect(X(0), Y(DP / 2) - 5, LP * k, 5);
    ctx.fillStyle = D.alpha(C.blue, 0.25); ctx.fillRect(X(0), Y(-DP / 2), LP * k, 5);
    D.text(ctx, '+', X(LP) + 6, Y(DP / 2), C.red, 13); D.text(ctx, '−', X(LP) + 6, Y(-DP / 2) + 8, C.blue, 13);
    ctx.beginPath(); f.trace.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
    D.circ(ctx, X(f.x), Y(f.y), 4, C.accent);
    if (f.hit) D.text(ctx, 'попал в пластину', w - 10, 16, C.red, 12, 'right', 'alphabetic', 700);
    D.text(ctx, 'поперёк растянуто ×2', 10, h - 6, C.muted, 10);
  },
  readout(f) {
    const a = QE * f.p.U / DP / ME, t = LP / (f.p.v * 1e7), yth = a * t * t / 2;
    if (f.hit) return [['отклонение на выходе по (14.1)', `${F(yth * 100, 3)} см`, `больше половины зазора ${F(DP * 50, 2)} см — попадание`, true]];
    if (!f.out) return [['отклонение на выходе', '—', `(14.1): ${F(yth * 100, 3)} см`]];
    return [cmp('отклонение на выходе', f.y * 100, yth * 100, 'см', '14.1'), cmp('угол вылета', Math.atan2(f.vy, f.vx) * 180 / Math.PI, Math.atan(a * t / (f.p.v * 1e7)) * 180 / Math.PI, '°', '14.1')];
  },
  note: () => 'Пластины 5 см, зазор 1 см, электрон влетает посередине. Для наглядности поперечный масштаб увеличен вдвое.',
});

/* ——— 15.1 Перезарядка через резистор ——— */
const C1 = 2e-6, C2 = 3e-6, U0 = 100;
FIG('recharge', {
  label: 'Конденсатор разряжается на другой через резистор',
  dt: 0.01, h: w => Math.min(80, w * 0.2),
  params: [{ id: 'R', label: 'сопротивление R', min: 1, max: 1000, step: 1, val: 100, unit: 'Ом' }],
  init(f) { f.q1 = C1 * U0; f.q2 = 0; f.Q = 0; f.time = 0; f.hist = [[0, U0, 0]]; },
  tick(f) {
    const tau = f.p.R * C1 * C2 / (C1 + C2), h = tau / 1000;
    for (let s = 0; s < 50; s++) {
      // шаг средней точкой: ток по закону Ома для разности напряжений
      const I1 = (f.q1 / C1 - f.q2 / C2) / f.p.R, q1m = f.q1 - I1 * h / 2, q2m = f.q2 + I1 * h / 2;
      const I = (q1m / C1 - q2m / C2) / f.p.R;
      f.Q += I * I * f.p.R * h; f.q1 -= I * h; f.q2 += I * h; f.time += h;
    }
    f.hist.push([f.time / tau, f.q1 / C1, f.q2 / C2]);
    if (f.time > 8 * tau) return false;
  },
  draw(f, ctx, w, h, C) {
    D.text(ctx, `U₁ = ${F(f.q1 / C1, 2)} В,  U₂ = ${F(f.q2 / C2, 2)} В,  тепло ${F(f.Q * 1e3, 3)} мДж`, 10, h / 2 + 5, C.fg, 13);
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 8, ymin: 0, ymax: 105, xl: 't / τ', yl: 'U, В',
        series: [{ pts: f.hist.map(r => [r[0], r[1]]), color: C.red, lw: 2 }, { pts: f.hist.map(r => [r[0], r[2]]), color: C.blue, lw: 2 }],
        hlines: [{ y: 40, color: C.ok, dash: [4, 3], label: '40 В' }],
      });
    },
  },
  readout(f) {
    const loss = C1 * U0 * U0 / 2 - (C1 * U0) ** 2 / (2 * (C1 + C2));
    if (f.time < 8 * f.p.R * C1 * C2 / (C1 + C2)) return [['тепло в резисторе', `${F(f.Q * 1e3, 4)} мДж`, `идёт перезарядка; потеря энергии ${F(loss * 1e3, 4)} мДж`]];
    return [cmp('тепло в резисторе', f.Q * 1e3, loss * 1e3, 'мДж', 'потеря энергии', 0.1)];
  },
  note: () => 'Время на графике — в единицах τ = R·C₁C₂/(C₁ + C₂). Меняйте R: перезарядка идёт быстрее или медленнее, а выделившееся тепло одно и то же — 6 мДж.',
});
})();
