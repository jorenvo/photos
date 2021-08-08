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
      .then(() => this.img = highres_image)
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
    a.href = this.full_url;
    a.appendChild(this.img);
    this.setDOM(a);
    return a;
  }
}

class Video extends Media {
  constructor(url) {
    super();
    this.url = url;
  }

  async load() {
    this.video = document.createElement("video");

    // setAttribute instead of e.g. this.video.muted = "1", because that doesn't
    // work for all these attributes.
    this.video.setAttribute("src", this.url);
    this.video.setAttribute("autoplay", "1");
    this.video.setAttribute("loop", "1");
    this.video.setAttribute("muted", "1");

    this.video.muted = true; // This is needed to unblock autoplay in Firefox 90
    this.video.setAttribute("playsinline", "1"); // Needed to play on iOS Safari

    return new Promise((resolve, reject) => {
      this.video.addEventListener("loadeddata", () => {
        console.log(`Got new state: ${this.video.readyState}`);
        console.log(
          `Dimensions after loading: ${this.video.videoWidth}x${this.video.videoHeight}`
        );
        resolve();
      });
    });
  }

  async load_highres_thumbnail() {
    return Promise.resolve();
  }

  loaded() {
    return true;
  }

  getWidth() {
    return this.video.videoWidth;
  }

  getHeight() {
    return this.video.videoHeight;
  }

  toDOM(height) {
    this.video.height = this.dom_height;
    this.setDOM(this.video);
    return this.video;
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
  const response = await fetch("https://www.jvo.sh/photos_dev_content/");
  const json = await response.json();

  const medias = [];
  const load_promises = [];
  for (const media of json) {
    const url = `https://www.jvo.sh/photos_dev_content/${media.name}`;
    if (media.name.includes("_low_thumb")) {
      const image = new Photo(url);
      medias.push(image);
      load_promises.push(image.load());
    } else if (media.name.includes(".mp4")) {
      const video = new Video(url);
      medias.push(video);
      load_promises.push(video.load());
    }
  }

  await Promise.all(load_promises);
  return medias;
}

function load_highres(medias) {
  medias.forEach((media) => {
    media.load_highres_thumbnail().then(() => {
      media.getDOM().replaceWith(media.toDOM());
    });
  });
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

load().then((medias) => {
  layout(medias);
  load_highres(medias);
  window.addEventListener("resize", () => layoutIfWidthChanged(medias));
  window.addEventListener("load", () => layoutIfWidthChanged(medias));
});
