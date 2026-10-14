#!/bin/sh
set -eu
mkdir -p .data/media
tmp_archive="$(mktemp /tmp/cinechat-media-XXXXXX.zip)"
trap 'rm -f "$tmp_archive"' EXIT
curl --fail --location --max-time 180 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4.zip' --output "$tmp_archive"
python3 - "$tmp_archive" <<'PY'
import sys, zipfile
from pathlib import Path
with zipfile.ZipFile(sys.argv[1]) as archive:
    movies = [name for name in archive.namelist() if name.endswith('.mp4')]
    if len(movies) != 1:
        raise SystemExit('Unexpected official archive contents')
    Path('.data/media/big-buck-bunny.mp4').write_bytes(archive.read(movies[0]))
print('Big Buck Bunny licensed sample ready. CC BY 3.0, © Blender Foundation.')
PY
