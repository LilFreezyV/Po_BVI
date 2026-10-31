(function () {
/* Рисунки темы 08 «Тепловые явления».
   Все модели — пошаговые балансы энергии: порции втекающей воды, энтальпия нагреваемого льда,
   потоки между слоями стены. Формулы конспекта используются только для сверки. */

const CW = 4200, CI = 2100, LAM = 330e3, LV = 2.3e6;

/* ——— 2.1 Протекающий сосуд ——— */
const SPEED_F = 40;                                              // модельное время ускорено
FIG('flow', {
  label: 'В перемешиваемый сосуд втекает горячая вода',
  dt: 0.01, h: w => Math.min(170, w * 0.36),
  params: [
    { id: 'm', label: 'масса воды в сосуде m', min: 0.5, max: 5, step: 0.5, val: 1, unit: 'кг' },
    { id: 'mu', label: 'расход μ', min: 2, max: 50, step: 2, val: 10, unit: 'г/с' },
    { id: 'T1', label: 'температура притока T₁', min: 30, max: 95, step: 5, val: 80, unit: '°C' },
  ],
  init(f) { f.T = 20; f.time = 0; f.half = null; f.hist = [[0, 20]]; },
  tick(f) {
    const { m, T1 } = f.p, mu = f.p.mu / 1000, dt = 1e-3, n = Math.round(this.dt * SPEED_F / dt);
    for (let i = 0; i < n; i++) {
      // пришло μ·dt воды при T₁, ушло столько же при T: баланс теплоты для перемешанной массы m
      const Tn = f.T + mu * dt * (T1 - f.T) / m;
      const mid = (T1 + 20) / 2;
      if (f.half === null && f.T < mid && Tn >= mid) f.half = f.time + dt * (mid - f.T) / (Tn - f.T);
      f.T = Tn; f.time += dt;
    }
    f.hist.push([f.time, f.T]);
    if (f.time > 6 * m / mu) return false;
  },
  draw(f, ctx, w, h, C) {
    const cx = w / 2, top = 24, bw = Math.min(140, w * 0.35), bh = h - 44;
    const hot = (f.T - 20) / Math.max(f.p.T1 - 20, 1);
    ctx.fillStyle = `rgba(${Math.round(60 + 180 * hot)}, ${Math.round(110 - 40 * hot)}, ${Math.round(220 - 170 * hot)}, 0.55)`;
    ctx.fillRect(cx - bw / 2, top + 10, bw, bh - 10);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.strokeRect(cx - bw / 2, top, bw, bh);
    D.arrow(ctx, cx - bw / 2 - 60, top + 18, cx - bw / 2 + 6, top + 18, C.red, 2.5);
    D.arrow(ctx, cx + bw / 2 - 6, top + bh - 12, cx + bw / 2 + 60, top + bh - 12, C.blue, 2.5);
    D.text(ctx, `${F(f.p.T1, 0)} °C`, cx - bw / 2 - 58, top + 12, C.red, 11);
    D.text(ctx, `${F(f.T, 1)} °C`, cx, top + bh / 2 + 5, C.fg, 15, 'center', 'alphabetic', 700);
    D.text(ctx, `t = ${F(f.time, 0)} с`, w - 10, 16, C.muted, 11, 'right');
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      const tau = f.p.m / (f.p.mu / 1000);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 6 * tau, ymin: 20, ymax: f.p.T1 * 1.02, xl: 't, с', yl: 'T, °C',
        series: [{ pts: f.hist, color: C.warm, lw: 2 }],
        hlines: [{ y: f.p.T1, color: C.red, dash: [4, 3], label: 'T₁' }],
      });
    },
  },
  readout(f) {
    const tau = f.p.m / (f.p.mu / 1000);
    if (f.half === null) return [['время до середины между 20 °C и T₁', '—', `(2.2): τ·ln 2 = ${F(tau * Math.log(2), 1)} с`]];
    return [cmp('время до середины', f.half, tau * Math.LN2, 'с', '2.2')];
  },
  note: () => 'Время ускорено. Разность между температурой притока и температурой в сосуде уменьшается вдвое за τ·ln 2, где τ = m/μ.',
});

