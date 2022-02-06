"use strict";

import {
  endpoint,
  relyOnPinchToZoom,
  getPhotoNames,
  getViewUrl,
} from "./utils.js";

function setText(id, text) {
  const tag = document.getElementById(id);
  tag.innerText = text;
}

function loadEXIF(img) {
  return new Promise(function (resolve, reject) {
    // The library caches the exifdata on an img tag. Since we change
    // the src always force it to reload.
    img.exifdata = undefined;

    // TODO: better to use the small thumbnail here because
    // the library will re-download the whole image into an
    // arraybuffer.
    EXIF.getData(img, function () {
      const date = EXIF.getTag(this, "DateTimeOriginal");
      const model = EXIF.getTag(this, "Model");
      const lens = EXIF.getTag(this, "LensModel");
      const f_number = EXIF.getTag(this, "FNumber");
      const exposure_time = EXIF.getTag(this, "ExposureTime");
      const iso = EXIF.getTag(this, "ISOSpeedRatings");

      setText("exif-camera", model);
      setText("exif-lens", lens.replace("f/1.6", "")); // Make iPhone 12 back lens a bit shorter
      setText("exif-aperture", `ƒ/${f_number}`);

      let exposure_string = "";
      if (exposure_time.denominator === 1) {
        exposure_string = `${exposure_time.numerator}`;
      } else {
        exposure_string = `${exposure_time.numerator}/${exposure_time.denominator}`;
      }

      setText("exif-exposure", `${exposure_string}s`);
      setText("exif-iso", iso);

      const [year, month, day] = date.split(" ")[0].split(":");
      setText("exif-date", `${year}/${month}/${day}`);
      resolve();
    });
  });
}

class Viewer {
  constructor(image_high_url) {
    this.image_high_url = this._fullPhotoURL(image_high_url);
    this.image_low_url = undefined;
    this.blob_cache = {};

    this.global_photo = document.getElementById("photo");
    this.global_photo_high = document.getElementById("photo-high");

    this.prevButton = document.querySelector(".nav-button-prev");
    this.nextButton = document.querySelector(".nav-button-next");

    this.zoom_factor = 180 / 90; // TODO: calculate from CSS?
    this.suppressing_mouse_move = false;

    this._bindFunctions();

    this.global_photo.onload = this._onPhotoLoad;
    this.prevButton.addEventListener("click", this._prevPhoto);
    this.nextButton.addEventListener("click", this._nextPhoto);

    this._wireDownload();
    this._wirePinch();
    this._wireZoom();
    this._wireSwapToLow();
    if (!relyOnPinchToZoom()) {
      window.addEventListener("resize", this._onResize);
    }
  }

  _fullPhotoURL(url) {
    return `${endpoint}/${url}`;
  }

  _bindFunctions() {
    this._zoom = this._zoom.bind(this);
    this._onZoomMouseMove = this._onZoomMouseMove.bind(this);
    this._stopSmoothZoom = this._stopSmoothZoom.bind(this);
    this._wireMouseMove = this._wireMouseMove.bind(this);
    this._swapToHigh = this._swapToHigh.bind(this);
    this._onResize = this._onResize.bind(this);
    this._wireZoom = this._wireZoom.bind(this);
    this._onPhotoLoad = this._onPhotoLoad.bind(this);
    this._prevPhoto = this._prevPhoto.bind(this);
    this._nextPhoto = this._nextPhoto.bind(this);
  }

  _wireZoom() {
    if (!relyOnPinchToZoom()) {
      this.global_photo.addEventListener("click", this._zoom);
    }
  }

  _unWireZoom() {
    this.global_photo.removeEventListener("click", this._zoom);
  }

  _calculateTranslation(image_size, viewport_size, pointer_pos) {
    const padding = 300;
    image_size += padding;

    const max_translation = Math.max(0, image_size - viewport_size);
    const ratio = pointer_pos / viewport_size - 0.5;
    const translation_mouse = max_translation * ratio;
    const translation_center = image_size / 2 - viewport_size / 2;

    return -translation_center - translation_mouse + padding / 2;
  }

