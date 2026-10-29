"""Готовит картинки животных для игры: 2048 px PNG с прозрачным фоном -> 1024 px WebP.

Источник: папка с вырезанными картинками, где у каждого животного своя подпапка
с файлами <animal>_<emotion>.png (так устроена art/cutout в файлах проекта).

    python3 scripts/prepare_art.py <папка-cutout> panda lion ...

Результат: public/assets/animals/<animal>/<emotion>.webp
Нужен Pillow: python3 -m pip install Pillow
"""
import sys
from pathlib import Path

from PIL import Image

SIZE = 1024
QUALITY = 88
EMOTIONS = ("base", "happy", "like", "chew", "think", "celebrate", "sleep")
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "animals"


def find_source(root: Path, animal: str, emotion: str) -> Path:
    matches = sorted(root.glob(f"*/{animal}_{emotion}.png"))
    if not matches:
        sys.exit(f"Нет файла {animal}_{emotion}.png в {root}")
    return matches[0]


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    root = Path(sys.argv[1])
    for animal in sys.argv[2:]:
        target = OUT / animal
        target.mkdir(parents=True, exist_ok=True)
        for emotion in EMOTIONS:
            src = find_source(root, animal, emotion)
            with Image.open(src) as img:
                img = img.convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
                dst = target / f"{emotion}.webp"
                img.save(dst, "WEBP", quality=QUALITY, method=6)
            print(f"{src.name} -> {dst.relative_to(OUT.parent.parent.parent)} ({dst.stat().st_size // 1024} КБ)")


if __name__ == "__main__":
    main()
