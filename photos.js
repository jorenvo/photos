async function loadImage(loaded_imgs, url) {
    const blob = await (await fetch(url)).blob();
    const img = new Image();
    img.addEventListener("load", () => loaded_imgs.push(img));
    img.src = URL.createObjectURL(blob);

    // catch errors because Promise.all will bail on the first rejection
    return img.decode().catch(() => console.error(`failed to decode ${url}`));
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

async function layout(imgs) {
    const DESIRED_WIDTH_PX = 500;
    const MAX_ROW_HEIGHT_PX = 250;

    let current_row = [];
    let row_height = 0;
    for (const img of imgs) {
        current_row.push(img);

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

    const loaded_imgs = [];
    const load_promises = [];
    for (const picture of json) {
        load_promises.push(loadImage(loaded_imgs, `https://www.jvo.sh/photos/${picture.name}`));
    }

    const loads = await Promise.all(load_promises);
    console.log(loaded_imgs);

    layout(loaded_imgs);
}

load();