  _onZoomMouseMove(e) {
    const photo = e.target;
    if (this.suppressing_mouse_move) {
      return;
    }
    this.suppressing_mouse_move = true;
    setTimeout(() => (this.suppressing_mouse_move = false), 1_000 / 60); // TODO: requestAnimationFrame

    const image_rect = photo.getBoundingClientRect();
    const x_translation = this._calculateTranslation(
      image_rect.width,
      document.body.clientWidth,
      e.clientX
    );
    const y_translation = this._calculateTranslation(
      image_rect.height,
      document.body.clientHeight,
      e.clientY
    );
    photo.style.transform = `translate(${x_translation}px, ${y_translation}px)`;
  }

  _stopSmoothZoom(e) {
    this.global_photo.classList.remove("smooth-zoom");
    e.target.removeEventListener("transitionend", this._stopSmoothZoom);
  }

  _unWireMouseMove() {
    this.global_photo.removeEventListener("mousemove", this._onZoomMouseMove);
    this.global_photo_high.removeEventListener(
      "mousemove",
      this._onZoomMouseMove
    );
  }

  _wireMouseMove(e) {
    this.global_photo.addEventListener("mousemove", this._onZoomMouseMove);
    this.global_photo_high.addEventListener("mousemove", this._onZoomMouseMove);
    e.target.removeEventListener("transitionend", this._wireMouseMove);
  }

  _initialZoomOnPointer(e) {
    const image_rect = this.global_photo.getBoundingClientRect();
    const x_translation = this._calculateTranslation(
      image_rect.width * this.zoom_factor,
      document.body.clientWidth,
      e.clientX
    );
    const y_translation = this._calculateTranslation(
      image_rect.height * this.zoom_factor,
      document.body.clientHeight,
      e.clientY
    );
    this.global_photo.style.transform = `translate(${x_translation}px, ${y_translation}px)`;
  }

  _wireSwapToLow() {
    this.global_photo_high.addEventListener("click", (e) => {
      this.global_photo.style.transform =
        this.global_photo_high.style.transform;
      this.global_photo_high.classList.add("hide");
      this.global_photo.classList.remove("hide");
      setTimeout(() => this.global_photo.click(), 0);
    });
  }

  _swapToHigh() {
    setTimeout(() => {
      this.global_photo_high.src = this.image_high_url;
      this.global_photo_high.decode().then(() => {
        this.global_photo.classList.add("hide");

        if (relyOnPinchToZoom()) {
          this.global_photo_high.classList.replace(
            "photo-zoom",
            "photo-normal"
          );
        }

        this.global_photo_high.style.transform =
          this.global_photo.style.transform;
        this.global_photo_high.classList.remove("hide");
      });
    }, 50);
    this.global_photo.removeEventListener("transitionend", this._swapToHigh);
  }

  _zoom(e) {
    if (this.global_photo.classList.contains("photo-zoom")) {
      this._unWireMouseMove();

      this.global_photo.classList.add("smooth-zoom");
      this.global_photo.classList.replace("photo-zoom", "photo-normal");

      this._centerPhoto(
        this.global_photo.getBoundingClientRect().width / this.zoom_factor
      );

      this.global_photo.addEventListener("transitionend", this._stopSmoothZoom);
    } else {
      this._unWireZoom();
      this.global_photo.classList.add("smooth-zoom");
      this._initialZoomOnPointer(e);
      this.global_photo.classList.replace("photo-normal", "photo-zoom");
      this.global_photo.addEventListener("transitionend", this._wireMouseMove);
      this.global_photo.addEventListener("transitionend", this._stopSmoothZoom);
      this.global_photo.addEventListener("transitionend", this._swapToHigh);
      this.global_photo.addEventListener("transitionend", this._wireZoom);
    }
  }

