"""Building + prop object sprites for the Konoha hub. Each returns an RGBA
PIL image sized in whole 16px tiles. Placed as overlay objects on the map;
collision is handled per-tile in the map grid (a door tile = warp/heal).
The Ichiraku Ramen stall is the game's 'Pokemon Center' (team heal)."""
from pixutil import Canvas, hx, shade
from PIL import Image

# palette
WOOD = hx('#b3824a'); WOOD_D = hx('#7e5a2e'); WOOD_L = hx('#cd9c5e'); WOOD_K = hx('#5a3f20')
PLASTER = hx('#e6dcc4'); PLASTER_D = hx('#c4b794'); PLASTER_K = hx('#9a8c68')
RED = hx('#c0392b'); RED_D = hx('#922a20'); RED_L = hx('#dc5547')
BLUE = hx('#3f6fb0'); BLUE_D = hx('#2c5088'); BLUE_L = hx('#5a8fd0')
GREY = hx('#9aa0a8'); GREY_D = hx('#767c86'); GREY_L = hx('#b8bec6')
DARK = hx('#2a2230'); GOLD = hx('#e8c24a')
GREEN = hx('#3f7a3f'); GREEN_D = hx('#2a5a2a')


def _roof(c, x0, y0, x1, y1, col, ridge=True):
    cd = shade(col, 0.78); cl = shade(col, 1.12); ck = shade(col, 0.62)
    for y in range(y0, y1+1):
        c.hline(x0, x1, y, col)
    # shingle rows
    for y in range(y0, y1+1, 3):
        c.hline(x0, x1, y, cd)
    for x in range(x0, x1+1, 4):
        c.vline(x, y0, y1, ck)
    # eave highlight + shadow
    c.hline(x0, x1, y0, cl)
    c.hline(x0, x1, y1, ck)
    if ridge:
        mid = (x0+x1)//2
        c.vline(mid, y0, y1, cl)
    # outline
    c.rect(x0, y0, x0, y1, ck); c.rect(x1, y0, x1, y1, ck)


def _wall(c, x0, y0, x1, y1, col):
    cd = shade(col, 0.82)
    for y in range(y0, y1+1):
        c.hline(x0, x1, y, col if (y % 4) else cd)
    c.vline(x1, y0, y1, cd)


