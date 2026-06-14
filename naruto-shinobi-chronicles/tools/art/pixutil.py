"""Shared pixel-art primitives for Naruto: Shinobi Chronicles asset generation.
Everything renders on an RGBA numpy canvas; helpers keep a single consistent
look (selective silhouette outline, 2-3 tone shading, fixed light from top-left).
"""
import numpy as np
from PIL import Image

# ---- color ---------------------------------------------------------------

def hx(s):
    s = s.lstrip('#')
    if len(s) == 6:
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)
    if len(s) == 8:
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), int(s[6:8], 16))
    raise ValueError(s)

def shade(c, f):
    """Multiply RGB by f (clamped), keep alpha."""
    return (max(0, min(255, int(c[0]*f))), max(0, min(255, int(c[1]*f))),
            max(0, min(255, int(c[2]*f))), c[3] if len(c) > 3 else 255)

def mix(a, b, t):
    return (int(a[0]*(1-t)+b[0]*t), int(a[1]*(1-t)+b[1]*t),
            int(a[2]*(1-t)+b[2]*t), 255)

OUTLINE = (24, 20, 28, 255)          # near-black, slightly warm
OUTLINE_SOFT = (52, 44, 58, 255)

# ---- canvas --------------------------------------------------------------

class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.a[int(y), int(x)] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1)+1):
            for x in range(int(x0), int(x1)+1):
                self.px(x, y, c)

    def hline(self, x0, x1, y, c):
        if x1 < x0:
            x0, x1 = x1, x0
        for x in range(int(x0), int(x1)+1):
            self.px(x, y, c)

    def vline(self, x, y0, y1, c):
        if y1 < y0:
            y0, y1 = y1, y0
        for y in range(int(y0), int(y1)+1):
            self.px(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c, fill=True):
        for y in range(int(cy-ry), int(cy+ry)+1):
            for x in range(int(cx-rx), int(cx+rx)+1):
                d = ((x-cx)/max(0.5, rx))**2 + ((y-cy)/max(0.5, ry))**2
                if (d <= 1.0) if fill else (0.6 <= d <= 1.0):
                    self.px(x, y, c)

    def disc(self, cx, cy, r, c):
        self.ellipse(cx, cy, r, r, c, True)

    def alpha(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.a[y, x, 3]
        return 0

    def opaque(self, x, y):
        return self.alpha(x, y) > 0

    def silhouette_outline(self, color=OUTLINE):
        """Add a 1px outline on transparent pixels orthogonally adjacent to opaque."""
        mask = self.a[:, :, 3] > 0
        out = np.zeros_like(mask)
        out[1:, :] |= mask[:-1, :]
        out[:-1, :] |= mask[1:, :]
        out[:, 1:] |= mask[:, :-1]
        out[:, :-1] |= mask[:, 1:]
        edge = out & (~mask)
        self.a[edge] = color

    def shadow_ground(self, cx, cy, rx, ry, c=(0, 0, 0, 70)):
        for y in range(int(cy-ry), int(cy+ry)+1):
            for x in range(int(cx-rx), int(cx+rx)+1):
                d = ((x-cx)/max(0.5, rx))**2 + ((y-cy)/max(0.5, ry))**2
                if d <= 1.0 and self.alpha(x, y) == 0:
                    self.px(x, y, c)

    def img(self):
        return Image.fromarray(self.a, 'RGBA')


def montage(images, cols, cell, bg=(38, 42, 50, 255), scale=1, labels=None,
            pad=4):
    from PIL import ImageDraw
    rows = (len(images)+cols-1)//cols
    cw, ch = cell
    M = Image.new('RGBA', (cw*cols, ch*rows), bg)
    d = ImageDraw.Draw(M)
    for i, im in enumerate(images):
        if scale != 1:
            im = im.resize((im.width*scale, im.height*scale), Image.NEAREST)
        cx = (i % cols)*cw + (cw-im.width)//2
        cy = (i//cols)*ch + (ch-im.height)//2 - 4
        M.alpha_composite(im, (cx, max(0, cy)))
        if labels:
            d.text(((i % cols)*cw+3, (i//cols)*ch+ch-11), labels[i], fill=(220, 224, 230, 255))
    return M