/* ——— 3.1 Нагрев льда до пара ——— */
const SPEED_H = 1000;
FIG('heatcurve', {
  label: 'Лёд нагревают постоянной мощностью до полного испарения',
  dt: 0.01, h: w => Math.min(120, w * 0.25),
  params: [
    { id: 'P', label: 'мощность нагревателя P', min: 200, max: 3000, step: 100, val: 1000, unit: 'Вт' },
    { id: 'm', label: 'масса льда m', min: 0.1, max: 2, step: 0.1, val: 0.5, unit: 'кг' },
    { id: 'T0', label: 'начальная температура', min: -40, max: 0, step: 5, val: -20, unit: '°C' },
  ],
  init(f) {
    f.Q = 0; f.time = 0; f.hist = [[0, f.p.T0]]; f.marks = {};
    const m = f.p.m;                                              // границы участков по полученной теплоте
    f.b = [CI * m * -f.p.T0]; f.b.push(f.b[0] + LAM * m); f.b.push(f.b[1] + CW * m * 100); f.b.push(f.b[2] + LV * m);
    if (f.b[0] <= 0) f.marks[0] = 0;                              // лёд уже при 0 °C — плавление с самого начала
  },
  state(f) {                                                      // температура и надпись по энтальпии
    const { m, T0 } = f.p, Q = f.Q, b = f.b;
    if (Q < b[0]) return [T0 + Q / (CI * m), 'лёд нагревается'];
    if (Q < b[1]) return [0, `плавление: растаяло ${F((Q - b[0]) / LAM * 1000, 0)} г`];
    if (Q < b[2]) return [(Q - b[1]) / (CW * m), 'вода нагревается'];
    if (Q < b[3]) return [100, `кипение: испарилось ${F((Q - b[2]) / LV * 1000, 0)} г`];
    return [100, 'всё испарилось'];
  },
  tick(f) {
    const dt = 0.01, n = Math.round(this.dt * SPEED_H / dt);
    for (let i = 0; i < n; i++) {
      const before = f.Q; f.Q += f.p.P * dt; f.time += dt;
      f.b.forEach((q, k) => { if (f.marks[k] === undefined && before < q && f.Q >= q) f.marks[k] = f.time - (f.Q - q) / f.p.P; });
      if (f.Q >= f.b[3]) break;
    }
    f.hist.push([f.time, this.state(f)[0]]);
    if (f.Q >= f.b[3]) return false;
  },
  draw(f, ctx, w, h, C) {
    const [T, msg] = this.state(f);
    D.text(ctx, `${F(T, 1)} °C`, 14, h / 2 + 6, C.fg, 20, 'left', 'alphabetic', 700);
    D.text(ctx, msg, 14, h / 2 + 28, C.muted, 12);
    D.text(ctx, `t = ${F(f.time / 60, 1)} мин (ускорено)`, w - 10, 16, C.muted, 11, 'right');
  },
  graph: {
    h: w => Math.min(210, w * 0.45),
    draw(f, ctx, w, h, C) {
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: f.b[3] / f.p.P / 60, ymin: Math.min(f.p.T0, 0) - 5, ymax: 110, xl: 't, мин', yl: 'T, °C',
        series: [{ pts: f.hist.map(r => [r[0] / 60, r[1]]), color: C.warm, lw: 2 }],
        hlines: [{ y: 0, color: C.blue, dash: [4, 3] }, { y: 100, color: C.red, dash: [4, 3] }],
      });
    },
  },
  readout(f) {
    const r = [], { P, m } = f.p, mk = f.marks;
    if (mk[1] !== undefined) r.push(cmp('площадка плавления', mk[1] - mk[0], LAM * m / P, 'с', 'λm/P'));
    if (mk[3] !== undefined) r.push(cmp('площадка кипения', mk[3] - mk[2], LV * m / P, 'с', 'Lm/P'));
    if (!r.length) r.push(['площадка плавления', '—', `λm/P = ${F(LAM * m / P, 0)} с`]);
    return r;
  },
  note: () => 'Кипение длится почти в 7 раз дольше плавления: удельная теплота парообразования воды в 7 раз больше теплоты плавления льда.',
});

