"use strict";

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
    zoom(image);
  });
}

function calculateTranslation(image_size, viewport_size, pointer_pos) {
  const max_x_translation = Math.max(0, (image_size - viewport_size) / 2);
  const half_viewport_size = viewport_size / 2;
  const ratio = (half_viewport_size - pointer_pos) / half_viewport_size;
  const translation_mouse = max_x_translation * ratio;
  const translation_center = image_size / 2 - viewport_size / 2;

  return -translation_center + translation_mouse;
}

var suppressing_mouse_move = false;
function onZoomMouseMove(e) {
  if (suppressing_mouse_move) {
    return;
  }
  suppressing_mouse_move = true;
  setTimeout(() => (suppressing_mouse_move = false), 25);

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

  console.log("transform");
  image.style.transform = `translate(${x_translation}px, ${y_translation}px)`;
}

function zoom(image) {
  if (image.classList.contains("zoom")) {
    image.removeEventListener("mousemove", onZoomMouseMove);
    image.classList.add("photo");
    image.classList.remove("smooth-zoom");
    image.classList.remove("zoom");
    image.style.transform = "";
  } else {
    image.classList.remove("photo");
    image.classList.add("smooth-zoom");
    image.classList.add("zoom");

    image.addEventListener("transitionend", () => {
      image.classList.replace("smooth-zoom", "smooth-transitions");
    });
    // image.classList.add("smooth-transitions");
    // image.addEventListener("mousemove", onZoomMouseMove);
  }
}

function show() {
  function toggle(e) {
    e.classList.toggle("hide");
  }
  toggle(document.getElementById("loading"));
  toggle(document.getElementById("photo"));
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
    show();
  };
}

view();
