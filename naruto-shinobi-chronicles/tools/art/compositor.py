"""Renders a map dict to a PNG exactly as the Godot engine will draw it:
ground tiles -> auto water-shore overlay -> props -> buildings -> npcs/player.
Used to design + verify the overworld before/independent of running Godot."""
import os, json
from PIL import Image
import tiles as TL
from buildings import BUILDINGS
from ninja import draw_dir
from roster import OVER

T = 16
HERE = os.path.dirname(__file__)
PROJ = os.path.abspath(os.path.join(HERE, '..', '..'))

with open(os.path.join(PROJ, 'data', 'visuals', 'tiles.json')) as f:
    TJSON = json.load(f)
LEGEND = TJSON['legend']

_tile_cache = {}
def tile_img(name):
    if name not in _tile_cache:
        _tile_cache[name] = TL.render_tile(name)
    return _tile_cache[name]

_b_cache = {}
def building_img(name):
    if name not in _b_cache:
        _b_cache[name] = BUILDINGS[name]()
    return _b_cache[name]

def npc_img(key, d='down'):
    spec = OVER.get(key, OVER['leaf_genin'])
    return draw_dir(spec, d, 0)


def render_map(m, player_cell=None, player_key='naruto'):
    grid = m['grid']
    h = len(grid); w = max(len(r) for r in grid)
    img = Image.new('RGBA', (w*T, h*T), (20, 30, 40, 255))
    # 1) ground
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            name = LEGEND.get(ch, 'grass')
            img.alpha_composite(tile_img(name), (x*T, y*T))
    # 2) water shore overlay
    def is_water(x, y):
        if 0 <= y < h and 0 <= x < len(grid[y]):
            return LEGEND.get(grid[y][x], 'grass') in ('water',)
        return True
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if LEGEND.get(ch, 'grass') != 'water':
                continue
            for side, (dx, dy) in (('n', (0, -1)), ('s', (0, 1)), ('w', (-1, 0)), ('e', (1, 0))):
                if not is_water(x+dx, y+dy):
                    img.alpha_composite(tile_img('shore_'+side), (x*T, y*T))
    # 3) props (trees, fences, lamps) bottom-anchored
    for p in m.get('props', []):
        bi = building_img(p['type'])
        cx, cy = p['cell']
        img.alpha_composite(bi, (cx*T, cy*T + T - bi.height))
    # 4) buildings (top-left anchored at cell)
    for b in m.get('buildings', []):
        bi = building_img(b['type'])
        cx, cy = b['cell']
        img.alpha_composite(bi, (cx*T, cy*T))
    # 5) npcs (bottom-center anchored on their cell)
    for n in m.get('npcs', []):
        key = n.get('sprite', n.get('id', 'leaf_genin'))
        s = npc_img(key, n.get('facing', 'down'))
        cx, cy = n['cell']
        ox = cx*T + (T - s.width)//2
        oy = cy*T + T - s.height + 2
        img.alpha_composite(s, (ox, oy))
    # 6) player
    if player_cell is not None:
        s = npc_img(player_key, 'down')
        cx, cy = player_cell
        ox = cx*T + (T - s.width)//2; oy = cy*T + T - s.height + 2
        img.alpha_composite(s, (ox, oy))
    return img


def render_viewport(m, player_cell, vw=256, vh=192, player_key='naruto', scale=3):
    """Crop a camera viewport centred on the player, like the in-game camera."""
    full = render_map(m, player_cell, player_key)
    px = player_cell[0]*T + T//2
    py = player_cell[1]*T + T//2
    cx = max(vw//2, min(full.width - vw//2, px))
    cy = max(vh//2, min(full.height - vh//2, py))
    box = (cx-vw//2, cy-vh//2, cx+vw//2, cy+vh//2)
    crop = full.crop(box)
    return crop.resize((vw*scale, vh*scale), Image.NEAREST)
