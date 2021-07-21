async function loadImage(url) {
    const blob = await (await fetch(url)).blob();
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    debugger;
    return img;
}

async function load() {
    const response = await fetch("https://www.jvo.sh/photos/");
    const json = await response.json();
    console.table(json);

    for (const picture of json) {
        if (picture.name.endsWith(".jpeg")) { // TODO: temp
            document.body.appendChild(await loadImage(`https://www.jvo.sh/photos/${picture.name}`));
        }
    }
}

load();
