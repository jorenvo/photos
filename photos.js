class Photo {
    constructor(url) {
        this.url = url;
        this.fullURL = url.replace("_thumb", "");
    }

    async load() {
        const blob = await (await fetch(this.url)).blob();
        this.img = new Image();
        this.img.src = URL.createObjectURL(blob);

        // catch errors because Promise.all will bail on the first rejection
        return this.img.decode().catch(() => console.error(`failed to decode ${this.url}`));
    }
}

async function layout_row(row, height) {
    if (!row.length) {
        return;
    }

    const div = document.createElement("div");
    while (row.length) {
        const img = row.pop();
        img.height = height;
        div.appendChild(img);
    }

    document.body.appendChild(div);
}

async function layout(photos) {
    const DESIRED_WIDTH_PX = 500;
    const MAX_ROW_HEIGHT_PX = 250;

    let current_row = [];
    let row_height = 0;
    for (const photo of photos) {
        // skip photos that failed to load
        if (!photo.img.naturalHeight) {
            continue;
        }

        current_row.push(photo.img);

        // w = x, h = 1
        const aspect_ratios = current_row.map(img => img.naturalWidth / img.naturalHeight);
        const total_width = aspect_ratios.reduce((prev, curr) => prev + curr, 0);
        row_height = DESIRED_WIDTH_PX / total_width;

        if (row_height < MAX_ROW_HEIGHT_PX) {
            layout_row(current_row, row_height);
        }
    }

    layout_row(current_row, row_height);
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
