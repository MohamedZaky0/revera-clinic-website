from PIL import Image
from pathlib import Path
import shutil

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

def ahash(img, size=8):
    img = img.convert("L").resize((size, size), Image.Resampling.LANCZOS)
    pixels = list(img.getdata())
    avg = sum(pixels) / len(pixels)
    bits = ''.join('1' if p > avg else '0' for p in pixels)
    return bits

def hamming(a, b):
    return sum(ch1 != ch2 for ch1, ch2 in zip(a, b))

root = Path(__file__).resolve().parent.parent
main_path = root / 'public' / 'images' / 'main_logo.png'
if not main_path.exists():
    print('ERROR: main_logo.png not found at', main_path)
    raise SystemExit(1)

main_img = Image.open(main_path)
main_hash = ahash(main_img)

candidates = []
for p in (root / 'public' / 'images').rglob('*'):
    if p.is_dir():
        continue
    if p.samefile(main_path):
        continue
    if p.suffix.lower() not in ALLOWED_EXT:
        continue
    try:
        img = Image.open(p)
    except Exception as e:
        # skip unreadable formats
        # print('skip', p, e)
        continue
    try:
        h = ahash(img)
    except Exception:
        continue
    d = hamming(main_hash, h)
    candidates.append((p, d))

# sort by distance
candidates.sort(key=lambda x: x[1])

THRESHOLD = 10
replaced = []
for p, d in candidates:
    if d <= THRESHOLD:
        bak = p.with_suffix(p.suffix + '.bak')
        if not bak.exists():
            shutil.copy2(p, bak)
        shutil.copy2(main_path, p)
        replaced.append((p, d))
        print(f'Replaced: {p} (distance={d})')
    else:
        print(f'Ignored:  {p} (distance={d})')

print(f"Total files scanned: {len(candidates)}")
print(f"Total replaced: {len(replaced)}")
if replaced:
    print('Backups are saved with the original filename plus the image extension ".bak"')
