"use strict";

function setText(id, text) {
  const tag = document.getElementById(id);
  tag.innerText = text;
}

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

    let [year, month, day] = date.split(" ")[0].split(":");
    setText("exif-date", `${year}/${month}/${day}`);
  });
};
