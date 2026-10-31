# -*- coding: utf-8 -*-
"""Проверка всех чисел конспекта «Механические колебания» (conspects/physics/07.html).

g = 10 м/с². Периоды проверяются численным интегрированием уравнений движения (РК4) с точными,
а не линеаризованными силами — так видно, что формулы малых колебаний верны при малой амплитуде.
"""
from math import acos, atan2, cos, degrees, hypot, pi, sin, sqrt

ok = 0
g = 10


def check(name, got, want, rel=1e-3):
    global ok
    assert abs(got - want) <= rel * max(1, abs(want)), f'{name}: {got} ≠ {want}'
    ok += 1
    print(f'  ✓ {name}: {got:.6g}')


def period(acc, x0, v0=0.0, h=1e-5):
    """Время между двумя последовательными прохождениями x = 0 в одну сторону."""
    x, v, t, cross = x0, v0, 0.0, []
    while len(cross) < 2:
        k1x, k1v = v, acc(x)
        k2x, k2v = v + h / 2 * k1v, acc(x + h / 2 * k1x)
        k3x, k3v = v + h / 2 * k2v, acc(x + h / 2 * k2x)
        k4x, k4v = v + h * k3v, acc(x + h * k3x)
        xn = x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x)
        vn = v + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)
        if x < 0 <= xn:
            cross.append(t + h * (-x) / (xn - x))
        x, v, t = xn, vn, t + h
    return cross[1] - cross[0]


print('01 Кинематика колебаний')
w, x0, v0 = 5, 0.03, 0.2
A = hypot(x0, v0 / w)
check('1.Р1 амплитуда', A, 0.05)
phi = atan2(-v0 / w, x0)
check('1.Р1 начальная фаза, °', degrees(phi), -53.130)
check('1.Р1 x(0)', A * cos(phi), x0)
check('1.Р1 v(0)', -A * w * sin(phi), v0)
w = pi
check('1.С1 v_max', 0.1 * w, 0.31416)
check('1.С1 a_max', 0.1 * w * w, 0.98696)
check('1.С2 время от A до A/2', 1.2 * acos(0.5) / (2 * pi), 0.2)
n = 200000
avg = sum(abs(sin(2 * pi * (i + 0.5) / n)) for i in range(n)) / n
check('1.С3 средняя скорость / v_max (сумма)', avg, 2 / pi, 1e-6)

print('02 Динамический подход')
check('2.Р1 период', 2 * pi * sqrt(0.1 / g), 0.62832)
# плавающий цилиндр: сила Архимеда минус вес, при погружении на h + x; масса = ρ S h
check('2.Р1 период (моделирование)', period(lambda x: -g * x / 0.1, 0.01), 0.62832, 1e-5)
check('2.С1 период', 2 * pi * sqrt(0.4 / 40), 0.62832)
check('2.С2 период', 2 * pi * sqrt(0.5 / (2 * g)), 0.99346)
check('2.С2 период (моделирование)', period(lambda x: -2 * g * x / 0.5, 0.01), 0.99346, 1e-5)
mu_r = 1 * 3 / 4
check('2.С3 период', 2 * pi * sqrt(mu_r / 300), 0.31416)
# два тела на пружине — моделирование: относительная координата
check('2.С3 период (моделирование)', period(lambda x: -300 * x / mu_r, 0.01), 0.31416, 1e-5)
check('маятник: поправка при 30°', 2 * pi * sqrt(1 / g) * (1 + (pi / 6) ** 2 / 16), 2.0210, 1e-4)
check('маятник 30° (моделирование)', period(lambda th: -g / 1 * sin(th), 0, v0=sqrt(2 * g * 1 * (1 - cos(pi / 6)))), 2.0215, 1e-4)

print('03 Энергетический подход')
check('3.Р1 период обруча', 2 * pi * sqrt(2 * 0.2 / g), 1.2566)
# обруч: E = m v² + m g (R − r)(1 − cos θ), v = (R − r) θ̇ → θ̈ = −g sin θ / (2 (R − r))
check('3.Р1 период (моделирование)', period(lambda th: -g * sin(th) / (2 * 0.2), 0.005), 1.2566, 1e-4)
check('3.С1 период шайбы', 2 * pi * sqrt(0.9 / g), 1.8850)
check('3.С2 период', 2 * pi / sqrt(4 * 25 / 1), 0.62832)
T0, l, m = 50, 0.5, 0.1
check('3.С3 период', 2 * pi / sqrt(2 * T0 / (m * l)), 0.14050)
# точная сила: две половины струны натянуты T0, поперечная составляющая 2 T0 x / √(l² + x²)
check('3.С3 период (моделирование, малая амплитуда)', period(lambda x: -2 * T0 * x / sqrt(l * l + x * x) / m, 0.001), 0.14050, 1e-4)

print(f'\nВсе проверки пройдены: {ok}')
