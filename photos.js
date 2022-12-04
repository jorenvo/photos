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
}

class Photo extends Media {
  constructor(url, aspect_ratio) {
    super();

    const url_with_endpoint = `${endpoint}/${url}`;
    this.thumb_url = url_with_endpoint; // no longer used
    this.highres_thumb_url = url_with_endpoint.replace("_low_thumb", "_thumb");
    this.low_url = url_with_endpoint
      .replace("_low_thumb", "_low")
      .replace(".webp", ".jpeg"); // no longer used
    this.full_url = url.replace("_low_thumb", "").replace(".webp", ".jpeg");
    this.aspect_ratio = aspect_ratio;

    this.img = new Image();
    this.img.src = this.highres_thumb_url;
  }

  getAspectRatio() {
    return this.aspect_ratio;
  }

  toDOM() {
    this.img.height = this.dom_height;
    if (this.img.src === this.thumb_url) {
      this.img.classList.add("blur");
    }

    const a = document.createElement("a");
    const href = getViewUrl(this.full_url);
    a.href = href;

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
  medias.forEach((media, i) => {
    current_row.push(media);

    // w = x, h = 1
    const aspect_ratios = current_row.map((media) => media.getAspectRatio());
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

  pageLinks();
}

async function load() {
  const PHOTOS_PER_PAGE = 9;
  const page = getPage();
  var photo_names = await getPhotoNames();

  const offset = (page - 1) * PHOTOS_PER_PAGE;
  photo_names = photo_names.slice(offset, offset + PHOTOS_PER_PAGE);
  console.log(`offset: ${offset}`);

  const medias = [];
  for (const media_metadata of photo_names) {
    if (media_metadata.length === 0) {
      continue;
    }

    const [media_name, aspect_ratio] = media_metadata.split(",");
    const [name, _] = media_name.split(".");
    const url = `${name}_low_thumb.webp`;
    const image = new Photo(url, parseFloat(aspect_ratio));
    medias.push(image);
  }

  return medias;
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

function getPage() {
  const url = new URL(window.location.href);
  const page = url.searchParams.get("page");
  return page ? parseInt(page, 10) : 1;
}

function pageLinks() {
  const url = new URL(window.location.href);
  const page = getPage();
  const container = document.createElement("div");
  container.classList.add("navigation");

  const back = document.createElement("a");
  back.innerText = "<";

  if (page - 1 <= 0) {
    back.classList.add("hide");
  } else {
    url.searchParams.set("page", page - 1);
    back.setAttribute("href", url.href);
  }

  const forward = document.createElement("a");
  forward.innerText = ">";
  url.searchParams.set("page", page + 1);
  forward.setAttribute("href", url.href);

  container.appendChild(back);
  container.appendChild(forward);
  document.body.appendChild(container);
}

load().then(async (medias) => {
  layout(medias);
  window.addEventListener("resize", () => layoutIfWidthChanged(medias));
  window.addEventListener("load", () => layoutIfWidthChanged(medias));
});
