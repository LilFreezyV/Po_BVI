(function () {
/* Рисунки темы 06 «Статика и гидростатика».
   Модели статические: без анимации, пересчитываются при каждом движении ползунка.
   Лестница — система уравнений равновесия решается методом Гаусса; домкрат — сила находится
   виртуальным перемещением и равновесием шарнира; полусфера — интегрированием давления. */

// метод Гаусса с выбором главного элемента
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const k = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= k * M[i][c]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/* ——— 1.1 Лестница у гладкой стены ——— */
const ML = 20, MP = 60, LL = 4;                                  // масса лестницы, человека, длина, м
FIG('ladder2', {
  label: 'Лестница у гладкой стены: стоит или поедет',
  h: w => Math.min(260, w * 0.6),
  params: [
    { id: 'al', label: 'угол с полом α', min: 30, max: 85, step: 1, val: 60, unit: '°' },
    { id: 's', label: 'человек прошёл долю длины', min: 0, max: 1, step: 0.05, val: 0.5 },
    { id: 'mu', label: 'коэффициент трения о пол μ', min: 0, max: 1, step: 0.02, val: 0.3 },
  ],
  init() {},                                                     // движок вызывает init у каждой модели
  calc(f) {
    const a = f.p.al * Math.PI / 180, s = f.p.s, c = Math.cos(a), sn = Math.sin(a);
    // неизвестные: N₁ (пол), F (трение), N₂ (стена); моменты относительно нижнего конца
    const [N1, Fr, N2] = solve([[1, 0, 0], [0, 1, -1], [0, 0, LL * sn]],
      [(ML + MP) * G, 0, ML * G * LL / 2 * c + MP * G * s * LL * c]);
    return { N1, Fr, N2, need: Fr / N1, th: (ML / 2 + MP * s) / ((ML + MP) * Math.tan(a)) };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), a = f.p.al * Math.PI / 180, k = Math.min((w - 80) / LL, (h - 40) / LL);
    const ox = 40, oy = h - 20, X = x => ox + x * k, Y = y => oy - y * k;
    const foot = [LL * Math.cos(a), 0], top = [0, LL * Math.sin(a)];
    D.line(ctx, ox, oy, w - 10, oy, C.fg, 2); D.line(ctx, ox, oy, ox, 10, C.fg, 2);
    const slip = r.need > f.p.mu + 1e-12;
    D.line(ctx, X(foot[0]), Y(0), X(0), Y(top[1]), slip ? C.red : C.warm, 5);
    const P = [foot[0] * (1 - f.p.s), top[1] * f.p.s];
    D.circ(ctx, X(P[0]), Y(P[1]) - 10, 7, C.accent);
    const sc = 40 / ((ML + MP) * G);                              // пикселей на ньютон
    D.arrow(ctx, X(foot[0]), Y(0), X(foot[0]), Y(0) - r.N1 * sc, C.ok, 2);
    D.arrow(ctx, X(foot[0]), Y(0), X(foot[0]) - r.Fr * sc, Y(0), C.violet, 2);
    D.arrow(ctx, X(0), Y(top[1]), X(0) + r.N2 * sc, Y(top[1]), C.ok, 2);
    D.text(ctx, slip ? 'поедет: трения не хватает' : 'стоит', w - 10, 18, slip ? C.red : C.ok, 13, 'right', 'alphabetic', 700);
    legend(ctx, X(0) + 10, h - 4 - 20, [{ label: 'реакции', color: C.ok }, { label: 'трение', color: C.violet }], w, C);
  },
  readout(f) {
    const r = this.calc(f);
    return [cmp('нужный коэффициент трения', r.need, r.th, '', 'моменты'),
            ['сила трения покоя', `${F(r.Fr, 1)} Н`, `не больше μN = ${F(f.p.mu * r.N1, 1)} Н`, r.Fr <= f.p.mu * r.N1 + 1e-9 ? true : undefined]];
  },
  note: () => 'Лестница 20 кг, 4 м; человек 60 кг. Чем выше человек, тем больше нужно трения: его момент относительно нижнего конца растёт.',
});

/* ——— 2.1 Ромбический домкрат ——— */
FIG('jack', {
  label: 'Ножничный домкрат: сила на винте',
  h: w => Math.min(220, w * 0.5),
  params: [
    { id: 'th', label: 'угол сторон с горизонтом θ', min: 5, max: 75, step: 1, val: 30, unit: '°' },
    { id: 'P', label: 'нагрузка', min: 1, max: 20, step: 1, val: 10, unit: 'кН' },
  ],
  init() {},                                                     // движок вызывает init у каждой модели
  calc(f) {
    const th = f.p.th * Math.PI / 180, d = 1e-6, a = 1;
    const y = t => 2 * a * Math.sin(t), x = t => 2 * a * Math.cos(t);
    const virt = f.p.P * (y(th + d) - y(th - d)) / (x(th - d) - x(th + d));   // F·|δx| = P·δy
    const rod = f.p.P / (2 * Math.sin(th));                       // сила в каждом стержне (вдоль него)
    const joint = 2 * rod * Math.cos(th);                         // горизонтальные составляющие двух стержней
    return { virt, joint, th: f.p.P / Math.tan(th), rod };
  },
  draw(f, ctx, w, h, C) {
    const th = f.p.th * Math.PI / 180, k = Math.min((w - 40) / 2.2, (h - 40) / 2.2) * 0.9;
    const cx = w / 2, by = h - 18, a = 1;
    const top = [cx, by - 2 * a * Math.sin(th) * k], L = [cx - a * Math.cos(th) * k, by - a * Math.sin(th) * k], R = [cx + a * Math.cos(th) * k, L[1]];
    D.line(ctx, 10, by, w - 10, by, C.fg, 2);
    [[cx, by, ...L], [cx, by, ...R], [...L, ...top], [...R, ...top]].forEach(s => D.line(ctx, s[0], s[1], s[2], s[3], C.fg, 3));
    D.line(ctx, L[0], L[1], R[0], R[1], C.violet, 2, [5, 3]);
    [top, L, R, [cx, by]].forEach(p => D.circ(ctx, p[0], p[1], 4, C.card, C.fg, 2));
    D.arrow(ctx, top[0], top[1] - 40, top[0], top[1] - 6, C.red, 2.5);
    D.text(ctx, `${F(f.p.P, 0)} кН`, top[0] + 8, top[1] - 26, C.red, 11);
    D.text(ctx, `винт: ${F(this.calc(f).virt, 2)} кН`, w - 10, 18, C.violet, 12, 'right');
  },
  readout(f) {
    const r = this.calc(f);
    return [cmp('виртуальное перемещение', r.virt, r.th, 'кН', 'P·ctg θ'), cmp('равновесие шарнира', r.joint, r.th, 'кН', 'P·ctg θ'),
            ['сила в каждом стержне', `${F(r.rod, 2)} кН`, 'P/(2 sin θ), сжатие']];
  },
  note: () => 'Пунктир — винт. При малом угле сила на винте во много раз больше нагрузки: поднимать «сложенный» домкрат тяжелее всего.',
});

/* ——— 3.1 Давление воды на полусферу ——— */
const RHO = 1000, NR = 4000;
FIG('hemi', {
  label: 'Сила давления воды на полусферу на дне',
  h: w => Math.min(240, w * 0.55),
  params: [
    { id: 'H', label: 'глубина воды H', min: 0.3, max: 2, step: 0.05, val: 1, unit: 'м' },
    { id: 'R', label: 'радиус полусферы R', min: 0.05, max: 0.3, step: 0.01, val: 0.2, unit: 'м' },
  ],
  init() {},                                                     // движок вызывает init у каждой модели
  calc(f) {
    const { H, R } = f.p;
    let Fz = 0;
    for (let i = 0; i < NR; i++) {                                // кольца по углу от вершины
      const t = Math.PI / 2 * (i + 0.5) / NR, z = R * Math.cos(t);
      Fz += RHO * G * (H - z) * 2 * Math.PI * R * Math.sin(t) * R * (Math.PI / 2 / NR) * Math.cos(t);
    }
    return { Fz, th: RHO * G * (H * Math.PI * R * R - 2 / 3 * Math.PI * R ** 3), arch: RHO * G * 2 / 3 * Math.PI * R ** 3 };
  },
  draw(f, ctx, w, h, C) {
    const { H, R } = f.p, k = Math.min((h - 30) / 2.1, (w - 40) / 1.2), by = h - 14, cx = w / 2;
    ctx.fillStyle = D.alpha(C.blue, 0.15); ctx.fillRect(20, by - H * k, w - 40, H * k);
    D.line(ctx, 20, by - H * k, w - 20, by - H * k, C.blue, 2);
    D.line(ctx, 20, by, w - 20, by, C.fg, 2);
    ctx.beginPath(); ctx.arc(cx, by, R * k, Math.PI, 0); ctx.closePath(); ctx.fillStyle = C.line; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 1; i < 8; i++) {                                 // стрелки давления — по нормали к поверхности
      const t = Math.PI * i / 8, px = cx + R * k * Math.cos(t), py = by - R * k * Math.sin(t);
      const p = H - R * Math.sin(t), len = 6 + 22 * p / H;
      D.arrow(ctx, px + Math.cos(t) * len, py - Math.sin(t) * len, px, py, C.accent, 1.5);
    }
    D.text(ctx, `H = ${F(H, 2)} м`, 24, by - H * k - 6, C.blue, 11);
  },
  readout(f) {
    const r = this.calc(f);
    return [cmp('сила давления (интеграл)', r.Fz, r.th, 'Н', 'вес воды над полусферой'),
            ['«сила Архимеда» ρgV', `${F(r.arch, 1)} Н`, 'не действует: вода не подтекает снизу']];
  },
  note: () => 'Стрелки — давление воды по нормали к поверхности (длина пропорциональна давлению). Атмосферное давление не учитывается.',
});
})();
