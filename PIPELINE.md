# Escala Brutal: daily pipeline

The owner of this repo has authorised fully automated creation and
publication of 3 Shorts per day to their YouTube channel and their TikTok,
through Metricool (brand blogId `8001188`, timezone Europe/Madrid).

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
   - Spend vidIQ credits on research only on Mondays (see Weekly).
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
6. **Commit & push** to `main`: episode JSONs, MP4s, `topics.md` (mark
   topics `[x]` with the episode id). Public URL of each video:
   `https://raw.githubusercontent.com/gonzaloliano02-svg/pepe-monedas-videos/main/videos/<id>.mp4`
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

## Weekly (Mondays)
- Read last week's stats (vidIQ `user_videos`, 5 credits; Windsor
  `tiktok_organic`, free). Rank videos by views and retention.
- vidIQ research (max ~15 credits): `keyword_research` mode `rising`
  (language `es`) and one `outliers` search for Shorts in Spanish.
- Write a short review in `log.md`: which formats/hooks/topics won, which
  failed, and what to try this week. Update `FORMATS.md` (promote winners,
  drop losers, add at least one new format to test).

## Hard rules
- Never post anything that isn't a finished `videos/*.mp4` from this repo.
- Never delete or edit existing posts on the accounts.
- If a step fails, do not publish a broken video: log the error and stop.
