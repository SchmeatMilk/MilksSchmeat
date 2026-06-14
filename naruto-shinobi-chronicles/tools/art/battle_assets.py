"""Creature battle sprites + battle backdrops/platforms + jutsu FX.
Exports to assets/sprites/units/battle, assets/fx, assets/ui."""
import os
from pixutil import Canvas, hx, shade
from PIL import Image

HERE = os.path.dirname(__file__)
PROJ = os.path.abspath(os.path.join(HERE, '..', '..'))
A = lambda *p: os.path.join(PROJ, 'assets', *p)


# ---- creatures ----------------------------------------------------------

def forest_snake():
    c = Canvas(72, 56)
    g = hx('#5a8a3a'); gd = hx('#3a6024'); gl = hx('#7cb24e'); belly = hx('#cfe0a0')
    # coiled body
    for (cx, cy, r) in [(30, 46, 12), (44, 42, 10), (24, 36, 9)]:
        c.ellipse(cx, cy, r, r*0.8, g)
        c.ellipse(cx, cy, r, r*0.8, gd, fill=False)
    # body curve up to head
    for i, (x, y) in enumerate([(26, 30), (30, 24), (36, 20), (42, 16)]):
        c.disc(x, y, 6-i*0.4, g)
    # head
    c.ellipse(46, 13, 8, 6, g); c.ellipse(46, 15, 7, 4, belly)
    c.ellipse(46, 13, 8, 6, gd, fill=False)
    # eyes + slit pupils
    for ex in (43, 50):
        c.disc(ex, 11, 1.6, hx('#e8c84a')); c.px(ex, 11, hx('#1a1a1a'))
    # fangs + forked tongue
    c.px(44, 18, hx('#f0f0f0')); c.px(48, 18, hx('#f0f0f0'))
    c.vline(46, 19, 23, hx('#c83a3a')); c.px(45, 23, hx('#c83a3a')); c.px(47, 23, hx('#c83a3a'))
    # scale speckle
    for (x, y) in [(28, 44), (42, 40), (22, 35), (48, 44), (34, 48)]:
        c.px(x, y, gl)
    c.silhouette_outline(hx('#1f2e16'))
    return c.img()


def giant_centipede():
    c = Canvas(72, 52)
    body = hx('#8a4a2a'); bd = hx('#5a2e18'); bl = hx('#b06a3a')
    seg = [(12, 34), (20, 30), (28, 28), (36, 28), (44, 30), (52, 33), (60, 37)]
    for (x, y) in seg:
        c.disc(x, y, 5, body); c.ellipse(x, y, 5, 5, bd, fill=False)
        c.disc(x-1, y-1, 2, bl)
        # legs
        c.vline(x, y+5, y+9, bd); c.vline(x, y-9, y-5, bd)
        c.px(x, y+9, body); c.px(x, y-9, body)
    # head + mandibles
    c.disc(64, 39, 6, body); c.disc(63, 38, 2, bl)
    c.px(60, 41, hx('#e8c84a')); c.px(60, 37, hx('#e8c84a'))     # eyes
    c.vline(69, 36, 39, hx('#2a1a10')); c.vline(69, 39, 42, hx('#2a1a10'))  # mandibles
    c.silhouette_outline(hx('#241208'))
    return c.img()


def custom_template():
    c = Canvas(56, 64)
    c.rect(18, 10, 38, 56, hx('#888888'))
    c.rect(18, 10, 38, 22, hx('#bbbbbb'))
    c.silhouette_outline()
    return c.img()


CREATURES = {'forest_snake': forest_snake, 'giant_centipede': giant_centipede,
             'custom_template': custom_template}


# ---- battle backdrop + platform ----------------------------------------

