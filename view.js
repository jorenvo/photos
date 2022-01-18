"use strict";

const global_zoom_factor = 180 / 90; // TODO calculate from CSS?

var global_photo = document.getElementById("photo");
var global_photo_high = document.getElementById("photo-high");

function mobileAndTabletCheck() {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

function isIpadOS() {
  return (
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 2 &&
    /Macintosh/.test(navigator.userAgent)
  );
}

function relyOnPinchToZoom() {
  return mobileAndTabletCheck() || isIpadOS();
}

function setText(id, text) {
  const tag = document.getElementById(id);
  tag.innerText = text;
}

function loadEXIF() {
  return new Promise(function (resolve, reject) {
    // TODO: better to use the small thumbnail here because
    // the library will re-download the whole image into an
    // arraybuffer.
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
  if (!relyOnPinchToZoom()) {
    global_photo.addEventListener("click", zoom);
  }
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
    document.body.clientWidth,
    e.clientX
  );
  const y_translation = calculateTranslation(
    image_rect.height,
    document.body.clientHeight,
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
    document.body.clientWidth,
    e.clientX
  );
  const y_translation = calculateTranslation(
    image_rect.height * global_zoom_factor,
    document.body.clientHeight,
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

function getHighResURI() {
  return global_photo.src.replace("_low", "");
}

function swapToHigh() {
  setTimeout(() => {
    global_photo_high.src = getHighResURI();
    global_photo_high.decode().then(() => {
      global_photo.classList.add("hide");

      if (relyOnPinchToZoom()) {
        global_photo_high.classList.replace("photo-zoom", "photo-normal");
      }

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
    (document.body.clientWidth - width) / 2
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

function wireDownload() {
  document.getElementById("download").href = getHighResURI();
}

function wirePinch() {
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      swapToHigh();
    }
  });
}

function view() {
  const url = new URL(window.location.href);
  const image_location = url.searchParams.get("url");

  global_photo.src = image_location;
  global_photo.onload = async () => {
    await loadEXIF();
    wireDownload();
    wirePinch();
    wireZoom();
    wireSwapToLow();
    if (!relyOnPinchToZoom()) {
      window.addEventListener("resize", onResize);
    }
    show();
  };
}

view();
