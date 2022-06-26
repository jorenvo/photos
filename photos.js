import { endpoint, getPhotoNames, getViewUrl } from "./utils.js";

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
    history.replaceState({}, "", `/photos/?scroll=${encodeURIComponent(url)}`);
  }
}

class Photo extends Media {
  constructor(url) {
    super();

    const url_with_endpoint = `${endpoint}/${url}`;
    this.thumb_url = url_with_endpoint;
    this.highres_thumb_url = url_with_endpoint.replace("_low_thumb", "_thumb");
    this.low_url = url_with_endpoint
      .replace("_low_thumb", "_low")
      .replace(".webp", ".jpeg");
    this.full_url = url.replace("_low_thumb", "").replace(".webp", ".jpeg");
  }

  async tryHardToDecode(img) {
    // Chrome and Edge error with:
    // "DOMException: The source image cannot be decoded."
    // This only triggers with a lot of requests in parallel.
    try {
      await img.decode();
    } catch (e) {
      console.log(`${e} - image decode of ${img.src} failed`);
    }
  }

  async load() {
    this.img = new Image();
    this.img.src = this.thumb_url;

    await this.tryHardToDecode(this.img);
  }

  async loadHighresThumbnail() {
    const highres_image = new Image();
    highres_image.src = this.highres_thumb_url;

    await this.tryHardToDecode(highres_image);
    this.img = highres_image;
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
    const href = getViewUrl(this.full_url);
    a.href = href;
    a.addEventListener("click", () => this.rememberMedia(href));

    a.appendChild(this.img);
    this.setDOM(a);
    return a;
  }
}

async function layoutRow(mediaRow, height, calculatedWidth) {
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
        layoutRow(current_row, row_height, target_width_px);
        current_row = [];
      }
    });

  if (current_row.length) {
    layoutRow(current_row, row_height, target_width_px);
  }
}

async function load() {
  const photo_names = await getPhotoNames();

  const medias = [];
  const load_promises = [];
  for (const media_name of photo_names) {
    if (media_name.length === 0) {
      continue;
    }

    const [name, _] = media_name.split(".");
    const url = `${name}_low_thumb.webp`;
    const image = new Photo(url);
    medias.push(image);
    load_promises.push(image.load());
  }

  await Promise.all(load_promises);
  return medias;
}

function loadHighres(medias) {
  let loads = [];
  for (const media of medias) {
    loads.push(
      media
        .loadHighresThumbnail()
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

  const CHUNK_SIZE = 8;
  for (let i = 0; i < medias.length; i += CHUNK_SIZE) {
    await loadHighres(medias.slice(i, i + CHUNK_SIZE));
  }

  scrollToLast();

  // The low res thumbnails are resized very small. This causes
  // rounding issues in their dimensions compared to their full
  // resolution counterparts. To fix this re-layout everything when we
  // have all the high res media.
  layout(medias);
  scrollToLast();
});
