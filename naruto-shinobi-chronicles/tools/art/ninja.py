"""Parametric chibi-ninja overworld sprite generator (D/P house style).
One generator drives the whole roster so movement + proportions stay cohesive.
Frame 24x32. Head centred x~11.5, feet ~y29, shadow y30. 4 dirs x 3 walk frames.
"""
import numpy as np
from PIL import Image
from pixutil import Canvas, hx, shade, mix, OUTLINE, montage

FW, FH = 24, 32
HCX = 11.5            # head centre x
LEAF_PLATE = hx('#aab4be')
LEAF_PLATE_SH = hx('#727c86')
LEAF_PLATE_HL = hx('#d6dde2')

# ------------------------------------------------------------- head --------

def _head_skin(c, spec, d):
    skin = spec['skin']; ssh = shade(skin, 0.84); shl = shade(skin, 1.06)
    c.ellipse(HCX, 9, 5.0, 5.6, skin, True)
    # shade lower-right of face
    for y in range(4, 15):
        for x in range(6, 17):
            if c.opaque(x, y):
                dd = ((x-HCX)/5.0)**2 + ((y-9)/5.6)**2
                if dd > 0.45 and (x > HCX+1 or y > 11):
                    c.px(x, y, ssh)
    # neck
    c.rect(10, 14, 13, 15, ssh)
    c.hline(10, 13, 14, skin)
    if d == 'left':           # profile nose bump (right view is mirrored)
        c.px(6, 9, skin); c.px(6, 10, skin); c.px(5, 10, skin)
        c.vline(15, 5, 12, ssh)   # shade the back of the head

def _eyes(c, spec, d):
    if d == 'up':
        return
    eye = spec.get('eyes', hx('#39323e'))
    white = hx('#f4f1ea')
    if d == 'down':
        for ex in (9, 14):
            c.vline(ex, 9, 10, eye)
            c.px(ex, 9, white)
        if spec.get('cheek'):
            c.px(8, 11, spec['cheek']); c.px(15, 11, spec['cheek'])
        if spec.get('mask'):
            mk = spec['mask']; c.rect(7, 11, 16, 14, mk); c.hline(7, 16, 11, shade(mk, 1.1))
    else:  # left profile (right is mirrored)
        ex = 10
        c.vline(ex, 9, 10, eye); c.px(ex, 9, white)
        if spec.get('mask'):
            c.rect(6, 11, 13, 14, spec['mask'])