def battle_bg(kind='field'):
    """256x192 battle backdrop with sky gradient, scenery, ground band."""
    W, H = 256, 192
    c = Canvas(W, H)
    if kind == 'forest':
        sky_top, sky_bot, ground, gl = hx('#cfe6c8'), hx('#a6cf9a'), hx('#3c6a34'), hx('#4f8442')
        tree = hx('#2a5a2a')
    elif kind == 'boss':
        sky_top, sky_bot, ground, gl = hx('#6a5a72'), hx('#9a7a86'), hx('#3a4030'), hx('#4a5240')
        tree = hx('#26301f')
    else:  # field
        sky_top, sky_bot, ground, gl = hx('#bfe2f4'), hx('#e8f2e0'), hx('#6aa048'), hx('#7eb456')
        tree = hx('#3a7a3a')
    horizon = 118
    for y in range(horizon):
        t = y / horizon
        col = (int(sky_top[0]*(1-t)+sky_bot[0]*t), int(sky_top[1]*(1-t)+sky_bot[1]*t),
               int(sky_top[2]*(1-t)+sky_bot[2]*t), 255)
        c.hline(0, W-1, y, col)
    # distant treeline silhouette
    import math
    for x in range(W):
        h = int(8 + 6*math.sin(x*0.13) + 4*math.sin(x*0.41))
        c.vline(x, horizon-h, horizon-1, shade(tree, 1.0))
    # ground
    for y in range(horizon, H):
        t = (y-horizon)/(H-horizon)
        col = (int(gl[0]*(1-t)+ground[0]*t), int(gl[1]*(1-t)+ground[1]*t),
               int(gl[2]*(1-t)+ground[2]*t), 255)
        c.hline(0, W-1, y, col)
    # ground texture speckle
    for i in range(420):
        x = (i*97) % W; y = horizon + (i*53) % (H-horizon)
        c.px(x, y, shade(ground, 1.12) if i % 2 else shade(ground, 0.9))
    return c.img()


def platform(col=hx('#caa86a')):
    """Elliptical combatant platform (96x32)."""
    c = Canvas(96, 32)
    cd = shade(col, 0.78); cl = shade(col, 1.12)
    c.ellipse(48, 18, 46, 12, cd)
    c.ellipse(48, 15, 46, 11, col)
    c.ellipse(48, 13, 44, 9, cl)
    for i in range(60):
        x = 6 + (i*53) % 84; y = 10 + (i*31) % 14
        if ((x-48)/46)**2 + ((y-15)/11)**2 < 0.9:
            c.px(x, y, cd if i % 2 else cl)
    return c.img()


# ---- jutsu / impact FX --------------------------------------------------

def fx_rasengan():
    c = Canvas(32, 32)
    for r, col in [(14, hx('#3f86d0aa')), (11, hx('#5aa6e8')), (8, hx('#9ad0f4')), (5, hx('#e8f6ff'))]:
        c.disc(16, 16, r, col)
    # swirl
    import math
    for a in range(0, 360, 30):
        x = 16 + 9*math.cos(math.radians(a)); y = 16 + 9*math.sin(math.radians(a))
        c.px(int(x), int(y), hx('#cfeefe'))
    return c.img()


def fx_impact():
    c = Canvas(32, 32)
    import math
    for a in range(0, 360, 45):
        for r in range(4, 15, 2):
            x = 16 + r*math.cos(math.radians(a)); y = 16 + r*math.sin(math.radians(a))
            c.px(int(x), int(y), hx('#ffd84a') if r < 10 else hx('#ff8a2a'))
    c.disc(16, 16, 4, hx('#fff0c0'))
    return c.img()


def fx_slash():
    c = Canvas(32, 32)
    import math
    for t in range(24):
        a = -40 + t*5
        x = 16 + 13*math.cos(math.radians(a)); y = 16 + 13*math.sin(math.radians(a))
        c.disc(int(x), int(y), 2, hx('#f4f8ff'))
    return c.img()


FX = {'rasengan': fx_rasengan, 'impact': fx_impact, 'slash': fx_slash}


def main():
    os.makedirs(A('sprites', 'units', 'battle'), exist_ok=True)
    os.makedirs(A('fx'), exist_ok=True)
    os.makedirs(A('ui'), exist_ok=True)
    for name, fn in CREATURES.items():
        fn().save(A('sprites', 'units', 'battle', name + '.png'))
    for fname, style in (('field', 'field'), ('wild', 'forest'), ('boss', 'boss')):
        battle_bg(style).save(A('ui', f'battle_bg_{fname}.png'))
    platform().save(A('ui', 'platform.png'))
    platform(hx('#9a86a8')).save(A('ui', 'platform_boss.png'))
    for name, fn in FX.items():
        fn().save(A('fx', name + '.png'))
    print('battle assets exported')


if __name__ == '__main__':
    main()