def _door(c, cx, by, w=6, h=9, col=WOOD_K):
    x0 = cx-w//2
    c.rect(x0, by-h, x0+w-1, by, col)
    c.vline(x0, by-h, by, shade(col, 1.3))
    c.hline(x0, x0+w-1, by-h, shade(col, 1.3))
    c.px(x0+w-2, by-h//2, GOLD)  # handle


def outline_dark(c):
    c.silhouette_outline(hx('#241c28'))


# ----------------------------------------------------- Ichiraku Ramen ------

def ramen():
    """Ichiraku-style ramen stall = team heal point (4x3 tiles, 64x48)."""
    W, H = 64, 48
    c = Canvas(W, H)
    # wooden roof frame
    _roof(c, 2, 2, 61, 14, WOOD)
    c.hline(2, 61, 2, WOOD_L)
    # red banner (noren) across the top front with sign panel
    c.rect(6, 15, 57, 24, RED)
    c.hline(6, 57, 15, RED_L); c.hline(6, 57, 24, RED_D)
    # white sign panel with 一楽 (Ichiraku) hint marks
    c.rect(24, 16, 39, 23, PLASTER)
    c.hline(27, 36, 18, DARK); c.hline(27, 36, 19, DARK)      # 一
    c.rect(28, 20, 35, 22, DARK); c.px(31, 21, PLASTER)        # 楽 block
    # hanging noren curtains (slatted) over the counter
    for x in range(8, 57, 4):
        c.vline(x, 25, 31, RED); c.vline(x+1, 25, 31, RED_D)
        c.vline(x+2, 25, 30, RED_L)
    c.hline(6, 57, 25, RED_D)
    # counter
    c.rect(6, 38, 57, 44, WOOD); c.hline(6, 57, 38, WOOD_L); c.hline(6, 57, 44, WOOD_K)
    c.rect(4, 32, 59, 38, shade(WOOD, 0.7))   # counter front shadow / interior
    # ramen bowls + steam on the counter
    for bx in (16, 32, 48):
        c.disc(bx, 36, 2, hx('#efe7d6')); c.disc(bx, 36, 1, hx('#d9b15a'))  # broth
        c.px(bx, 33, hx('#f4efe6'))  # steam
        c.px(bx-1, 31, hx('#e8e2d6')); c.px(bx+1, 30, hx('#e8e2d6'))
    # red paper lanterns hanging at the corners
    for lx in (8, 56):
        c.disc(lx, 12, 2, RED); c.px(lx, 9, DARK); c.hline(lx-1, lx+1, 12, RED_D); c.px(lx, 12, GOLD)
    # stools
    for sx in (16, 32, 48):
        c.rect(sx-2, 45, sx+1, 47, WOOD_D); c.hline(sx-2, sx+1, 45, WOOD)
    outline_dark(c)
    return c.img()


# ----------------------------------------------------- Hokage Tower --------

def hokage_tower():
    """Central round red-roofed tower with 火 kanji (5x5, 80x80)."""
    W, H = 80, 80
    c = Canvas(W, H)
    # base cylinder body
    c.rect(12, 40, 67, 74, PLASTER)
    for y in range(40, 75, 4):
        c.hline(12, 67, y, PLASTER_D)
    c.vline(67, 40, 74, PLASTER_K)
    # windows
    for wy in (46, 58):
        for wx in (20, 32, 44, 56):
            c.rect(wx, wy, wx+5, wy+5, BLUE_D); c.px(wx, wy, BLUE_L)
    # big round red roof, conical/stepped
    c.ellipse(40, 30, 34, 18, RED)
    c.ellipse(40, 28, 34, 16, RED_L)
    for r, yy in ((30, 18), (24, 12), (16, 7)):
        c.ellipse(40, yy+6, r, r*0.5, RED); c.ellipse(40, yy+5, r, r*0.5, RED_L)
        c.ellipse(40, yy+9, r, r*0.5, RED_D, fill=False)
    c.disc(40, 6, 4, RED_D)
    # white circular plaque with 火 (fire) kanji
    c.disc(40, 26, 8, PLASTER)
    c.ellipse(40, 26, 8, 8, PLASTER_K, fill=False)
    k = hx('#b8302a')
    c.vline(40, 21, 31, k)              # 火 centre stroke
    c.hline(36, 44, 27, k)
    c.px(36, 24, k); c.px(44, 24, k); c.px(35, 30, k); c.px(45, 30, k)
    # grand door + steps
    _door(c, 40, 74, 12, 14, WOOD_K)
    c.rect(30, 75, 50, 79, GREY); c.hline(30, 50, 75, GREY_L)
    outline_dark(c)
    return c.img()


# ----------------------------------------------------- generic buildings ---

def _house(W, H, roofcol, wallcol=PLASTER, sign=None):
    c = Canvas(W, H)
    rh = H*5//12
    _roof(c, 1, 1, W-2, rh, roofcol)
    c.hline(1, W-2, 1, shade(roofcol, 1.2))
    _wall(c, 3, rh+1, W-4, H-2, wallcol)
    # windows
    for wx in range(7, W-8, 12):
        c.rect(wx, rh+4, wx+4, rh+8, BLUE_D); c.px(wx, rh+4, BLUE_L)
    _door(c, W//2, H-2, 7, min(11, H-rh-2), WOOD_K)
    if sign:
        c.rect(W//2-7, rh-1, W//2+7, rh+3, sign[0])
        c.hline(W//2-6, W//2+6, rh, shade(sign[0], 1.2))
    outline_dark(c)
    return c.img()


def academy():
    # wide tan/brown school with red roof + central peak (4x3, 64x48)
    c = Canvas(64, 48)
    _roof(c, 1, 6, 62, 20, hx('#a8553a'))
    # central gable peak
    for i in range(10):
        c.hline(32-i, 31+i, 1+i, hx('#b85f44'))
    c.disc(32, 8, 3, PLASTER); c.px(32, 8, hx('#a8553a'))   # emblem
    _wall(c, 3, 21, 60, 46, PLASTER)
    for wx in (8, 20, 40, 52):
        c.rect(wx, 26, wx+5, 33, BLUE_D); c.px(wx, 26, BLUE_L)
    _door(c, 32, 46, 9, 12, WOOD_K)
    outline_dark(c)
    return c.img()


def hospital():
    # white/teal building with red cross (3x3, 48x48)
    c = Canvas(48, 48)
    _roof(c, 1, 4, 46, 16, hx('#4a9aa0'))
    _wall(c, 3, 17, 44, 46, hx('#eef2f0'))
    # red cross
    cr = hx('#cc3a3a')
    c.rect(21, 22, 26, 33, cr); c.rect(18, 25, 29, 30, cr)
    for wx in (8, 36):
        c.rect(wx, 24, wx+4, 30, BLUE_D); c.px(wx, 24, BLUE_L)
    _door(c, 24, 46, 8, 11, WOOD_K)
    outline_dark(c)
    return c.img()


def shop():
    # tool shop with blue roof (Poke-Mart vibe) (3x2, 48x32)
    c = Canvas(48, 36)
    _roof(c, 1, 2, 46, 14, BLUE)
    c.rect(16, 4, 31, 9, PLASTER); c.hline(19, 28, 6, BLUE_D)   # sign
    _wall(c, 3, 15, 44, 34, PLASTER)
    c.rect(7, 19, 16, 28, hx('#2a3340')); c.px(7, 19, BLUE_L)    # display window
    _door(c, 33, 34, 8, 12, WOOD_K)
    outline_dark(c)
    return c.img()


def house_small(variant=0):
    roofs = [hx('#9a6a3a'), hx('#6a8a5a'), hx('#a8553a'), hx('#7a6a8a')]
    return _house(32, 32, roofs[variant % len(roofs)])


def gate():
    """Konoha's great green double-gate (6x3, 96x48)."""
    c = Canvas(96, 48)
    g = hx('#3f7a3f'); gd = hx('#2c5a2c'); gl = hx('#54a054')
    # two towers
    for tx in (4, 78):
        c.rect(tx, 8, tx+13, 47, g); c.vline(tx+13, 8, 47, gd)
        c.rect(tx, 4, tx+13, 9, hx('#caa14a'))  # roof cap
        c.hline(tx, tx+13, 4, hx('#e0bb5e'))
        for wy in (16, 26, 36):
            c.rect(tx+4, wy, tx+8, wy+4, DARK)
    # crossbeam banner
    c.rect(17, 6, 78, 16, g); c.hline(17, 78, 6, gl); c.hline(17, 78, 16, gd)
    c.rect(38, 8, 57, 14, PLASTER)   # sign plate
    c.hline(42, 53, 11, DARK)        # 門 hint
    # open doors
    c.rect(18, 18, 46, 47, gd); c.rect(49, 18, 77, 47, gd)
    c.vline(18, 18, 47, g); c.vline(77, 18, 47, g)
    for yy in range(20, 47, 4):
        c.hline(19, 45, yy, shade(gd, 0.8)); c.hline(50, 76, yy, shade(gd, 0.8))
    outline_dark(c)
    return c.img()


def tree_obj():
    """Round feature tree (16x24, transparent), canopy overhangs the base."""
    c = Canvas(16, 24)
    TR = hx('#6e4a2a'); TRD = hx('#4e321a')
    c.rect(6, 17, 9, 23, TR); c.vline(9, 17, 23, TRD)
    cgr = hx('#2f6e34'); cl = hx('#41924a'); cd = hx('#1f4e26')
    c.disc(8, 9, 7.5, cgr)
    c.disc(5, 6, 3, cl); c.disc(10, 7, 3, cl)
    c.disc(8, 13, 5, cd, )
    c.disc(8, 11, 6, cgr)
    c.disc(6, 7, 2, cl); c.px(5, 5, hx('#5aa85a'))
    c.silhouette_outline(hx('#1a2e18'))
    return c.img()


def lamp():
    c = Canvas(16, 24)
    c.rect(7, 6, 8, 22, hx('#3a3a44'))
    c.disc(7.5, 4, 3, hx('#ffd86a')); c.disc(7.5, 4, 2, hx('#fff0b0'))
    c.silhouette_outline(hx('#241c28'))
    return c.img()


def post():
    """Wooden training log (16x24)."""
    c = Canvas(16, 24)
    c.rect(5, 4, 10, 23, WOOD); c.vline(10, 4, 23, WOOD_D); c.vline(5, 4, 23, WOOD_L)
    c.ellipse(7.5, 4, 3, 1.6, shade(WOOD, 1.15))   # top cut
    for y in (9, 16):                                # rope bindings
        c.rect(4, y, 11, y+1, hx('#3a2a1a'))
    c.silhouette_outline(hx('#241c28'))
    return c.img()


def darktree():
    """Forest-of-Death gnarled tree (16x28)."""
    c = Canvas(16, 28)
    TR = hx('#4a3320'); TRD = hx('#2e1f12')
    c.rect(6, 18, 9, 27, TR); c.vline(9, 18, 27, TRD)
    cgr = hx('#244a22'); cl = hx('#356a30'); cd = hx('#143012')
    c.disc(8, 10, 7.5, cgr); c.disc(5, 7, 3, cl); c.disc(10, 12, 4, cd)
    c.disc(8, 12, 6, cgr); c.px(5, 6, hx('#3f7a36'))
    c.silhouette_outline(hx('#0e1a0c'))
    return c.img()


def hokage_faces():
    """Hokage Rock — 4 carved faces (Part I: Hashirama, Tobirama, Hiruzen,
    Minato) in the cliff. 8 tiles wide x 3 tall (128x44)."""
    W, H = 128, 44
    c = Canvas(W, H)
    rock = hx('#b48c58'); rl = hx('#c8a06a'); rd = hx('#8a6840'); rk = hx('#6a4e30')
    c.rect(0, 0, W-1, H-1, rock)
    for i in range(260):                       # rock noise
        x = (i*53) % W; y = (i*31) % H
        c.px(x, y, rl if i % 2 else rd)
    for x in range(4, W, 9):                    # vertical striations
        for y in range(H):
            if (x*7 + y*3) % 5 == 0:
                c.px(x, y, rk)
    # four carved relief faces
    hairs = [hx('#5a3a22'), hx('#c9cdd6'), hx('#9a8c6a'), hx('#e0c24a')]  # brown, white(Tobirama), grey(Hiruzen), blond(Minato)
    for i in range(4):
        cx = 16 + i*32; cy = 22
        # raised head (lighter, lit top-left; shaded bottom-right)
        c.ellipse(cx, cy, 11, 13, rl)
        c.ellipse(cx+2, cy+3, 10, 11, rock)
        c.ellipse(cx, cy, 11, 13, rk, fill=False)
        # brow + eye sockets (recessed)
        c.hline(cx-6, cx+6, cy-3, rd)
        c.px(cx-4, cy-1, rk); c.px(cx+4, cy-1, rk)
        c.vline(cx, cy-1, cy+3, rd)             # nose shadow
        c.hline(cx-3, cx+3, cy+6, rd)           # mouth
        # carved hair / hat hint
        c.ellipse(cx, cy-9, 9, 5, shade(hairs[i], 0.9))
        c.ellipse(cx, cy-8, 9, 4, rk, fill=False)
    outline_dark(c)
    return c.img()


def memorial_stone():
    """KIA Memorial Stone — black angled obelisk (16x28)."""
    c = Canvas(16, 28)
    st = hx('#2e3640'); stl = hx('#48515e'); std = hx('#1b2026')
    for y in range(6, 27):
        c.hline(4, 11, y, st)
    c.vline(4, 6, 26, stl); c.vline(11, 6, 26, std)
    # angled top
    for i in range(4):
        c.hline(4+i, 11, 6+i, st); c.px(4+i, 6+i, stl)
    c.rect(2, 25, 13, 27, hx('#7a6a4a'))         # stone base
    for yy in (12, 16, 20):                       # engraved name lines
        c.hline(6, 9, yy, std)
    outline_dark(c)
    return c.img()


def forest_tower():
    """Forest-of-Death central tower (3x4 = 48x64)."""
    c = Canvas(48, 64)
    wall = hx('#8f8a7a'); wd = shade(wall, 0.8); wl = shade(wall, 1.12); rk = shade(wall, 0.6)
    c.rect(6, 14, 41, 62, wall)
    for y in range(14, 63, 5):
        c.hline(6, 41, y, wd)
    c.vline(41, 14, 62, rk)
    # battlement roof
    for x in range(4, 44, 6):
        c.rect(x, 8, x+3, 14, wall); c.px(x, 8, wl)
    c.rect(4, 12, 43, 14, rk)
    # arched door + windows
    _door(c, 24, 62, 10, 14, hx('#3a2f24'))
    for wy in (22, 36):
        for wx in (12, 30):
            c.rect(wx, wy, wx+5, wy+6, hx('#2a2218')); c.px(wx, wy, wl)
    c.rect(20, 18, 27, 24, hx('#2a2218'))         # central high window
    outline_dark(c)
    return c.img()


def chainlink_gate():
    """Forest-of-Death perimeter chain-link gate 'Gate 44' (2x3 = 32x48)."""
    c = Canvas(32, 48)
    post = hx('#6a7078'); pl = hx('#8a9098'); mesh = hx('#9aa4ac')
    c.rect(2, 6, 5, 47, post); c.vline(2, 6, 47, pl)
    c.rect(26, 6, 29, 47, post); c.vline(26, 6, 47, pl)
    c.rect(2, 4, 29, 7, post)                      # top bar
    for x in range(7, 25, 3):                      # chain-link diagonal mesh
        for y in range(9, 46):
            if (x + y) % 3 == 0:
                c.px(x + ((y) % 3), y, mesh)
            if (x - y) % 3 == 0:
                c.px(x, y, shade(mesh, 0.8))
    c.rect(10, 12, 21, 18, hx('#caa84a'))          # "44" sign plate
    c.hline(12, 14, 15, hx('#2a2218')); c.hline(17, 19, 15, hx('#2a2218'))
    outline_dark(c)
    return c.img()


BUILDINGS = {
    'ramen': ramen, 'hokage_tower': hokage_tower, 'academy': academy,
    'hospital': hospital, 'shop': shop, 'gate': gate,
    'house0': lambda: house_small(0), 'house1': lambda: house_small(1),
    'house2': lambda: house_small(2), 'house3': lambda: house_small(3),
    'tree': tree_obj, 'lamp': lamp, 'post': post, 'darktree': darktree,
    'hokage_faces': hokage_faces, 'memorial_stone': memorial_stone,
    'forest_tower': forest_tower, 'chainlink_gate': chainlink_gate,
}
