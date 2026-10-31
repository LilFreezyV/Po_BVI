# -*- coding: utf-8 -*-
"""Проверка всех чисел конспекта «Динамика» (conspects/physics/03.html).

В задачах g = 10 м/с², если не сказано иное. Где возможно, ответ получен вторым способом:
моделированием (интегрирование уравнений движения), перебором или из другого закона.
"""
from math import atan, hypot, cos, degrees, exp, log, pi, radians, sin, sqrt, tan

ok = 0
g = 10


def check(name, got, want, rel=1e-3):
    global ok
    assert abs(got - want) <= rel * max(1, abs(want)), f'{name}: {got} ≠ {want}'
    ok += 1
    print(f'  ✓ {name}: {got:.6g}')


def solve(A, b):
    """Решение линейной системы методом Гаусса с выбором главного элемента."""
    n = len(b)
    M = [list(map(float, row)) + [float(bi)] for row, bi in zip(A, b)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        for r in range(n):
            if r != i:
                f = M[r][i] / M[i][i]
                M[r] = [x - f * y for x, y in zip(M[r], M[i])]
    return [M[i][n] / M[i][i] for i in range(n)]


def simulate(acc, x0, v0, until, h=1e-5, tmax=100):
    """Интегрирует x'' = acc(x, v) методом РК4, пока until(x, v, t) ложно."""
    x, v, t = x0, v0, 0.0
    while not until(x, v, t) and t < tmax:
        k1x, k1v = v, acc(x, v)
        k2x, k2v = v + h / 2 * k1v, acc(x + h / 2 * k1x, v + h / 2 * k1v)
        k3x, k3v = v + h / 2 * k2v, acc(x + h / 2 * k2x, v + h / 2 * k2v)
        k4x, k4v = v + h * k3v, acc(x + h * k3x, v + h * k3v)
        x += h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x)
        v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)
        t += h
    return x, v, t


print('01 Законы Ньютона')
check('1.Р1 ускорение', 10 / 5, 2)
check('1.Р1 сила между брусками', 3 * 2, 6)
check('1.С1 сила', 5 * 8 / 4, 10)
check('1.С2 горизонтальная сила', 1 * g * tan(radians(30)), 5.7735)
a = g * sin(radians(30))
x, v, t = simulate(lambda x, v: -a, 0, 6, lambda x, v, t: t > 0 and x <= 0)
check('1.С3 время возвращения (моделирование)', t, 2.4, 1e-4)
check('1.С3 путь вверх', 36 / (2 * a), 3.6)

print('02 Тяготение')
check('2.Р1 высота, км', 6400 * (sqrt(4) - 1), 6400)
check('2.С1 v₁ Луны, м/с', sqrt(1.62 * 1.737e6), 1677.5, 2e-3)
GM, T = 3.986e14, 86164
r = (GM * T * T / (4 * pi * pi)) ** (1 / 3)
check('2.С2 радиус ГСО, км', r / 1e3, 42164, 2e-4)
check('2.С2 высота ГСО, км', r / 1e3 - 6371, 35793, 5e-4)
Gc, T = 6.674e-11, 84.4 * 60
check('2.С3 плотность, кг/м³', 3 * pi / (Gc * T * T), 5512, 2e-3)
check('2.С3 кратность периода при r×4', 4 ** 1.5, 8)

print('03 Натяжение')
check('3.Р1 натяжение в середине', 12 * (1 - 0.5), 6)
a = 12 / 6
check('3.С1 T₁₂', (2 + 3) * a, 10)
check('3.С1 T₂₃', 3 * a, 6)
check('3.С2 натяжение в середине', 1 * (g + 2), 12)
m, L, xh = 1, 1, 0.3
a = g * xh / L
check('3.С3 ускорение цепочки', a, 3)
check('3.С3 натяжение на перегибе', m * (L - xh) / L * a, 2.1)
check('3.С3 то же по формуле mg x(L−x)/L²', m * g * xh * (L - xh) / L ** 2, 2.1)

print('04 Вес')
check('4.Р1 вес при разгоне вниз', 60 * (g - 2), 480)
check('4.Р1 вес при разгоне вверх', 60 * (g + 2), 720)
check('4.С2 сила давления на мост', 1000 * (g - 100 / 40), 7500)
check('4.С2 скорость отрыва', sqrt(g * 40), 20)
check('4.С3 ускорение клина', g * tan(radians(30)), 5.7735)
check('4.С3 сила реакции', 1 * g / cos(radians(30)), 11.547)

