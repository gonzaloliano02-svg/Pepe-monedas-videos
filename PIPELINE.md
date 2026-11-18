# Escala Brutal: daily pipeline

The owner of this repo has authorised fully automated creation and
publication of 3 Shorts per day to their YouTube channel and their TikTok,
through Metricool (brand blogId `8001188`, timezone Europe/Madrid).

**PUBLISHING CHANGE (2026-11-16): Metricool's free plan hit its limit on
2026-11-15 ("You have reached your Metricool account limit"): every post
from 15-11 12:00 onward failed silently. YouTube now goes through vidIQ
(free, 0 credits):** `vidiq_video_upload` with `url` = the
raw.githubusercontent media URL → `vidiq_upload_image` for the long-form
thumbnail → `vidiq_social_post_draft_create` (YOUTUBE, platformAccountId
`UCSqBNpq50sQpp0j75z8nxNw`, privacyStatus public, categoryId 27, tags,
publishAt with +01:00, text = description) → `vidiq_social_post_publish`
(standing approval covers it) → `vidiq_social_post_status` until completed.
Shorts are recognised automatically (vertical, <60 s). TikTok is NOT
possible until the owner connects TikTok in vidIQ or upgrades Metricool.
Do not schedule in Metricool while it is at its limit (it would only fail).
**Every run must first check that yesterday's posts actually went live**
(Windsor YouTube list / vidIQ post status) and report any failure.

**Autonomy (owner, 2026-11-11 and 2026-11-12): "Ahórrate pedirme permisos
para nada, yo te lo autorizo todo siempre, y si cambio de opinión te lo
diré."** Never ask for permission: decide and act (topics, formats,
template, scheduling, rescheduling, replacing or removing posts when there
is a good reason, comments). Report what was done in the daily summary.
Only involve the owner when something physically needs them (an
authorisation link, a login, a payment method, uploading a profile photo).

**Credits (owner, 2026-11-11): spend as few vidIQ credits as possible,
ideally none.** Free tools first, always: Pixabay (footage), WebSearch
(trends, fact checks), Windsor (YouTube/TikTok stats and comment counts),
Metricool (scheduling, best times). vidIQ credits are only for:
(1) reading + replying to NEW YouTube comments (no free tool can reply), and
(2) b-roll as a true last resort when Pixabay and footage.md have nothing.
No vidIQ for research, stats, scripts, thumbnails or images.

