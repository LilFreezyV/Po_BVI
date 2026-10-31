(function () {
/* Рисунки темы 09 «Молекулярная физика и термодинамика».
   Газ в коробке — молекулярная динамика упругих дисков; адиабата, точка смены знака теплоты и
   сжатие пара — пошаговое применение первого начала и уравнения состояния на малых шагах объёма.
   Проверяемые формулы конспекта используются только для сверки. */

const R = 8.31;

/* ——— 1.1 Двумерный газ в коробке ——— */
const NP = 60, RAD = 0.012, SUB = 10;
FIG('gasbox', {
  label: 'Двумерный газ: давление из ударов молекул о стенки',
  dt: 0.01, h: w => Math.min(300, w * 0.75),
  params: [
    { id: 'v', label: 'средняя скорость молекул', min: 0.5, max: 3, step: 0.25, val: 1.5, unit: 'усл.' },
    { id: 'N', label: 'число молекул', min: 10, max: 60, step: 10, val: 60 },
    { id: 'coll', label: 'молекулы', val: '0', opts: [['0', 'точки'], ['1', 'шарики']] },
  ],
  init(f) {
    let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    f.ps = [];
    for (let i = 0; i < f.p.N; i++) {
      const a = 2 * Math.PI * rnd(), sp = f.p.v * (0.4 + 1.2 * rnd());
      f.ps.push({ x: 0.05 + 0.9 * (i % 8) / 7, y: 0.05 + 0.9 * Math.floor(i / 8) / 7, vx: sp * Math.cos(a), vy: sp * Math.sin(a) });
    }
    f.v2 = f.ps.reduce((a, q) => a + q.vx ** 2 + q.vy ** 2, 0) / f.p.N;   // средний квадрат скорости сохраняется
    f.imp = 0; f.hits = 0; f.time = 0; f.r = f.p.coll === '1' ? RAD : 0;   // точечные молекулы не сталкиваются
  },
  tick(f) {
    const h = this.dt * 5 / SUB, ps = f.ps;
    for (let s = 0; s < SUB; s++) {
      for (const q of ps) {
        q.x += q.vx * h; q.y += q.vy * h;
        if (q.x < f.r && q.vx < 0) { q.vx = -q.vx; f.imp += 2 * Math.abs(q.vx); f.hits++; }
        if (q.x > 1 - f.r && q.vx > 0) { q.vx = -q.vx; f.imp += 2 * Math.abs(q.vx); f.hits++; }
        if (q.y < f.r && q.vy < 0) { q.vy = -q.vy; f.imp += 2 * Math.abs(q.vy); f.hits++; }
        if (q.y > 1 - f.r && q.vy > 0) { q.vy = -q.vy; f.imp += 2 * Math.abs(q.vy); f.hits++; }
      }
      if (f.r) for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {   // упругие удары равных масс
        const a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 < 4 * RAD * RAD) {
          const d = Math.sqrt(d2) || 1e-9, nx = dx / d, ny = dy / d, vr = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (vr > 0) { a.vx -= vr * nx; a.vy -= vr * ny; b.vx += vr * nx; b.vy += vr * ny; }
        }
      }
      f.time += h;
    }
  },
  draw(f, ctx, w, h, C) {
    const L = Math.min(w, h) - 20, ox = (w - L) / 2, oy = 10;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, L, L);
    f.ps.forEach(q => D.circ(ctx, ox + q.x * L, oy + (1 - q.y) * L, Math.max(2, RAD * L), C.accent));
    D.text(ctx, `ударов о стенки: ${f.hits}`, w - 8, h - 6, C.muted, 11, 'right');
  },
  readout(f) {
    const th = f.p.N * f.v2 / 2;                                  // P = N m <v²> / (2A), A = 1, m = 1
    const Pm = f.time ? f.imp / f.time / 4 : NaN;
    if (f.hits < 2000) return [['давление (сила на длину стенки)', F(Pm, 2), `МКТ: ${F(th, 2)}; сверка после 2000 ударов`]];
    if (f.r) return [['давление', `${F(Pm, 2)} усл.`, `идеальный газ: ${F(th, 2)}; больше на ${F((Pm / th - 1) * 100, 1)} % — молекулы занимают место (подтема 21)`]];
    return [cmp('давление', Pm, th, 'усл.', 'N m⟨v²⟩/2A', 3)];
  },
  note: () => 'Единицы условные: сторона коробки 1, масса молекулы 1. Давление — суммарный импульс, переданный стенкам, делённый на время и периметр. Для точечных молекул расхождение — только от конечного времени счёта (допуск 3 %). Шарики конечного размера давят сильнее: им тесно — это поправка на собственный объём, как у Ван-дер-Ваальса.',
});