  _onResize() {
    if (this.global_photo.classList.contains("photo-normal")) {
      this._centerPhoto(this.global_photo.width);
    }
  }

  _centerPhoto(width) {
    this.global_photo.style.transform = `translate(${
      (document.body.clientWidth - width) / 2
    }px, 0px)`;
  }

  _loadingScreen() {
    function addHide(e) {
      e.classList.add("hide");
    }

    document.getElementById("loading").classList.remove("hide");

    addHide(this.global_photo);

    document
      .querySelectorAll(".nav-button-prev, .nav-button-next, .exif-tag")
      .forEach(addHide);
  }

  _photoScreen() {
    function removeHide(e) {
      e.classList.remove("hide");
    }

    document.getElementById("loading").classList.add("hide");

    removeHide(this.global_photo);
    this._centerPhoto(this.global_photo.getBoundingClientRect().width);

    document
      .querySelectorAll(".nav-button-prev, .nav-button-next, .exif-tag")
      .forEach(removeHide);
  }

  _wireDownload() {
    document.getElementById("download").href = this.image_high_url;
  }

  _wirePinch() {
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        this._swapToHigh();
      }
    });
  }

  _switchToPhoto(image_high_url) {
    this.image_high_url = this._fullPhotoURL(image_high_url);
    history.replaceState({}, "", getViewUrl(image_high_url));
  }

  async _nextPhoto() {
    this._switchToPhoto(this.nextPhoto);

    if (!this._is_cached(getLowUrl(this.nextPhoto))) {
      this._loadingScreen();
    }

    const data = await this.next_photo_promise;
    this.start(data["low_url"], data["blob"]);
  }

  async _prevPhoto() {
    this._switchToPhoto(this.prevPhoto);

    if (!this._is_cached(getLowUrl(this.prevPhoto))) {
      this._loadingScreen();
    }

    const data = await this.preloadPhoto(this.prevPhoto);
    this.start(data["low_url"], data["blob"]);
  }

  async _setAdjacentPhotos() {
    const photo_names = await getPhotoNames();
    const index = photo_names.findIndex((photo) => {
      return this._fullPhotoURL(photo) === this.image_high_url;
    });

    if (index > 0) {
      this.prevPhoto = photo_names[index - 1];
    } else {
      this.prevButton.classList.add("hide");
    }

    if (index < photo_names.length - 1) {
      this.nextPhoto = photo_names[index + 1];
    } else {
      this.nextButton.classList.add("hide");
    }
  }

  _is_cached(image_url) {
    const full_url = this._fullPhotoURL(image_url);
    return !!this.blob_cache[full_url];
  }

  async preloadPhoto(image_high_url) {
    const image_low_url = getLowUrl(image_high_url);

    const full_url = this._fullPhotoURL(image_low_url);
    if (!this._is_cached(image_low_url)) {
      const response = await fetch(full_url);
      this.blob_cache[full_url] = await response.blob();
    }

    return {
      low_url: image_low_url,
      high_url: image_high_url,
      blob: this.blob_cache[full_url],
    };
  }

  async _onPhotoLoad() {
    await loadEXIF(this.global_photo);
    await this._setAdjacentPhotos();
    this._photoScreen();

    // load next
    this.next_photo_promise = this.preloadPhoto(this.nextPhoto);
  }

  async start(image_low_url, blob) {
    this.image_low_url = image_low_url;
    this.global_photo.src = URL.createObjectURL(blob);
  }
}

function getLowUrl(image_high_url) {
  const parts = image_high_url.split(".");
  return `${parts[0]}_low.${parts[1]}`;
}

async function init() {
  const url = new URL(window.location.href);
  const image_high_url = url.searchParams.get("url");
  const viewer = new Viewer(image_high_url);

  const data = await viewer.preloadPhoto(image_high_url);
  viewer.start(data["low_url"], data["blob"]);
}

init();
