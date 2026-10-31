# -*- coding: utf-8 -*-
"""Проверка всех чисел конспекта «Электромагнитные колебания» (conspects/physics/13.html).

Каждый контур дополнительно моделируется: уравнения Кирхгофа интегрируются методом РК4.
"""
from math import acos, exp, log, pi, sqrt

ok = 0


def check(name, got, want, rel=1e-3):
    global ok
    assert abs(got - want) <= rel * max(1e-30, abs(want)), f'{name}: {got} ≠ {want}'
    ok += 1
    print(f'  ✓ {name}: {got:.6g}')


def rk4(state, rhs, h):
    k1 = rhs(state); s2 = [x + h / 2 * k for x, k in zip(state, k1)]
    k2 = rhs(s2); s3 = [x + h / 2 * k for x, k in zip(state, k2)]
    k3 = rhs(s3); s4 = [x + h * k for x, k in zip(state, k3)]
    k4 = rhs(s4)
    return [x + h / 6 * (a + 2 * b + 2 * c + d) for x, a, b, c, d in zip(state, k1, k2, k3, k4)]


print('01 LC-контур')
L, C = 0.1, 1e-5
check('1.Р1 ω', 1 / sqrt(L * C), 1000)
check('1.Р1 период, мс', 2 * pi * sqrt(L * C) * 1e3, 6.2832)
check('1.Р1 наибольший ток', 100 * sqrt(C / L), 1)
# моделирование: q' = I, I' = −q/(LC)
s, h, Imax, t, cross = [C * 100, 0.0], 1e-6, 0.0, 0.0, []
for _ in range(20000):
    n = rk4(s, lambda z: [z[1], -z[0] / (L * C)], h)
    if s[0] > 0 >= n[0]: cross.append(t + h * s[0] / (s[0] - n[0]))
    s = n; t += h; Imax = max(Imax, abs(s[1]))
check('1.Р1 наибольший ток (моделирование)', Imax, 1, 1e-5)
check('1.Р1 период (моделирование), мс', (cross[1] - cross[0]) * 1e3, 6.2832, 1e-4)
check('1.С1 период, мкс', 2 * pi * sqrt(1e-3 * 1e-9) * 1e6, 6.2832)
check('1.С1 частота, кГц', 1 / (2 * pi * sqrt(1e-12)) / 1e3, 159.15)
check('1.С2 ток при U = U₀/2', sqrt(1 - 0.25), 0.86603)
check('1.С3 наибольшее напряжение', 1 * sqrt(L / C), 100)
check('1.С3 время, мс', 2 * pi * sqrt(L * C) / 4 * 1e3, 1.5708)

print('02 Контуры с ключами')
C1, C2 = 1e-5, 1e-5
Cs = C1 * C2 / (C1 + C2)
check('2.Р1 наибольший ток', sqrt(2 * (C1 * 1e4 / 2 - (C1 + C2) * 50 ** 2 / 2) / L), 0.70711)
check('2.Р1 период, мс', 2 * pi * sqrt(L * Cs) * 1e3, 4.4429)
check('2.С1 ω', 1 / sqrt(L * Cs), 1414.2)


def two_caps(C1, C2, U0=100, steps=40000, h=2e-7):
    """q1 — заряд C1, I — ток катушки от C1 к C2: L I' = q1/C1 − q2/C2, q2 = Q − q1."""
    Q = C1 * U0; s = [Q, 0.0]; U2max = Imax = 0.0
    for _ in range(steps):
        s = rk4(s, lambda z: [-z[1], (z[0] / C1 - (Q - z[0]) / C2) / L], h)
        U2max = max(U2max, (Q - s[0]) / C2); Imax = max(Imax, abs(s[1]))
    return U2max, Imax


U2, Im = two_caps(1e-5, 1e-5)
check('2.С2 наибольшее напряжение C₂ (моделирование)', U2, 100, 1e-4)
check('2.Р1 наибольший ток (моделирование)', Im, 0.70711, 1e-4)
U2, Im = two_caps(1e-5, 2e-5)
check('2.С3 наибольшее напряжение C₂ (моделирование)', U2, 2 * 100 / 3, 1e-4)
check('2.С3 наибольший ток (моделирование)', Im, sqrt(2 * (1e-5 * 1e4 / 2 - 3e-5 * (100 / 3) ** 2 / 2) / L), 1e-4)
check('2.С3 наибольший ток', sqrt(2 * (0.05 - 3e-5 * (100 / 3) ** 2 / 2) / 0.1), 0.81650)

print('03 Затухающие колебания')
R = 10
b = R / (2 * L)
check('3.Р1 β', b, 50)
check('3.Р1 ω', sqrt(1e6 - b * b), 998.75)
check('3.Р1 добротность', 1000 * L / R, 10)
check('3.Р1 время уменьшения амплитуды вдвое, мс', log(2) / b * 1e3, 13.863)
# моделирование RLC: огибающая по пикам заряда
s, t, peaks = [C * 100, 0.0], 0.0, []
prev = None
for _ in range(60000):
    n = rk4(s, lambda z: [z[1], -z[0] / (L * C) - R / L * z[1]], 1e-6)
    if prev is not None and s[0] > prev and s[0] > n[0] and s[0] > 0: peaks.append((t, s[0]))
    prev = s[0]; s = n; t += 1e-6
check('3.Р1 отношение соседних максимумов', peaks[1][1] / peaks[0][1], exp(-b * 2 * pi / sqrt(1e6 - b * b)), 1e-4)
check('3.С1 критическое сопротивление', 2 * sqrt(L / C), 200)
T1 = 2 * pi / sqrt(1e6 - 25)
check('3.С2 доля потерь за период при R = 1 Ом', 1 - exp(-2 * 5 * T1), 0.060878)
check('3.С3 число колебаний до спада в e раз', sqrt(1e6 - b * b) / (2 * pi * b), 3.1791)

print(f'\nВсе проверки пройдены: {ok}')
