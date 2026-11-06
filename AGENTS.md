# showcase-capture

Records a web app as a looping animated WebP through agent-browser's stream and FFmpeg. `README.md` documents `record()` and the lessons behind each default; keep it in step with the code.

- No runtime dependencies. Node 22+, ESM, `node:` imports, tests with `node --test` (`npm test`). agent-browser and FFmpeg come from the PATH; the encode test skips without FFmpeg.
- Everything project-specific (start, drive, verify, crop) stays in the caller. Add an option only when two projects need it.
- Try a change by re-recording a real project's loop and looking at the frame sheet before releasing. Never write into another project's repo unless asked.
- Conventional Commits. Releases run locally: `pnpm release`, pick the version at the prompt.
