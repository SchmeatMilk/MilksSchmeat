"""Export tile atlas + building props into assets/, and write the
data/visuals manifests the Godot DataRegistry will consume."""
import os, json
import tiles as TILES_MOD
from tiles import build_atlas, T
from buildings import BUILDINGS
from roster import OVER

HERE = os.path.dirname(__file__)
PROJ = os.path.abspath(os.path.join(HERE, '..', '..'))
A = lambda *p: os.path.join(PROJ, 'assets', *p)
V = lambda *p: os.path.join(PROJ, 'data', 'visuals', *p)

# char -> ground tile name (full opaque ground tiles only)
LEGEND = {
    '.': 'grass', ',': 'tallgrass', ':': 'flower', 'g': 'grass2',
    'P': 'path', 'W': 'water', 'B': 'bridge_h', 'b': 'bridge_v',
    'C': 'cliff', '^': 'cliff_top', 'S': 'stairs', '#': 'plaza',
    'D': 'darkgrass', 'T': 'forest', 's': 'sand',
}
SOLID = ['W', 'C', 'T']           # ground chars that block movement
ENCOUNTER = [',']                  # tall grass triggers wild rolls
ANIM = {'water': ['water', 'water2']}


def export_tiles():
    atlas, index, cols, rows = build_atlas(cols=8)
    os.makedirs(A('tiles'), exist_ok=True)
    atlas.save(A('tiles', 'konoha_tiles.png'))
    data = {
        'atlas': 'res://assets/tiles/konoha_tiles.png',
        'tile_size': T, 'cols': cols, 'rows': rows,
        'index': index, 'legend': LEGEND, 'solid': SOLID,
        'encounter': ENCOUNTER, 'anim': ANIM,
    }
    os.makedirs(V(), exist_ok=True)
    json.dump(data, open(V('tiles.json'), 'w'), indent=1)
    print(f"tiles atlas {atlas.size} ({len(index)} tiles)")


def export_buildings():
    os.makedirs(A('buildings'), exist_ok=True)
    meta = {}
    for name, fn in BUILDINGS.items():
        im = fn()
        im.save(A('buildings', name + '.png'))
        meta[name] = {'sprite': f'res://assets/buildings/{name}.png',
                      'w': im.width, 'h': im.height,
                      'tw': (im.width+T-1)//T, 'th': (im.height+T-1)//T}
    json.dump(meta, open(V('buildings.json'), 'w'), indent=1)
    print(f"buildings: {len(meta)}")


def export_units():
    import os as _os
    data = {}
    bdir = A('sprites', 'units', 'battle')
    for key in OVER:
        ow = f'res://assets/sprites/units/overworld/{key}.png'
        entry = {'overworld': ow}
        if _os.path.exists(_os.path.join(bdir, key + '.png')):
            entry['battle'] = f'res://assets/sprites/units/battle/{key}.png'
        data[key] = entry
    # creature/battle-only units
    for ck in ('forest_snake', 'giant_centipede', 'custom_template'):
        bp = _os.path.join(bdir, ck + '.png')
        if _os.path.exists(bp):
            data.setdefault(ck, {})['battle'] = f'res://assets/sprites/units/battle/{ck}.png'
    json.dump(data, open(V('units.json'), 'w'), indent=1)
    print(f"units visual map: {len(data)}")


if __name__ == '__main__':
    export_tiles()
    export_buildings()
    export_units()
