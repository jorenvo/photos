"use strict";

const url = new URL(window.location.href);
const image_location = url.searchParams.get("url");

const image = document.getElementById("photo");
image.src = image_location;
