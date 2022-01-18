#!/usr/bin/env bash
set -euo pipefail

DIR="${1}"

cd "${DIR}"

for IMG in *; do
  if [[ ! $IMG =~ "_thumb" ]] && [[ ! $IMG =~ "_low" ]] && [[ ! $IMG =~ ".mp4" ]] && [[ ! $IMG =~ ".json" ]]; then
    WITHOUT_EXT="${IMG%%.*}"
    LOW_NAME="${WITHOUT_EXT}_low.jpeg"
    THUMB_LOW_NAME="${WITHOUT_EXT}_low_thumb.webp"
    THUMB_NAME="${WITHOUT_EXT}_thumb.webp"

    if [ ! -f "${LOW_NAME}" ]; then
      echo "Creating low res for ${IMG}..."
      convert -resize 40% -quality 90 "${IMG}" "${LOW_NAME}"
    fi

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
