const endpoint = "/photos_content";

async function get_photo_names() {
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

export { get_photo_names, getViewUrl };
