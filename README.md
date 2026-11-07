# Cutroom Web

Edit a talking video on your phone or computer: it cuts the pauses, adds captions in a style
you pick, punch-ins, a colour look, two brand colours (highlight + background) and automatic
b-roll cards for numbers and highlighted words. Everything runs in the visitor's own browser:
free, no server, and nobody's footage is uploaded anywhere.

- Speech-to-text: Whisper (transformers.js), downloaded once (41 MB fast / 77 MB accurate) and cached.
- Recording: canvas + MediaRecorder (MP4 on Safari and recent Chrome, WebM on older browsers).
- Best for talking clips up to about 3 minutes. It plays the edit through once while recording,
  so keep the screen on.

## Put it online (free)
Any static host works - the folder is the whole site (leave out `_test/`):
- GitHub Pages: push this folder to a repository, Settings -> Pages -> deploy from the main branch.
- Cloudflare Pages / Netlify: drag and drop the folder.

## Logins (Lachlan is admin)
Everyone gets their own code. Double-click `USERS.bat` (or `Videos\Jobs\SITE-LOGINS.bat`):
add a person (it makes them a code), remove a person, then Publish. Or: `python users.py add "Sammy"`,
`python users.py remove "Sammy"`, `python users.py publish`. Plain codes stay in `codes.txt` on the laptop only.

## Local test
`python -m http.server 8767` in this folder, open http://localhost:8767
