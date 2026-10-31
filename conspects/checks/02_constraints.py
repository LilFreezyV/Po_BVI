# -*- coding: utf-8 -*-
"""Проверка всех чисел конспекта «Кинематические связи» (conspects/physics/02.html).

Каждая величина считается вторым способом: численным дифференцированием геометрической
связи, моделированием или прямым подсчётом по координатам.
"""
from math import cos, hypot, pi, radians, sin, sqrt

ok = 0


def check(name, got, want, rel=1e-3):
    global ok
    assert abs(got - want) <= rel * max(1, abs(want)), f'{name}: {got} ≠ {want}'
    ok += 1
    print(f'  ✓ {name}: {got:.6g}')


def deriv(f, t, h=1e-6):
    return (f(t + h) - f(t - h)) / (2 * h)


print('01 Простые связи')
h, u = 6, 1.0
# лодка: длина верёвки l(t) = 10 - u t; x(t) = sqrt(l² - h²); в момент t = 0 x = 8
x_of_t = lambda t: sqrt((10 - u * t) ** 2 - h * h)      # noqa: E731
check('1.Р1 скорость лодки (численно), м/с', -deriv(x_of_t, 0), 1.25)
check('1.Р1 u/cos α', u / (8 / 10), 1.25)
check('1.С1 скорость груза, м/с', 0.4 / 2, 0.2)
check('1.С2 скорость второго груза, м/с', 2 * 2 - (-1), 5)
x = h / sqrt(3)
check('1.С3 расстояние, м', x, 3.46410)
check('1.С3 cos α = 1/2', x / hypot(x, h), 0.5)
t0 = 10 - hypot(x, h)                                     # момент, когда x = h/√3
check('1.С3 скорость вдвое больше (численно)', -deriv(x_of_t, t0), 2 * u)
a_num = -(x_of_t(t0 + 1e-4) - 2 * x_of_t(t0) + x_of_t(t0 - 1e-4)) / 1e-8
check('1.С3 ускорение (численно), м/с²', a_num, u * u * h * h / x ** 3)
check('1.С3 ускорение, м/с²', u * u * h * h / x ** 3, 0.866025)

print('02 Качение')
R, vc = 0.5, 10
w = vc / R
# точка обода на высоте 0.75 м: угол от верхней точки theta, cos theta = 0.5
th = radians(60)
px, py = R * sin(th), R * cos(th)                        # относительно центра
vx, vy = vc + w * py, -w * px                            # v = v_c + ω × r (ω по часовой)
check('2.Р1 скорость точки, м/с', hypot(vx, vy), 17.3205)
check('2.Р1 v_c √(2h/R)', vc * sqrt(2 * 0.75 / R), 17.3205)
check('2.С1 верх, м/с', 2 * 20, 40)
check('2.С2 нить снизу оси, см/с', 2 * 5 / (5 - 3), 5)
check('2.С2 нить сверху оси, см/с', 2 * 5 / (5 + 3), 1.25)
# 2.С3: путь точки обода за оборот — численно по циклоиде
R3, n = 0.3, 200000
path, prev = 0.0, (0.0, 0.0)
for i in range(1, n + 1):
    ph = 2 * pi * i / n
    p = (R3 * (ph - sin(ph)), R3 * (1 - cos(ph)))
    path += hypot(p[0] - prev[0], p[1] - prev[1])
    prev = p
check('2.С3 путь точки обода, м', path, 8 * R3)
check('2.С3 путь центра, м', 2 * pi * R3, 1.88496)
# 2.С4 («Курчатов» 2024): ось вверх V0, лента слева (x = −r), ω = V0/r против часовой
r4, R4, V0 = 16, 31, 1.0
w4 = V0 / r4
vel = lambda x, y: (-w4 * y, V0 + w4 * x)                # noqa: E731  v = V0·ŷ + ω×r, ω = w4·ẑ
check('2.С4 точка схода ленты покоится', hypot(*vel(-r4, 0)), 0)
check('2.С4 V_B/V_C', hypot(*vel(-R4, 0)) / hypot(*vel(0, R4)), 0.429983)

