"""Готовит картинки для игры из вырезанных PNG с прозрачным фоном.

Животные: папка, где у каждого животного своя подпапка с файлами <animal>_<emotion>.png
(так устроена art/cutout в файлах проекта), 2048 px -> 1024 px WebP:

    python3 scripts/prepare_art.py <папка-cutout> panda lion ...

Еда: папка с файлами <id>.png (art/food_cutout в файлах проекта) -> 512 px WebP:

    python3 scripts/prepare_art.py --food <папка-food_cutout>

Результат: public/assets/animals/<animal>/<emotion>.webp и public/assets/foods/<id>.webp
Нужен Pillow: python3 -m pip install Pillow
"""
import sys
from pathlib import Path

from PIL import Image

QUALITY = 88
EMOTIONS = ("base", "happy", "like", "chew", "think", "celebrate", "sleep")
ASSETS = Path(__file__).resolve().parent.parent / "public" / "assets"


def save_webp(src: Path, dst: Path, size: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as img:
        img = img.convert("RGBA").resize((size, size), Image.LANCZOS)
        img.save(dst, "WEBP", quality=QUALITY, method=6)
    print(f"{src.name} -> {dst.relative_to(ASSETS.parent.parent)} ({dst.stat().st_size // 1024} КБ)")


def find_source(root: Path, animal: str, emotion: str) -> Path:
    matches = sorted(root.glob(f"*/{animal}_{emotion}.png"))
    if not matches:
        sys.exit(f"Нет файла {animal}_{emotion}.png в {root}")
    return matches[0]


def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == "--food":
        sources = sorted(Path(sys.argv[2]).glob("*.png"))
        if not sources:
            sys.exit(f"Нет PNG в {sys.argv[2]}")
        for src in sources:
            save_webp(src, ASSETS / "foods" / f"{src.stem}.webp", 512)
        return
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    root = Path(sys.argv[1])
    for animal in sys.argv[2:]:
        for emotion in EMOTIONS:
            save_webp(find_source(root, animal, emotion), ASSETS / "animals" / animal / f"{emotion}.webp", 1024)


if __name__ == "__main__":
    main()