**Style (owner's request): real footage + 3D, cinematic, NOT charts.**
Every video = real animated footage with a big headline on screen,
TikTok-style captions, voice-over, music, and (when it fits) ONE 3D scene.
Format: `"format": "doc"`. Reference: `episodes/2026-11-10-a.json`.

**Content (owner's request): VARIETY and ORIGINALITY, guided by data. Not
a single-topic channel, but if something works really well, keep doing it
(with new angles); just don't get stuck.** "Escala Brutal" means *things that blow your mind by their
scale*: size, time, money, speed, numbers, history, the human body,
technology, places, "what if". See `FORMATS.md` for the format catalogue and
the variety rules; they are mandatory.

## Daily run (3 videos)

1. **Setup** (fresh container):
   `npm ci && pip install -q piper-tts numpy kokoro-onnx soundfile`.
   Voice-over: Kokoro `em_santa` (chosen by the owner), model in `voices/kokoro/`;
   Piper `voices/es_ES-davefx-medium` is only the fallback.
   The Spanish voice model lives in `voices/` (committed).
   3D renders need `--gl=swangle` (already in `scripts/build_episode.py`).
2. **Research & pick 3 topics** (every day, ~10 min):
   - Read the last 7 days of `log.md` (what was published and how it did).
   - Check what is trending today, for free: WebSearch (e.g. "tendencias
     TikTok España hoy", "temas virales hoy", "Google Trends España hoy",
     current events, anniversaries, releases, sports, space missions,
     weather records). Avoid politics, tragedies and anything sensitive.
   - No vidIQ for research: use WebSearch and Windsor only.
   - Pick 3 topics following the variety rules in `FORMATS.md`: follow
     what the data says works, avoid monotony, keep exploring (video **c**
     is usually the experimental slot), something current most days.
   - Write today's choice and the reason in `log.md`. Keep `topics.md`
     above 15 unchecked ideas across all categories.
3. **Find footage** for each scene (vertical, >= 720 px wide, >= 6 s).
   - **First: Pixabay** (free, unlimited, HD):
     `python3 scripts/pixabay.py "<english query>"`. Needs the
     `PIXABAY_API_KEY` environment variable (set in the environment
     settings; it loads when the session starts/resumes). Vertical clips are
     listed first; landscape ones get centre-cropped, so use them only for
     wide scenery. Pixabay needs no attribution, but name "Pixabay" in the
     description anyway.
   - Then reuse clips from `footage.md`.
   - Last resort: vidIQ `generate_broll` (`orientation: portrait`), 1 credit
     per search, **max 1 search per video** (150 credits/month). If the
     balance (`vidiq_balance`) is under 10, don't search.
   - (Pexels' own API is unusable: new keys are paused.)
   - Prefer >= 1080 px wide; at most one low-res (360 px) clip per video.
   - **Always preview one frame of each clip before using it**
     (download with curl, `ffmpeg -ss 2 -i clip.mp4 -frames:v 1`): stock
     titles are often wrong. For landscape clips whose subject would be
     cropped out, set `"fit": "contain"` on the scene.
   - Add every useful new clip to `footage.md`.
   - Never reuse the same clip in two videos on the same day.
   - Record the source/photographers in `credits`.
4. **Write each script** as `episodes/<YYYY-MM-DD>-a.json` / `-b.json` / `-c.json`:
   - 25–40 s. Typical: hook `clip` → 3–4 `clip`/`scale3d` → outro `clip`.
     The hook must create curiosity in the first 2 seconds; vary hook styles
     (question, shocking claim, "this is X", countdown, "nobody tells you").
     Vary the outro line too (not always "sígueme para más escalas").
   - Use a `scale3d` scene whenever a size comparison fits; add new 3D
     subjects (planets, buildings, vehicles, objects) instead of forcing
     animals. Not every video needs it.
   - `stamp` = the big on-screen headline: 1–4 words, one figure, highlight
     with `*...*`; use a non-breaking space inside numbers+units ("8 kg").
   - `scale3d.subject`: `whale`, `sperm-whale`, `bus`, `tower` (size =
     height), `sphere` (size = diameter). `size` in metres, `env`
     `ocean|land|space`. If no subject fits, add a new one in
     `src/three/subjects.tsx` (primitives, smooth shading) and check a still.
   - Every number must be a real, well-established figure. Prefer
     conservative values and round numbers; say "hasta", "unos", "más de"
     when sources vary. No invented facts. If unsure, drop it.
   - Narration is written for the ear: numbers in words, short sentences.
   - `title` ≤ 80 chars, curiosity-driven, 1 emoji max.
   - `description` names the data sources, "Imágenes: Pexels." and ends with
     "Video creado con ayuda de IA."
5. **Build**: `python3 scripts/build_episode.py episodes/<id>.json`
   → `videos/<id>.mp4` (~5 min each). Check a frame sheet:
   `ffmpeg -i videos/<id>.mp4 -vf "fps=1/2.3,scale=216:-1,tile=7x2" -frames:v 1 build/sheet.png`
   and fix anything clipped, unreadable or off-topic before publishing.
6. **Publish media & commit:** `scripts/publish_media.sh videos/<id>.mp4`
   puts the file on the `media` branch (today's files only) and prints its
   public URL (`https://raw.githubusercontent.com/gonzaloliano02-svg/pepe-monedas-videos/media/<id>.mp4`).
   Videos are NOT committed to `main` any more. Then commit & push to `main`
   the episode JSONs and `topics.md` (mark topics `[x]` with the episode id).
7. **Schedule in Metricool** (`createScheduledPost`), one post per video with
   providers `youtube` + `tiktok`:
   - slots: **10:00** (video a), **12:00** (video b) and **18:00** (video c),
     Europe/Madrid, today (Metricool best-time data for this account peaks at
     10h, 12h and 18h);
     if a slot has passed, use the next free slot ≥ 30 min from now.
   - `youtubeData`: `{title, type: "short", privacy: "public", madeForKids: false, isAiGeneratedContent: false, category: "EDUCATION", tags}`
     (realistic synthetic footage is not used: footage is real, 3D is
     stylised. The description still says AI helped.)
   - `tiktokData`: `{privacyOption: "PUBLIC_TO_EVERYONE", title, isAigc: true}`
     (AI voice-over).
   - `text`: description + 4–6 hashtags (#escalabrutal #curiosidades ...).
   - `autoPublish: true`.
8. **Log** the result in `log.md` (date, ids, titles, Metricool planner URLs).

## Long-form (2 videos per day, YouTube only) — owner's request 2026-11-12

"Al menos dos vídeos diarios de al menos 10 minutos… en 2D… locutor de habla
natural… del estilo de los que se están haciendo famosos… gráficos buenos,
entretenidos, que parezcan currados… dale mimo… análisis diario."

**Niche (from research, 2026-11-12):** 2D animated documentaries: real,
dramatic stories (history, disasters, mysteries, extreme places, science
events) told with tension and chapters — the fastest-growing faceless
long-form genre, with high RPM (~$10–13) and proven Spanish demand
(Memorias de Pez, Academia Play). Second slot: long-form versions of what
works on Shorts (rankings / "¿Qué pasaría si…?" / escala), also in 2D.
Re-evaluate with Windsor stats every Monday (views, average view %, CTR
isn't available: judge thumbnails/titles by views in the first 48 h).

**Daily:** `episodes/<date>-L1.json` (documentary) and `-L2.json`
(ranking / what-if / escala), format `"story"`. Reference:
`episodes/2026-11-13-L1.json`.

**Script rules**
- 10–12 min: **1.750–2.000 words** of narration (the voice speaks ~181 wpm;
  each scene adds ~0.6 s). Check the word count before building.
- Structure: cold open with the most shocking fact + a promise ("quédate
  hasta el final porque…") → 5–6 chapters (`title` scene "Capítulo N") →
  conclusion that ties back to the opening → CTA (suscríbete + comment
  question). Open loops: tease what comes later.
- Storytelling, not a list of facts: people, dates, places, sensory detail,
  quotes, consequences, surprising links (Tambora → Frankenstein).
- Facts must be real and well sourced; conservative numbers; say
  "estimaciones", "se cree", "según…" when uncertain. Sources in the
  description. No politics, no gore, nothing sensitive or recent tragedies.
- Scenes of 6–14 s (25–40 words). Vary scene types constantly: never 3
  `landscape` in a row; use `map` whenever places matter; 1–3 `stat`,
  1–3 `quote`, 1–2 `compare`, 1 `timeline`, optional `footage` (Pixabay).
- Every `landscape` gets 1–3 Twemoji props that illustrate the sentence,
  with animation (walk, float, pop, rise, shake, fall, spin); different
  `env` and `seed` from the previous scene.
- Map country names must match world-atlas (`United States of America`,
  `United Kingdom`, `China`, `Indonesia`, …).
- `thumbnail`: 2–4 words, ONE emotion/curiosity hook, big emoji, env.
- Title: ≤ 70 chars, curiosity + specificity (number/year/name), CAPS on
  one word. Description: summary, chapter timestamps (from the props
  durations), sources, "Mapas: Natural Earth. Ilustraciones: Twemoji
  (CC-BY 4.0). Video creado con ayuda de IA."
- Mimo: watch a frame sheet (`fps=1/12`) of the whole video and fix
  anything ugly (overlaps, empty scenes, wrong emoji, unreadable text).

**Build:** `python3 scripts/build_episode.py episodes/<id>.json` → video
(≤ 95 MB) + `videos/<id>-thumb.jpg`. Render takes long (allow ~1 h each):
build the Shorts first, then L1, then L2.

**Publish:** `scripts/publish_media.sh videos/<id>.mp4 videos/<id>-thumb.jpg`,
then Metricool `createScheduledPost` with provider `youtube` only,
`youtubeData: {title, type: "video", privacy: "public", madeForKids: false,
isAiGeneratedContent: false, category: "EDUCATION", tags}` and
`videoThumbnailUrl` = the thumbnail URL. If Metricool rejects the thumbnail
(channel not verified), schedule without it and tell the owner that
verifying the channel (phone) enables custom thumbnails.
Slots: **L1 16:00**, **L2 20:00** Europe/Madrid (if passed, next ≥ 30 min).

## Comments (every day, after scheduling)
The owner asked me to handle comments fully, replying directly.
1. **Free check:** Windsor `get_data` (connector `youtube`, fields
   `video`, `video_title`, `video_comment_count`, last 30 days). Compare with
   the counts saved in `comments.md`; only videos whose count went up need
   attention.
2. **Read** only when the free check shows new comments, and then with a
   single channel-wide call: vidIQ `video_comments` (channelId, order
   `time`, 5 credits), never per video. No new comments → 0 credits.
3. **Reply** to every new top-level comment not written by the channel
   (`byChannelOwner` false) with vidIQ `reply_to_comment` (1 credit each).
   Reply in Spanish, short (1–2 sentences), warm, with personality, and add
   value: answer the question, add an extra fact (real and conservative),
   or invite them to suggest the next topic. Never argue, never insult,
   no politics, no promises, no links. Spam, insults or hate: don't reply.
   Topic suggestions from comments go to `topics.md` (they are gold).
4. Never reply twice to the same comment (record replied comment IDs in
   `comments.md`); never retry automatically after an uncertain result.
5. If `reply_to_comment` returns `verification_required`, don't retry: tell
   the owner in the daily summary that YouTube needs re-authorisation
   (vidIQ `authorize_with_youtube` with `commentReplyChannelId`).
6. TikTok: no tool can reply there yet; note TikTok comment counts in the
   weekly review only.

## Weekly (Mondays)
- Read last week's stats for free with Windsor: `youtube` (views,
  average_view_percentage, likes, comments, shares, subscribers_gained per
  video) and `tiktok_organic`. Rank videos by views and retention.
- Trend research for free with WebSearch (no vidIQ).
- Write a short review in `log.md`: which formats/hooks/topics won, which
  failed, and what to try this week. Update `FORMATS.md` (promote winners,
  drop losers, add at least one new format to test).

## Hard rules
- Never post anything that isn't a finished `videos/*.mp4` from this repo.
- Never delete or edit existing posts on the accounts.
- If a step fails, do not publish a broken video: log the error and stop.

## 2026-11-13 — voice & long-form music change (user feedback)
- VOICE: the owner picked "Voz nueva A" = Chatterbox multilingual default voice (scripts/cbx_worker.py, venv
  /opt/cbx/venv, exaggeration 0.55, cfg 0.5). Kokoro/Piper are BANNED (robotic): tts() has no fallback on purpose.
  The worker checks every chunk with Whisper and regenerates if <80% of words are heard. ~4x slower than real time:
  a 10-min video needs ~45 min of TTS, so start long-form builds early. No vidIQ voiceover needed.
- Long-form music is now `make_calm_music` (slow e-piano + warm pad, no drums). Shorts keep `make_music`.
- L1 Tambora re-voiced with voice A + calm music, rescheduled for 2026-11-13 16:00.

## 2026-11-13 (tarde) — música más baja
- Petición del usuario: música aún muy alta. Volúmenes: Shorts (Doc.tsx) 0.45 → 0.25; largos (Story.tsx) 0.22 → 0.12 (≈ -5 dB). NO subir sin que lo pida.

## 2026-11-14 — voz 2A con entrega "C" (aprobada por el usuario)
- Misma voz 2A (Chatterbox default), pero generada frase a frase (frases cortas se fusionan), exaggeration 0.6, cfg_weight 0.4, temperature 0.75, silencios recortados y pausas 0.45 s (0.55 s tras "?" o "..."). QA Whisper con números normalizados (num2words) y penalización de palabras inventadas; hasta 4 intentos por frase.
- Clave de caché TTS: "cbxC1|" (los vídeos anteriores usaban "cbxA1|").
- NO subir exaggeration > 0.6 ni bajar cfg < 0.4: con 0.7/0.3 alucinaba (prueba B descartada).

## 2026-11-15 — colas de build
- Los logs de build van con fecha: `build/<fecha>-<x>.log`. Una cola que mire `build/<x>.log` sin fecha encuentra el "OK" del día anterior y se salta los vídeos (pasó el 2026-11-15 con b, c, L1, L2).
- Con la voz C: Short ≈ 15 min de build; largo ≈ 80 min de TTS + ~50 min de render.

**TikTok via vidIQ (owner, 2026-11-16):** TikTok connected in vidIQ, platformAccountId
`_000QfZ-yRFByg3j6Yt6eKCteQDghOAqKuzY`. Owner's choices: privacyLevel
PUBLIC_TO_EVERYONE, allowComment true, musicUsageConfirmed true (owner accepted
TikTok's Music Usage Confirmation), isAiGenerated true. Add a TIKTOK destination
to every Short's vidIQ draft (same video, same publishAt, text = title + caption).

**VOICE (owner, 2026-11-16): "tu voz A" = the owner's own voice cloned with
Chatterbox** (reference voices/owner/ref.wav, same delivery as voice C:
exaggeration 0.6, cfg 0.4). build_episode.py uses it automatically when the file
exists. The recording is private: never commit it (the repo is public). If the
container was replaced and the file is gone, the build falls back to voice C:
say so in the daily summary and ask the owner to send the voice note again.

**LONG-FORM STRATEGY CHANGE (owner approved 2026-11-17):** long-form gets 0–3
views, so:
- **One long-form video every 2–3 days instead of two a day**: Mondays,
  Wednesdays and Fridays at 16:00 (YouTube only), with much more care: a
  strong first 30 s (the promise of the title), tighter pacing, and a bolder
  thumbnail (big number or question, high contrast, ≤4 words).
- **Topics by search demand**: titles people would type ("qué pasaría si…",
  "los X más… del mundo", "cómo funciona…", "por qué…"), evergreen or tied to
  current events; check that the main keyword appears early in the title.
- **Shorts feed the long-form**: on long-form days and the day after, one of
  the 3 Shorts is a TEASER of the latest long video (its most striking fact,
  ending with "El vídeo completo está en el canal"). On other days all three
  Shorts follow the normal formats.
- **Daily summary must list "Vídeo relacionado"**: for each Short, which long
  video the owner should link with YouTube Studio's "Related video" option
  (we cannot set it from here). Also remind the owner, until confirmed done,
  to verify the channel (youtube.com/verify) so custom thumbnails apply, and
  to add end screens to long videos.

**VOICE UPDATE (owner, 2026-11-17): "muy animada"** = owner's animated recording
voices/owner/ref_animado.wav (backup /root/.claude/voice-backup/ref_animado.wav),
exaggeration 0.8, cfg 0.3. The owner found the earlier delivery robotic: keep
scripts lively and conversational too (short sentences, questions, emphasis).

## ANIMATION UPGRADE (owner, 2026-11-18): long-form must be VERY animated
Owner: "quiero más animación... monigotes, escenas guays, incluso épicas... Vídeos muy animados!!"
Every long-form (format "story") must be staged mostly with `type: "cartoon"` scenes
(src/story/Cartoon.tsx). No more static landscape+emoji scenes.
- Characters: `kind: "stick"` articulated stick figures. Poses: idle wave walk run point
  scared think cheer float fall shrug look stretch push facepalm. Faces: happy wow scared
  sad cool dizzy calm angry. Options: helmet, name ("TÚ" yellow scarf, "TU AMIGO" cyan),
  flip, to/move (walk across), pose2/expr2/poseAt (change mid-scene), stretch [a,b]
  (spaghettification), spin, scaleTo, vanish.
- Objects: bh (epic black hole, animated disk), star (mode collapse + at → supernova),
  clock (speed, slow), ripple (merge + at → two black holes merging), emoji, arrow
  (to + text), bubble (speech), tag (yellow label), beam.
- Backdrops (`bg`): space, blackhole (+ bh {x,y,size}), warp (tunnel), chalk (+ chalk
  lines typed on a blackboard), earth, void, land:<env>.
- Camera: {zoom:[a,b], focus:[x,y], shake, shakeAt}. fx: flash(+flashAt), redshift,
  speedlines, einstein (light arcs), glitch.
- Stat/quote/compare/timeline/title scenes accept `bg` + `actors` too: always add a
  reacting stick figure or a matching backdrop. Compare items with emoji 🕳️ draw the
  animated black hole.
- Scenes are long (10–18 s): give each 2–4 beats (delays, pose2, tags/bubbles appearing).
- Thumbnail: `thumbnail.bg` + `bh` + `actors` (use delay -2 so actors are visible).
- QA before the full render: render one still per scene with the Node API script
  (bundle once, renderStill with browserExecutable =
  /opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell)
  and check overlaps with headlines.

## SCHEDULE CHANGE (owner, 2026-11-18): one long-form EVERY DAY
Owner: "Quiero uno al día". Long-form (very animated, cartoon scenes) every day at 16:00,
YouTube only. The 18:00 Short is every day the teaser of the latest long video.
Overrides the Mon/Wed/Fri rule of "LONG-FORM STRATEGY CHANGE".

## SHORTS ARE ANIMATED TOO (owner, 2026-11-18)
Owner: "quiero que a partir de ahora todos los vídeos sean así. Los shorts de TikTok y
YouTube también, con ese nivel como mínimo. Si hay algún día que te lo quieres currar más,
adelante." → From 2026-11-19 every Short is an animated cartoon Short, at least at the
level of the long-form (stick figures acting, epic objects, camera, effects). Pixabay
footage only as an occasional extra scene (`type: "footage"`), never the main look.
- Episode: `"format": "story"`, `"vertical": true` → composition StoryV (1080x1920, 24 fps),
  music at 0.25, word captions (TikTok style) added automatically on every non-title scene,
  no thumbnail. Template: episodes/templates/short-animado.json.
- Vertical layout zones (percent of height): headline 9–20 %; objects/black holes 22–55 %;
  CAPTIONS 60–72 % (keep bubbles/tags out of it); characters with feet at 85–95 %.
- 5–7 scenes, 35–55 s, one strong visual beat per scene (pose change, collapse, flash...).
- QA: stills per scene (Node API with id "StoryV") + clean scene WAV transcription.