print('05 Блоки')
check('5.Р1 a', (3 - 2) * g / 5, 2)
check('5.Р1 T', 2 * 3 * 2 * g / 5, 24)
check('5.Р1 сила на ось', 2 * 24, 48)
check('5.С1 a', (6 - 4) * g / 10, 2)
check('5.С1 T', 2 * 4 * 6 * g / 10, 48)
m1, m2 = 4, 1                                   # m1 на подвижном блоке, ось вверх
a1 = (2 * m2 - m1) * g / (m1 + 4 * m2)
check('5.С2 ускорение m₁ (вверх)', a1, -2.5)
check('5.С2 T', m2 * (g + 5), 15)
check('5.С2 уравнение m₁: 2T − m₁g = m₁a₁', 2 * 15 - m1 * g, m1 * a1)
check('5.С3 a в лифте', (3 - 2) * (g + 2) / 5, 2.4)
check('5.С3 T в лифте', 2 * 3 * 2 * (g + 2) / 5, 28.8)

print('06 Сухое трение')
al, mu = radians(30), 0.3
check('6.Р1 a скольжения', g * (sin(al) - mu * cos(al)), 2.4019)
check('6.Р1 трение покоя при μ=0,7', 1 * g * sin(al), 5)
check('6.С1 a при 12 Н', (12 - 0.4 * 20) / 2, 2)
mu, m = 0.75, 2
check('6.С2 F_min', mu * m * g / sqrt(1 + mu * mu), 12)
check('6.С2 угол', degrees(atan(mu)), 36.87)
# перебором угла
best = min((m * mu * g / (cos(radians(b / 100)) + mu * sin(radians(b / 100))), b / 100) for b in range(0, 9000))
check('6.С2 F_min перебором', best[0], 12)
mu = 0.3
a1, a2 = g * (sin(al) + mu * cos(al)), g * (sin(al) - mu * cos(al))
x, v, t1 = simulate(lambda x, v: -a1, 0, 6, lambda x, v, t: v <= 0)
check('6.С3 путь вверх', x, 2.3690, 2e-4)
check('6.С3 время подъёма', t1, 0.78966, 2e-4)
x2, v2, t2 = simulate(lambda x, v: -a2, x, 0, lambda x, v, t: x <= 0)
check('6.С3 время спуска', t2, 1.4044, 2e-4)
check('6.С3 скорость внизу', -v2, 3.3734, 2e-4)

print('07 Сложные задачи на трение')
M, m, mu = 2, 1, 0.5
check('7.Р1 F_max (тянут брусок)', (m + M) * mu * m * g / M, 7.5)
check('7.Р1 a бруска при 10 Н', (10 - mu * m * g) / m, 5)
check('7.Р1 a доски', mu * m * g / M, 2.5)
check('7.С1 F_max (тянут доску)', mu * g * (m + M), 15)
check('7.С2 a доски', (20 - mu * m * g) / M, 7.5)
check('7.С2 время', sqrt(2 * 1.25 / (7.5 - 5)), 1)
check('7.С3 угол заклинивания', degrees(atan(1 / 0.5)), 63.435)
# при угле 64° никакая сила не сдвигает, при 63° — сдвигает большая
for b, moves in ((64, False), (63, True)):
    F = 1e6
    check(f'7.С3 при {b}° сила 10⁶ Н {"сдвигает" if moves else "не сдвигает"}',
          int(F * cos(radians(b)) > 0.5 * (1 * g + F * sin(radians(b)))), int(moves))

print('08 Вязкое трение')
m, v0, k = 200, 2, 50
x, v, t = simulate(lambda x, v: -k * v / m, 0, v0, lambda x, v, t: t >= 200, h=1e-3, tmax=300)
check('8.Р1 путь до остановки (моделирование)', x, 8, 1e-5)
check('8.Р1 время уменьшения вдвое', m / k * log(2), 2.7726)
# 8.С2: подобрать k/m, при котором шарик возвращается со скоростью 8 м/с, и найти время полёта
def flight(km):
    x, v, t = simulate(lambda x, v: -g - km * v, 0, 10, lambda x, v, t: t > 0.01 and x <= 0, h=1e-5)
    return -v, t
