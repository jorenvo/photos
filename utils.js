const endpoint = "/photos_content";

async function get_photo_names() {
  const response = await fetch(`auxiliary/photos.db`);
  const photo_names = await response.text();
  return photo_names.split("\n");
}

export { endpoint, get_photo_names };
