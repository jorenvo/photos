#!/usr/bin/env python3
import exif
import os
import sys


DB_NAME = "photos.db"


def process(media_dir):
    name_to_creation_date = {}

    for media_name in os.listdir(media_dir):
        if not (media_name.endswith(".jpg") or media_name.endswith(".jpeg")):
            continue

        media_path = os.path.join(media_dir, media_name)
        with open(media_path, "rb") as media_file:
            image = exif.Image(media_file)

            if not image.has_exif:
                print(f"{media_name} does not have exif data")
                continue

            name_to_creation_date[media_name] = image.datetime_original

    contents = sorted(
        name_to_creation_date.items(), key=lambda media: media[1], reverse=True
    )

    with open(DB_NAME, "w") as db:
        for media_name_datetime in contents:
            media_name = media_name_datetime[0]
            db.write(media_name + "\n")


if __name__ == "__main__":
    process(sys.argv[1])