print('03 Палочка')
L, u = 5, 0.6
y_of_x = lambda x: sqrt(L * L - x * x)                    # noqa: E731
# x(t) = 3 + u t
yt = lambda t: y_of_x(3 + u * t)                          # noqa: E731
check('3.Р1 скорость верха (численно), м/с', -deriv(yt, 0), 0.45)
mid = lambda t: ((3 + u * t) / 2, yt(t) / 2)              # noqa: E731
vm = hypot(deriv(lambda t: mid(t)[0], 0), deriv(lambda t: mid(t)[1], 0))
check('3.Р1 скорость середины (численно), м/с', vm, 0.375)
check('3.Р1 u/(2 sin φ)', u / (2 * 0.8), 0.375)
yt4 = lambda t: y_of_x(4 + u * t)                         # noqa: E731
check('3.С1 скорость верха при x=4, м/с', -deriv(yt4, 0), 0.8)
check('3.С2 скорость середины при 45°, м/с', u / (2 * sin(radians(45))), 0.424264)
acc = -(yt(1e-4) - 2 * yt(0) + yt(-1e-4)) / 1e-8
check('3.С3 ускорение верха (численно), м/с²', acc, u * u * L * L / 4 ** 3)
check('3.С3 ускорение, м/с²', u * u * L * L / 64, 0.140625)

print('04 Шарниры')
# 4.Р1: B = (L cos φ, L sin φ), C = (2L cos φ, 0); C движется со скоростью u
for phi_deg, want in ((30, 1.0), (60, 0.577350)):
    Lr, uu = 1.0, 1.0
    phi = radians(phi_deg)
    dphi = -uu / (2 * Lr * sin(phi))
    vb = Lr * abs(dphi)
    check(f'4.Р1 v_B при {phi_deg}°, м/с', vb, want)
check('4.С1 скорость ползуна, м/с', 10 * 0.2, 2)
r, w, l = 0.1, 20, 0.3
xb = lambda th: r * cos(th) + sqrt(l * l - (r * sin(th)) ** 2)   # noqa: E731  координата ползуна
th = radians(60)
check('4.С3 скорость ползуна при 60° (численно), м/с', abs(w * deriv(xb, th)), 2.03362)
formula = w * r * sin(th) * (1 + r * cos(th) / sqrt(l * l - (r * sin(th)) ** 2))
check('4.С3 по формуле', formula, 2.03362)
th = radians(90)
a_num = w * w * (xb(th + 1e-4) - 2 * xb(th) + xb(th - 1e-4)) / 1e-8  # при ω = const: ẍ = ω² x''(θ)
check('4.С2 ускорение ползуна при 90° (численно), м/с²', abs(a_num), 14.1421)
check('4.С2 ω²r²/√(ℓ²−r²)', w * w * r * r / sqrt(l * l - r * r), 14.1421)
check('4.С2 ускорение направлено от O (x растёт)', 1 if a_num > 0 else 0, 1)

print('05 Практикум')
V, al = 2, radians(30)
check('5.Р1 скорость стержня, м/с', V * sin(al) / cos(al), 1.15470)
check('5.Р1 относительно клина, м/с', V / cos(al), 2.30940)
check('5.С1, м/с', 1 * 1, 1)
check('5.С2 скорость груза, м/с', 2 * cos(radians(60)), 1)
v1, v2, R = 4, -2, 0.1
check('5.С3 скорость центра, м/с', (v1 + v2) / 2, 1)
wq = (v1 - v2) / (2 * R)
check('5.С3 угловая скорость, рад/с', wq, 30)
check('5.С3 МЦС над нижней точкой, м', v1 / wq, 0.133333)

print(f'\nВсе проверки пройдены: {ok}')
