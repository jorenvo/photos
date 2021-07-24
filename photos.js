"use strict";

class Photo {
    constructor(url) {
        this.url = url;
        this.fullURL = url.replace("_thumb", "").replace(".webp", ".jpeg");
    }

    async load() {
        const blob = await (await fetch(this.url)).blob();
        this.img = new Image();
        this.img.src = URL.createObjectURL(blob);

        // catch errors because Promise.all will bail on the first rejection
        return this.img.decode().catch(() => console.error(`failed to decode ${this.url}`));
    }

    loaded() {
        return !!this.img.naturalHeight;
    }

    toDOM(height) {
        this.img.height = height;

        const a = document.createElement("a");
        a.href = this.fullURL;
        a.appendChild(this.img);
        return a;
    }
}

async function layout_row(photoRow, height) {
    if (!photoRow.length) {
        return;
    }

    const div = document.createElement("div");
    let totalWidth = 0;
    while (photoRow.length) {
        const photo = photoRow.pop();
        div.appendChild(photo.toDOM(height));
        const expectedWidth = photo.img.naturalWidth / photo.img.naturalHeight * Math.round(height);
        console.log(`expected width ${expectedWidth}, height ${height}`);
        totalWidth += expectedWidth;
        if (photoRow.length === 0) {
            console.log(`Last width is ${expectedWidth}, total is now ${totalWidth}`);

            // Chrome floors this when rendering?
            div.lastChild.firstChild.style.width = `${(expectedWidth + 500 - totalWidth).toFixed(2)}px`;
        }
    }

    // console.log(`totalWidth is ${totalWidth}`);
    document.body.appendChild(div);
}

async function layout(photos) {
    const DESIRED_WIDTH_PX = 500;
    const MAX_ROW_HEIGHT_PX = 250;

    console.log("layout");
    let current_row = [];
    let row_height = 0;
    for (const photo of photos) {
        if (!photo.loaded) {
            continue;
        }

        current_row.push(photo);

        // w = x, h = 1
        const aspect_ratios = current_row.map(photo => photo.img.naturalWidth / photo.img.naturalHeight);
        const total_width = aspect_ratios.reduce((prev, curr) => prev + curr, 0);
        row_height = DESIRED_WIDTH_PX / total_width;

        if (row_height < MAX_ROW_HEIGHT_PX) {
            // console.log(`scaled width ${total_width * row_height}, expected ${DESIRED_WIDTH_PX}`);
            layout_row(current_row, row_height);
        }
    }

    if (current_row.length) {
        layout_row(current_row, row_height);
    }
}

async function load() {
    const response = await fetch("https://www.jvo.sh/photos/");
    const json = await response.json();
    console.table(json);

    const photos = [];
    const load_promises = [];
    for (const picture of json) {
        if (picture.name.includes("_thumb")) {
            const image = new Photo(`https://www.jvo.sh/photos/${picture.name}`);
            photos.push(image);
            load_promises.push(image.load());
        }
    }

    await Promise.all(load_promises);
    layout(photos);
}

load();
