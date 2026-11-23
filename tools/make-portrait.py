"""
Turns a photograph into the stylised portrait + depth map used by the hero scene.

Two outputs per run:
  <name>.png        RGBA tri-tone portrait, cut out from its background
  <name>-depth.png  greyscale depth used to displace the point cloud in WebGL

Usage:
  python3 make_portrait.py <photo> <out-dir> <name> x0 y0 x1 y1 [--soft]

The crop box is given in normalised image coordinates. --soft dials the
stylisation back for secondary images (about section) so they stay readable
at smaller sizes.
"""

import sys
import cv2
import numpy as np

# Gradient map: luminance -> colour. Cool graphite shadows, neutral-warm highlights,
# which is what keeps the skin looking like skin inside a very blue palette.
RAMP = [
    (0.00, (5, 7, 11)),
    (0.20, (17, 23, 38)),
    (0.42, (54, 60, 86)),
    (0.66, (132, 140, 168)),
    (0.85, (218, 220, 230)),
    (1.00, (248, 246, 244)),
]

CYAN = np.array([34, 211, 238], np.float32)
VIOLET = np.array([139, 92, 246], np.float32)


def crop(img, box):
    h, w = img.shape[:2]
    x0, y0, x1, y1 = box
    return img[int(h * y0):int(h * y1), int(w * x0):int(w * x1)]


def build_alpha(bgr):
    """Cut the subject out. Green foliage is seeded as background, a central
    ellipse as foreground, then grabCut refines the boundary."""
    h, w = bgr.shape[:2]
    b, g, r = [bgr[:, :, i].astype(np.float32) for i in range(3)]

    mask = np.full((h, w), cv2.GC_PR_FGD, np.uint8)

    # Foliage: green channel dominant. Reliable here, the backdrop is a hedge.
    green = (g > r * 1.06) & (g > b * 1.04)
    mask[green] = cv2.GC_PR_BGD

    # Frame edges are background: top strip and the outer columns up high.
    mask[: int(h * 0.05), :] = cv2.GC_BGD
    mask[: int(h * 0.45), : int(w * 0.06)] = cv2.GC_BGD
    mask[: int(h * 0.45), int(w * 0.94):] = cv2.GC_BGD
    mask[green & (np.arange(h)[:, None] < h * 0.62)] = cv2.GC_BGD

    # Subject core: head ellipse + torso block, both well inside the silhouette.
    cv2.ellipse(mask, (int(w * 0.48), int(h * 0.30)), (int(w * 0.13), int(h * 0.13)),
                0, 0, 360, cv2.GC_FGD, -1)
    cv2.rectangle(mask, (int(w * 0.30), int(h * 0.62)),
                  (int(w * 0.70), h - 1), cv2.GC_FGD, -1)

    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, None, bgd, fgd, 7, cv2.GC_INIT_WITH_MASK)
    solid = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # Keep the largest blob, close gaps, fill interior holes.
    solid = cv2.morphologyEx(solid, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8), iterations=3)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, 8)
    if n > 1:
        keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        solid = np.where(labels == keep, 255, 0).astype(np.uint8)
    holes = cv2.bitwise_not(solid)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(holes, 4)
    for i in range(1, n):
        touches_edge = (stats[i, cv2.CC_STAT_TOP] == 0 or stats[i, cv2.CC_STAT_LEFT] == 0 or
                        stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT] >= h or
                        stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH] >= w)
        if not touches_edge:
            solid[labels == i] = 255

    solid = cv2.erode(solid, np.ones((5, 5), np.uint8), iterations=2)  # trim green fringe
    alpha = cv2.GaussianBlur(solid, (0, 0), 2.4).astype(np.float32) / 255.0
    return np.clip(alpha, 0, 1)


def head_mask(shape, blur_scale=0.07):
    """Soft mask over the head, used to keep the face the brightest thing."""
    h, w = shape
    m = np.zeros((h, w), np.float32)
    cv2.ellipse(m, (int(w * 0.48), int(h * 0.30)), (int(w * 0.21), int(h * 0.21)),
                0, 0, 360, 1.0, -1)
    return cv2.GaussianBlur(m, (0, 0), w * blur_scale)


def build_depth(bgr, alpha):
    """Pseudo-depth: silhouette bulge + head-forward bump + fine luminance relief."""
    h, w = alpha.shape
    binary = (alpha > 0.5).astype(np.uint8)

    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    if dist.max() > 0:
        dist /= dist.max()
    bulge = np.sqrt(dist)  # rounded bust rather than a flat card

    head = head_mask((h, w), blur_scale=0.06)

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    gray = cv2.bilateralFilter((gray * 255).astype(np.uint8), 9, 70, 70).astype(np.float32) / 255.0
    relief = gray - cv2.GaussianBlur(gray, (0, 0), w * 0.03)
    relief = np.clip(relief * 1.6, -0.12, 0.12)

    depth = 0.52 * bulge + 0.30 * head + relief
    depth = cv2.GaussianBlur(depth, (0, 0), 2.2)
    depth = np.clip(depth, 0, 1) * alpha
    if depth.max() > 0:
        depth /= depth.max()
    return depth


def gradient_map(lum):
    stops = np.array([s[0] for s in RAMP], np.float32)
    cols = np.array([s[1] for s in RAMP], np.float32)  # RGB
    out = np.empty(lum.shape + (3,), np.float32)
    for c in range(3):
        out[:, :, c] = np.interp(lum, stops, cols[:, c])
    return out


