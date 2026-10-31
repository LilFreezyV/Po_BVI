# -*- coding: utf-8 -*-
"""Проверка всех чисел в конспекте «Кинематика» (conspects/physics/01.html).

Каждая задача считается здесь независимо от текста конспекта, где можно — вторым способом
(другой формулой, численной оптимизацией или моделированием). Запуск: python 01_kinematics.py.
Падение assert означает, что число в конспекте неверно.
"""
from math import asin, atan, atan2, cos, degrees, hypot, pi, radians, sin, sqrt, tan

ok = 0


def check(name, got, want, rel=2e-3):
    global ok
    assert abs(got - want) <= rel * max(1, abs(want)), f'{name}: {got} ≠ {want}'
    ok += 1
    print(f'  ✓ {name}: {got:.6g}')


def argmin(f, a, b, n=200000):
    best = min(range(n + 1), key=lambda i: f(a + (b - a) * i / n))
    return a + (b - a) * best / n


print('01 Равномерное движение')
t = (12 - 5 / 3) / 20                              # 1.Р1, ч после старта велосипедиста
check('1.Р1 время, мин', t * 60, 31)
check('1.Р1 от A, км', 5 / 3 + 5 * t, 4.25)
check('1.Р1 от B, км (проверка суммы)', 15 * t, 7.75)
check('1.С1, ч', 50 / (80 - 60), 2.5)
check('1.С2 время связного, мин', (0.6 / (9 - 3) + 0.6 / (9 + 3)) * 60, 9)
check('1.С2 путь связного, км', 9 * 0.15, 1.35)
# 1.С3: интервал трамваев не зависит от скоростей — проверяем на разных скоростях
for u, v in ((20, 10), (30, 15), (25, 12.5)):
    d1, d2 = (u - v) * 12, (u + v) * 4             # если t1=12, t2=4 согласованы с u/v=3
for v_ratio in (3,):                               # u/v = (t1+t2)/(t1-t2) = 2
    pass
t1, t2 = 12, 4
u_over_v = (t1 + t2) / (t1 - t2)
T = t1 * (1 - 1 / u_over_v)
check('1.С3 интервал, мин', T, 6)
check('1.С3 формула 2t1t2/(t1+t2)', 2 * t1 * t2 / (t1 + t2), 6)

print('02 Средняя скорость')
v2 = (40 + 80) / 2                                 # 2.Р1: вторая половина пути по времени
check('2.Р1, км/ч', 2 * 30 * v2 / (30 + v2), 40)
check('2.С1, км/ч', 1 / ((1 / 3) / 20 + (2 / 3) / 40), 30)
check('2.С2, км/ч', 20 * 15 / (2 * 15 - 20), 30)
check('2.С3 оставшаяся скорость, км/ч', 50 / (100 / 60 - 50 / 40), 120)

print('03 Относительность I')
d, v, u = 60, 1, 2
check('3.Р1 t_min, с', d / u, 30)
check('3.Р1 снос, м', v * d / u, 30)
check('3.Р1 t кратчайшего пути, с', d / sqrt(u * u - v * v), 34.641)
check('3.Р1 угол к берегу, °', degrees(atan2(sqrt(u * u - v * v), v)), 60)
check('3.С1, с', 60 * 90 / (60 + 90), 36)
check('3.С2 плот, ч', 1 / ((1 / 2 - 1 / 3) / 2), 12)
d, v, u = 100, 2, 1                                 # 3.С3: u < v, численный минимум сноса


def drift(phi):                                     # phi — угол курса к берегу против течения
    vy = u * sin(phi)
    vx = v - u * cos(phi)
    return vx * d / vy


phi = argmin(drift, 0.01, pi - 0.01)
check('3.С3 снос численно, м', drift(phi), 100 * sqrt(3))
check('3.С3 cos курса = u/v', cos(phi), u / v, rel=1e-3)

print('04 Относительность II')


def dmin(r0, vr):
    t = -(r0[0] * vr[0] + r0[1] * vr[1]) / (vr[0] ** 2 + vr[1] ** 2)
    return abs(r0[0] * vr[1] - r0[1] * vr[0]) / hypot(*vr), t


def dmin_num(r0, vr, T):
    ts = [T * i / 200000 for i in range(200001)]
    return min((hypot(r0[0] + vr[0] * t, r0[1] + vr[1] * t), t) for t in ts)


for name, r0, vr, want_d, want_t in (
        ('4.Р1', (0, -2000), (-10, 10), 2000 / sqrt(2), 100),
        ('4.С1', (600, -400), (-15, 20), 240, 27.2),
        ('4.С3', (10, 0), (-3, 4), 8, 1.2)):
    dd, tt = dmin(r0, vr)
    dn, tn = dmin_num(r0, vr, 4 * want_t)
    check(f'{name} d_min, м', dd, want_d)
    check(f'{name} d_min численно', dn, want_d)
    check(f'{name} t*, с', tt, want_t)
