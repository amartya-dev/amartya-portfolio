Personal photos and video for /about. Drop files here and they appear on the page
automatically, newest naming wins. No code change needed.

  photos  ->  .jpg .jpeg .png .webp .avif
  video   ->  .mp4 .webm

The filename becomes the caption. Dashes become spaces:

  guitar-on-the-balcony.jpg   ->  "guitar on the balcony"
  wordcamp-delhi-2024.jpg     ->  "wordcamp delhi 2024"
  singing-yeh-ishq-hai.mp4    ->  "singing yeh ishq hai"

An image sharing a video's name is treated as that video's poster frame, not as a
photograph of its own:

  singing-yeh-ishq-hai.mp4
  singing-yeh-ishq-hai.jpg    ->  the poster for the clip above

Keep photos under ~400KB and video under ~8MB. Two commands that do it:

  sips -Z 1600 photo.jpg
  ffmpeg -i in.mov -vf scale=1280:-2 -crf 30 -preset slow -movflags +faststart out.mp4
