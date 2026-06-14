"""16x16 terrain tile generator for Konoha + training grounds + forest.
Textured, top-left-lit, cohesive with the chibi sprite palette. Stable noise
(hash by coord) so tiles are deterministic and tileable."""
from pixutil import Canvas, hx, shade
from PIL import Image

T = 16

def _n(x, y, s=0):
    """deterministic 0..1 noise"""
    h = (x*374761393 + y*668265263 + s*2246822519) & 0xffffffff
    h = (h ^ (h >> 13)) * 1274126177 & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 65535.0

def _fill(c, col):
    c.rect(0, 0, T-1, T-1, col)

# ---- nature -------------------------------------------------------------

GRASS = hx('#5d8c3c'); GRASS_L = hx('#6fa048'); GRASS_D = hx('#487029'); BLADE = hx('#7cb24e')

def grass(c, seed=0):
    _fill(c, GRASS)
    for y in range(T):
        for x in range(T):
            r = _n(x, y, seed)
            if r > 0.86:
                c.px(x, y, GRASS_L)
            elif r < 0.12:
                c.px(x, y, GRASS_D)
    # a few blades
    for i in range(3):
        bx = int(_n(i, seed, 7)*13)+1; by = int(_n(seed, i, 9)*11)+3
        c.px(bx, by, BLADE); c.px(bx, by-1, BLADE); c.px(bx+1, by, GRASS_D)

def grass_flower(c, seed=0):
    grass(c, seed)
    cols = [hx('#e85a6a'), hx('#f0d24a'), hx('#f4f0f4')]
    for i in range(3):
        fx = 2+int(_n(i, seed, 3)*11); fy = 2+int(_n(seed, i, 4)*11)
        col = cols[i % 3]
        c.px(fx, fy, col); c.px(fx+1, fy, col); c.px(fx, fy+1, col); c.px(fx+1, fy+1, col)
        c.px(fx, fy, hx('#f6e27a'))

DIRT = hx('#b98f54'); DIRT_L = hx('#cca871'); DIRT_D = hx('#94693a'); DIRT_K = hx('#7d5630')

def path(c, seed=0):
    _fill(c, DIRT)
    for y in range(T):
        for x in range(T):
            r = _n(x, y, seed+1)
            if r > 0.88:
                c.px(x, y, DIRT_L)
            elif r < 0.14:
                c.px(x, y, DIRT_D)
            elif r < 0.04:
                c.px(x, y, DIRT_K)

def path_edge_grass(c, side='n'):
    """dirt with a grassy lip on one side (soft transition)."""
    path(c, 5)
    if side == 'n':
        for x in range(T):
            h = 2 + (1 if _n(x, 0, 2) > 0.5 else 0)
            for y in range(h):
                c.px(x, y, GRASS if _n(x, y, 6) > .3 else GRASS_D)
            c.px(x, h, GRASS_D)
    elif side == 's':
        for x in range(T):
            h = 2 + (1 if _n(x, 1, 2) > 0.5 else 0)
            for y in range(T-h, T):
                c.px(x, y, GRASS if _n(x, y, 6) > .3 else GRASS_D)
    elif side == 'w':
        for y in range(T):
            h = 2 + (1 if _n(0, y, 2) > 0.5 else 0)
            for x in range(h):
                c.px(x, y, GRASS if _n(x, y, 6) > .3 else GRASS_D)
    elif side == 'e':
        for y in range(T):
            h = 2 + (1 if _n(1, y, 2) > 0.5 else 0)
            for x in range(T-h, T):
                c.px(x, y, GRASS if _n(x, y, 6) > .3 else GRASS_D)

WATER = hx('#3f78c0'); WATER_L = hx('#5a98d8'); WATER_D = hx('#2f5fa6'); FOAM = hx('#cfe6f4')

def water(c, frame=0):
    _fill(c, WATER)
    for y in range(T):
        for x in range(T):
            r = _n(x, (y+frame*2) % T, 11)
            if r > 0.9:
                c.px(x, y, WATER_L)
            elif r < 0.1:
                c.px(x, y, WATER_D)
    # gentle wave lines that drift with frame
    for y in range(2, T, 5):
        yy = (y+frame) % T
        for x in range(T):
            if (x+frame) % 6 < 2:
                c.px(x, yy, WATER_L)

