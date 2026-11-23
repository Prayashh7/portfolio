"""
Generates the static brand assets: social card, favicons, and the abstract cover
plate for each project. Covers are deliberately abstract rather than fake
screenshots - swap them for real captures from the admin dashboard.

  python3 make_assets.py <out-dir> <hero-portrait.png>
"""

import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

BG = (16, 11, 7)          # BGR of #07090D
PANEL = (23, 17, 13)      # BGR of #0D1117
CYAN = (238, 211, 34)     # BGR of #22D3EE
VIOLET = (246, 92, 139)   # BGR of #8B5CF6
INK = (250, 247, 245)     # BGR of #F5F7FA
MUTED = (110, 98, 88)

SS = 2  # supersample factor, everything is drawn 2x then downscaled

NARROW = '/usr/share/fonts/opentype/urw-base35/NimbusSansNarrow-Bold.otf'
MONO = '/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf'


def base(w, h, seed=1):
    """Shared substrate: near-black, faint grid, corner bloom, grain, vignette."""
    img = np.zeros((h, w, 3), np.float32)
    img[:, :] = BG

    step = int(w / 26)
    for x in range(0, w, step):
        img[:, x:x + 1] += 5
    for y in range(0, h, step):
        img[y:y + 1, :] += 5
    return img


def bloom(img, cx, cy, radius, colour, strength):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    g = np.clip(1 - d, 0, 1) ** 2 * strength
    return img + np.array(colour, np.float32) * g[:, :, None]


def finish(img, seed=1, vignette=0.55):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    img *= (1 - np.clip(d - 0.55, 0, 1) ** 1.6 * vignette)[:, :, None]
    rng = np.random.default_rng(seed)
    img += rng.normal(0, 2.4, img.shape).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)


def put_text(draw, text, xy, font, fill, tracking=0.0):
    """Draws text with optional letter tracking, in RGB, via PIL."""
    x, y = xy
    if tracking <= 0:
        draw.text((x, y), text, font=font, fill=fill)
        return
    step = font.size * tracking
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + step


# --------------------------------------------------------------------------- #
# Social card
# --------------------------------------------------------------------------- #

