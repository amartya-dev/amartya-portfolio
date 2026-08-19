Drop files here and they appear on /about automatically. No code change needed.

  photos  →  .jpg .jpeg .png .webp .avif
  video   →  .mp4 .webm

Naming controls the caption. Everything before the first dash becomes the label,
dashes become spaces:

  guitar-on-the-balcony.jpg   →  "guitar on the balcony"
  wordcamp-delhi-2024.jpg     →  "wordcamp delhi 2024"
  singing-yeh-ishq-hai.mp4    →  "singing yeh ishq hai"

Keep photos under ~400KB and video under ~8MB — the whole site is currently 212KB
and it would be a shame to undo that. `sips -Z 1600 photo.jpg` and
`ffmpeg -i in.mov -vf scale=1280:-2 -crf 30 out.mp4` are enough.
