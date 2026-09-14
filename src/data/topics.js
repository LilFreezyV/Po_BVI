// Презентационные константы для страницы темы — тайлвинд-классы под уровни сложности.
// Сам контент тем (разделы/темы/задачи) теперь приходит из API (см. src/lib/api.js).

export const LEVELS = [
  { id: 'easy', title: 'Лёгкий', hint: 'Разбор идеи и базовая техника', badge: 'bg-brand-50 text-brand-700 border-brand-100' },
  { id: 'medium', title: 'Средний', hint: 'Уровень отборочных этапов', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'hard', title: 'Сложный', hint: 'Заключительные этапы и призовые места', badge: 'bg-clay-50 text-clay-600 border-clay-100' },
]
