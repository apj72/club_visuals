#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/downloads"

usage() {
    echo "Usage: ig-save <instagram-url>"
    echo ""
    echo "Download videos from Instagram reels/posts."
    echo "Videos are saved to: $OUTPUT_DIR"
    echo ""
    echo "Example:"
    echo "  ig-save https://www.instagram.com/reel/DbR8ySkmWb6/"
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

URL="$1"

if [[ ! "$URL" =~ instagram\.com ]]; then
    echo "Error: Not an Instagram URL."
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Downloading video from: $URL"
echo "Saving to: $OUTPUT_DIR"
echo ""

yt-dlp \
    --no-warnings \
    -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" \
    --merge-output-format mp4 \
    -o "$OUTPUT_DIR/%(title).80s_%(id)s.%(ext)s" \
    "$URL"

if [ $? -eq 0 ]; then
    echo ""
    echo "Done! Saved to $OUTPUT_DIR"
else
    echo ""
    echo "Download failed. Instagram may require login for this content."
    echo "To authenticate, run:  yt-dlp --cookies-from-browser safari \"$URL\""
fi
