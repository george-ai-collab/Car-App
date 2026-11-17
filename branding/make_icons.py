# Makes the app's logo files and Android icons from branding/logo-source.png
# (a black lizard on white). Run from the repo root:  python3 branding/make_icons.py
# Outputs:
#   branding/logo-white.png           white lizard on transparent (square)
#   branding/icon-512.png             red tile with white lizard (store / preview)
#   branding/icons/mipmap-*/          Android launcher icons (copied in by scripts/patch-android.mjs)
#   src/assets/logo-white.png, logo-tile.png   used inside the app
import os
from PIL import Image, ImageDraw, ImageFilter

RED = (230, 56, 70, 255)
src = Image.open("branding/logo-source.png").convert("L")
# Solid shape only: anything darker than mid-grey is lizard (drops faint marks and anti-alias noise),
# then a light blur + re-threshold for smooth edges.
mask = src.point(lambda v: 255 if v < 128 else 0).filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: 0 if v < 60 else (255 if v > 200 else v))
mask = mask.crop(mask.getbbox())
w, h = mask.size
side = int(max(w, h) * 1.04)
sq = Image.new("L", (side, side), 0)
sq.paste(mask, ((side - w) // 2, (side - h) // 2))
white = Image.new("RGBA", (side, side), (255, 255, 255, 0))
white.putalpha(sq)
white.save("branding/logo-white.png")

def tile(size, scale, shape):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if shape:
        big = size * 4
        m = Image.new("L", (big, big), 0)
        d = ImageDraw.Draw(m)
        if shape == "round":
            d.ellipse((0, 0, big - 1, big - 1), fill=255)
        else:
            d.rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * 0.22), fill=255)
        img.paste(Image.new("RGBA", (size, size), RED), (0, 0), m.resize((size, size), Image.LANCZOS))
    s = int(size * scale)
    img.alpha_composite(white.resize((s, s), Image.LANCZOS), ((size - s) // 2, (size - s) // 2))
    return img

for name, f in {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}.items():
    d = f"branding/icons/mipmap-{name}"
    os.makedirs(d, exist_ok=True)
    tile(int(48 * f), 0.70, "square").save(f"{d}/ic_launcher.png")
    tile(int(48 * f), 0.64, "round").save(f"{d}/ic_launcher_round.png")
    tile(int(108 * f), 0.60, None).save(f"{d}/ic_launcher_foreground.png")  # adaptive: keep inside the safe zone
tile(512, 0.68, "square").save("branding/icon-512.png")
os.makedirs("src/assets", exist_ok=True)
white.resize((256, 256), Image.LANCZOS).save("src/assets/logo-white.png", optimize=True)
tile(192, 0.68, "square").save("src/assets/logo-tile.png", optimize=True)
print("icons done")