lo, hi = 0.0, 1.0
for _ in range(50):
    mid = (lo + hi) / 2
    if flight(mid)[0] > 8: lo = mid
    else: hi = mid
v1, T = flight((lo + hi) / 2)
check('8.С2 скорость падения при подобранном k/m', v1, 8, 1e-4)
check('8.С2 время полёта (моделирование)', T, 1.8, 2e-4)
vu, tau = 20, 20 / g
check('8.С3 время до 10 м/с', tau * log(2), 1.3863)
x, v, t = simulate(lambda x, v: g - v / tau, 0, 0, lambda x, v, t: v >= 10)
check('8.С3 путь (моделирование)', x, 7.7259, 2e-4)

print('09 Нити и блоки')
check('9.Р1 a', 1 * g / 4, 2.5)
check('9.Р1 T', 3 * 1 * g / 4, 7.5)
check('9.С1 a', (1 - 0.2 * 3) * g / 4, 1)
check('9.С1 T', 1 * (g - 1), 9)
check('9.С2 a', (2 - 2 * 0.5) * g / 4, 2.5)
check('9.С2 T', 2 * (g - 2.5), 15)
m, M = 2, 1
am = m * g / (m + 4 * M)
check('9.С3 a груза', am, 3.3333)
check('9.С3 a бруска', 2 * am, 6.6667)
check('9.С3 T', M * 2 * am, 6.6667)
check('9.С3 груз: mg − 2T = m a', m * g - 2 * M * 2 * am, m * am)

print('10 Невесомые тела')
a = 8 / 4
check('10.Р1 сила упругости', 1 * a, 2)
check('10.Р1 удлинение, см', 1 * a / 100 * 100, 2)
check('10.С1 натяжение', 20 / 2, 10)
check('10.С2 a', 10 * cos(radians(30)) / 2, 4.3301)
check('10.С2 N', 2 * g + 10 * sin(radians(30)), 25)
T = 60 / 2
check('10.С3 a₁', T / 1 - g, 20)
check('10.С3 a₂', T / 3 - g, 0)
check('10.С3 a блока', (20 + 0) / 2, 10)

print('11 Клинья')
M, m, al = 3, 1, radians(30)
A = m * g * sin(al) * cos(al) / (M + m * sin(al) ** 2)
check('11.Р1 A клина', A, 1.3323)
N = M * m * g * cos(al) / (M + m * sin(al) ** 2)
check('11.Р1 N', N, 7.9941)
check('11.Р1 N = MA/sin α', M * A / sin(al), N)
# независимо: решаем линейную систему уравнений Ньютона для бруска и клина
# неизвестные: ax, ay (брусок), A (клин, знак +: от бруска), N
s, c = sin(al), cos(al)
# грань поднимается вправо, нормаль к ней (−sin α, cos α). Брусок: m ax = −N s, m ay = N c − m g;
# клин: M A = N s; брусок не отрывается от грани: относительное ускорение вдоль неё, −(ax − A) s + ay c = 0
Mtx = ([[m, 0, 0, s], [0, m, 0, -c], [0, 0, M, -s], [-s, c, s, 0]])
sol = solve(Mtx, [0, -m * g, 0, 0])
check('11.Р1 A из системы уравнений', abs(sol[2]), A)
check('11.Р1 N из системы уравнений', sol[3], N)
check('11.С1 a', g * sin(radians(45)), 7.0711)
check('11.С1 N', 1 * g * cos(radians(45)), 7.0711)
arel = (M + m) * g * sin(al) / (M + m * sin(al) ** 2)
check('11.С2 a_отн', arel, 6.1538)
check('11.С2 a_отн из системы', hypot(sol[0] - sol[2], sol[1]), arel)
check('11.С3 F', (M + m) * g * tan(al), 23.094)

