"use strict";

const url = new URL(window.location.href);
const image_location = url.searchParams.get("url");

const image = document.getElementById("photo");
image.src = image_location;
image.onload = () => {
  EXIF.getData(image, function () {
    console.log(EXIF.pretty(this));

    const date = EXIF.getTag(this, "DateTimeOriginal");
    const model = EXIF.getTag(this, "Model");
    const lens = EXIF.getTag(this, "LensModel");

    const aperture = EXIF.getTag(this, "ApertureValue");
    const shutter_speed = EXIF.getTag(this, "ShutterSpeedValue");
    const iso = EXIF.getTag(this, "ISOSpeedRatings");

    const makeAndModel = document.getElementById("exif");
    makeAndModel.innerHTML += `${model} ${date} ${lens} ${aperture} ${shutter_speed} ${iso}`;
  });
};
