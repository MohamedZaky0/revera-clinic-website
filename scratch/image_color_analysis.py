from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Pillow is not installed')

import numpy as np

path = Path('public/images/assets/diffrent/1a.jpg')
img = Image.open(path).convert('RGB')
arr = np.array(img)

w = arr.shape[1]
left = arr[:, : w // 2]
right = arr[:, (w * 3) // 4 :]

print('size', img.size)
print('left avg', np.round(left.reshape(-1, 3).mean(axis=0)).astype(int).tolist())
print('right avg', np.round(right.reshape(-1, 3).mean(axis=0)).astype(int).tolist())
print('left med', np.median(left.reshape(-1, 3), axis=0).astype(int).tolist())
print('right med', np.median(right.reshape(-1, 3), axis=0).astype(int).tolist())
