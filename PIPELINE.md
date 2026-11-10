# Escala Brutal: daily pipeline

The owner of this repo has authorised fully automated creation and
publication of 2 Shorts per day to their YouTube channel and their TikTok,
through Metricool (brand blogId `8001188`, timezone Europe/Madrid).

## Daily run (2 videos)

1. **Setup** (fresh container):
   `npm ci && pip install -q piper-tts numpy`.
   The Spanish voice model lives in `voices/` (committed).
   In `remotion.config.ts` the browser path points at the cloud image's
   Chromium; if it is missing, remove that line and Remotion downloads its own.
2. **Pick 2 topics** from `topics.md` (unchecked, varied: not two of the same
   category on the same day). If the bank has fewer than 10 unchecked topics,
   add more. Once a week, refresh with vidIQ `keyword_research` mode `rising`
   (language `es`) and add trending subjects that fit the format.
3. **Write each script** as `episodes/<YYYY-MM-DD>-a.json` and `-b.json`
   (copy the structure of `episodes/2026-11-10-a.json`):
   - 25–45 s total. Scene order: `hook` → 2–4 of `compare`/`stat` → `outro`.
   - Hook is a question or a shocking claim; highlight one word with `*...*`.
   - Every number must be a real, well-established figure. Prefer
     conservative values and round numbers; write "hasta", "unos",
     "más de" when sources vary. No invented facts. If unsure, drop it.
   - `compare` items use one unit per scene; 2–4 items; the subject last
     and biggest when possible. `display` is the formatted label.
   - Narration is written for the ear: numbers in words, short sentences.
   - `title` ≤ 80 chars, curiosity-driven, 1 emoji max.
   - `description` ends with: "Video creado con ayuda de IA."
4. **Build**: `python3 scripts/build_episode.py episodes/<id>.json`
   → `videos/<id>.mp4`. Look at 2–3 stills
   (`npx remotion still ... --frame=N --props=build/<id>.props.json`)
   and fix anything clipped or overlapping before publishing.
5. **Commit & push** to `main`: the episode JSONs, the MP4s and the updated
   `topics.md` (mark topics `[x]` with the episode id). The public video URL is
   `https://raw.githubusercontent.com/gonzaloliano02-svg/pepe-monedas-videos/main/videos/<id>.mp4`
6. **Schedule in Metricool** (`createScheduledPost`), one post per video with
   providers `youtube` + `tiktok`:
   - slots: **13:30** (video a) and **20:30** (video b), Europe/Madrid, today;
     if a slot has passed, use the next free slot ≥ 30 min from now.
   - `youtubeData`: `{title, type: "short", privacy: "public", madeForKids: false, isAiGeneratedContent: false, category: "EDUCATION", tags}`
     (`isAiGeneratedContent` is for realistic synthetic footage; these are
     motion graphics, so false. The description still says AI helped.)
   - `tiktokData`: `{privacyOption: "PUBLIC_TO_EVERYONE", title, isAigc: true}`
   - `text`: description + 4–6 hashtags (#escalabrutal #curiosidades ...).
   - `autoPublish: true`.
7. **Log** the result in `log.md` (date, ids, titles, Metricool planner URLs).

## Weekly (Mondays)
Read last week's stats (vidIQ `user_videos`, Windsor `tiktok_organic`),
note in `log.md` which topics/hooks worked, and bias the next topics
toward the winners.

## Hard rules
- Never post anything that isn't a finished `videos/*.mp4` from this repo.
- Never delete or edit existing posts on the accounts.
- If a step fails, do not publish a broken video: log the error and stop.