/* ——— 4.1 Двухслойная стена ——— */
const NL = 60;
FIG('wall', {
  label: 'Двухслойная стена: прогрев и установившийся режим',
  dt: 0.01, h: w => Math.min(200, w * 0.45),
  params: [
    { id: 'd1', label: 'толщина кирпича', min: 0.05, max: 0.5, step: 0.05, val: 0.2, unit: 'м' },
    { id: 'd2', label: 'толщина утеплителя', min: 0, max: 0.2, step: 0.01, val: 0.1, unit: 'м' },
    { id: 'tin', label: 'температура внутри', min: 10, max: 30, step: 1, val: 20, unit: '°C' },
  ],
  init(f) {
    const { d1, d2 } = f.p, n2 = d2 > 0 ? Math.max(1, Math.round(NL * d2 / (d1 + d2))) : 0, n1 = NL - n2;
    f.k = [...Array(n1).fill(0.7), ...Array(n2).fill(0.04)];
    f.hx = [...Array(n1).fill(d1 / n1), ...Array(n2).fill(n2 ? d2 / n2 : 0)];
    f.n1 = n1; f.Tc = Array(NL + 1).fill(-10); f.Tc[0] = f.p.tin; f.it = 0; f.done2 = false;
    // устойчивый шаг явной схемы: τ ≤ min(h²/2κ) при единичной объёмной теплоёмкости
    f.step = 0.45 * Math.min(...f.hx.map((h, i) => h * h / f.k[i]));
  },
  flux(f) { return f.k.map((k, i) => k * (f.Tc[i] - f.Tc[i + 1]) / f.hx[i]); },
  tick(f) {
    if (f.done2) return false;
    for (let s = 0; s < 400; s++) {
      const q = this.flux(f);
      for (let i = 1; i < NL; i++) f.Tc[i] += f.step * (q[i - 1] - q[i]) / ((f.hx[i - 1] + f.hx[i]) / 2);
      f.it++;
    }
    const q = this.flux(f);
    if (Math.max(...q) - Math.min(...q) < 1e-7 * Math.max(...q.map(Math.abs))) f.done2 = true;
  },
  draw(f, ctx, w, h, C) {
    const { d1, d2 } = f.p, total = d1 + d2, x0 = 40, x1 = w - 40, X = x => x0 + (x1 - x0) * x / total;
    const Y = T => h - 24 - (T + 10) / (f.p.tin + 10) * (h - 50);
    ctx.fillStyle = D.alpha(C.warm, 0.2); ctx.fillRect(X(0), 12, X(d1) - X(0), h - 36);
    if (d2 > 0) { ctx.fillStyle = D.alpha(C.ok, 0.2); ctx.fillRect(X(d1), 12, X(total) - X(d1), h - 36); }
    let x = 0; ctx.beginPath();
    f.Tc.forEach((T, i) => { const px = X(x), py = Y(T); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); if (i < NL) x += f.hx[i]; });
    ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.stroke();
    D.text(ctx, `${F(f.p.tin, 0)} °C`, 4, Y(f.p.tin) + 4, C.fg, 11);
    D.text(ctx, '−10 °C', x1 + 2, Y(-10) + 4, C.fg, 11);
    D.text(ctx, 'кирпич', X(d1 / 2), h - 8, C.muted, 10, 'center');
    if (d2 > 0) D.text(ctx, 'утеплитель', X(d1 + d2 / 2), h - 8, C.muted, 10, 'center');
  },
  readout(f) {
    const { d1, d2, tin } = f.p, R1 = d1 / 0.7, R2 = d2 / 0.04, P = (tin + 10) / (R1 + R2), q = this.flux(f);
    if (!f.done2) return [['поток, Вт/м²', `от ${F(Math.min(...q), 2)} до ${F(Math.max(...q), 2)}`, 'прогрев: в разных слоях поток разный']];
    return [cmp('поток, Вт/м²', q[0], P, '', '4.1, R₁ + R₂'), cmp('температура на стыке', f.Tc[f.n1], tin - P * R1, '°C', 'T − P·R₁')];
  },
  note: () => 'Снаружи −10 °C, на 1 м² стены. Кирпич 0,7, утеплитель 0,04 Вт/(м·К). Почти весь перепад температуры приходится на утеплитель.',
});
})();