/* ——— 13.1 Адиабатное сжатие ——— */
FIG('adiabat', {
  label: 'Адиабатное сжатие: первое начало по шагам',
  dt: 0.01, h: w => Math.min(80, w * 0.2),
  params: [
    { id: 'i', label: 'газ', val: '5', opts: [['3', 'одноатомный'], ['5', 'двухатомный']] },
    { id: 'k', label: 'во сколько раз сжать', min: 1.5, max: 20, step: 0.5, val: 10 },
  ],
  init(f) {
    // A — работа внешних сил над газом
    f.i = +f.p.i; f.V = 10e-3; f.T = 300; f.A = 0; f.hist = [[10, R * 300 / 10e-3 / 1e5]]; f.vEnd = 10e-3 / f.p.k;
  },
  tick(f) {
    const n = 200, dV = (f.vEnd - 10e-3) / 2e4;                 // 20 000 шагов на весь процесс
    for (let s = 0; s < n && f.V > f.vEnd + 1e-15; s++) {
      // шаг по средней точке: dT = −P dV / C_V, 1 моль
      const Tm = f.T - R * f.T / f.V * dV / 2 / (f.i / 2 * R), Pm = R * Tm / (f.V + dV / 2);
      f.T += -Pm * dV / (f.i / 2 * R); f.A += -Pm * dV; f.V += dV;
    }
    f.hist.push([f.V * 1e3, R * f.T / f.V / 1e5]);
    if (f.V <= f.vEnd + 1e-15) return false;
  },
  draw(f, ctx, w, h, C) {
    D.text(ctx, `V = ${F(f.V * 1e3, 2)} л,  T = ${F(f.T, 1)} К,  P = ${F(R * f.T / f.V / 1e5, 2)}·10⁵ Па`, 10, h / 2 + 5, C.fg, 13);
  },
  graph: {
    h: w => Math.min(240, w * 0.5),
    draw(f, ctx, w, h, C) {
      const g = (f.i + 2) / f.i, Pmax = R * 300 / 10e-3 / 1e5 * f.p.k ** g;
      const iso = [], adi = [];
      for (let k = 0; k <= 60; k++) { const V = 10 - (10 - f.vEnd * 1e3) * k / 60; iso.push([V, R * 300 / (V * 1e-3) / 1e5]); adi.push([V, R * 300 / 10e-3 / 1e5 * (10 / V) ** g]); }
      D.plot(ctx, { x: 52, y: 14, w: w - 70, h: h - 48 }, {
        xmin: 0, xmax: 10.5, ymin: 0, ymax: Pmax * 1.05, xl: 'V, л', yl: 'P, 10⁵ Па',
        series: [{ pts: iso, color: C.muted, lw: 1.5, dash: [5, 4] }, { pts: adi, color: C.ok, lw: 4 }, { pts: f.hist, color: C.red, lw: 1.5 }],
      });
      legend(ctx, 60, 26, [{ label: 'изотерма', color: C.muted, dash: [5, 4] }, { label: 'PV^γ = const', color: C.ok }, { label: 'по шагам', color: C.red }], w, C);
    },
  },
  readout(f) {
    const g = (f.i + 2) / f.i, k = 10e-3 / f.V;
    return [cmp('температура', f.T, 300 * k ** (g - 1), 'К', '13.1'),
            cmp('работа над газом', f.A, f.i / 2 * R * (f.T - 300), 'Дж', 'ΔU')];
  },
  note: () => '1 моль, начало: 10 л и 300 К. Красная кривая получена шагами по первому началу и легла на зелёную — уравнение Пуассона. Пунктир — изотерма: адиабата круче.',
});

