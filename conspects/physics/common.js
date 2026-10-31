/* Общие помощники для моделей всех тем по физике.
   Сборщик вставляет этот файл перед моделями темы (physics/NN.js), так что всё ниже видно
   внутри них. Постоянные — по CODATA; g здесь не постоянная CODATA, а принятое в моделях
   значение ускорения свободного падения у поверхности Земли. */
const G = 9.81;
// Поля движка (Fig): t, done, playing, visible, p, m, g, tbl, note, drag, rng — своим состоянием их не занимать.
const F = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n).replace('.', ',').replace('-', '−') : '—');
const pct = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12) * 100;
// строка сверки: величина, численно, «теория (N): …; расхождение …», укладывается ли в допуск
const cmp = (name, num, th, unit, ref, tol = 0.1) => [
  name, `${F(num, 3)} ${unit}`, `(${ref}): ${F(th, 3)} ${unit}; расхождение ${F(pct(num, th), 3)} %`, pct(num, th) <= tol];

// Момент, когда fn(t) обращается в ноль внутри шага [a, b], — бисекцией до машинной точности.
// Линейная интерполяция для квадратичных законов давала ошибку на коротких полётах.
function root(fn, a, b) { let fa = fn(a); for (let i = 0; i < 60; i++) { const m = (a + b) / 2, fm = fn(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; }

// Легенда с переносом строк: у D.legend одна строка, и на телефоне она обрезается.
// Возвращает y последней строки — чтобы ниже не налезали подписи.
function legend(ctx, x, y, items, w, C) {
  let cx = x, cy = y;
  D.font(ctx, 11);
  items.forEach(it => {
    const wd = 30 + ctx.measureText(it.label).width;
    if (cx > x && cx + wd > w - 8) { cx = x; cy += 16; }
    D.line(ctx, cx, cy - 4, cx + 16, cy - 4, it.color, 2.5, it.dash);
    D.text(ctx, it.label, cx + 21, cy, C.fg, 11);
    cx += wd;
  });
  return cy;
}

// масштабная линейка: подбирает «круглую» длину 1·2·5·10ᵏ метров
function scaleBar(ctx, x, y, pxPerM, C, maxPx = 110) {
  const raw = maxPx / pxPerM, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = [5, 2, 1].map(k => k * p).find(v => v <= raw) || p;
  const L = m * pxPerM;
  D.line(ctx, x, y, x + L, y, C.fg, 1.5);
  D.line(ctx, x, y - 4, x, y + 4, C.fg, 1.5); D.line(ctx, x + L, y - 4, x + L, y + 4, C.fg, 1.5);
  D.text(ctx, `${F(m, m < 1 ? 2 : 0)} м`, x + L / 2, y - 7, C.fg, 11, 'center');
}
