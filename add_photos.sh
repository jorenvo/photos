#!/usr/bin/env bash
set -euo pipefail

DIR="${1}"

for IMG in "${DIR}"/*; do
  if [[ ! $IMG =~ "_thumb" ]] && [[ ! $IMG =~ ".mp4" ]] && [[ ! $IMG =~ ".json" ]]; then
    WITHOUT_EXT="${IMG%%.*}"
    THUMB_LOW_NAME="${WITHOUT_EXT}_low_thumb.webp"
    THUMB_NAME="${WITHOUT_EXT}_thumb.webp"

    if [ ! -f "${THUMB_LOW_NAME}" ]; then
      echo "Creating low res thumbnail for ${IMG}..."
      convert -resize 1% -quality 0 "${IMG}" "${THUMB_LOW_NAME}"
    fi

    if [ ! -f "${THUMB_NAME}" ]; then
      echo "Creating thumbnail for ${IMG}..."
      convert -resize 20% -quality 75 "${IMG}" "${THUMB_NAME}"
    fi
  fi
done

echo "Caching photos json..."
curl -s https://www.jvo.sh/photos_content/ > "${DIR}/photos.json"