/* ——— 16.1 Точка смены знака теплоты ——— */
FIG('cycle', {
  label: 'Где газ перестаёт получать теплоту на прямолинейном процессе',
  h: w => Math.min(280, w * 0.6),
  params: [
    { id: 'i', label: 'газ', val: '3', opts: [['3', 'одноатомный'], ['5', 'двухатомный']] },
    { id: 'P1', label: 'давление в начале (V = 1 л)', min: 1.5, max: 6, step: 0.5, val: 3, unit: '10⁵ Па' },
    { id: 'V2', label: 'объём в конце (P = 1)', min: 1.5, max: 6, step: 0.5, val: 3, unit: 'л' },
  ],
  init() {},
  calc(f) {
    const i = +f.p.i, P1 = f.p.P1, V2 = f.p.V2, k = (P1 - 1) / (V2 - 1), P = V => P1 - k * (V - 1), N = 20000;
    let Vs = null, qin = 0, qout = 0;
    for (let s = 0; s < N; s++) {
      const a = 1 + (V2 - 1) * s / N, b = 1 + (V2 - 1) * (s + 1) / N;
      const q = i / 2 * (P(b) * b - P(a) * a) + (P(a) + P(b)) / 2 * (b - a);
      if (q > 0) qin += q; else { qout -= q; if (Vs === null) Vs = a; }
    }
    const V0 = 1 + P1 / k, th = (i + 2) / (2 * (i + 1)) * V0;  // 5/8 или 7/12 от точки пересечения с осью V
    return { P, k, Vs, qin: qin * 100, qout: qout * 100, th, V0 };
  },
  draw(f, ctx, w, h, C) {
    const r = this.calc(f), i = +f.p.i, g = (i + 2) / i;
    const vmax = Math.max(f.p.V2, r.V0) * 1.05, pmax = f.p.P1 * 1.15;
    const box = { x: 46, y: 12, w: w - 62, h: h - 44 }, X = V => box.x + V / vmax * box.w, Y = P => box.y + box.h - P / pmax * box.h;
    D.plot(ctx, box, { xmin: 0, xmax: vmax, ymin: 0, ymax: pmax, xl: 'V, л', yl: 'P, 10⁵ Па', series: [] });
    D.line(ctx, X(1), Y(f.p.P1), X(r.V0), Y(0), C.line, 1, [3, 4]);
    const Vs = r.Vs ?? f.p.V2;
    D.line(ctx, X(1), Y(f.p.P1), X(Vs), Y(r.P(Vs)), C.red, 4);
    if (r.Vs !== null) {
      D.line(ctx, X(Vs), Y(r.P(Vs)), X(f.p.V2), Y(1), C.blue, 4);
      const Ps = r.P(Vs), adi = [];                               // адиабата через точку смены
      for (let V = Vs * 0.6; V <= Math.min(vmax, Vs * 1.6); V += Vs * 0.02) adi.push([V, Ps * (Vs / V) ** g]);
      ctx.beginPath(); adi.forEach((p, k) => (k ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.strokeStyle = C.ok; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
      D.circ(ctx, X(Vs), Y(Ps), 5, C.fg);
    }
    legend(ctx, box.x + box.w - 170, box.y + 12, [{ label: 'газ получает Q', color: C.red }, { label: 'отдаёт Q', color: C.blue }, { label: 'адиабата', color: C.ok, dash: [5, 3] }], w, C);
  },
  readout(f) {
    const r = this.calc(f), rows = [];
    if (r.Vs !== null && r.th > 1 && r.th < f.p.V2) rows.push(cmp('точка смены V*', r.Vs, r.th, 'л', '16.1', 0.05));
    else rows.push(['точка смены V*', r.Vs === null ? 'нет' : F(r.Vs, 3) + ' л', `(16.1): ${F(r.th, 3)} л — вне отрезка`]);
    rows.push(['получено / отдано на отрезке', `${F(r.qin, 1)} / ${F(r.qout, 1)} Дж`, 'суммы по 20 000 шагам']);
    return rows;
  },
  note: () => 'Прямая продолжена пунктиром до оси V — точка пересечения V₀. Газ получает теплоту до 5/8·V₀ (одноатомный) или 7/12·V₀ (двухатомный); там прямая касается адиабаты.',
});

/* ——— 18.1 Изотермическое сжатие пара ——— */
const TV = 373.15, PS = 1e5, MW = 0.018;
FIG('vapor', {
  label: 'Водяной пар при 100 °C сжимают: начало конденсации',
  dt: 0.01, h: w => Math.min(80, w * 0.2),
  params: [
    { id: 'p0', label: 'начальное давление пара', min: 0.2, max: 0.9, step: 0.05, val: 0.5, unit: '10⁵ Па' },
    { id: 'Vmin', label: 'сжать до объёма', min: 0.5, max: 5, step: 0.5, val: 2, unit: 'л' },
  ],
  init(f) {
    f.V = 10e-3; f.m0 = f.p.p0 * 1e5 * f.V * MW / (R * TV); f.mv = f.m0; f.liq = 0; f.onset = null; f.hist = [[10, f.p.p0]];
  },
  tick(f) {
    const vEnd = f.p.Vmin * 1e-3, dV = (vEnd - 10e-3) / 4000;
    for (let s = 0; s < 40 && f.V > vEnd + 1e-12; s++) {
      f.V += dV;
      let P = f.mv * R * TV / (MW * f.V);
      if (P > PS) {                                               // лишний пар конденсируется
        if (f.onset === null) f.onset = f.V - dV * (P - PS) / (P - f.mv * R * TV / (MW * (f.V - dV)));
        const ms = PS * f.V * MW / (R * TV); f.liq += f.mv - ms; f.mv = ms; P = PS;
      }
    }
    f.hist.push([f.V * 1e3, f.mv * R * TV / (MW * f.V) / 1e5]);
    if (f.V <= vEnd + 1e-12) return false;
  },
  draw(f, ctx, w, h, C) {
    D.text(ctx, `V = ${F(f.V * 1e3, 2)} л,  пар ${F(f.mv * 1e3, 3)} г,  вода ${F(f.liq * 1e3, 3)} г`, 10, h / 2 + 5, C.fg, 13);
  },
  graph: {
    h: w => Math.min(220, w * 0.48),
    draw(f, ctx, w, h, C) {
      D.plot(ctx, { x: 52, y: 14, w: w - 70, h: h - 48 }, {
        xmin: 0, xmax: 10.5, ymin: 0, ymax: 1.2, xl: 'V, л', yl: 'P, 10⁵ Па',
        series: [{ pts: f.hist, color: C.accent, lw: 2.5 }],
        hlines: [{ y: 1, color: C.red, dash: [4, 3], label: 'P насыщ. при 100 °C' }],
      });
    },
  },
  readout(f) {
    const onsetTh = 10 * f.p.p0, r = [];
    if (onsetTh > f.p.Vmin) r.push(f.onset === null ? ['начало конденсации', '—', `теория: ${F(onsetTh, 2)} л`] : cmp('начало конденсации', f.onset * 1e3, onsetTh, 'л', 'PV = const'));
    else r.push(['начало конденсации', 'не наступит', `нужно сжать до ${F(onsetTh, 2)} л`]);
    if (f.V <= f.p.Vmin * 1e-3 + 1e-12 && onsetTh > f.p.Vmin) r.push(cmp('сконденсировалось', f.liq * 1e3, (f.m0 - PS * f.p.Vmin * 1e-3 * MW / (R * TV)) * 1e3, 'г', 'm₀ − m_нас'));
    return r;
  },
  note: () => 'Начальный объём 10 л. До излома пар ненасыщенный — изотерма PV = const; после излома давление равно давлению насыщенного пара, а масса пара убывает вместе с объёмом.',
});
})();
