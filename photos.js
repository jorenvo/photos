"use strict";

/* To deal with browser rendering differences in images with
 * fractional dimensions we cut of these right pixels of all
 * thumbnails.
 * padding-left in row should be half of this */
const RIGHT_BOX_CUT_PX = 4;

class Photo {
    constructor(url) {
        this.url = url;
        this.fullURL = url.replace("_thumb", "").replace(".webp", ".jpeg");
    }

    async load() {
        this.img = new Image();
        this.img.src = this.url;

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

async function layout_row(photoRow, height, calculatedWidth) {
    if (!photoRow.length) {
        return;
    }

    const rowDOM = document.createElement("row");
    rowDOM.style.maxWidth = `${calculatedWidth - RIGHT_BOX_CUT_PX}px`;
    for (const photo of photoRow) {
        rowDOM.appendChild(photo.toDOM(height));
    }

    document.body.appendChild(rowDOM);
}

async function layout(photos) {
    const target_width_px = window.innerWidth;
    const MAX_ROW_HEIGHT_PX = window.innerHeight / 2;

    document.body.innerHTML = "";

    let current_row = [];
    let row_height = 0;
    for (const photo of photos) {
        if (!photo.loaded()) {
            continue;
        }

        current_row.push(photo);

        // w = x, h = 1
        const aspect_ratios = current_row.map(photo => photo.img.naturalWidth / photo.img.naturalHeight);
        const total_width = aspect_ratios.reduce((prev, curr) => prev + curr, 0);
        row_height = target_width_px / total_width;

        if (row_height < MAX_ROW_HEIGHT_PX) {
            layout_row(current_row, row_height, target_width_px);
            current_row = [];
        }
    }

    if (current_row.length) {
        layout_row(current_row, row_height, target_width_px);
    }
}

async function load() {
    const response = await fetch("https://www.jvo.sh/photos_content/");
    const json = await response.json();
    console.table(json);

    const photos = [];
    const load_promises = [];
    for (const picture of json) {
        if (picture.name.includes("_thumb")) {
            const image = new Photo(`https://www.jvo.sh/photos_content/${picture.name}`);
            photos.push(image);
            load_promises.push(image.load());
        }
    }

    await Promise.all(load_promises);
    return photos;
}

let prevWidthPx = window.innerWidth;
let timeout = 0;
function layoutIfWidthChanged(photos) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        // Only re-layout when width has changed to avoid
        // new layout when iOS Safari changes the height
        // of the address bar.
        if (prevWidthPx !== window.innerWidth) {
            layout(photos);
            prevWidthPx = window.innerWidth;
        }
    }, 100);
}

load().then((photos) => {
    layout(photos);
    window.addEventListener("resize", () => layoutIfWidthChanged(photos));
    window.addEventListener("load", () => layoutIfWidthChanged(photos));
});