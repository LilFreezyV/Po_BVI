(function () {
/* Рисунки темы 14 «Оптика».
   Снеллиус — перебором точки на границе по принципу Ферма; призма и шар — точной трассировкой
   по закону Снеллиуса; тонкая линза — пересечением двух лучей. Формулы — только для сверки. */

const DEG = Math.PI / 180;
// векторный закон Снеллиуса: d — направление, nrm — нормаль навстречу лучу; null при полном отражении
function refract(d, nrm, n1, n2) {
  const ci = -(d[0] * nrm[0] + d[1] * nrm[1]), r = n1 / n2, k = 1 - r * r * (1 - ci * ci);
  if (k < 0) return null;
  return [r * d[0] + (r * ci - Math.sqrt(k)) * nrm[0], r * d[1] + (r * ci - Math.sqrt(k)) * nrm[1]];
}

/* ——— 4.1 Закон Снеллиуса из принципа Ферма ——— */
FIG('snell', {
  label: 'Преломление: путь наименьшего времени',
  h: w => Math.min(260, w * 0.6),
  params: [
    { id: 'a', label: 'угол падения α', min: 0, max: 85, step: 1, val: 45, unit: '°' },
    { id: 'n1', label: 'показатель среды 1 (сверху)', min: 1, max: 2, step: 0.01, val: 1 },
    { id: 'n2', label: 'показатель среды 2 (снизу)', min: 1, max: 2, step: 0.01, val: 1.33 },
  ],
  init() {},
  calc(f) {
    const { n1, n2 } = f.p, a = f.p.a * DEG, s = n1 * Math.sin(a) / n2;
    if (s > 1) return { tir: true };
    const b = Math.asin(s), A = [-Math.tan(a), 1], B = [Math.tan(b), -1];   // источник и приёмник на луче Снеллиуса
    let best = [Infinity, 0];
    for (let k = 0; k <= 20000; k++) {                             // перебор точки на границе y = 0
      const x = A[0] + (B[0] - A[0]) * k / 20000, t = n1 * Math.hypot(x - A[0], A[1]) + n2 * Math.hypot(B[0] - x, B[1]);
      if (t < best[0]) best = [t, x];
    }
    return { tir: false, A, B, x: best[1], bF: Math.atan2(B[0] - best[1], 1), b };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), cx = w / 2, cy = h / 2, k = Math.min(w, h) * 0.38, a = f.p.a * DEG;
    ctx.fillStyle = D.alpha(C.blue, 0.06 + 0.12 * (f.p.n2 - 1)); ctx.fillRect(0, cy, w, h / 2);
    ctx.fillStyle = D.alpha(C.blue, 0.06 + 0.12 * (f.p.n1 - 1)); ctx.fillRect(0, 0, w, cy);
    D.line(ctx, 0, cy, w, cy, C.fg, 1.5); D.line(ctx, cx, 10, cx, h - 10, C.line, 1, [4, 4]);
    const P = [cx - Math.sin(a) * k, cy - Math.cos(a) * k];
    D.line(ctx, ...P, cx, cy, C.red, 2.5);
    if (r.tir) {
      D.line(ctx, cx, cy, cx + Math.sin(a) * k, cy - Math.cos(a) * k, C.red, 2.5);
      D.text(ctx, 'полное отражение', 10, 16, C.red, 12, 'left', 'alphabetic', 700);
    } else {
      D.line(ctx, cx, cy, cx + Math.sin(r.b) * k, cy + Math.cos(r.b) * k, C.red, 2.5);
      D.line(ctx, cx, cy, cx + Math.sin(a) * k * 0.6, cy - Math.cos(a) * k * 0.6, D.alpha(C.red, 0.3), 1.5);
      D.text(ctx, `β = ${F(r.b / DEG, 2)}°`, cx + 8, cy + 18, C.fg, 12);
    }
    D.text(ctx, `α = ${F(f.p.a, 0)}°`, cx - 50, cy - 8, C.fg, 12);
  },
  readout(f) {
    const r = this.calc(f), { n1, n2 } = f.p;
    if (r.tir) return [['преломлённого луча нет', '—', `n₁ sin α = ${F(n1 * Math.sin(f.p.a * DEG), 3)} > n₂: угол больше предельного ${F(Math.asin(n2 / n1) / DEG, 2)}°`, true]];
    return [cmp('угол преломления (по Ферма)', r.bF / DEG, r.b / DEG, '°', '4.1', 0.1)];
  },
  note: () => 'Источник и приёмник стоят на расстоянии 1 от границы. Точка, где луч пересекает границу, найдена перебором 20 000 вариантов по наименьшему времени пути — и угол совпадает со Снеллиусом.',
});

/* ——— 5.1 Призма ——— */
FIG('prism', {
  label: 'Отклонение луча призмой',
  h: w => Math.min(240, w * 0.55),
  params: [
    { id: 'A', label: 'преломляющий угол φ', min: 10, max: 80, step: 1, val: 60, unit: '°' },
    { id: 'n', label: 'показатель преломления n', min: 1.2, max: 1.9, step: 0.01, val: 1.5 },
    { id: 'i', label: 'угол падения', min: 0, max: 89, step: 0.5, val: 48.6, unit: '°' },
  ],
  init() {},
  dev(A, n, i) {                                                   // через углы граней — на каждой Снеллиус
    const r1 = Math.asin(Math.sin(i * DEG) / n), r2 = A * DEG - r1;
    if (n * Math.sin(r2) >= 1 || r2 < -Math.PI / 2) return null;
    return (i * DEG + Math.asin(n * Math.sin(r2))) / DEG - A;
  },
  calc(f) {
    const { A, n } = f.p; let best = [Infinity, 0];
    for (let k = 0; k <= 9000; k++) { const d = this.dev(A, n, k / 100); if (d !== null && d < best[0]) best = [d, k / 100]; }
    const th = 2 * Math.asin(Math.min(1, n * Math.sin(A * DEG / 2))) / DEG - A;
    return { best, th, cur: this.dev(A, n, f.p.i), ok: n * Math.sin(A * DEG / 2) < 1 };
  },
  draw(f, ctx, w, h, C) {
    const { A, n, i } = f.p, cx = w / 2, by = h - 20, s = Math.min(w * 0.5, (h - 40) / Math.cos(A * DEG / 2));
    const top = [cx, by - s * Math.cos(A * DEG / 2)], L = [cx - s * Math.sin(A * DEG / 2), by], Rr = [cx + s * Math.sin(A * DEG / 2), by];
    ctx.beginPath(); ctx.moveTo(...top); ctx.lineTo(...L); ctx.lineTo(...Rr); ctx.closePath(); ctx.fillStyle = D.alpha(C.blue, 0.15); ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    // точка входа — середина левой грани; нормаль к левой грани наружу
    const P = [(top[0] + L[0]) / 2, (top[1] + L[1]) / 2], ex = [L[0] - top[0], L[1] - top[1]], le = Math.hypot(...ex);
    const nOut = [-ex[1] / le, ex[0] / le];                          // наружу (влево-вверх)
    // направление падения: внутренняя нормаль, повёрнутая на угол i; берём вариант «снизу слева вверх»
    const nin = [-nOut[0], -nOut[1]], rot = (v, t) => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
    const c1 = rot(nin, i * DEG), c2 = rot(nin, -i * DEG), d0 = c1[1] < c2[1] ? c1 : c2;
    const t1 = refract(d0, nOut, 1, n);
    D.line(ctx, P[0] - d0[0] * 80, P[1] - d0[1] * 80, ...P, C.red, 2);
    if (!t1) return;
    // пересечение с правой гранью
    const ux = Rr[0] - top[0], uy = Rr[1] - top[1], den = t1[0] * uy - t1[1] * ux;
    const tt = ((top[0] - P[0]) * uy - (top[1] - P[1]) * ux) / den, Q = [P[0] + t1[0] * tt, P[1] + t1[1] * tt];
    D.line(ctx, ...P, ...Q, C.red, 2);
    const lr = Math.hypot(ux, uy), nR = [-uy / lr, ux / lr];         // нормаль правой грани, обращённая внутрь
    const t2 = refract(t1, nR, n, 1);
    if (t2) D.line(ctx, ...Q, Q[0] + t2[0] * 90, Q[1] + t2[1] * 90, C.red, 2);
    else D.text(ctx, 'полное отражение на второй грани', 10, 16, C.red, 12);
  },
  graph: {
    h: w => Math.min(190, w * 0.4),
    draw(f, ctx, w, h, C) {
      const { A, n } = f.p, pts = [];
      for (let k = 0; k <= 890; k++) { const d = this.dev(A, n, k / 10); if (d !== null) pts.push([k / 10, d]); }
      const r = this.calc(f);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 90, ymin: 0, ymax: 90, xl: 'угол падения, °', yl: 'отклонение, °',
        series: [{ pts, color: C.accent, lw: 2 }, ...(r.cur !== null ? [{ pts: [[f.p.i, r.cur]], color: C.red, dots: 5 }] : [])],
        hlines: r.ok ? [{ y: r.th, color: C.ok, dash: [4, 3], label: 'δ_min по (5.2)' }] : [],
      });
    },
  },
  readout(f) {
    const r = this.calc(f);
    if (!r.ok) return [['наименьшее отклонение', '—', 'луч не выходит ни при каком угле: φ ≥ 2 arcsin(1/n)', true]];
    return [cmp('наименьшее отклонение (перебор)', r.best[0], r.th, '°', '5.2', 0.05),
            ['при угле падения', `${F(r.best[1], 2)}°`, 'ход симметричен: входной и выходной углы равны']];
  },
  note: () => 'Перебор углов падения с шагом 0,01°. Минимум отклонения — при симметричном ходе луча внутри призмы.',
});

