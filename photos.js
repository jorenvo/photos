async function loadImage(loaded_imgs, url) {
    const blob = await (await fetch(url)).blob();
    const img = new Image();
    img.addEventListener("load", () => loaded_imgs.push(img));
    img.src = URL.createObjectURL(blob);

    // catch errors because Promise.all will bail on the first rejection
    return img.decode().catch(() => console.error(`failed to decode ${url}`));
}

async function layout(imgs) {
    const DESIRED_WIDTH_PX = 500;
    const MAX_ROW_HEIGHT_PX = 250;

    let current_row = [];
    for (const img of imgs) {
        current_row.push(img);

        // w = x, h = 1
        const aspect_ratios = current_row.map(img => img.naturalWidth / img.naturalHeight);
        const total_width = aspect_ratios.reduce((prev, curr) => prev + curr, 0);
        const row_height = DESIRED_WIDTH_PX / total_width;

        if (row_height < MAX_ROW_HEIGHT_PX) {
            console.log(`Row would be ${row_height}px`);
            const div = document.createElement("div");

            while (current_row.length) {
                console.log(`Should be height: ${row_height}px`);
                const img = current_row.pop();
                img.height = row_height;
                div.appendChild(img);
            }

            document.body.appendChild(div);
        }
    }
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