def stylise(bgr, alpha, soft=False):
    h, w = alpha.shape
    flat = cv2.bilateralFilter(bgr, 9, 75, 75)
    flat = cv2.bilateralFilter(flat, 9, 60, 60)

    lum = cv2.cvtColor(flat, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    lo, hi = np.percentile(lum[alpha > 0.5], [4, 97]) if (alpha > 0.5).any() else (0.0, 1.0)
    lum = np.clip((lum - lo) / max(hi - lo, 1e-3), 0, 1)
    lum = np.clip(lum * lum * (3 - 2 * lum), 0, 1)  # smoothstep: deepen shadows

    # Light the portrait rather than the photograph: lift the face, add a little
    # fill into its shadow side, and let the torso sink into the page so the
    # silhouette dissolves instead of ending in a hem.
    face = head_mask((h, w))
    lum = lum + face * (0.30 if not soft else 0.18) * (1.0 - lum)
    lum = lum + face * np.clip(0.22 - lum, 0, None) * 0.55  # fill, shadows only
    fade_from = 0.42 if not soft else 0.46
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    fade = np.clip((y - fade_from) / (1.0 - fade_from), 0, 1) ** 1.5
    lum *= 1.0 - fade * (0.92 if not soft else 0.72)
    # Vignette keyed to the head, not the frame: clothing never outshines the face.
    lum *= 1.0 - (0.16 if not soft else 0.34) * (1.0 - np.clip(face * 1.35, 0, 1))
    lum = np.clip(lum, 0, 1)

    if not soft:
        levels = 20  # posterise into planes, like a shaded render
        lum = np.floor(lum * levels) / (levels - 1)
        lum = cv2.GaussianBlur(np.clip(lum, 0, 1), (0, 0), 1.1)

    rgb = gradient_map(np.clip(lum, 0, 1))

    # Rim light from the silhouette normal: violet on the left, cyan on the right.
    gx = cv2.Sobel(alpha, cv2.CV_32F, 1, 0, ksize=5)
    edge = np.abs(cv2.Laplacian(alpha, cv2.CV_32F, ksize=5))
    if edge.max() > 0:
        edge /= edge.max()
    dist = cv2.distanceTransform((alpha > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    falloff = np.exp(-dist / (w * 0.055))
    rim = cv2.GaussianBlur(np.sqrt(edge), (0, 0), w * 0.008) * falloff * alpha
    rim /= max(rim.max(), 1e-3)
    rim *= 1.0 - fade * 0.65  # the rim fades out with the body
    left = np.clip(gx, 0, None); right = np.clip(-gx, 0, None)
    span = max(left.max(), right.max(), 1e-3)
    strength = 1.35 if not soft else 0.6
    for tint, side in ((VIOLET, left / span), (CYAN, right / span)):
        amount = (rim * cv2.GaussianBlur(side, (0, 0), w * 0.012) * strength)[:, :, None]
        rgb = rgb + (tint - rgb) * np.clip(amount, 0, 1) * 0.95

    # Ambient: violet from above, cyan from below, only where light already falls.
    ramp = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    ambient = VIOLET * (1 - ramp) + CYAN * ramp
    weight = (lum[:, :, None] * (0.12 if not soft else 0.06))
    rgb = rgb + (ambient - rgb) * weight

    # Bloom on the brightest planes.
    bright = np.clip(lum - 0.72, 0, None)[:, :, None] * rgb
    rgb = rgb + cv2.GaussianBlur(bright, (0, 0), w * 0.02) * (1.0 if not soft else 0.5)

    if not soft:  # faint horizontal scan lines: reads as captured volume
        lines = (np.sin(np.arange(h, dtype=np.float32) * np.pi / 2.0) * 0.5 + 0.5)[:, None, None]
        rgb *= 1.0 - 0.035 * lines
    rng = np.random.default_rng(7)
    rgb += rng.normal(0, 2.0, rgb.shape).astype(np.float32)  # grain kills banding

    return np.clip(rgb, 0, 255), fade


def main():
    src, out_dir, name = sys.argv[1], sys.argv[2], sys.argv[3]
    box = tuple(float(v) for v in sys.argv[4:8])
    soft = '--soft' in sys.argv

    img = crop(cv2.imread(src), box)
    target_h = 1200 if not soft else 1000
    img = cv2.resize(img, (int(img.shape[1] * target_h / img.shape[0]), target_h),
                     interpolation=cv2.INTER_AREA)

    alpha = build_alpha(img)
    rgb, fade = stylise(img, alpha, soft)
    depth = build_depth(img, alpha)
    # The body dissolves rather than ending in a hem, so the cutout has no edge.
    alpha = alpha * (1.0 - fade * (0.96 if not soft else 0.45))

    bgra = np.dstack([rgb[:, :, ::-1], alpha * 255]).astype(np.uint8)
    cv2.imwrite(f'{out_dir}/{name}.png', bgra, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    cv2.imwrite(f'{out_dir}/{name}.webp', bgra, [cv2.IMWRITE_WEBP_QUALITY, 92])

    # Depth is smooth, so half resolution is plenty for a displacement lookup.
    small = cv2.resize((depth * 255).astype(np.uint8),
                       (bgra.shape[1] // 2, bgra.shape[0] // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{out_dir}/{name}-depth.png', small, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    print(f'{name}: {bgra.shape[1]}x{bgra.shape[0]}  subject covers '
          f'{100 * (alpha > 0.5).mean():.1f}% of frame')


if __name__ == '__main__':
    main()