/* ——— 9.1 Тонкая линза ——— */
FIG('lens', {
  label: 'Изображение в тонкой линзе: построение двумя лучами',
  h: w => Math.min(240, w * 0.55),
  params: [
    { id: 'F', label: 'фокусное расстояние F', min: -20, max: 20, step: 1, val: 10, unit: 'см' },
    { id: 'd', label: 'расстояние до предмета d', min: 2, max: 50, step: 0.5, val: 15, unit: 'см' },
  ],
  init() {},
  calc(f) {
    const { F: Fc, d } = f.p, h = 1;
    if (Fc === 0 || Math.abs(d - Fc) < 1e-9) return { inf: true };
    // луч через центр: y = −(h/d)x; луч параллельный оси: y = h − (h/F)x
    const x = h / (h / Fc - h / d);
    return { inf: false, x, H: -(h / d) * x, th: 1 / (1 / Fc - 1 / d) };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), { F: Fc, d } = f.p, cx = w * 0.5, cy = h * 0.55, k = Math.min((w - 40) / 110, 6);
    const X = x => cx + x * k, Y = y => cy - y * k * 6, hob = 1;
    D.line(ctx, 10, cy, w - 10, cy, C.line, 1);
    D.line(ctx, cx, 15, cx, h - 15, C.accent, 2);
    if (Fc !== 0) { D.circ(ctx, X(Fc), cy, 3, C.fg); D.circ(ctx, X(-Fc), cy, 3, C.fg); D.text(ctx, 'F', X(Fc), cy + 14, C.muted, 10, 'center'); }
    D.arrow(ctx, X(-d), cy, X(-d), Y(hob), C.ok, 2.5);
    if (r.inf) { D.text(ctx, 'изображение на бесконечности', 10, 16, C.muted, 12); return; }
    D.line(ctx, X(-d), Y(hob), cx, Y(hob), C.red, 1.5);            // параллельный оси
    const far = 60;
    D.line(ctx, cx, Y(hob), X(far), Y(hob - hob / Fc * far), C.red, 1.5);
    D.line(ctx, X(-d), Y(hob), X(far), Y(-hob / d * far), C.red, 1.5);   // через центр
    if (r.x < 0) { D.line(ctx, cx, Y(hob), X(r.x), Y(r.H), C.red, 1, [4, 4]); D.line(ctx, cx, cy, X(r.x), Y(r.H), C.red, 1, [4, 4]); }
    D.arrow(ctx, X(r.x), cy, X(r.x), Y(r.H), r.x > 0 ? C.blue : D.alpha(C.blue, 0.5), 2.5);
    D.text(ctx, r.x > 0 ? 'действительное' : 'мнимое', X(r.x), Y(r.H) + (r.H > 0 ? -8 : 16), C.blue, 11, 'center');
  },
  readout(f) {
    const r = this.calc(f);
    if (r.inf) return [['изображение', 'на бесконечности', 'предмет в фокусе', true]];
    return [cmp('положение изображения f', r.x, r.th, 'см', '9.1'), ['увеличение', F(Math.abs(r.H), 3), r.H < 0 ? 'перевёрнутое' : 'прямое']];
  },
  note: () => 'Отрицательный F — рассеивающая линза. Пунктир — продолжения лучей, они дают мнимое изображение. Поперечный масштаб растянут.',
});

