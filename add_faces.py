#!/usr/bin/env python3
"""Add new face images to the pool and tag them in one shot.

    python3 add_faces.py ~/Downloads/newfaces --gender f --heritage white --age 60+
    python3 add_faces.py ~/Downloads/*.jpg    --gender m --heritage black --age 45-59

Point it at a folder or a list of files. Everything in one call gets the same
tags, so download a demographic at a time and run it once per batch.
Files are MOVED (not copied), which keeps your Downloads folder clean.

Then run:  python3 build.py
"""
import argparse, glob, json, os, shutil, sys

ROOT   = os.path.dirname(os.path.abspath(__file__))
FACES  = os.path.join(ROOT, "faces")
MANI   = os.path.join(FACES, "manifest.json")
EXTS   = {".jpg", ".jpeg", ".png", ".webp"}

GENDERS   = ["f", "m"]
HERITAGES = ["white", "black", "hispanic", "eastasian", "southasian", "mideast", "mixed"]
AGES      = ["18-29", "30-44", "45-59", "60+"]


def collect(paths):
    out = []
    for p in paths:
        p = os.path.expanduser(p)
        if os.path.isdir(p):
            for f in sorted(os.listdir(p)):
                if os.path.splitext(f)[1].lower() in EXTS:
                    out.append(os.path.join(p, f))
        else:
            out.extend(f for f in glob.glob(p) if os.path.splitext(f)[1].lower() in EXTS)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+", help="folder or image files to ingest")
    ap.add_argument("--gender",   required=True, choices=GENDERS)
    ap.add_argument("--heritage", required=True, choices=HERITAGES)
    ap.add_argument("--age",      required=True, choices=AGES)
    ap.add_argument("--copy", action="store_true", help="copy instead of move")
    a = ap.parse_args()

    files = collect(a.paths)
    if not files:
        sys.exit("No images found at those paths.")

    manifest = json.load(open(MANI))
    existing = {f["file"] for f in manifest["faces"]}
    n = 0
    while f"face-{n:02d}.jpg" in existing or f"face-{n:02d}.png" in existing:
        n += 1

    added = 0
    for src in files:
        ext = os.path.splitext(src)[1].lower()
        ext = ".jpg" if ext in (".jpeg", ".webp") else ext
        while f"face-{n:02d}{ext}" in existing:
            n += 1
        name = f"face-{n:02d}{ext}"
        dst = os.path.join(FACES, name)
        (shutil.copy2 if a.copy else shutil.move)(src, dst)
        manifest["faces"].append({
            "file": name, "gender": a.gender,
            "heritage": a.heritage, "age": a.age,
        })
        existing.add(name)
        added += 1
        n += 1

    json.dump(manifest, open(MANI, "w"), indent=2)

    from collections import Counter
    print(f"  added {added} → {a.gender} / {a.heritage} / {a.age}")
    print(f"  pool is now {len(manifest['faces'])} faces")
    print(f"  gender   {dict(Counter(f['gender']   for f in manifest['faces']))}")
    print(f"  age      {dict(Counter(f['age']      for f in manifest['faces']))}")
    print(f"  heritage {dict(Counter(f['heritage'] for f in manifest['faces']))}")
    print("\n  now run:  python3 build.py")


if __name__ == "__main__":
    main()
