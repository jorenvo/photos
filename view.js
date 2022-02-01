"use strict";

import { relyOnPinchToZoom, getViewUrl, getPhotoNames } from "./utils.js";

function setText(id, text) {
  const tag = document.getElementById(id);
  tag.innerText = text;
}

function loadEXIF(img) {
  return new Promise(function (resolve, reject) {
    // TODO: better to use the small thumbnail here because
    // the library will re-download the whole image into an
    // arraybuffer.
    EXIF.getData(img, function () {
      console.log(EXIF.pretty(this));

      const date = EXIF.getTag(this, "DateTimeOriginal");
      const model = EXIF.getTag(this, "Model");
      const lens = EXIF.getTag(this, "LensModel");
      const f_number = EXIF.getTag(this, "FNumber");
      const exposure_time = EXIF.getTag(this, "ExposureTime");
      const iso = EXIF.getTag(this, "ISOSpeedRatings");

      setText("exif-camera", model);
      setText("exif-lens", lens);
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
  constructor(image_low_url, image_high_url) {
    this.image_low_url = image_low_url;
    this.image_high_url = image_high_url;

    this.global_photo = document.getElementById("photo");
    this.global_photo_high = document.getElementById("photo-high");

    this.zoom_factor = 180 / 90; // TODO: calculate from CSS?
    this.suppressing_mouse_move = false;

    this._bindFunctions();
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

      this.global_photo.removeEventListener("transitionend", this._swapToHigh);
    }, 50);
  }

  _zoom(e) {
    // Cancel high res if zoom level is about to change
    this.global_photo_high.onload = undefined;

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

  _show() {
    function toggle(e) {
      e.classList.toggle("hide");
    }

    toggle(document.getElementById("loading"));

    toggle(this.global_photo);
    this._centerPhoto(this.global_photo.getBoundingClientRect().width);

    document
      .querySelectorAll(".nav-button-prev, .nav-button-next, .exif-tag")
      .forEach(toggle);
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

  async _wireNav() {
    const photo_names = await getPhotoNames();
    const index = photo_names.findIndex((photo) => {
      return photo === this.image_high_url;
    });

    const prevButton = document.querySelector(".nav-button-prev"); // TODO: move to constructor
    if (index > 0) {
      prevButton.href = getViewUrl(photo_names[index - 1]);
    } else {
      prevButton.classList.add("hide");
    }

    const nextButton = document.querySelector(".nav-button-next");
    if (index < photo_names.length - 1) {
      nextButton.href = getViewUrl(photo_names[index + 1]);
    } else {
      nextButton.classList.add("hide");
    }
  }

  async _onPhotoLoad() {
    await loadEXIF(this.global_photo);
    this._wireDownload();
    this._wirePinch();
    this._wireZoom();
    this._wireSwapToLow();
    this._wireNav();
    if (!relyOnPinchToZoom()) {
      window.addEventListener("resize", this._onResize);
    }
    this._show();
  }

  start() {
    this.global_photo.src = this.image_low_url;
    this.global_photo.onload = this._onPhotoLoad;
  }
}

function getLowUrl(image_high_url) {
  const parts = image_high_url.split(".");
  return `${parts[0]}_low.${parts[1]}`;
}

function init() {
  const url = new URL(window.location.href);
  const image_high_url = url.searchParams.get("url");
  const viewer = new Viewer(getLowUrl(image_high_url), image_high_url);
  viewer.start();
}

init();
