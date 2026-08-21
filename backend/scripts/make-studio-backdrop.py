"""
Seamless cream studio backdrop for FASHN's `background_reference`.

Vertical linear gradient #F7F0E6 (top) -> #EFE2D2 (bottom), 1600x2000.
No props, no floor line, no vignette, no visible seam: the whole point of this
asset is that it contributes nothing but an even tone, so that every generation
lands on an identical backdrop and whatever variation is left in a batch comes
from the pose/seed rather than from a background the model reinvented that run.

WHY THESE TONES AND NOT THE SITE'S OWN #FAF6F1. That token is a UI surface,
where it sits behind text in small areas and reads correctly as cream. Stretched
across a 1600x2000 field it is only 9 points of separation between its red and
blue channels, and a flat plane that pale reads as plain white — which is what
it looked like in the first version of this file. The ramp below is warmer on
purpose. It is deliberately NOT tied to the palette in styles.css: this is
photographic set dressing, not a UI surface, and it should be retuned by looking
at generated photos rather than by whatever the site's chrome is doing.

Kept restrained rather than fully beige because the catalogue is largely pale
garments, and a backdrop much warmer than this casts a visible tint onto white
and ivory dresses and flattens the separation between garment and wall.

WHY IT IS DITHERED, AND WHY WITH A BAYER MATRIX
A 2000px ramp spanning ~10 levels per channel quantises to ~10 hard horizontal
steps in 8-bit — visible banding, and banding is exactly the kind of structure a
diffusion model will latch onto and amplify into a "seam" in the output. So the
gradient is computed in float and dithered before quantising.

The dither pattern is an 8x8 ordered (Bayer) matrix rather than random noise.
Both kill the banding equally well; the ordered one is periodic, so PNG's row
filters and deflate compress it to ~35KB where random noise produced a 2.2MB
file for the identical visual result. FASHN fetches this URL on every single
generation, so that difference is worth the four extra lines.

Deterministic by construction — no RNG — so re-running this reproduces the
exact same bytes.
"""
import os

import numpy as np
from PIL import Image

W, H = 1600, 2000
TOP = (0xF7, 0xF0, 0xE6)      # warm cream
BOTTOM = (0xEF, 0xE2, 0xD2)   # slightly deeper and warmer toward the floor
OUT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "studio-backdrop-cream-1600x2000.png",
)

t = np.linspace(0.0, 1.0, H, dtype=np.float64).reshape(H, 1, 1)
top = np.array(TOP, dtype=np.float64).reshape(1, 1, 3)
bottom = np.array(BOTTOM, dtype=np.float64).reshape(1, 1, 3)
grad = np.repeat(top + (bottom - top) * t, W, axis=1)

BAYER8 = np.array([
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
], dtype=np.float64)
threshold = (BAYER8 + 0.5) / 64.0 - 0.5
tile = np.tile(threshold, (H // 8 + 1, W // 8 + 1))[:H, :W][:, :, None]

img = np.clip(np.rint(grad + tile), 0, 255).astype(np.uint8)
Image.fromarray(img, mode="RGB").save(OUT, format="PNG", optimize=True)

print("size      :", (W, H))
print("bytes     :", os.path.getsize(OUT))
print("top-left  :", tuple(int(v) for v in img[0, 0]))
print("mid       :", tuple(int(v) for v in img[H // 2, W // 2]))
print("bottom-rt :", tuple(int(v) for v in img[H - 1, W - 1]))
# Largest step between adjacent rows, per channel — 1 means no banding.
rows = img[:, 0, :].astype(int)
print("max row-to-row step:", int(np.abs(np.diff(rows, axis=0)).max()))
