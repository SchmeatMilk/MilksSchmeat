"""Rebuild Training Grounds + Forest of Death in the new scrolling format,
preserving original NPCs, encounters, warps and the Orochimaru boss."""
import os, json

HERE = os.path.dirname(__file__)
PROJ = os.path.abspath(os.path.join(HERE, '..', '..'))


def blank(w, h, ch='.'):
    return [[ch for _ in range(w)] for _ in range(h)]


def to_strings(g):
    return [''.join(r) for r in g]


# ----------------------------------------------------- Training Grounds ----

def training_grounds():
    W, H = 24, 18
    g = blank(W, H, '.')
    def rect(x0, y0, x1, y1, ch):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                g[y][x] = ch
    # forest border
    rect(0, 0, W-1, 0, 'T'); rect(0, H-1, W-1, H-1, 'T')
    rect(0, 0, 0, H-1, 'T'); rect(W-1, 0, W-1, H-1, 'T')
    # entrance gap (top centre) -> path down
    g[0][11] = 'P'
    for y in range(1, 6):
        g[y][11] = 'P'; g[y][12] = 'P'
    # central sparring clearing (sand) with the three logs
    rect(8, 6, 15, 11, 's')
    # tall-grass training fields (encounters)
    rect(2, 3, 7, 8, ','); rect(16, 3, 21, 8, ',')
    rect(2, 11, 9, 15, ','); rect(15, 11, 21, 15, ',')
    # a pond
    rect(3, 10, 6, 13, 'W')
    g = to_strings(g)
    props = [{'type': 'post', 'cell': c} for c in ([9, 8], [11, 8], [13, 8])]
    props += [{'type': 'memorial_stone', 'cell': [15, 9]}]
    props += [{'type': 'tree', 'cell': c} for c in ([2, 2], [21, 2], [2, 16], [21, 16], [12, 14])]
    npcs = [
        {'id': 'guy', 'sprite': 'rock_lee', 'name': 'Might Guy', 'cell': [12, 11], 'facing': 'down',
         'dialogue': ['YOUTH! Train in the tall grass and wild challengers will find you!',
                      'Defeat them for experience — or weaken them and SEAL A CONTRACT!'],
         'action': ''}]
    warps = [{'cell': [11, 0], 'to_map': 'konoha', 'to_cell': [20, 29], 'label': 'Konoha'}]
    return {
        'id': 'training_grounds', 'name': 'Training Grounds', 'music': 'route_theme',
        'size': [W, H], 'spawn': [11, 2], 'grid': g, 'props': props, 'buildings': [],
        'npcs': npcs, 'warps': warps,
        'encounters': {'rate': 0.18, 'table': [
            {'unit': 'leaf_genin', 'weight': 50, 'min_level': 3, 'max_level': 6},
            {'unit': 'forest_snake', 'weight': 25, 'min_level': 3, 'max_level': 5},
            {'unit': 'giant_centipede', 'weight': 20, 'min_level': 3, 'max_level': 5},
            {'unit': 'shikamaru', 'weight': 3, 'min_level': 6, 'max_level': 8},
            {'unit': 'kiba', 'weight': 2, 'min_level': 6, 'max_level': 8}]}}


# ----------------------------------------------------- Forest of Death -----

def forest_of_death():
    W, H = 26, 18
    g = blank(W, H, 'D')           # dark grass base
    def rect(x0, y0, x1, y1, ch):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                g[y][x] = ch
    # solid forest walls forming a loose maze
    rect(0, 0, W-1, 0, 'T'); rect(0, H-1, W-1, H-1, 'T')
    rect(0, 0, 0, H-1, 'T'); rect(W-1, 0, W-1, H-1, 'T')
    for (x0, y0, x1, y1) in [(3, 2, 4, 9), (7, 4, 12, 5), (15, 2, 16, 8),
                             (6, 9, 14, 10), (18, 6, 22, 7), (9, 13, 18, 14),
                             (20, 10, 21, 15), (4, 12, 5, 15)]:
        rect(x0, y0, x1, y1, 'T')
    # tall-grass undergrowth (encounters) everywhere between walls
    for (x0, y0, x1, y1) in [(1, 1, 2, 8), (5, 2, 6, 8), (8, 6, 11, 9),
                             (17, 9, 19, 13), (6, 11, 8, 12), (11, 11, 17, 12),
                             (22, 2, 24, 9)]:
        rect(x0, y0, x1, y1, ',')
    # entrance + a murky stream
    g[5][0] = 'P'; g[5][1] = 'P'
    rect(13, 3, 14, 12, 'W')
    g[8][13] = 'B'; g[8][14] = 'B'      # log bridge over the stream
    g = to_strings(g)
    props = [{'type': 'darktree', 'cell': c} for c in
             ([2, 10], [8, 3], [23, 11], [17, 16], [10, 16], [24, 4], [3, 16])]
    props += [{'type': 'chainlink_gate', 'cell': [1, 4]}]
    buildings_fod = [{'type': 'forest_tower', 'cell': [9, 5], 'name': 'Central Tower'}]
    npcs = [
        {'id': 'anko', 'sprite': 'villager_f', 'name': 'Anko Mitarashi', 'cell': [2, 6], 'facing': 'down',
         'dialogue': ['Exam rules: reach the far corner of the forest alive.',
                      "Something in here is wearing a face that isn't theirs. Watch your back."],
         'action': ''},
        {'id': 'orochimaru_boss', 'sprite': 'orochimaru', 'name': 'Disguised Genin',
         'cell': [22, 13], 'facing': 'down',
         'dialogue': ['Kukuku... such promising material walks into my forest.',
                      'Show me what your contract bonds are worth!'],
         'action': 'boss_battle',
         'boss': {'party': [['forest_snake', 9], ['sound_genin', 10], ['orochimaru', 12]],
                  'flag': 'forest_of_death_cleared',
                  'reward_items': {'scroll_of_heaven': 1, 'scroll_of_earth': 1},
                  'reward_ryo': 1500,
                  'victory_text': 'The figure peels away into mud and snakes. You claim both scrolls — the exam is yours.'}}]
    warps = [{'cell': [0, 5], 'to_map': 'konoha', 'to_cell': [39, 27], 'label': 'Konoha'}]
    return {
        'id': 'forest_of_death', 'name': 'Forest of Death — Area 44', 'music': 'dungeon_theme',
        'size': [W, H], 'spawn': [2, 5], 'grid': g, 'props': props, 'buildings': buildings_fod,
        'npcs': npcs, 'warps': warps,
        'encounters': {'rate': 0.22, 'table': [
            {'unit': 'forest_snake', 'weight': 35, 'min_level': 6, 'max_level': 10},
            {'unit': 'giant_centipede', 'weight': 30, 'min_level': 6, 'max_level': 10},
            {'unit': 'sound_genin', 'weight': 25, 'min_level': 7, 'max_level': 11},
            {'unit': 'mist_swordsman', 'weight': 8, 'min_level': 8, 'max_level': 12},
            {'unit': 'haku', 'weight': 2, 'min_level': 10, 'max_level': 12}]}}


if __name__ == '__main__':
    for fn in (training_grounds, forest_of_death):
        m = fn()
        out = os.path.join(PROJ, 'data', 'maps', m['id'] + '.json')
        json.dump(m, open(out, 'w'), indent=1)
        print('wrote', m['id'], m['size'])