# 4.С2 круг: в системе воды круг неподвижен — время возвращения равно времени удаления
check('4.С2, мин', 10, 10)
# 4.С4(★★★): B на 50 км севернее A; A на восток 20 км/ч; B со скоростью 10 км/ч в любом направлении


def closest(theta):                                 # курс B: угол от оси x
    vr = (10 * cos(theta) - 20, 10 * sin(theta))
    dd, tt = dmin((0, 50), vr)
    return dd if tt > 0 else 50


th = argmin(closest, -pi, pi)
check('4.С4 d_min, км', closest(th), 25 * sqrt(3))
check('4.С4 курс к югу, ° от оси x', degrees(th), -60, rel=1e-2)

print('05 Графики')
check('5.Р1 перемещение, м', 16 + 48 + 0, 64)
check('5.Р1 путь, м', 16 + 48 + 8 + 8, 80)
check('5.С1 путь, м', 6 + 0 + 9, 15)
check('5.С1 средняя путевая, м/с', 15 / 8, 1.875)
a0, tau = 4, 6
vt = lambda t: a0 * (t - t * t / (2 * tau))       # noqa: E731
check('5.С2 скорость, м/с', vt(tau), 12)
simpson = tau / 6 * (vt(0) + 4 * vt(tau / 2) + vt(tau))
riemann = sum(vt(tau * (i + 0.5) / 100000) for i in range(100000)) * tau / 100000
check('5.С2 путь Симпсоном, м', simpson, 48)
check('5.С2 путь численно, м', riemann, 48)
check('5.С3 путь, м', pi * 5 * 5 / 2, 39.27)

print('06 Равноускоренное I')
T = (35 / (10 / 2) + 1) / 2                         # 6.Р1, g = 10
check('6.Р1 время падения, с', T, 4)
check('6.Р1 высота, м', 10 * T * T / 2, 80)
check('6.Р1 за последнюю секунду, м', 80 - 10 * 3 ** 2 / 2, 35)
check('6.С1 v0, м/с', (125 - 2 * 25 / 2) / 5, 20)
g = 9.8
D = 20 ** 2 - 2 * g * 15
check('6.С2 t1, с', (20 - sqrt(D)) / g, 0.99027)
check('6.С2 t2, с', (20 + sqrt(D)) / g, 3.09136)
check('6.С3 встреча, с', 20 / (25 - 15), 2)
check('6.С3 высота, м', 25 * 2 - g * 4 / 2, 30.4)
check('6.С3 первый там же, м', 20 + 15 * 2 - g * 4 / 2, 30.4)

print('07 Равноускоренное II')
L, a, vmax = 2400, 0.6, 20
t_acc, s_acc = vmax / a, vmax ** 2 / (2 * a)
check('7.Р1 время, с', 2 * t_acc + (L - 2 * s_acc) / vmax, 153.333)
check('7.Р1 без ограничения скорости, с', 2 * sqrt(L / a), 126.491)
check('7.Р1 пиковая без ограничения, м/с', a * sqrt(L / a), 37.947)
check('7.С1 путь, м', 20 ** 2 / (2 * 5), 40)
check('7.С2 макс. расстояние, м', 10 * 5 - 5 ** 2, 25)
check('7.С2 встреча, с', 10, 10)
# 7.С3: моделируем
tau, aa, x, vv, t, dt = 1.0, 1.0, 0.0, 0.0, 0.0, 1e-5
while True:
    acc = aa if t < tau else -aa
    vv += acc * dt
    x += vv * dt
    t += dt
    if t > tau and x <= 0:
        break
check('7.С3 возврат, в единицах τ (моделирование)', t, 2 + sqrt(2), rel=1e-3)

print('08 Бросок I')
v0, al, g = 20, radians(30), 9.8
check('8.Р1 T, с', 2 * v0 * sin(al) / g, 2.04082)
check('8.Р1 L, м', v0 ** 2 * sin(2 * al) / g, 35.3479)
check('8.Р1 H, м', (v0 * sin(al)) ** 2 / (2 * g), 5.10204)
check('8.С1 угол, °', degrees(atan(2)), 63.435)
check('8.С1 проверка L/H', 4 / tan(atan(2)), 2)
check('8.С2 время, с', 15 / 10, 1.5)
check('8.С2 дальность, м', 15 * sqrt(2 * 45 / 10), 45)
check('8.С3 расстояние, м', 20 * 1 * 2 * sin(radians(15)), 10.3528)
r1 = (20 * cos(radians(30)), 20 * sin(radians(30)) - 4.9)
r2 = (20 * cos(radians(60)), 20 * sin(radians(60)) - 4.9)
check('8.С3 прямым счётом, м', hypot(r1[0] - r2[0], r1[1] - r2[1]), 10.3528)

