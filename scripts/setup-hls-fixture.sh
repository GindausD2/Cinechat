#!/bin/sh
set -eu
command -v ffmpeg >/dev/null || { echo 'ffmpeg is required for the HLS acceptance fixture.' >&2; exit 1; }
mkdir -p .data/media/hls/low .data/media/hls/high
# A 20-second transformed excerpt of the already licensed CC BY 3.0 open film.
for rendition in low high; do
  if [ "$rendition" = low ]; then frame_size=160:90; else frame_size=320:180; fi
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss 5 -i .data/media/big-buck-bunny.mp4 -t 20 -vf "scale=$frame_size" -r 12 -c:v libx264 -preset ultrafast -g 24 -sc_threshold 0 -an -f hls -hls_time 2 -hls_playlist_type vod -hls_segment_filename ".data/media/hls/$rendition/segment%02d.ts" ".data/media/hls/$rendition/index.m3u8"
done
cat > .data/media/hls/master.m3u8 <<'PLAYLIST'
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=100000,RESOLUTION=160x90
low/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=320x180
high/index.m3u8
PLAYLIST
cat > .data/media/hls/captions.vtt <<'CAPTIONS'
WEBVTT

00:00.000 --> 00:20.000
Big Buck Bunny — Blender Foundation. CC BY 3.0 licensed excerpt.
CAPTIONS
