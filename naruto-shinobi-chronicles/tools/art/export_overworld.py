"""Export every character's 72x128 overworld walk sheet into assets/."""
import os
from ninja import sheet, FW, FH
from roster import OVER

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets',
                   'sprites', 'units', 'overworld')
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)


def main():
    n = 0
    for key, spec in OVER.items():
        s = sheet(spec)
        s.save(os.path.join(OUT, key + '.png'))
        n += 1
    print(f"exported {n} overworld sheets ({FW*3}x{FH*4}) -> {OUT}")


if __name__ == '__main__':
    main()
