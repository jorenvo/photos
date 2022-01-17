"use strict";

const global_zoom_factor = 180 / 90; // TODO calculate from CSS?

var global_photo = document.getElementById("photo");
var global_photo_high = document.getElementById("photo-high");

function setText(id, text) {
  const tag = document.getElementById(id);
  tag.innerText = text;
}

function loadEXIF() {
  return new Promise(function (resolve, reject) {
    EXIF.getData(global_photo, function () {
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

function wireZoom() {
  // TODO: disable this on mobile, pinch-to-zoom works fine
  global_photo.addEventListener("click", zoom);
}

function unWireZoom() {
  global_photo.removeEventListener("click", zoom);
}

function calculateTranslation(image_size, viewport_size, pointer_pos) {
  const padding = 300;
  image_size += padding;

  const max_translation = Math.max(0, image_size - viewport_size);
  const ratio = pointer_pos / viewport_size - 0.5;
  const translation_mouse = max_translation * ratio;
  const translation_center = image_size / 2 - viewport_size / 2;

  // console.log("image_size", image_size);
  // console.log("viewport_size", viewport_size);
  // console.log("pointer_pos", pointer_pos);
  // console.log("max_translation", max_translation);
  // console.log("ratio", ratio);
  // console.log("translation_mouse", translation_mouse);
  // console.log("translation_center", translation_center);
  // console.log("--------");

  return -translation_center - translation_mouse + padding / 2;
}

var suppressing_mouse_move = false;
function onZoomMouseMove(e) {
  const photo = e.target;
  if (suppressing_mouse_move) {
    return;
  }
  suppressing_mouse_move = true;
  setTimeout(() => (suppressing_mouse_move = false), 1_000 / 60); // todo requestAnimationFrame

  const image_rect = photo.getBoundingClientRect();
  const x_translation = calculateTranslation(
    image_rect.width,
    window.innerWidth,
    e.clientX
  );
  const y_translation = calculateTranslation(
    image_rect.height,
    window.innerHeight,
    e.clientY
  );
  photo.style.transform = `translate(${x_translation}px, ${y_translation}px)`;
}

function stopSmoothZoom(e) {
  global_photo.classList.remove("smooth-zoom");
  e.target.removeEventListener("transitionend", stopSmoothZoom);
}

function unWireMouseMove() {
  global_photo.removeEventListener("mousemove", onZoomMouseMove);
  global_photo_high.removeEventListener("mousemove", onZoomMouseMove);
}

function wireMouseMove(e) {
  global_photo.addEventListener("mousemove", onZoomMouseMove);
  global_photo_high.addEventListener("mousemove", onZoomMouseMove);
  e.target.removeEventListener("transitionend", wireMouseMove);
}

function initialZoomOnPointer(e) {
  const image_rect = global_photo.getBoundingClientRect();
  const x_translation = calculateTranslation(
    image_rect.width * global_zoom_factor,
    window.innerWidth,
    e.clientX
  );
  const y_translation = calculateTranslation(
    image_rect.height * global_zoom_factor,
    window.innerHeight,
    e.clientY
  );
  global_photo.style.transform = `translate(${x_translation}px, ${y_translation}px)`;
}

function wireSwapToLow() {
  global_photo_high.addEventListener("click", (e) => {
    global_photo.style.transform = global_photo_high.style.transform;
    global_photo_high.classList.add("hide");
    global_photo.classList.remove("hide");
    setTimeout(() => global_photo.click(), 0);
  });
}

function swapToHigh() {
  setTimeout(() => {
    global_photo_high.src = "/_MGL1085.jpeg";
    global_photo_high.decode().then(() => {
      global_photo.classList.add("hide");
      global_photo_high.style.transform = global_photo.style.transform;
      global_photo_high.classList.remove("hide");
    });

    global_photo.removeEventListener("transitionend", swapToHigh);
  }, 50);
}

function zoom(e) {
  // Cancel high res if zoom level is about to change
  global_photo_high.onload = undefined;

  if (global_photo.classList.contains("photo-zoom")) {
    unWireMouseMove();

    global_photo.classList.add("smooth-zoom");
    global_photo.classList.replace("photo-zoom", "photo-normal");

    centerPhoto(
      global_photo.getBoundingClientRect().width / global_zoom_factor
    );

    global_photo.addEventListener("transitionend", stopSmoothZoom);
  } else {
    unWireZoom();
    global_photo.classList.add("smooth-zoom");
    initialZoomOnPointer(e);
    global_photo.classList.replace("photo-normal", "photo-zoom");
    global_photo.addEventListener("transitionend", wireMouseMove);
    global_photo.addEventListener("transitionend", stopSmoothZoom);
    global_photo.addEventListener("transitionend", swapToHigh);
    global_photo.addEventListener("transitionend", wireZoom);
  }
}

function onResize() {
  if (global_photo.classList.contains("photo-normal")) {
    centerPhoto(global_photo.width);
  }
}

function centerPhoto(width) {
  global_photo.style.transform = `translate(${
    (window.innerWidth - width) / 2
  }px, 0px)`;
}

function show() {
  function toggle(e) {
    e.classList.toggle("hide");
  }

  toggle(document.getElementById("loading"));

  toggle(global_photo);
  centerPhoto(global_photo.getBoundingClientRect().width);

  document.querySelectorAll(".exif-tag").forEach(toggle);
}

function view() {
  const url = new URL(window.location.href);
  const image_location = url.searchParams.get("url");

  global_photo.src = image_location;
  global_photo.onload = async () => {
    await loadEXIF();
    wireZoom();
    wireSwapToLow();
    window.addEventListener("resize", onResize);
    show();
  };
}

view();
