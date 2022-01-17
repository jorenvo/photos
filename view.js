"use strict";

const zoom_factor = 2; // TODO calculate from CSS?

function setText(id, text) {
  const tag = document.getElementById(id);
  tag.innerText = text;
}

function loadEXIF(image) {
  return new Promise(function (resolve, reject) {
    EXIF.getData(image, function () {
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

function wireZoom(image) {
  // TODO: disable this on mobile, pinch-to-zoom works fine
  image.addEventListener("click", (e) => {
    zoom(e, image);
  });
}

function calculateTranslation(image_size, viewport_size, pointer_pos) {
  const max_translation = Math.max(0, image_size - viewport_size);
  const half_viewport_size = viewport_size / 2;
  const ratio = pointer_pos / viewport_size - 0.5;
  const translation_mouse = max_translation * ratio;
  const translation_center = image_size / 2 - viewport_size / 2;

  // console.log("image_size", image_size);
  // console.log("viewport_size", viewport_size);
  // console.log("pointer_pos", pointer_pos);
  // console.log("max_translation", max_translation);
  // console.log("half_viewport_size", half_viewport_size);
  // console.log("ratio", ratio);
  // console.log("translation_mouse", translation_mouse);
  // console.log("translation_center", translation_center);
  // console.log("--------");

  return -translation_center + translation_mouse;
}

var suppressing_mouse_move = false;
function onZoomMouseMove(e) {
  if (suppressing_mouse_move) {
    return;
  }
  suppressing_mouse_move = true;
  setTimeout(() => (suppressing_mouse_move = false), 1_000 / 60); // todo requestAnimationFrame

  const image = e.target;
  const image_rect = image.getBoundingClientRect();
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
  image.style.transform = `translate(${x_translation}px, ${y_translation}px)`;
}

function stopSmoothZoomOut(e) {
  const image = e.target;
  image.classList.remove("smooth-zoom");
}

function stopSmoothZoomIn(e) {
  const image = e.target;
  image.classList.replace("smooth-zoom", "smooth-transitions"); // TODO: remove smooth transitions
  image.addEventListener("mousemove", onZoomMouseMove);
}

function initialZoomOnPointer(e, image) {
  const image_rect = image.getBoundingClientRect();
  const x_translation = calculateTranslation(
    image_rect.width * zoom_factor,
    window.innerWidth,
    e.offsetX * zoom_factor
  );
  const y_translation = calculateTranslation(
    image_rect.height * zoom_factor,
    window.innerHeight,
    e.offsetY * zoom_factor
  );
  console.log(e.offsetX, e.offsetY);
  image.style.transform = `translate(${x_translation}px, ${y_translation}px)`;
}

function zoom(e, image) {
  if (image.classList.contains("photo-zoom")) {
    image.removeEventListener("mousemove", onZoomMouseMove);
    image.removeEventListener("transitionend", stopSmoothZoomIn);

    image.classList.remove("smooth-transitions");
    image.classList.add("smooth-zoom");
    image.classList.replace("photo-zoom", "photo-normal");

    centerPhoto(image.getBoundingClientRect().width / zoom_factor);

    image.addEventListener("transitionend", stopSmoothZoomOut);
  } else {
    image.removeEventListener("transitionend", stopSmoothZoomOut);

    image.classList.add("smooth-zoom");
    // initialZoomOnPointer(e, image);
    image.classList.replace("photo-normal", "photo-zoom");

    image.addEventListener("transitionend", stopSmoothZoomIn);
  }
}

function onResize() {
  const photo = document.getElementById("photo");
  if (photo.classList.contains("photo-normal")) {
    centerPhoto(photo.width);
  }
}

function centerPhoto(width) {
  photo.style.transform = `translate(${
    (window.innerWidth - width) / 2
  }px, 0px)`;
}

function show() {
  function toggle(e) {
    e.classList.toggle("hide");
  }

  toggle(document.getElementById("loading"));

  const photo = document.getElementById("photo");
  toggle(photo);
  centerPhoto(photo.getBoundingClientRect().width);

  document.querySelectorAll(".exif-tag").forEach(toggle);
}

function view() {
  const url = new URL(window.location.href);
  const image_location = url.searchParams.get("url");

  const image = document.getElementById("photo");
  image.src = image_location;
  image.onload = async () => {
    await loadEXIF(image);
    wireZoom(image);
    window.addEventListener("resize", onResize);
    show();
  };
}

view();
