// Презентационные константы для страницы темы — тайлвинд-классы под уровни сложности.
// Сам контент тем (разделы/темы/задачи) теперь приходит из API (см. src/lib/api.js).

export const LEVELS = [
  { id: 'easy', title: 'Лёгкий', hint: 'Разбор идеи и базовая техника', badge: 'bg-pen-50 text-pen-700 border-pen-100' },
  { id: 'medium', title: 'Средний', hint: 'Уровень отборочных этапов', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'hard', title: 'Сложный', hint: 'Заключительные этапы и призовые места', badge: 'bg-mark-50 text-mark-600 border-mark-100' },
]