def _face_marks(c, spec, d):
    """Signature per-character details on the face skin (whiskers, clan marks,
    dojutsu eyes handled via spec['eyes'], tattoos, paint, bandage mask)."""
    if d == 'up':
        return
    marks = spec.get('marks', [])
    sk = spec['skin']
    if 'whiskers' in marks:               # Naruto - 3 fox whiskers per cheek
        wc = shade(sk, 0.66)
        for y in (10, 11, 12):
            c.px(8, y, wc)
            if d == 'down':
                c.px(15, y, wc)
    if 'fang' in marks:                   # Kiba - red Inuzuka fang marks
        r = hx('#c2402e')
        c.px(8, 11, r); c.px(8, 12, r)
        if d == 'down':
            c.px(15, 11, r); c.px(15, 12, r)
    if 'swirl' in marks:                  # Choji - cheek spirals
        r = hx('#c2402e')
        c.px(8, 11, r); c.px(9, 12, r)
        if d == 'down':
            c.px(15, 11, r); c.px(14, 12, r)
    if 'eye_rings' in marks:              # Gaara - dark insomnia rings
        dk = hx('#3a2535')
        for ex in ((9, 14) if d == 'down' else (10,)):
            c.px(ex, 8, dk); c.px(ex, 11, dk)
    if 'kanji_ai' in marks:               # Gaara - 愛 love tattoo (red mark)
        c.px(13, 6, hx('#b23023')); c.px(13, 5, hx('#b23023'))
    if 'facelines' in marks:              # Jiraiya - red eye streaks
        r = hx('#bb3526')
        for ex in ((9, 14) if d == 'down' else (10,)):
            c.px(ex, 11, r); c.px(ex, 12, r); c.px(ex, 13, r)
    if 'seal_mark' in marks:              # Tsunade - violet forehead rhombus
        c.px(11, 6, hx('#7c4a86'))
    if 'facepaint' in marks:              # Kankuro - purple war paint
        p = hx('#7a3a9a')
        c.px(9, 9, p); c.px(11, 11, p); c.px(13, 9, p)
    if 'bandage' in marks:                # Zabuza - bandage over lower face
        b = hx('#d9dde2'); bsh = shade(b, 0.86)
        c.rect(7, 11, 16, 14, b); c.hline(7, 16, 11, bsh); c.hline(7, 16, 13, bsh)
    if 'sage' in marks:                    # Naruto Sage - orange eye pigment
        o = hx('#d8741a')
        for ex in ((9, 14) if d == 'down' else (10,)):
            c.px(ex, 8, o); c.px(ex, 11, o); c.px(ex-1, 9, o) if d == 'down' else None
    if 'curse' in marks:                   # Sasuke CM2 - black flame seal
        k = hx('#1a1422')
        c.px(7, 9, k); c.px(7, 10, k); c.px(8, 8, k); c.px(6, 11, k)
    if 'scar' in marks:                    # Iruka - scar across nose
        c.hline(9, 14, 11, shade(sk, 0.72))


