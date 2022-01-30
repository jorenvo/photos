const endpoint = "/photos_content";

async function getPhotoNames() {
  const response = await fetch("auxiliary/photos.db");
  const photo_names = await response.text();
  return photo_names
    .split("\n")
    .filter((n) => n.length > 0)
    .map((n) => `${endpoint}/${n}`);
}

function getViewUrl(image_high_url) {
  return `/photos/view.html?url=${encodeURIComponent(image_high_url)}`;
}

export { getPhotoNames, getViewUrl };
