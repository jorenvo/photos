#!/usr/bin/env bash
set -euo pipefail

DIR="${1}"

for IMG in "${DIR}"/*; do
    if [[ ! $IMG =~ "_thumb" ]] && [[ ! $IMG =~ ".mp4" ]]; then
    WITHOUT_EXT="${IMG%%.*}"
    THUMB_NAME="${WITHOUT_EXT}_thumb.webp"
    if [ ! -f "${THUMB_NAME}" ]; then
      echo "Creating thumbnail for ${IMG}..."
      convert -thumbnail 1500x -quality 75 "${IMG}" "${THUMB_NAME}"
    fi
  fi
done
