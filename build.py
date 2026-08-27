#!/usr/bin/env python3
"""Bake faces + data + app into one self-contained HTML file.

Reads faces/manifest.json, embeds every face as a base64 data URI so the
built page works offline from file:// and canvas exports are never tainted.

    python3 build.py
"""
import base64, json, mimetypes, os, sys

ROOT   = os.path.dirname(os.path.abspath(__file__))
SRC    = os.path.join(ROOT, "src")
FACES  = os.path.join(ROOT, "faces")
DIST   = os.path.join(ROOT, "dist")
OUT    = os.path.join(DIST, "facebook-comment-mockup.html")

# Faces bigger than this are downscaled at build time to keep the file small.
MAX_PX = 320
JPEG_Q = 82


def encode_face(path):
    """Return a data URI, downscaling large images if Pillow is available."""
    try:
        from PIL import Image
        import io
        im = Image.open(path).convert("RGB")
        if max(im.size) > MAX_PX:
            s = MAX_PX / max(im.size)
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=JPEG_Q, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        mime = mimetypes.guess_type(path)[0] or "image/jpeg"
        with open(path, "rb") as fh:
            return f"data:{mime};base64," + base64.b64encode(fh.read()).decode()


def main():
    manifest = json.load(open(os.path.join(FACES, "manifest.json")))
    entries, missing = [], []
    for f in manifest["faces"]:
        path = os.path.join(FACES, f["file"])
        if not os.path.exists(path):
            missing.append(f["file"])
            continue
        entries.append({
            "id":       f["file"],
            "gender":   f["gender"],
            "heritage": f["heritage"],
            "age":      f["age"],
            "src":      encode_face(path),
        })

    if missing:
        print(f"  ! {len(missing)} listed in manifest but not on disk: {', '.join(missing[:5])}")
    if not entries:
        sys.exit("No faces found — put images in faces/ and list them in manifest.json")

    html = open(os.path.join(SRC, "index.html")).read()
    parts = {
        "/*__FACES__*/":     "const FACES = " + json.dumps(entries, separators=(",", ":")) + ";",
        "/*__NAMES__*/":     open(os.path.join(SRC, "data-names.js")).read(),
        "/*__MESSAGES__*/":  open(os.path.join(SRC, "data-messages.js")).read(),
        "/*__REACTIONS__*/": open(os.path.join(SRC, "data-reactions.js")).read(),
        "/*__APP__*/":       open(os.path.join(SRC, "app.js")).read(),
    }
    for token, code in parts.items():
        if token not in html:
            sys.exit(f"Template is missing {token}")
        html = html.replace(token, code)

    os.makedirs(DIST, exist_ok=True)
    open(OUT, "w").write(html)

    from collections import Counter
    print(f"  built {OUT}")
    print(f"  {len(entries)} faces  |  {len(html)/1024/1024:.2f} MB")
    for k in ("gender", "age", "heritage"):
        print(f"  {k:9s} {dict(Counter(e[k] for e in entries))}")


if __name__ == "__main__":
    main()