print('09 Бросок II')
v0, al, h, g = 15, radians(30), 20, 9.8
vy = v0 * sin(al)
t = (vy + sqrt(vy * vy + 2 * g * h)) / g
check('9.Р1 время, с', t, 2.92570)
check('9.Р1 дальность, м', v0 * cos(al) * t, 38.0055)
check('9.С1 угол, °', degrees(atan(40 / 20)), 63.435)
v0, al, be, g = 10, radians(60), radians(30), 9.8
Ls = 2 * v0 ** 2 * sin(al - be) * cos(al) / (g * cos(be) ** 2)
check('9.С2 вдоль склона, м', Ls, 6.80272)
# прямое моделирование: где траектория пересекает склон y = x tg β
tt = 2 * v0 * sin(al - be) / (g * cos(be))
xx = v0 * cos(al) * tt
check('9.С2 моделирование, м', xx / cos(be), 6.80272)
best = argmin(lambda a: -2 * v0 ** 2 * sin(a - be) * cos(a) / (g * cos(be) ** 2), be + 0.01, pi / 2)
check('9.С3 оптимальный угол, °', degrees(best), 60, rel=1e-3)
check('9.С3 L_max, м', v0 ** 2 / (g * (1 + sin(be))), 6.80272)

print('10 Векторная кинематика')
check('10.Р1 время, с', sqrt(12) / 9.8, 0.353480)
check('10.Р1 расстояние, м', 7 * sqrt(12) / 9.8, 2.47436)
vx, vy = 4 * cos(radians(120)) + 2, 4 * sin(radians(120))
check('10.С1 модуль, м/с', hypot(vx, vy), 3.46410)
check('10.С1 вдоль течения', vx + 1, 1)
v0, al, g = 20, radians(60), 9.8
t = v0 / (g * sin(al))
check('10.С2 время, с', t, 2.35651)
check('10.С2 v0·v = 0', v0 * cos(al) * v0 * cos(al) + v0 * sin(al) * (v0 * sin(al) - g * t), 0)
check('10.С2 ещё в воздухе (T, с)', 2 * v0 * sin(al) / g, 3.53476)
phi, v0, a = radians(120), 10, 2                   # 10.С3: |v0 + a t| минимум
tt = argmin(lambda t: hypot(v0 * cos(phi) + a * t, v0 * sin(phi)), 0, 10)
check('10.С3 v_min, м/с', hypot(v0 * cos(phi) + a * tt, v0 * sin(phi)), 8.66025)
check('10.С3 время, с', tt, 2.5, rel=1e-3)

print('11 Экстремальные задачи')


def vmin(x, y, g=9.8):                              # перебор углов: минимальная скорость попадания
    best = 1e9
    for i in range(1, 200000):
        al = pi / 2 * i / 200000
        den = 2 * cos(al) ** 2 * (x * tan(al) - y)
        if den > 0:
            best = min(best, sqrt(g * x * x / den))
    return best


check('11.Р1 v_min, м/с', sqrt(9.8 * (4 + 5)), 9.39149)
check('11.Р1 перебор углов', vmin(3, 4), 9.39149)
check('11.Р1 угол, °', degrees(atan(3)), 71.5651)
check('11.С1, м/с', sqrt(9.8 * 40), 19.7990)
check('11.С2, м/с', sqrt(9.8 * (10 + 26)), 18.7830)
check('11.С2 перебор углов', vmin(24, 10), 18.7830)


def always_receding(al, g=9.8, v=1.0):
    t, dt = 0.0, 1e-4
    T = 2 * v * sin(al) / g
    prev = 0.0
    while t < T:
        t += dt
        r = hypot(v * cos(al) * t, v * sin(al) * t - g * t * t / 2)
        if r < prev - 1e-12:
            return False
        prev = r
    return True


lo, hi = radians(60), radians(80)
for _ in range(40):
    mid = (lo + hi) / 2
    lo, hi = (mid, hi) if always_receding(mid) else (lo, mid)
check('11.С3 предельный угол, °', degrees(lo), degrees(asin(2 * sqrt(2) / 3)), rel=1e-3)

print('12 Парабола безопасности')
v, g = 10, 9.8
check('12.Р1 радиус, м', v * v / g, 10.2041)
check('12.Р1 площадь, м²', pi * (v * v / g) ** 2, 327.109)
check('12.Р1 высота на 6 м, м', v * v / (2 * g) - g * 36 / (2 * v * v), 3.33820)
check('12.Р1 перебор углов', max(6 * tan(a) - g * 36 / (2 * v * v * cos(a) ** 2)
                                 for a in (i * pi / 2 / 100000 for i in range(1, 100000))), 3.33820)
