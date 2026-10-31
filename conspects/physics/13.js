(function () {
/* Рисунки темы 13 «Электромагнитные колебания».
   Все три модели интегрируют уравнения Кирхгофа для контура методом РК4; формулы конспекта
   (период, наибольший ток, затухание) используются только для сверки. */

function rk4(s, rhs, h) {
  const k1 = rhs(s), s2 = s.map((x, i) => x + h / 2 * k1[i]), k2 = rhs(s2), s3 = s.map((x, i) => x + h / 2 * k2[i]);
  const k3 = rhs(s3), s4 = s.map((x, i) => x + h * k3[i]), k4 = rhs(s4);
  return s.map((x, i) => x + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
const U0 = 100;

/* ——— 1.1 LC-контур ——— */
FIG('lc', {
  label: 'LC-контур: заряд, ток и энергия',
  dt: 0.01, h: w => Math.min(80, w * 0.2),
  params: [
    { id: 'L', label: 'индуктивность L', min: 0.01, max: 1, step: 0.01, val: 0.1, unit: 'Гн' },
    { id: 'C', label: 'ёмкость C', min: 1, max: 50, step: 1, val: 10, unit: 'мкФ' },
  ],
  init(f) {
    f.Cc = f.p.C * 1e-6; f.Tth = 2 * Math.PI * Math.sqrt(f.p.L * f.Cc);
    f.s = [f.Cc * U0, 0]; f.T = 0; f.cross = []; f.Imax = 0; f.hist = [[0, U0, 0]]; f.Emin = Infinity; f.Emax = 0;
  },
  tick(f) {
    const L = f.p.L, Cc = f.Cc, h = f.Tth / 400, rhs = z => [z[1], -z[0] / (L * Cc)];
    for (let k = 0; k < 4; k++) {
      const n = rk4(f.s, rhs, h);
      if (f.s[0] > 0 && n[0] <= 0) f.cross.push(f.T + h * f.s[0] / (f.s[0] - n[0]));
      f.s = n; f.T += h; f.Imax = Math.max(f.Imax, Math.abs(f.s[1]));
      const E = f.s[0] ** 2 / (2 * Cc) + L * f.s[1] ** 2 / 2; f.Emin = Math.min(f.Emin, E); f.Emax = Math.max(f.Emax, E);
    }
    f.hist.push([f.T / f.Tth, f.s[0] / Cc, f.s[1]]);
    if (f.T > 3 * f.Tth) return false;
  },
  draw(f, ctx, w, h, C) {
    const Wc = f.s[0] ** 2 / (2 * f.Cc), Wl = f.p.L * f.s[1] ** 2 / 2, tot = Wc + Wl || 1, bw = w - 40;
    D.rect(ctx, 20, h / 2 - 10, bw * Wc / tot, 20, C.red); D.rect(ctx, 20 + bw * Wc / tot, h / 2 - 10, bw * Wl / tot, 20, C.blue);
    D.text(ctx, 'энергия конденсатора', 22, h / 2 - 16, C.red, 11); D.text(ctx, 'катушки', w - 20, h / 2 - 16, C.blue, 11, 'right');
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      const I0 = U0 * Math.sqrt(f.Cc / f.p.L);
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 3, ymin: -1.1, ymax: 1.1, xl: 't / T', yl: 'U/U₀, I/I₀',
        series: [{ pts: f.hist.map(r => [r[0], r[1] / U0]), color: C.red, lw: 2 }, { pts: f.hist.map(r => [r[0], r[2] / I0]), color: C.blue, lw: 2 }],
      });
      legend(ctx, 56, 26, [{ label: 'напряжение', color: C.red }, { label: 'ток', color: C.blue }], w, C);
    },
  },
  readout(f) {
    const r = [], I0 = U0 * Math.sqrt(f.Cc / f.p.L);
    if (f.cross.length >= 2) r.push(cmp('период', (f.cross[1] - f.cross[0]) * 1e3, f.Tth * 1e3, 'мс', '1.1'));
    if (f.T > f.Tth / 2) r.push(cmp('наибольший ток', f.Imax, I0, 'А', '1.2'));
    if (f.T > 0) r.push(['энергия', `от ${F(f.Emin * 1e3, 4)} до ${F(f.Emax * 1e3, 4)} мДж`, 'сохраняется', (f.Emax - f.Emin) / f.Emax < 1e-6]);
    return r;
  },
  note: () => 'Начальное напряжение 100 В. Красная полоса — энергия в конденсаторе, синяя — в катушке; их сумма постоянна.',
});

/* ——— 2.1 Два конденсатора через катушку ——— */
FIG('twocaps', {
  label: 'Перекачка заряда между конденсаторами через катушку',
  dt: 0.01, h: w => Math.min(80, w * 0.2),
  params: [{ id: 'C2', label: 'ёмкость второго C₂', min: 2, max: 50, step: 1, val: 10, unit: 'мкФ' }],
  init(f) {
    f.L = 0.1; f.C1 = 1e-5; f.C2 = f.p.C2 * 1e-6; f.Q = f.C1 * U0; f.s = [f.Q, 0]; f.T = 0; f.U2max = 0; f.Imax = 0; f.hist = [[0, U0, 0]];
    f.Cs = f.C1 * f.C2 / (f.C1 + f.C2); f.Tp = 2 * Math.PI * Math.sqrt(f.L * f.Cs);
  },
  tick(f) {
    const h = f.Tp / 400, rhs = z => [-z[1], (z[0] / f.C1 - (f.Q - z[0]) / f.C2) / f.L];
    for (let k = 0; k < 4; k++) {
      f.s = rk4(f.s, rhs, h); f.T += h;
      f.U2max = Math.max(f.U2max, (f.Q - f.s[0]) / f.C2); f.Imax = Math.max(f.Imax, Math.abs(f.s[1]));
    }
    f.hist.push([f.T / f.Tp, f.s[0] / f.C1, (f.Q - f.s[0]) / f.C2]);
    if (f.T > 3 * f.Tp) return false;
  },
  draw(f, ctx, w, h, C) {
    D.text(ctx, `U₁ = ${F(f.s[0] / f.C1, 1)} В,  U₂ = ${F((f.Q - f.s[0]) / f.C2, 1)} В,  ток ${F(f.s[1], 3)} А`, 10, h / 2 + 5, C.fg, 13);
  },
  graph: {
    h: w => Math.min(200, w * 0.42),
    draw(f, ctx, w, h, C) {
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 3, ymin: 0, ymax: 105, xl: 't / T', yl: 'U, В',
        series: [{ pts: f.hist.map(r => [r[0], r[1]]), color: C.red, lw: 2 }, { pts: f.hist.map(r => [r[0], r[2]]), color: C.blue, lw: 2 }],
        hlines: [{ y: U0 * f.C1 / (f.C1 + f.C2), color: C.ok, dash: [4, 3], label: 'равновесие' }],
      });
      legend(ctx, 56, 26, [{ label: 'U₁', color: C.red }, { label: 'U₂', color: C.blue }], w, C);
    },
  },
  readout(f) {
    const Ueq = U0 * f.C1 / (f.C1 + f.C2), Ith = Math.sqrt(2 * (f.C1 * U0 * U0 / 2 - (f.C1 + f.C2) * Ueq * Ueq / 2) / f.L);
    if (f.T < f.Tp / 2) return [['наибольшее U₂', '—', `теорема 2.1: ${F(2 * Ueq, 2)} В`]];
    return [cmp('наибольшее U₂', f.U2max, 2 * Ueq, 'В', '2 U_равн'), cmp('наибольший ток', f.Imax, Ith, 'А', 'энергия')];
  },
  note: () => 'L = 0,1 Гн, C₁ = 10 мкФ при 100 В. Зелёный пунктир — общее напряжение в равновесии: колебания симметричны относительно него.',
});