def water_shore(c, side='n'):
    water(c, 0)
    sand = hx('#cdb277'); sand_d = hx('#a98c52')
    if side == 'n':
        for x in range(T):
            c.px(x, 0, sand); c.px(x, 1, sand if _n(x, 0, 1) > .4 else sand_d)
            c.px(x, 2, FOAM if _n(x, 2, 3) > .6 else WATER_L)
    elif side == 's':
        for x in range(T):
            c.px(x, T-1, sand); c.px(x, T-2, sand)
            c.px(x, T-3, FOAM if _n(x, 1, 3) > .6 else WATER_L)
    elif side == 'w':
        for y in range(T):
            c.px(0, y, sand); c.px(1, y, sand); c.px(2, y, FOAM if _n(1, y, 3) > .6 else WATER_L)
    elif side == 'e':
        for y in range(T):
            c.px(T-1, y, sand); c.px(T-2, y, sand); c.px(T-3, y, FOAM if _n(1, y, 3) > .6 else WATER_L)

TREE = hx('#2f6e34'); TREE_L = hx('#41924a'); TREE_D = hx('#1f4e26'); TRUNK = hx('#6e4a2a')

def forest(c, seed=0):
    """tiling dense-canopy forest mass."""
    _fill(c, TREE)
    for y in range(T):
        for x in range(T):
            r = _n(x, y, seed+2)
            if r > 0.8:
                c.px(x, y, TREE_L)
            elif r < 0.2:
                c.px(x, y, TREE_D)
    # blobby clumps
    for i in range(3):
        bx = int(_n(i, seed, 1)*12)+2; by = int(_n(seed, i, 2)*12)+2
        c.disc(bx, by, 2, TREE_L); c.disc(bx, by+2, 1, TREE_D)

def tree(c):
    """a single round tree object on transparent bg (16x20)."""
    pass  # trees authored as objects in buildings.py

FENCE = hx('#8a6a44'); FENCE_D = hx('#5e4528')

def fence_h(c):
    # transparent except the rail
    c.rect(0, 6, T-1, 8, FENCE); c.hline(0, T-1, 6, shade(FENCE, 1.15)); c.hline(0, T-1, 8, FENCE_D)
    for x in (2, 8, 14):
        c.rect(x, 3, x+1, 12, FENCE); c.vline(x, 3, 12, shade(FENCE, 1.15)); c.vline(x+1, 3, 12, FENCE_D)

STONE = hx('#9aa0a8'); STONE_L = hx('#b6bcc4'); STONE_D = hx('#767c86')

def plaza(c, seed=0):
    _fill(c, STONE)
    # paving grid
    for y in range(T):
        for x in range(T):
            if (x % 8 == 0) or (y % 8 == 0):
                c.px(x, y, STONE_D)
            elif _n(x, y, seed+4) > 0.9:
                c.px(x, y, STONE_L)
    c.hline(1, 6, 1, STONE_L); c.hline(9, 14, 1, STONE_L)

def bridge_h(c):
    wood = hx('#b3824a'); wd = hx('#7e5a2e'); wl = hx('#c89c5e')
    _fill(c, wood)
    for x in range(T):
        if x % 3 == 0:
            c.vline(x, 0, T-1, wd)
        if _n(x, 0, 5) > 0.7:
            c.vline(x, 0, T-1, wl)
    c.hline(0, T-1, 0, wd); c.hline(0, T-1, T-1, wd)

def bridge_v(c):
    wood = hx('#b3824a'); wd = hx('#7e5a2e'); wl = hx('#c89c5e')
    _fill(c, wood)
    for y in range(T):
        if y % 3 == 0:
            c.hline(0, T-1, y, wd)
        if _n(0, y, 5) > 0.7:
            c.hline(0, T-1, y, wl)
    c.vline(0, 0, T-1, wd); c.vline(T-1, 0, T-1, wd)

CLIFF = hx('#b48c58'); CLIFF_L = hx('#c8a06a'); CLIFF_D = hx('#8a6840'); CLIFF_K = hx('#6a4e30')