print('12 Связи с трением')
m1, mu = 2, 0.2
fmax = mu * m1 * g * cos(al)
check('12.Р1 a', (15 - m1 * g * sin(al) - fmax) / 3.5, 0.43887)
check('12.Р1 T', 1.5 * (g - 0.43887), 14.342)
check('12.С1 трение покоя', 12 - m1 * g * sin(al), 2)
check('12.С1 условие покоя', int(m1 * g * sin(al) - fmax < 12 < m1 * g * sin(al) + fmax), 1)
check('12.С2 отн. ускорение', 0.3 * g - 4, -1)
lo = g * (sin(al) - mu * cos(al)) / (cos(al) + mu * sin(al))
hi = g * (sin(al) + mu * cos(al)) / (cos(al) - mu * sin(al))
check('12.С3 a_min', lo, 3.3828)
check('12.С3 a_max', hi, 8.7880)
# проверка: в НеИСО клина сумма сил вдоль грани при a_min и a_max — ровно на пределе трения
for a, sign in ((lo, 1), (hi, -1)):
    along = g * sin(al) - a * cos(al)          # вниз по грани, без трения
    Nn = g * cos(al) + a * sin(al)
    check(f'12.С3 на пределе при a = {a:.3f}', abs(along), mu * Nn)

print('13 Практикум')
check('13.Р1 ускорение каждого', 2 / 2, 1)
check('13.Р1 T', 10 * (g + 1), 110)
check('13.С1 T', 1 * (g + 2), 12)
check('13.С2 показание', 2 * 2 * 1 * 3 * g / 4, 30)
check('13.С2 ускорение центра масс', (3 * 5 - 1 * 5) / 4, 2.5)
check('13.С2 вес минус показание = M a_c', 40 - 30, 4 * 2.5)
check('13.С3 a человека', g * sin(al) * (20 + 60) / 60, 6.6667)

print('14 Окружность')
L = 1
check('14.Р1 v верх', sqrt(g * L), 3.1623)
check('14.Р1 v низ', sqrt(5 * g * L), 7.0711)
check('14.Р1 T низ / mg', (5 * g * L / L + g) / g, 6)
check('14.С1 ω', sqrt(g / (0.5 * cos(radians(60)))), 6.3246)
check('14.С1 T', 1 * g / cos(radians(60)), 20)
check('14.С2 v низ (стержень)', sqrt(4 * g * L), 6.3246)
R = 0.6
# шайба на полусфере: моделирование по углу, отрыв при N = 0
th, w, h = 1e-6, 0.0, 1e-6
while True:
    w += g / R * sin(th) * h
    th += w * h
    if g * cos(th) - R * w * w <= 0:
        break
check('14.С3 cos угла отрыва (моделирование)', cos(th), 2 / 3, 2e-3)
check('14.С3 высота над центром', R * 2 / 3, 0.4)
check('14.С3 скорость', sqrt(2 * g * R / 3), 2)

print('15 НеИСО')
check('15.Р1 угол', degrees(atan(3 / g)), 16.699)
check('15.Р1 натяжение', sqrt(g * g + 9), 10.440)
check('15.С1 вес', 70 * (g + 20), 2100)
check('15.С2 a_отн', g * sin(al) - 2 * cos(al), 3.2679)
check('15.С2 N', 1 * (g * cos(al) + 2 * sin(al)), 9.6603)
check('15.С3 период', 2 * pi * sqrt(1 / (g * cos(al))), 2.1351)

print('16 Центр масс: теорема')
check('16.Р1 сдвиг лодки', 60 * 3 / 180, 1)
check('16.С1 от лёгкого', 3 * 4 / 4, 3)
check('16.С2 второй осколок', 2 * 1000 - 500, 1500)
check('16.С3 сдвиг клина', 1 * cos(al) / 4, 0.21651)

print('17 Вычисление центра масс')
x = (4 * 0.5 - 1 * 0.75) / 3
check('17.Р1 координата', x, 0.41667)
check('17.Р1 смещение по диагонали', sqrt(2) * (0.5 - x), 0.11785)
check('17.С1', sqrt(2) / 4, 0.35355)
# полукольцо и полудиск — численным суммированием
n = 200000
ring = sum(sin(pi * (i + 0.5) / n) for i in range(n)) / n * 0.3
check('17.С2 полукольцо (сумма)', ring, 2 * 0.3 / pi, 1e-6)
check('17.С2 полукольцо', 2 * 0.3 / pi, 0.19099)
disk = sum((0.3 * (i + 0.5) / n) ** 2 for i in range(n)) * 2 / pi / (0.3 ** 2 / 2) * (0.3 / n)
check('17.С3 полудиск (сумма тонких полуколец)', disk, 4 * 0.3 / (3 * pi), 1e-5)
check('17.С3 полудиск', 4 * 0.3 / (3 * pi), 0.12732)

print(f'\nВсе проверки пройдены: {ok}')