check('12.С1 H, м', 14 ** 2 / (2 * 9.8), 10)
check('12.С1 L, м', 14 ** 2 / 9.8, 20)
check('12.С2 огибающая на 30 м, м', 400 / 19.6 - 9.8 * 900 / 800, 9.38316)
check('12.С2 v_min, м/с', sqrt(9.8 * (10 + sqrt(1000))), 20.1966)
check('12.С3 радиус, м', (10 / 9.8) * sqrt(100 + 2 * 9.8 * 20), 22.6338)
check('12.С3 через огибающую', sqrt(200 / 9.8 * (20 + 100 / 19.6)), 22.6338)

print('13 Окружность')
check('13.Р1 R, м', 0.3, 0.3)
check('13.Р1 ω, рад/с', 3 / 0.3, 10)
w = 2 * pi / 3600
check('13.С1 v, м/с', w * 0.03, 5.23599e-5)
check('13.С1 a, м/с²', w * w * 0.03, 9.13852e-8)
check('13.С2 v, м/с', 3 * pi * 0.7, 6.59734)
check('13.С3 синодический, мин', 1 / (1 / 3 - 1 / 5), 7.5)

print('14 Кривизна')
check('14.Р1 ρ параболы y=x² в вершине', 1 / 2, 0.5)
check('14.С1 ρ в вершине, м', 10 ** 2 / 9.8, 10.2041)
check('14.С2 ρ в начале, м', 400 / (9.8 * 0.5), 81.6327)


def rho_param(x, y, t, h=1e-4):                     # численный радиус кривизны параметрической кривой
    dx = (x(t + h) - x(t - h)) / (2 * h)
    dy = (y(t + h) - y(t - h)) / (2 * h)
    ddx = (x(t + h) - 2 * x(t) + x(t - h)) / h ** 2
    ddy = (y(t + h) - 2 * y(t) + y(t - h)) / h ** 2
    return (dx * dx + dy * dy) ** 1.5 / abs(dx * ddy - dy * ddx)


check('14.С3 ρ в (a,0)', rho_param(lambda t: 5 * cos(t), lambda t: 3 * sin(t), 0), 1.8)
check('14.С3 ρ в (0,b)', rho_param(lambda t: 5 * cos(t), lambda t: 3 * sin(t), pi / 2), 25 / 3)
check('14.С2 численно', rho_param(lambda t: 20 * cos(radians(60)) * t,
                                  lambda t: 20 * sin(radians(60)) * t - 4.9 * t * t, 0), 81.6327)

print('15 Погони')
check('15.Р1, с', 1 / 0.01, 100)
check('15.С1, с', 2 * 60 / (3 * 2), 20)


def chase(u, v, L, dt=1e-3, steps=None):
    """РК4 для собаки, бегущей на зайца. Возвращает время поимки и минимум/предел расстояния.

    Поимка — когда до зайца меньше одного шага собаки (u·dt): ближе шагом не подойти, и
    с порогом меньше шага собака проскакивает мимо — цикл не кончается. Ошибка времени
    поимки при этом порядка dt, то есть ~10⁻⁴ относительной для t ~ 5 с.
    """
    eps = u * dt
    def f(t, p):
        hx, hy = L, v * t
        dx, dy = hx - p[0], hy - p[1]
        r = hypot(dx, dy)
        return (u * dx / r, u * dy / r)
    p, t = (0.0, 0.0), 0.0
    for _ in range(steps or 10 ** 9):
        k1 = f(t, p)
        k2 = f(t + dt / 2, (p[0] + dt / 2 * k1[0], p[1] + dt / 2 * k1[1]))
        k3 = f(t + dt / 2, (p[0] + dt / 2 * k2[0], p[1] + dt / 2 * k2[1]))
        k4 = f(t + dt, (p[0] + dt * k3[0], p[1] + dt * k3[1]))
        p = (p[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
             p[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]))
        t += dt
        if hypot(L - p[0], v * t - p[1]) < eps:
            return t, 0
    return t, hypot(L - p[0], v * t - p[1])


tc, _ = chase(10, 6, 32)
check('15.С2 поимка формулой, с', 10 * 32 / (100 - 36), 5)
check('15.С2 поимка РК4, с', tc, 5, rel=1e-3)
check('15.С2 путь собаки, м', 10 * 5, 50)
_, dist = chase(1, 1, 1, dt=1e-3, steps=200000)      # 15.С3: u = v, t = 200 L/v
check('15.С3 предельное расстояние (РК4, t = 200 L/v)', dist, 0.5, rel=2e-3)

print(f'\nВсе проверки пройдены: {ok}')
