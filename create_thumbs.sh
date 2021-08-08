#!/usr/bin/env bash
set -euo pipefail

DIR="${1}"

for IMG in "${DIR}"/*; do
    if [[ ! $IMG =~ "_thumb" ]] && [[ ! $IMG =~ ".mp4" ]]; then
    WITHOUT_EXT="${IMG%%.*}"
    THUMB_LOW_NAME="${WITHOUT_EXT}_low_thumb.webp"
    THUMB_NAME="${WITHOUT_EXT}_thumb.webp"
    if [ ! -f "${THUMB_NAME}" ]; then
      echo "Creating thumbnails for ${IMG}..."
      convert -resize 1% -quality 0 "${IMG}" "${THUMB_LOW_NAME}"
      convert -resize 20% -quality 75 "${IMG}" "${THUMB_NAME}"
    fi
  fi
done