/* ——— 15.1 Стеклянный шар ——— */
FIG('ball', {
  label: 'Параллельный пучок через стеклянный шар',
  h: w => Math.min(240, w * 0.55),
  params: [{ id: 'n', label: 'показатель преломления n', min: 1.2, max: 1.9, step: 0.01, val: 1.5 }],
  init() {},
  trace(n, y) {                                                     // R = 1, центр в начале координат
    const P0 = [-Math.sqrt(1 - y * y), y], t1 = refract([1, 0], [P0[0], P0[1]], 1, n);
    const s = -2 * (P0[0] * t1[0] + P0[1] * t1[1]), P1 = [P0[0] + s * t1[0], P0[1] + s * t1[1]];
    const t2 = refract(t1, [-P1[0], -P1[1]], n, 1);
    return { P0, P1, t2, xf: t2 && Math.abs(t2[1]) > 1e-15 ? P1[0] - P1[1] * t2[0] / t2[1] : null };
  },
  draw(f, ctx, w, h, C) {
    const n = f.p.n, cx = w * 0.32, cy = h / 2, k = Math.min(w * 0.18, h * 0.38);
    ctx.beginPath(); ctx.arc(cx, cy, k, 0, 2 * Math.PI); ctx.fillStyle = D.alpha(C.blue, 0.15); ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    D.line(ctx, 10, cy, w - 10, cy, C.line, 1);
    for (let y = -0.8; y <= 0.81; y += 0.2) {
      const r = this.trace(n, y); if (!r.t2) continue;
      D.line(ctx, 10, cy - y * k, cx + r.P0[0] * k, cy - r.P0[1] * k, C.red, 1);
      D.line(ctx, cx + r.P0[0] * k, cy - r.P0[1] * k, cx + r.P1[0] * k, cy - r.P1[1] * k, C.red, 1);
      D.line(ctx, cx + r.P1[0] * k, cy - r.P1[1] * k, cx + (r.P1[0] + r.t2[0] * 4) * k, cy - (r.P1[1] + r.t2[1] * 4) * k, C.red, 1);
    }
    const xp = this.trace(n, 1e-4).xf;
    if (xp) { D.circ(ctx, cx + xp * k, cy, 4, C.ok); D.text(ctx, 'параксиальный фокус', cx + xp * k, cy + 16, C.ok, 10, 'center'); }
  },
  readout(f) {
    const n = f.p.n, xp = this.trace(n, 1e-4).xf, edge = this.trace(n, 0.8).xf;
    return [cmp('фокус узкого пучка (от центра)', xp, n / (2 * (n - 1)), 'R', '15.1'),
            ['луч на высоте 0,8R', edge === null ? '—' : `${F(edge, 3)} R`, 'ближе — сферическая аберрация']];
  },
  note: () => 'Лучи рассчитаны по точному закону Снеллиуса. Узкий пучок у оси фокусируется по формуле, крайние лучи пересекают ось ближе к шару.',
});
})();