def _headgear(c, spec, d):
    hat = spec.get('npc_hat')
    if not hat:
        return
    if hat == 'hokage':                    # triangular Hokage hat, red+white
        white = hx('#efe9da'); red = hx('#b23a3a')
        for i, y in enumerate(range(0, 5)):
            c.hline(7-i//2, 16+i//2, y, white)
        c.hline(6, 17, 5, red); c.hline(6, 17, 6, red)
        c.px(11, 1, red); c.px(12, 1, red)   # tiny 火 hint
    elif hat == 'chef':                    # white chef bandana
        white = hx('#f0ece0')
        c.rect(6, 3, 17, 6, white); c.hline(6, 17, 3, shade(white, 1.05))
        c.hline(6, 17, 6, shade(white, 0.8))
    elif hat == 'goggles':                 # Konohamaru goggles on forehead
        g = hx('#3a6a8a'); rim = hx('#caa84a')
        c.hline(8, 15, 6, rim); c.px(9, 6, g); c.px(10, 6, g); c.px(13, 6, g); c.px(14, 6, g)


def _hair(c, spec, d):
    hair = spec['hair']; hsh = shade(hair, 0.70); hhl = shade(hair, 1.22)
    style = spec.get('hair_style', 'spiky')

    def helmet(top, browL, browR, brow_y):
        # solid hair shell over the skull, lower edge = bangs line
        for y in range(top, brow_y+1):
            x0 = 6 if y >= top+1 else 7
            x1 = 17 if y >= top+1 else 16
            c.hline(x0, x1, y, hair)
        # top sheen
        c.hline(8, 12, top+1, hhl)
        # right side shade
        c.vline(16, top+1, brow_y, hsh); c.vline(17, top+2, brow_y, hsh)

    if style == 'spiky':
        helmet(3, 7, 16, 6)
        spikes = [(6, 4), (8, 2), (10, 1), (12, 1), (14, 2), (16, 4), (17, 5)]
        for x, ty in spikes:
            c.vline(x, ty, 4, hair); c.px(x, ty, hhl if x < 12 else hsh)
        if d == 'down':
            # bangs notches over forehead
            for x in (8, 11, 14):
                c.px(x, 7, hair)
        if d == 'up':
            for y in range(3, 11):
                c.hline(6, 17, y, hair)
            c.hline(6, 17, 10, hsh); c.hline(8, 12, 4, hhl)
    elif style == 'duck':       # Sasuke
        helmet(3, 7, 16, 6)
        for x, ty in [(6, 3), (7, 2), (16, 2), (17, 3), (18, 4)]:
            c.vline(x, ty, 6, hair)
        c.px(18, 3, hair); c.px(19, 4, hair); c.px(18, 5, hsh)  # back spike
        if d == 'down':
            c.px(8, 7, hair); c.px(11, 8, hair); c.px(15, 7, hair)
        if d == 'up':
            for y in range(3, 11):
                c.hline(6, 18, y, hair)
            c.hline(6, 18, 10, hsh)
    elif style == 'bob':        # Sakura / Ino front bob
        helmet(3, 6, 17, 7)
        c.vline(6, 5, 12, hair); c.vline(17, 5, 12, hair)
        c.vline(6, 5, 12, hsh)
        if d == 'down':
            c.px(7, 8, hair); c.px(16, 8, hair)
        if d == 'up':
            for y in range(3, 12):
                c.hline(6, 17, y, hair)
            c.hline(6, 17, 11, hsh)
    elif style == 'long':       # Hinata/Neji long straight
        helmet(3, 6, 17, 6)
        c.vline(6, 5, 19, hair); c.vline(7, 6, 17, hair)
        c.vline(17, 5, 19, hair); c.vline(16, 6, 17, hsh)
        c.vline(6, 5, 19, hsh)
        if d == 'down':
            c.hline(8, 15, 6, hair)
        if d == 'up':
            for y in range(3, 20):
                c.hline(6, 17, y, hair)
            c.hline(6, 17, 6, hsh)
    elif style == 'ponytail':   # Ino long pony
        helmet(3, 6, 17, 7)
        if d == 'up':
            c.vline(11, 4, 22, hair); c.vline(12, 4, 22, hair); c.vline(11, 4, 22, hsh)
            c.disc(11.5, 4, 2, hhl)
        elif d == 'down':
            c.px(6, 8, hair); c.px(17, 8, hair)
        else:
            c.vline(7, 6, 20, hair); c.vline(7, 6, 20, hsh)
    elif style == 'pineapple':  # Shikamaru
        c.vline(11, 1, 4, hsh); c.vline(12, 1, 4, hair)
        c.disc(11.5, 2, 2.2, hair); c.px(11, 1, hhl)
        helmet(4, 7, 16, 7)
    elif style == 'bun_twin':   # Tenten
        helmet(3, 7, 16, 6)
        c.disc(6, 3, 2.1, hair); c.disc(17, 3, 2.1, hair)
        c.disc(6, 3, 2.1, hsh); c.px(6, 2, hhl); c.px(17, 2, hhl)
    elif style == 'bowl':       # Rock Lee / Gai
        for y in range(2, 8):
            c.hline(6, 17, y, hair)
        c.hline(6, 17, 7, hsh); c.hline(8, 12, 3, hhl)
        if spec.get('brows'):
            b = spec['brows']
            if d == 'down':
                c.hline(8, 10, 8, b); c.hline(13, 15, 8, b)
            elif d != 'up':
                c.hline(8, 10, 8, b)
    elif style == 'hood':       # Shino / Kankuro
        hd = spec.get('hood', hair); hdsh = shade(hd, 0.78); hdhl = shade(hd, 1.12)
        for y in range(2, 16):
            c.hline(5, 18, y, hd)
        c.vline(17, 3, 15, hdsh); c.vline(18, 4, 15, hdsh)
        c.hline(7, 12, 2, hdhl)
        if spec.get('cat_ears'):    # Kankuro - bunraku puppeteer cat-eared hood
            for ex in (6, 17):
                c.px(ex, 1, hd); c.px(ex, 0, hd); c.px(ex - 1, 1, hd) if ex < 12 else c.px(ex + 1, 1, hd)
        if d == 'down':
            c.rect(8, 7, 15, 13, spec['skin'])
            for y in range(7, 14):
                c.px(15, y, shade(spec['skin'], 0.84))
            if spec.get('glasses'):
                g = spec['glasses']; c.rect(8, 8, 15, 9, g); c.px(8, 10, g); c.px(15, 10, g)
            else:
                _eyes(c, spec, d)
        return
    elif style == 'sannin':     # Jiraiya/Tsunade long mane
        helmet(3, 7, 16, 6)
        c.vline(5, 4, 22, hair); c.vline(6, 4, 20, hair)
        c.vline(18, 4, 22, hair); c.vline(17, 4, 20, hsh)
        c.vline(5, 4, 22, hsh)
        for x, ty in [(7, 1), (11, 0), (15, 1)]:
            c.vline(x, ty, 3, hair)
        if d == 'up':
            for y in range(2, 22):
                c.hline(5, 18, y, hair)
            c.hline(5, 18, 6, hsh)
    elif style == 'temari':     # Temari - four spiky ponytails
        helmet(3, 7, 16, 6)
        for px in (6, 9, 14, 17):
            c.disc(px, 3, 1.6, hair); c.px(px, 2, hhl)
        if d == 'up':
            for px, ph in ((6, 8), (9, 9), (14, 9), (17, 8)):
                c.vline(px, 3, ph, hair)
    elif style == 'orochi':     # Orochimaru sleek long black
        helmet(3, 7, 16, 7)
        c.vline(6, 6, 23, hair); c.vline(17, 6, 23, hair); c.vline(6, 6, 23, hsh)
        if d == 'up':
            for y in range(3, 24):
                c.hline(6, 17, y, hair)
    else:                        # short
        helmet(3, 7, 16, 7)

# ------------------------------------------------------------- body --------

def _arms(c, spec, d, f):
    top = spec['top']; tsh = shade(top, 0.74); skin = spec['skin']
    # swing: f<0 -> left arm fwd(down), f>0 -> right arm fwd
    lo = 1 if f < 0 else 0
    ro = 1 if f > 0 else 0
    # left arm
    c.vline(6, 16+lo, 22+lo, top); c.vline(7, 16+lo, 22+lo, top)
    c.px(6, 23+lo, skin); c.px(7, 23+lo, skin)
    # right arm (shaded)
    c.vline(16, 16+ro, 22+ro, tsh); c.vline(17, 16+ro, 22+ro, tsh)
    c.px(16, 23+ro, shade(skin, 0.86)); c.px(17, 23+ro, shade(skin, 0.86))

def _torso(c, spec, d, f):
    top = spec['top']; tsh = shade(top, 0.76); thl = shade(top, 1.10)
    trim = spec.get('trim', shade(top, 0.62))
    x0, x1, y0, y1 = 7, 16, 15, 23
    if spec.get('big'):
        x0, x1 = 6, 17
    for y in range(y0, y1):
        c.hline(x0, x1, y, top)
    c.vline(x1, y0, y1-1, tsh); c.vline(x1-1, y0+1, y1-1, tsh)
    c.vline(x0, y0, y1-1, thl)
    # collar
    c.hline(x0, x1, y0, trim); c.px(8, y0, shade(trim, 1.15))
    if d == 'down':
        c.vline(11, y0, y1-1, trim); c.vline(12, y0+1, y1-2, shade(trim, 0.8))
        if spec.get('vest'):
            v = spec['vest']; vsh = shade(v, 0.78)
            c.rect(x0, y0+1, x0+2, y1-1, v); c.rect(x1-2, y0+1, x1, y1-1, vsh)
            c.hline(x0, x1, y1-1, vsh)
            c.px(x0, y0+1, shade(v, 1.12))
            if spec.get('haori_dots'):     # Jiraiya - yellow circles on red haori
                gold = hx('#f0d24a')
                c.px(x0+1, y0+3, gold); c.px(x1-1, y0+5, gold); c.px(x0+1, y1-2, gold)
    elif d == 'up':
        c.vline(11, y0, y1-1, tsh); c.vline(12, y0, y1-1, tsh)
        if spec.get('band_style') == 'forehead' and spec.get('band'):
            c.hline(9, 14, y0+1, spec['band'])  # headband knot tails on back
            c.px(9, y0+2, spec['band']); c.px(14, y0+2, spec['band'])
        if spec.get('vest'):
            v = spec['vest']; c.rect(x0, y0+1, x1, y1-1, shade(v, 0.9))
    else:  # side
        c.rect(x0+1, y0, x1-1, y1-1, top)
        c.vline(x1-1, y0, y1-1, tsh)
        if spec.get('vest'):
            c.rect(x0+1, y0+1, x1-2, y1-1, spec['vest'])

def _legs(c, spec, d, f):
    pants = spec['pants']; psh = shade(pants, 0.74)
    sandal = spec.get('sandal', hx('#3a2a22')); ssh = shade(sandal, 0.7)
    legwarm = spec.get('legwarm')
    # base stand y 24..28; stepping leg lifts/extends
    L = (8, 10); R = (13, 15)
    lstep = f < 0; rstep = f > 0
    for (x0, x1), step, lit in ((L, lstep, True), (R, rstep, False)):
        bot = 28 if not step else 27
        col = pants if lit else pants
        for x in range(x0, x1+1):
            c.vline(x, 24, bot, col)
        c.vline(x1, 24, bot, psh)
        if legwarm:
            c.hline(x0, x1, bot-1, legwarm); c.hline(x0, x1, bot, shade(legwarm, 0.85))
        c.hline(x0, x1, bot, sandal); c.px(x0, bot, ssh)
    # hip line
    c.hline(8, 15, 23, psh)

# ----------------------------------------------------- accessories ---------

def _band(c, spec, d):
    band = spec.get('band')
    if not band or spec.get('hair_style') == 'hood':
        return
    plate = spec.get('plate', LEAF_PLATE)
    bs = spec.get('band_style', 'forehead')
    if d == 'up':
        return
    if bs == 'forehead':
        yy = 6 if d == 'down' else 6
        c.hline(7, 16, yy, band)
        c.rect(9, yy, 14, yy, plate)
        c.hline(9, 13, yy, LEAF_PLATE_HL); c.px(14, yy, LEAF_PLATE_SH)
        c.px(7, yy+1, band); c.px(16, yy+1, band)
    elif bs == 'slant':
        for i, x in enumerate(range(7, 17)):
            c.px(x, 4 + i//3, band)
        c.rect(10, 5, 13, 6, plate); c.hline(10, 12, 5, LEAF_PLATE_HL)
    elif bs == 'neck':
        c.hline(8, 15, 14, band); c.rect(10, 14, 13, 14, plate)

def _back_items(c, spec, d):
    ex = spec.get('extras', [])
    if 'gourd' in ex:
        g = hx('#9c6b34'); gsh = shade(g, 0.74); ghl = shade(g, 1.12)
        if d == 'up':
            c.rect(8, 14, 15, 24, g); c.vline(15, 14, 24, gsh); c.hline(8, 15, 14, ghl)
            c.px(11, 18, gsh); c.px(12, 20, gsh)
        elif d == 'down':
            c.vline(5, 16, 23, g); c.vline(18, 16, 23, gsh)
        else:
            c.rect(15, 15, 18, 24, g); c.vline(18, 15, 24, gsh)
    if 'sword' in ex:
        blade = hx('#cfd3da'); wrap = hx('#5a6068')
        if d != 'left':
            c.vline(17, 5, 25, wrap); c.vline(17, 5, 14, blade)
    if 'fan' in ex and d in ('up', 'down'):
        fa = hx('#2a2f3a'); c.rect(15, 14, 18, 22, fa); c.vline(15, 14, 22, shade(fa, 1.3))
    if 'scroll' in ex:                    # Jiraiya - giant scroll on back
        sc = hx('#e6ddc4'); scsh = shade(sc, 0.82); tie = hx('#9a2f2f')
        if d == 'up':
            c.rect(7, 13, 16, 25, sc); c.vline(16, 13, 25, scsh); c.hline(7, 16, 19, tie)
        else:
            c.rect(16, 14, 19, 26, sc); c.vline(19, 14, 26, scsh); c.px(16, 20, tie); c.px(19, 20, tie)
    if 'puppet' in ex:                    # Kankuro - wrapped puppet bundle
        wr = hx('#c8b48a'); wrsh = shade(wr, 0.8)
        if d == 'up':
            c.rect(7, 13, 16, 24, wr); c.hline(7, 16, 17, wrsh); c.hline(7, 16, 21, wrsh)
        else:
            c.rect(16, 14, 19, 25, wr); c.vline(19, 14, 25, wrsh)

def _front_items(c, spec, d):
    ex = spec.get('extras', [])
    if 'sash' in ex:                      # Gaara - white cloth sash shoulder->hip
        wc = hx('#e8e0cc'); wsh = shade(wc, 0.85)
        for i, x in enumerate(range(7, 16)):
            y = 15 + i
            if y < 24:
                c.px(x, y, wc); c.px(x, y+1, wsh)
    if 'akamaru' in ex:                   # Kiba - Akamaru the pup rides on his head
        w = hx('#f2efe6'); wsh = shade(w, 0.86); ear = hx('#caa6a0')
        if d != 'up':
            c.disc(11.5, 2, 2.4, w); c.px(9, 1, ear); c.px(14, 1, ear)
            c.px(10, 2, hx('#39323e')); c.px(13, 2, hx('#39323e'))   # eyes
            c.px(11, 3, hx('#caa6a0'))                                # nose
        else:
            c.disc(11.5, 3, 2.2, w); c.px(9, 2, ear); c.px(14, 2, ear)
    if 'scarf' in ex:                      # Konohamaru - long blue scarf
        s = hx('#5a7ad0'); ssh = shade(s, 0.8)
        c.hline(7, 16, 15, s); c.hline(7, 16, 16, ssh)
        if d == 'down':
            c.vline(7, 16, 22, s); c.vline(7, 16, 22, ssh)
        elif d == 'up':
            c.hline(8, 15, 14, s)

# --------------------------------------------------------- compose ---------

def draw(spec, d='down', f=0):
    c = Canvas(FW, FH)
    c.shadow_ground(11.5, 30, 8, 2)
    if d == 'up':
        _back_items(c, spec, d)
    _legs(c, spec, d, f)
    _torso(c, spec, d, f)
    _arms(c, spec, d, f)
    if d != 'up':
        _back_items(c, spec, d)
    _head_skin(c, spec, d)
    _eyes(c, spec, d)
    _hair(c, spec, d)
    _band(c, spec, d)
    _headgear(c, spec, d)
    _face_marks(c, spec, d)
    _front_items(c, spec, d)
    c.silhouette_outline()
    return c.img()

def draw_dir(spec, d, f):
    if d == 'right':
        return draw(spec, 'left', f).transpose(Image.FLIP_LEFT_RIGHT)
    return draw(spec, d, f)

def sheet(spec):
    """3 cols (step-,idle,step+) x 4 rows (down,left,right,up) -> 72x128."""
    dirs = ['down', 'left', 'right', 'up']
    frames = [-1, 0, 1]
    S = Image.new('RGBA', (FW*3, FH*4), (0, 0, 0, 0))
    for r, d in enumerate(dirs):
        for col, f in enumerate(frames):
            S.alpha_composite(draw_dir(spec, d, f), (col*FW, r*FH))
    return S
