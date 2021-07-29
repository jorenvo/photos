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

    getWidth() {
        return this.img.naturalWidth;
    }

    getHeight() {
        return this.img.naturalHeight;
    }

    toDOM(height) {
        this.img.height = height;

        const a = document.createElement("a");
        a.href = this.fullURL;
        a.appendChild(this.img);
        return a;
    }
}

class Video {
    constructor(url) {
        this.url = url;
    }

    async load() {
        this.video = document.createElement("video");

        // setAttribute instead of e.g. this.video.muted = "1", because that doesn't
        // work for all these attributes.
        this.video.setAttribute("src", this.url);
        this.video.setAttribute("autoplay", "1");
        this.video.setAttribute("loop", "1");
        this.video.setAttribute("muted", "1");
	
	this.video.muted = true; // This is needed to unblock autoplay in Firefox 90
        this.video.setAttribute("playsinline", "1"); // Needed to play on iOS Safari

        return new Promise((resolve, reject) => {
            this.video.addEventListener("loadeddata", () => {
                console.log(`Got new state: ${this.video.readyState}`);
                console.log(`Dimensions after loading: ${this.video.videoWidth}x${this.video.videoHeight}`);
                resolve();
            });
        });
    }

    loaded() {
        return true;
    }

    getWidth() {
        return this.video.videoWidth;
    }

    getHeight() {
        return this.video.videoHeight;
    }

    toDOM(height) {
        this.video.height = height;
        return this.video;
    }
}

async function layout_row(mediaRow, height, calculatedWidth) {
    if (!mediaRow.length) {
        return;
    }

    const rowDOM = document.createElement("row");
    rowDOM.style.maxWidth = `${calculatedWidth - RIGHT_BOX_CUT_PX}px`;
    for (const media of mediaRow) {
        rowDOM.appendChild(media.toDOM(height));
    }

    document.body.appendChild(rowDOM);
}

async function layout(medias) {
    const target_width_px = window.innerWidth;
    const MAX_ROW_HEIGHT_PX = window.innerHeight / 2;

    document.body.innerHTML = "";

    let current_row = [];
    let row_height = 0;
    medias.filter(media => media.loaded()).forEach((media, i) => {
        current_row.push(media);

        // w = x, h = 1
        const aspect_ratios = current_row.map(media => media.getWidth() / media.getHeight());
        const total_width = aspect_ratios.reduce((prev, curr) => prev + curr, 0);
        row_height = target_width_px / total_width;

	// Create new row only if there's >2 photos left. This avoids large photos at the end.
        if (row_height < MAX_ROW_HEIGHT_PX && i < medias.length - 3) {
            layout_row(current_row, row_height, target_width_px);
            current_row = [];
        }
    });

    if (current_row.length) {
        layout_row(current_row, row_height, target_width_px);
    }
}

async function load() {
    const response = await fetch("https://www.jvo.sh/photos_content/");
    const json = await response.json();
    console.table(json);

    const medias = [];
    const load_promises = [];
    for (const media of json) {
        if (media.name.includes("_thumb")) {
            const image = new Photo(`https://www.jvo.sh/photos_content/${media.name}`);
            medias.push(image);
            load_promises.push(image.load());
        } else if (media.name.includes(".mp4")) {
            const video = new Video(`https://www.jvo.sh/photos_content/${media.name}`);
            medias.push(video);
            load_promises.push(video.load());
        }
    }

    await Promise.all(load_promises);
    return medias;
}

let prevWidthPx = window.innerWidth;
let timeout = 0;
function layoutIfWidthChanged(medias) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        // Only re-layout when width has changed to avoid
        // new layout when iOS Safari changes the height
        // of the address bar.
        if (prevWidthPx !== window.innerWidth) {
            layout(medias);
            prevWidthPx = window.innerWidth;
        }
    }, 100);
}

load().then((medias) => {
    layout(medias);
    window.addEventListener("resize", () => layoutIfWidthChanged(medias));
    window.addEventListener("load", () => layoutIfWidthChanged(medias));
});
