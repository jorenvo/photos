async function loadImage(url) {
    const blob = await (await fetch(url)).blob();
    const img = new Image();
    // img.addEventListener("load", () => document.body.appendChild(img));
    img.addEventListener("error", () => { console.error(`${url} failed to decode ${img}`); });
    img.src = URL.createObjectURL(blob);
    return img.decode().catch(() => console.error("error ignored?"));
}

async function load() {
    const response = await fetch("https://www.jvo.sh/photos/");
    const json = await response.json();
    console.table(json);

    const load_promises = [];
    for (const picture of json) {
        // if (picture.name.endsWith(".jpeg"))
        load_promises.push(loadImage(`https://www.jvo.sh/photos/${picture.name}`));
    }

    console.log(load_promises);
    const loads = await Promise.all(load_promises);
    console.log(loads);
}

load();