def social_card(portrait_path, out):
    w, h = 1200 * SS, 630 * SS
    img = base(w, h)
    img = bloom(img, w * 0.14, h * 1.05, w * 0.55, VIOLET, 0.30)
    img = bloom(img, w * 0.78, h * 0.30, w * 0.45, CYAN, 0.14)

    p = cv2.imread(portrait_path, cv2.IMREAD_UNCHANGED)
    ph = int(h * 1.18)
    p = cv2.resize(p, (int(p.shape[1] * ph / p.shape[0]), ph), interpolation=cv2.INTER_AREA)
    px = int(w * 0.60)
    pw = min(p.shape[1], w - px)
    region = img[0:h, px:px + pw]
    tile = p[0:h, 0:pw]
    a = (tile[:, :, 3:4].astype(np.float32) / 255.0) * 0.96
    img[0:h, px:px + pw] = tile[:, :, :3].astype(np.float32) * a + region * (1 - a)

    x = int(w * 0.062)
    plate = finish(img, 3, 0.35)
    pil = Image.fromarray(cv2.cvtColor(plate, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil)
    display = ImageFont.truetype(NARROW, int(h * 0.20))
    label = ImageFont.truetype(MONO, int(h * 0.046))
    small = ImageFont.truetype(MONO, int(h * 0.038))

    put_text(draw, 'PRAYASH', (x, int(h * 0.15)), display, (245, 247, 250))
    put_text(draw, 'BARTAULA', (x, int(h * 0.34)), display, (118, 132, 150))
    draw.line([(x, int(h * 0.60)), (x + int(w * 0.055), int(h * 0.60))],
              fill=(34, 211, 238), width=3 * SS)
    put_text(draw, 'FULL-STACK DEVELOPER', (x, int(h * 0.655)), label,
             (245, 247, 250), tracking=0.22)
    put_text(draw, 'HETAUDA, NEPAL  /  UTC+05:45', (x, int(h * 0.745)), small,
             (140, 152, 168), tracking=0.16)
    put_text(draw, 'prayashbartaula.com.np', (x, int(h * 0.86)), small,
             (139, 92, 246), tracking=0.10)

    plate = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    out_img = cv2.resize(plate, (1200, 630), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{out}/og-image.jpg', out_img, [cv2.IMWRITE_JPEG_QUALITY, 90])


# --------------------------------------------------------------------------- #
# Favicons - drawn as primitives so no SVG rasteriser is needed
# --------------------------------------------------------------------------- #

def favicon(out):
    for size, name in ((180, 'apple-touch-icon.png'), (64, 'favicon-64.png'),
                       (32, 'favicon-32.png')):
        s = size * 4
        img = np.zeros((s, s, 3), np.float32)
        img[:, :] = BG
        img = bloom(img, s * 0.15, s * 1.0, s * 0.9, VIOLET, 0.5)
        img = bloom(img, s * 0.9, s * 0.1, s * 0.8, CYAN, 0.22)
        img = np.clip(img, 0, 255).astype(np.uint8)

        stem_w = int(s * 0.115)
        x0, y0, y1 = int(s * 0.30), int(s * 0.22), int(s * 0.78)
        cv2.rectangle(img, (x0, y0), (x0 + stem_w, y1), INK, -1, cv2.LINE_AA)
        r = int(s * 0.165)
        cv2.ellipse(img, (x0 + stem_w, y0 + r), (r, r), 0, -90, 90, CYAN,
                    stem_w, cv2.LINE_AA)
        img = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)
        cv2.imwrite(f'{out}/{name}', img)

    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="64" x2="64" y2="0">
      <stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#22D3EE"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#07090D"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.3" fill="none"
        stroke="url(#g)" stroke-opacity="0.55" stroke-width="1.5"/>
  <rect x="19" y="14" width="7.5" height="36" fill="#F5F7FA"/>
  <path d="M26.5 17.5h6.5a10.5 10.5 0 0 1 0 21h-6.5" fill="none"
        stroke="#22D3EE" stroke-width="7.5"/>
</svg>
"""
    with open(f'{out}/favicon.svg', 'w') as fh:
        fh.write(svg)


# --------------------------------------------------------------------------- #
# Project covers - one motif per project, all cut from the same cloth
# --------------------------------------------------------------------------- #

def cover_panels(img):
    """Software company: a stack of isometric panels."""
    h, w = img.shape[:2]
    for i, (dx, dy, alpha) in enumerate([(0.0, 0.0, 0.10), (0.06, -0.10, 0.16),
                                         (0.12, -0.20, 0.24)]):
        cx, cy = w * (0.30 + dx), h * (0.60 + dy)
        pw, ph, skew = w * 0.36, h * 0.24, h * 0.15
        pts = np.array([[cx, cy - skew], [cx + pw, cy], [cx + pw, cy + ph],
                        [cx, cy + ph - skew]], np.int32)
        overlay = img.copy()
        cv2.fillPoly(overlay, [pts], (60, 46, 36), cv2.LINE_AA)
        img[:] = img * (1 - alpha) + overlay * alpha
        cv2.polylines(img, [pts], True, CYAN if i == 2 else (90, 76, 64),
                      2 * SS, cv2.LINE_AA)
    return img


def cover_routes(img):
    """Mero Bhariya: a delivery graph with one route traced across it."""
    h, w = img.shape[:2]
    rng = np.random.default_rng(4)
    xs = np.sort(rng.uniform(0.08, 0.94, 14))
    ys = rng.uniform(0.16, 0.86, 14)
    nodes = np.stack([xs * w, ys * h], 1).astype(np.int32)

    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if np.linalg.norm(nodes[i] - nodes[j]) < w * 0.20:
                cv2.line(img, tuple(nodes[i]), tuple(nodes[j]), (56, 47, 39),
                         1 * SS, cv2.LINE_AA)
    for n in nodes:
        cv2.circle(img, tuple(n), 4 * SS, (92, 80, 68), -1, cv2.LINE_AA)

    route = [1, 4, 6, 9, 12]  # already left-to-right: reads as a trip
    for a, b in zip(route, route[1:]):
        cv2.line(img, tuple(nodes[a]), tuple(nodes[b]), CYAN, 3 * SS, cv2.LINE_AA)
    for k, i in enumerate(route):
        cv2.circle(img, tuple(nodes[i]), 7 * SS, CYAN, -1, cv2.LINE_AA)
        if k == 0:
            for r in (0.045, 0.08, 0.125):
                cv2.circle(img, tuple(nodes[i]), int(w * r), CYAN, 1 * SS, cv2.LINE_AA)
    end = nodes[route[-1]]
    s = 13 * SS
    cv2.rectangle(img, (end[0] - s, end[1] - s), (end[0] + s, end[1] + s),
                  CYAN, 2 * SS, cv2.LINE_AA)
    return img


def cover_embers(img):
    """Game of Thrones: embers rising through a shaft of light."""
    h, w = img.shape[:2]
    shaft = np.zeros((h, w), np.float32)
    pts = np.array([[int(w * 0.42), 0], [int(w * 0.58), 0],
                    [int(w * 0.74), h], [int(w * 0.26), h]], np.int32)
    cv2.fillPoly(shaft, [pts], 1.0)
    shaft = cv2.GaussianBlur(shaft, (0, 0), w * 0.06)
    fall = np.linspace(1.0, 0.25, h, dtype=np.float32)[:, None]
    img += np.array((170, 140, 205), np.float32) * (shaft * fall)[:, :, None] * 0.30

    rng = np.random.default_rng(9)
    glow = np.zeros_like(img)
    for _ in range(150):
        y = h * (1.0 - rng.power(1.7))          # crowded low, thinning upward
        x = w * (0.5 + rng.normal(0, 0.17))
        if not 0 < x < w:
            continue
        r = int(rng.uniform(1.5, 5.0) * SS)
        warm = rng.random() < 0.55
        c = (95, 155, 240) if warm else VIOLET   # amber or violet
        cv2.circle(glow, (int(x), int(y)), r, c, -1, cv2.LINE_AA)
    img += cv2.GaussianBlur(glow, (0, 0), w * 0.012) * 1.6
    img += glow * 0.9
    return img


def cover_arcs(img):
    """Cafe: concentric rings, like a cup left on paper."""
    h, w = img.shape[:2]
    for i, r in enumerate(np.linspace(0.08, 0.46, 9)):
        colour = CYAN if i == 5 else (70, 62, 54)
        cv2.ellipse(img, (int(w * 0.50), int(h * 0.50)), (int(w * r), int(w * r)),
                    0, 200, 430, colour, (2 if i == 5 else 1) * SS, cv2.LINE_AA)
    cv2.line(img, (int(w * 0.06), int(h * 0.50)), (int(w * 0.94), int(h * 0.50)),
             (46, 40, 34), 1 * SS, cv2.LINE_AA)
    return img


def cover_plates(img):
    """Restaurant: a laid table seen from above."""
    h, w = img.shape[:2]
    for row in range(2):
        for col in range(4):
            cx, cy = w * (0.18 + col * 0.215), h * (0.34 + row * 0.34)
            r = int(w * 0.062)
            filled = (row, col) == (0, 2)
            cv2.circle(img, (int(cx), int(cy)), r, CYAN if filled else (74, 64, 55),
                       2 * SS if filled else 1 * SS, cv2.LINE_AA)
            cv2.circle(img, (int(cx), int(cy)), int(r * 0.55),
                       CYAN if filled else (58, 50, 43), 1 * SS, cv2.LINE_AA)
    for y in (0.17, 0.51, 0.85):
        cv2.line(img, (0, int(h * y)), (w, int(h * y)), (40, 35, 30), 1 * SS, cv2.LINE_AA)
    return img


COVERS = [
    ('cover-software-company', cover_panels, (0.30, 0.75, CYAN, 0.13)),
    ('cover-mero-bhariya', cover_routes, (0.72, 0.28, CYAN, 0.16)),
    ('cover-game-of-thrones', cover_embers, (0.50, 0.10, VIOLET, 0.20)),
    ('cover-cafe', cover_arcs, (0.52, 0.54, CYAN, 0.10)),
    ('cover-restaurant', cover_plates, (0.20, 0.20, VIOLET, 0.12)),
]


def covers(out):
    w, h = 1400 * SS, 900 * SS
    for i, (name, draw, (bx, by, bc, bs)) in enumerate(COVERS):
        img = base(w, h, i)
        img = bloom(img, w * bx, h * by, w * 0.55, bc, bs)
        img = draw(img)
        small = cv2.resize(finish(img, 10 + i, 0.5), (1400, 900), interpolation=cv2.INTER_AREA)
        cv2.imwrite(f'{out}/{name}.webp', small, [cv2.IMWRITE_WEBP_QUALITY, 88])


if __name__ == '__main__':
    out_dir, portrait = sys.argv[1], sys.argv[2]
    social_card(portrait, out_dir)
    favicon(out_dir)
    covers(out_dir)
    print('assets written to', out_dir)
