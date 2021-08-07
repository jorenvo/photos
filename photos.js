"use strict";

/* To deal with browser rendering differences in images with
 * fractional dimensions we cut of these right pixels of all
 * thumbnails.
 * padding-left in row should be half of this */
const RIGHT_BOX_CUT_PX = 4;

class Photo {
  constructor(url) {
    this.url = url;
    this.fullURL = url.replace("_thumb", "").replace(".webp", ".jpeg");
  }

  async load() {
    this.img = new Image();
    this.img.src = this.url;

    // catch errors because Promise.all will bail on the first rejection
    return this.img
      .decode()
      .catch(() => console.error(`failed to decode ${this.url}`));
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

  toDOM(height) {
    this.img.height = height;

    const a = document.createElement("a");
    a.href = this.fullURL;
    a.appendChild(this.img);
    return a;
  }
}

class Video {
  constructor(url) {
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
    this.video.height = height;
    return this.video;
  }
}

class LayoutEngine {
  constructor() {
    this.all = [];
    this.to_layout = [];
  }

  clear() {
    document.body.innerHTML = "";
  }

  add_media(media) {
    this.all.push(media);
    this.to_layout.push(media);
  }

  relayout() {
    this.clear();
    for (let media of this.all) {
      this.to_layout.push(media);
      this.layout();
    }
  }

  layout_row(height, calculatedWidth) {
    if (!this.to_layout.length) {
      return;
    }

    const rowDOM = document.createElement("row");
    rowDOM.style.maxWidth = `${calculatedWidth - RIGHT_BOX_CUT_PX}px`;
    for (const media of this.to_layout) {
      rowDOM.appendChild(media.toDOM(height));
    }

    document.body.appendChild(rowDOM);
  }

  layout() {
    const target_width_px = window.innerWidth;
    const MAX_ROW_HEIGHT_PX = window.innerHeight / 2;

    let row_height = 0;
    // w = x, h = 1
    const aspect_ratios = this.to_layout.map(
      (media) => media.getWidth() / media.getHeight()
    );
    const total_width = aspect_ratios.reduce((prev, curr) => prev + curr, 0);
    row_height = target_width_px / total_width;

    if (row_height < MAX_ROW_HEIGHT_PX) {
      this.layout_row(row_height, target_width_px);
      this.to_layout = [];
    }
  }
}

async function load(layout_engine) {
  const response = await fetch("https://www.jvo.sh/photos_content/");
  const json = await response.json();
  console.table(json);

  const medias = [];
  for (const metadata of json) {
    const url = `https://www.jvo.sh/photos_content/${metadata.name}`;
    let media;
    if (metadata.name.includes("_thumb")) {
      media = new Photo(url);
    } else if (metadata.name.includes(".mp4")) {
      media = new Video(url);
    }

    if (media) {
      medias.push(media);
      await media.load();

      layout_engine.add_media(media);
      layout_engine.layout();
    }
  }
}

const layoutEngine = new LayoutEngine();
let prevWidthPx = window.innerWidth;
let timeout = 0;
function layoutIfWidthChanged(medias) {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    // Only re-layout when width has changed to avoid
    // new layout when iOS Safari changes the height
    // of the address bar.
    if (prevWidthPx !== window.innerWidth) {
      layoutEngine.relayout();
      prevWidthPx = window.innerWidth;
    }
  }, 100);
}

load(layoutEngine);
window.addEventListener("resize", () => layoutIfWidthChanged());
window.addEventListener("load", () => layoutIfWidthChanged());