/* ——— 3.1 Затухающие колебания ——— */
FIG('rlc', {
  label: 'Затухающие колебания в RLC-контуре',
  dt: 0.01, h: w => Math.min(60, w * 0.15),
  params: [{ id: 'R', label: 'сопротивление R', min: 0, max: 300, step: 1, val: 10, unit: 'Ом' }],
  init(f) {
    f.L = 0.1; f.C = 1e-5; f.s = [f.C * U0, 0]; f.T = 0; f.peaks = []; f.hist = [[0, 1]]; f.prevI = 0;
    f.T0 = 2 * Math.PI * Math.sqrt(f.L * f.C);
  },
  tick(f) {
    const { L, C } = f, R = f.p.R, h = f.T0 / 400, rhs = z => [z[1], -z[0] / (L * C) - R / L * z[1]];
    for (let k = 0; k < 4; k++) {
      const n = rk4(f.s, rhs, h);
      if (f.s[1] > 0 && n[1] <= 0) {                                // максимум заряда — ток меняет знак с + на −
        const dt = h * f.s[1] / (f.s[1] - n[1]);                    // ток почти линеен в шаге: момент и величина максимума
        f.peaks.push([f.T + dt, f.s[0] + f.s[1] * dt / 2]);
      }
      if (f.T === 0 && n[1] < 0) f.peaks.push([0, f.s[0]]);
      f.s = n; f.T += h;
    }
    f.hist.push([f.T / f.T0, f.s[0] / (f.C * U0)]);
    if (f.T > 5 * f.T0) return false;
  },
  draw(f, ctx, w, h, C) {
    const b = f.p.R / (2 * f.L), crit = 2 * Math.sqrt(f.L / f.C);
    D.text(ctx, `β = ${F(b, 1)} с⁻¹, добротность ${f.p.R ? F(1000 * f.L / f.p.R, 1) : '∞'}, критическое R = ${F(crit, 0)} Ом`, 10, h / 2 + 5, C.fg, 12);
  },
  graph: {
    h: w => Math.min(210, w * 0.45),
    draw(f, ctx, w, h, C) {
      const b = f.p.R / (2 * f.L), env = [], env2 = [];
      for (let k = 0; k <= 100; k++) { const t = 5 * k / 100; env.push([t, Math.exp(-b * t * f.T0)]); env2.push([t, -Math.exp(-b * t * f.T0)]); }
      D.plot(ctx, { x: 48, y: 14, w: w - 66, h: h - 48 }, {
        xmin: 0, xmax: 5, ymin: -1.05, ymax: 1.05, xl: 't / T₀', yl: 'q / q₀',
        series: [{ pts: env, color: C.muted, lw: 1, dash: [4, 3] }, { pts: env2, color: C.muted, lw: 1, dash: [4, 3] }, { pts: f.hist, color: C.accent, lw: 2 }],
      });
    },
  },
  readout(f) {
    const b = f.p.R / (2 * f.L), w0 = 1 / Math.sqrt(f.L * f.C);
    if (b >= w0) return [['колебания', 'нет', `R ≥ 2√(L/C) = ${F(2 * Math.sqrt(f.L / f.C), 0)} Ом — апериодический разряд`, true]];
    const pk = f.peaks.filter(p => p[1] > 0);
    if (pk.length < 2) return [['отношение соседних максимумов', '—', `e^(−βT) = ${F(Math.exp(-b * 2 * Math.PI / Math.sqrt(w0 * w0 - b * b)), 4)}`]];
    const T = 2 * Math.PI / Math.sqrt(w0 * w0 - b * b);
    return [cmp('отношение соседних максимумов', pk[1][1] / pk[0][1], Math.exp(-b * T), '', '3.1'), cmp('период', (pk[1][0] - pk[0][0]) * 1e3, T * 1e3, 'мс', '3.1')];
  },
  note: () => 'L = 0,1 Гн, C = 10 мкФ. Пунктир — огибающая ±e^(−βt). При R = 200 Ом и больше колебаний нет.',
});
})();
