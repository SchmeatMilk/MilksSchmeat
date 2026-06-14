"""Procedurally builds the scrolling Konoha hub and writes data/maps/konoha.json.
Layout follows the FireRed-style reference: Hokage Rock cliff + central round
Hokage Tower, plaza, river+bridge, Academy/Hospital east, shopping+residential
west, two Ichiraku Ramen heal-stalls, south gate, Forest-of-Death SE exit."""
import os, json

W, H = 44, 32
HERE = os.path.dirname(__file__)
PROJ = os.path.abspath(os.path.join(HERE, '..', '..'))

g = [['.' for _ in range(W)] for _ in range(H)]

def rect(x0, y0, x1, y1, ch):
    for y in range(max(0, y0), min(H, y1+1)):
        for x in range(max(0, x0), min(W, x1+1)):
            g[y][x] = ch

def hline(y, x0, x1, ch):
    for x in range(x0, x1+1):
        g[y][x] = ch

def vline(x, y0, y1, ch):
    for y in range(y0, y1+1):
        g[y][x] = ch

# --- terrain base --------------------------------------------------------
# Hokage Rock cliff band along the top
rect(0, 0, W-1, 3, 'C')
hline(4, 0, W-1, '^')
# forest border (sides + bottom)
rect(0, 4, 1, H-1, 'T'); rect(W-2, 4, W-1, H-1, 'T')
rect(0, H-2, W-1, H-1, 'T')
# river: down the east third, feeding a pond, crossed by a bridge
rect(34, 5, 36, H-3, 'W')
rect(33, 12, 37, 17, 'W')          # pond bulge
hline(13, 34, 36, 'B')             # wooden bridge across the river
# main vertical avenue + central plaza
vline(21, 9, H-3, 'P'); vline(22, 9, H-3, 'P')
rect(15, 14, 27, 19, '#')          # stone plaza
vline(21, 14, 19, 'P'); vline(22, 14, 19, 'P')
# cross avenues
hline(18, 4, 33, 'P'); hline(19, 4, 33, 'P')
hline(10, 6, 33, 'P')
# connector paths to building doors
vline(7, 10, 18, 'P'); vline(31, 10, 23, 'P'); vline(28, 16, 19, 'P'); vline(9, 18, 25, 'P')
# tall-grass patch leading to the Forest of Death (SE)
rect(37, 24, 41, 29, ','); g[29][41] = ','
vline(40, 19, 24, 'P')
# flower beds dressing the plaza
g[15][16] = ':'; g[15][26] = ':'; g[18][16] = ':'; g[18][26] = ':'
# south-gate doorway: walkable path through the gate down to the exit warp
for yy in (28, 29, 30):
    g[yy][20] = 'P'; g[yy][21] = 'P'

grid = [''.join(r) for r in g]

# --- buildings (cell = top-left tile) -----------------------------------
buildings = [
    {'type': 'hokage_faces', 'cell': [14, 0], 'name': 'Hokage Rock'},
    {'type': 'hokage_tower', 'cell': [18, 5], 'name': 'Hokage Tower'},
    {'type': 'academy', 'cell': [28, 6], 'name': 'Ninja Academy'},
    {'type': 'hospital', 'cell': [29, 20], 'name': 'Konoha Hospital'},
    {'type': 'shop', 'cell': [5, 11], 'name': 'Tool Shop'},
    {'type': 'ramen', 'cell': [24, 11], 'name': 'Ichiraku Ramen'},
    {'type': 'ramen', 'cell': [6, 21], 'name': 'Ichiraku Ramen (West)'},
    {'type': 'house0', 'cell': [4, 24]}, {'type': 'house1', 'cell': [11, 24]},
    {'type': 'house2', 'cell': [14, 7]}, {'type': 'house3', 'cell': [11, 11]},
    {'type': 'gate', 'cell': [18, 28], 'name': 'Konoha Main Gate',
     'door': [[2, 0], [3, 0], [2, 1], [3, 1], [2, 2], [3, 2]]},
]

# --- props ---------------------------------------------------------------
props = []
for c in [[3, 8], [4, 18], [13, 19], [27, 25], [32, 26], [16, 11], [3, 21],
          [33, 8], [26, 24], [12, 19], [38, 6], [40, 12]]:
    props.append({'type': 'tree', 'cell': c})
for c in [[20, 9], [23, 9], [20, 27], [23, 27], [19, 16], [24, 16]]:
    props.append({'type': 'lamp', 'cell': c})

# --- npcs (sprite by id; actions reuse existing engine handlers) ---------
npcs = [
    {'id': 'hokage', 'name': 'Third Hokage', 'cell': [20, 10], 'facing': 'down',
     'dialogue': ['Welcome back, Commander.', 'Your squad is fully rested.',
                  'The Chunin Exams await in the Forest of Death — to the east.'],
     'action': 'heal_party'},
    {'id': 'teuchi', 'sprite': 'teuchi', 'name': 'Teuchi', 'cell': [26, 15], 'facing': 'down',
     'dialogue': ['One bowl of the usual? On the house, Commander!',
                  'Your whole squad looks livelier already!'],
     'action': 'heal_party'},
    {'id': 'ayame', 'sprite': 'ichiraku', 'name': 'Ichiraku Cook', 'cell': [8, 25], 'facing': 'up',
     'dialogue': ['Ramen heals all wounds. Slurp up!'],
     'action': 'heal_party'},
    {'id': 'shopkeep', 'sprite': 'shopkeep', 'name': 'Tool Shop Keeper', 'cell': [6, 15], 'facing': 'down',
     'dialogue': ['Tags, pills, and steel — everything a Commander needs.'],
     'action': 'open_shop'},
    {'id': 'iruka', 'sprite': 'iruka', 'name': 'Iruka Sensei', 'cell': [30, 10], 'facing': 'down',
     'dialogue': ['Type advantage wins fights.',
                  'Fire burns Wind. Wind cuts Lightning. Lightning splits Earth.',
                  'Earth dams Water. Water douses Fire. Yin breaks Yang, Yang shatters Yin.'],
     'action': ''},
    {'id': 'konohamaru', 'sprite': 'konohamaru', 'name': 'Konohamaru', 'cell': [24, 20], 'facing': 'left',
     'dialogue': ['One day I\'ll be Hokage, boss! Believe it!'], 'action': ''},
    {'id': 'medic', 'sprite': 'villager_f', 'name': 'Medic-nin', 'cell': [30, 23], 'facing': 'down',
     'dialogue': ['The hospital can mend any wound — but rest is the best medicine.'], 'action': ''},
    {'id': 'villager1', 'sprite': 'villager_m', 'name': 'Villager', 'cell': [12, 17], 'facing': 'down',
     'dialogue': ['The Will of Fire burns bright in Konoha.'], 'action': ''},
]

warps = [
    {'cell': [20, 30], 'to_map': 'training_grounds', 'to_cell': [7, 1], 'label': 'Training Grounds'},
    {'cell': [40, 29], 'to_map': 'forest_of_death', 'to_cell': [1, 5], 'label': 'Forest of Death'},
]

m = {
    'id': 'konoha', 'name': 'Konohagakure', 'music': 'town_theme',
    'size': [W, H], 'spawn': [21, 24],
    'grid': grid, 'buildings': buildings, 'props': props,
    'npcs': npcs, 'warps': warps,
    'encounters': {'rate': 0.0, 'table': []},
}

if __name__ == '__main__':
    out = os.path.join(PROJ, 'data', 'maps', 'konoha.json')
    json.dump(m, open(out, 'w'), indent=1)
    print('wrote', out, '| size', W, 'x', H)
