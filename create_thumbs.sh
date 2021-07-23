#!/usr/bin/env bash
set -euo pipefail

DIR="${1}"

for IMG in "${DIR}"/*; do
  if [[ ! $IMG =~ "_thumb" ]]; then
    echo "Creating thumbnail for ${IMG}..."
    WITHOUT_EXT="${IMG%%.*}"
    convert -thumbnail 500x500 "${IMG}" "${WITHOUT_EXT}_thumb.webp"
  fi
done