def cliff(c, seed=0):
    _fill(c, CLIFF)
    for y in range(T):
        for x in range(T):
            r = _n(x, y, seed+8)
            if r > 0.85:
                c.px(x, y, CLIFF_L)
            elif r < 0.18:
                c.px(x, y, CLIFF_D)
    # vertical striations
    for x in range(2, T, 5):
        for y in range(T):
            if _n(x, y, 9) > 0.4:
                c.px(x, y, CLIFF_K)

def cliff_top(c):
    grass(c, 3)
    for x in range(T):
        c.px(x, T-1, CLIFF_D); c.px(x, T-2, CLIFF)

def sand(c, seed=0):
    s = hx('#d6c08a'); sl = hx('#e6d29a'); sd = hx('#b89c64')
    _fill(c, s)
    for y in range(T):
        for x in range(T):
            r = _n(x, y, seed+6)
            if r > 0.88:
                c.px(x, y, sl)
            elif r < 0.14:
                c.px(x, y, sd)

def stairs(c):
    st = hx('#a8aeb6'); sd = hx('#787e88'); sl = hx('#c2c8d0')
    _fill(c, st)
    for y in range(0, T, 4):
        c.hline(0, T-1, y, sl); c.hline(0, T-1, y+3, sd)

def tallgrass(c, seed=0):
    """encounter grass - darker base with upright blades."""
    base = hx('#4c7e30'); d = hx('#37601f'); l = hx('#69a040')
    _fill(c, base)
    for y in range(T):
        for x in range(T):
            r = _n(x, y, seed+14)
            if r < 0.2:
                c.px(x, y, d)
    for bx in range(1, T, 3):
        h = 4 + int(_n(bx, seed, 5)*3)
        for yy in range(T-h, T):
            c.px(bx, yy, l if yy < T-1 else d)
            c.px(bx+1, yy, base)
        c.px(bx, T-h, l)
    c.hline(0, T-1, T-1, d)


def darkgrass(c, seed=0):
    base = hx('#33502a'); l = hx('#436a36'); d = hx('#223a1c')
    _fill(c, base)
    for y in range(T):
        for x in range(T):
            r = _n(x, y, seed+12)
            if r > 0.85:
                c.px(x, y, l)
            elif r < 0.15:
                c.px(x, y, d)

# ---- registry & atlas ---------------------------------------------------

TILES = {
    'grass': lambda c: grass(c, 0),
    'grass2': lambda c: grass(c, 4),
    'flower': lambda c: grass_flower(c, 1),
    'path': lambda c: path(c, 0),
    'path_n': lambda c: path_edge_grass(c, 'n'),
    'path_s': lambda c: path_edge_grass(c, 's'),
    'path_w': lambda c: path_edge_grass(c, 'w'),
    'path_e': lambda c: path_edge_grass(c, 'e'),
    'water': lambda c: water(c, 0),
    'water2': lambda c: water(c, 1),
    'shore_n': lambda c: water_shore(c, 'n'),
    'shore_s': lambda c: water_shore(c, 's'),
    'shore_w': lambda c: water_shore(c, 'w'),
    'shore_e': lambda c: water_shore(c, 'e'),
    'forest': lambda c: forest(c, 0),
    'forest2': lambda c: forest(c, 5),
    'fence': fence_h,
    'plaza': lambda c: plaza(c, 0),
    'bridge_h': bridge_h,
    'bridge_v': bridge_v,
    'cliff': lambda c: cliff(c, 0),
    'cliff_top': cliff_top,
    'sand': lambda c: sand(c, 0),
    'stairs': stairs,
    'darkgrass': lambda c: darkgrass(c, 0),
    'tallgrass': lambda c: tallgrass(c, 0),
}

def render_tile(name, transparent=False):
    c = Canvas(T, T)
    TILES[name](c)
    return c.img()

def build_atlas(cols=8):
    names = list(TILES.keys())
    rows = (len(names)+cols-1)//cols
    atlas = Image.new('RGBA', (cols*T, rows*T), (0, 0, 0, 0))
    index = {}
    for i, name in enumerate(names):
        im = render_tile(name)
        cx, cy = (i % cols)*T, (i//cols)*T
        atlas.alpha_composite(im, (cx, cy))
        index[name] = [i % cols, i//cols]
    return atlas, index, cols, rows
