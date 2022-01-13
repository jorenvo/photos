"use strict";

/* To deal with browser rendering differences in images with
 * fractional dimensions we cut of these right pixels of all
 * thumbnails.
 * padding-left in row should be half of this */
const RIGHT_BOX_CUT_PX = 4;

class Media {
  constructor(url) {
    this.dom = null;
    this.dom_height = 0;
  }

  setDOMHeight(height) {
    this.dom_height = height;
  }

  getDOM() {
    return this.dom;
  }

  setDOM(dom) {
    this.dom = dom;
  }

  rememberMedia(url) {
    history.replaceState({}, "", `/?scroll=${encodeURIComponent(url)}`);
  }
}

class Photo extends Media {
  constructor(url) {
    super();
    this.thumb_url = url;
    this.highres_thumb_url = url.replace("_low_thumb", "_thumb");
    this.full_url = url.replace("_low_thumb", "").replace(".webp", ".jpeg");
  }

  async load() {
    this.img = new Image();
    this.img.src = this.thumb_url;

    // catch errors because Promise.all will bail on the first rejection
    return this.img
      .decode()
      .catch(() => console.error(`failed to decode ${this.thumb_url}`));
  }

  async load_highres_thumbnail() {
    const highres_image = new Image();
    highres_image.src = this.highres_thumb_url;

    // catch errors because Promise.all will bail on the first rejection
    return highres_image
      .decode()
      .then(() => (this.img = highres_image))
      .catch(() => console.error(`failed to decode ${this.highres_thumb_url}`));
  }

  loaded() {
    return !!this.img.naturalHeight;
  }

  getWidth() {
    return this.img.naturalWidth;
  }

  getHeight() {
    return this.img.naturalHeight;
  }

  toDOM() {
    this.img.height = this.dom_height;
    if (this.img.src === this.thumb_url) {
      this.img.classList.add("blur");
    }

    const a = document.createElement("a");
    const href = `/view.html?url=${encodeURIComponent(this.full_url)}`;
    a.href = href;
    a.addEventListener("click", () => this.rememberMedia(href));

    a.appendChild(this.img);
    this.setDOM(a);
    return a;
  }
}

async function layout_row(mediaRow, height, calculatedWidth) {
  if (!mediaRow.length) {
    return;
  }

  const rowDOM = document.createElement("row");
  rowDOM.style.maxWidth = `${calculatedWidth - RIGHT_BOX_CUT_PX}px`;
  for (const media of mediaRow) {
    media.setDOMHeight(height);
    rowDOM.appendChild(media.toDOM());
  }

  document.body.appendChild(rowDOM);
}

async function layout(medias) {
  const target_width_px = window.innerWidth;
  const MAX_ROW_HEIGHT_PX = window.innerHeight / 2;

  document.body.innerHTML = "";

  let current_row = [];
  let row_height = 0;
  medias
    .filter((media) => media.loaded())
    .forEach((media, i) => {
      current_row.push(media);

      // w = x, h = 1
      const aspect_ratios = current_row.map(
        (media) => media.getWidth() / media.getHeight()
      );
      const total_width = aspect_ratios.reduce((prev, curr) => prev + curr, 0);
      row_height = target_width_px / total_width;

      // Create new row only if there's >2 photos left. This avoids large photos at the end.
      if (row_height < MAX_ROW_HEIGHT_PX && i < medias.length - 3) {
        layout_row(current_row, row_height, target_width_px);
        current_row = [];
      }
    });

  if (current_row.length) {
    layout_row(current_row, row_height, target_width_px);
  }
}

async function load() {
  const endpoint = "/photos_content";
  const response = await fetch(`auxiliary/photos.db`);
  const media_names = await response.text();

  const medias = [];
  const load_promises = [];
  for (const media_name of media_names.split("\n")) {
    if (media_name.length === 0) {
      continue;
    }

    const [name, _] = media_name.split(".");
    const url = `${endpoint}/${name}_low_thumb.webp`;
    const image = new Photo(url);
    medias.push(image);
    load_promises.push(image.load());
  }

  await Promise.all(load_promises);
  return medias;
}

function load_highres(medias) {
  let loads = [];
  for (const media of medias) {
    loads.push(
      media
        .load_highres_thumbnail()
        .then(() => media.getDOM().replaceWith(media.toDOM()))
    );
  }

  return Promise.all(loads);
}

let prevWidthPx = window.innerWidth;
let timeout = 0;
function layoutIfWidthChanged(medias) {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    // Only re-layout when width has changed to avoid
    // new layout when iOS Safari changes the height
    // of the address bar.
    if (prevWidthPx !== window.innerWidth) {
      layout(medias);
      prevWidthPx = window.innerWidth;
    }
  }, 200);
}

function scrollToLast() {
  const url = new URL(window.location.href);
  const href = url.searchParams.get("scroll");

  if (href) {
    const a = document.querySelector(`a[href="${href}"]`);

    if (a) {
      a.scrollIntoView();
    }
  }
}

load().then(async (medias) => {
  layout(medias);
  window.addEventListener("resize", () => layoutIfWidthChanged(medias));
  window.addEventListener("load", () => layoutIfWidthChanged(medias));

  await load_highres(medias);
  scrollToLast();

  // The low res thumbnails are resized very small. This causes
  // rounding issues in their dimensions compared to their full
  // resolution counterparts. To fix this re-layout everything when we
  // have all the high res media.
  layout(medias);
  scrollToLast();
});
