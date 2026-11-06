import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { clipFrames, encode, findRef } from "../src/capture.js";

test("findRef finds a button by name, also when its snapshot line carries state", () => {
  const snapshot = [
    '- button "Choose a theme" [expanded=false, ref=e16]',
    '- button "Close" [ref=e2]',
    '- option "Topdeck" [selected, ref=e18]',
    '- button "Play (1x)" [ref=e7]',
  ].join("\n");
  assert.equal(findRef(snapshot, "button", "Choose a theme"), "e16");
  assert.equal(findRef(snapshot, "button", "Close"), "e2");
  assert.equal(findRef(snapshot, "option", "Topdeck"), "e18");
  assert.equal(findRef(snapshot, "button", "Play (1x)"), "e7");
  assert.equal(findRef(snapshot, "button", "Topdeck"), undefined);
});

test("a clip opens on the frame on screen when it starts", () => {
  const frames = [{ at: 100, data: "a" }, { at: 900, data: "b" }, { at: 1500, data: "c" }, { at: 4000, data: "d" }];
  assert.deepEqual(clipFrames(frames, { startAt: 1000, endAt: 3000 }), [{ at: 1000, data: "b" }, { at: 1500, data: "c" }]);
  assert.deepEqual(clipFrames(frames, { startAt: 0, endAt: 1000 }), [{ at: 100, data: "a" }, { at: 900, data: "b" }]);
});

// The total frame duration of an animated WebP, read from its ANMF chunks without decoding it.
function webpDuration(buffer) {
  let total = 0;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const size = buffer.readUInt32LE(offset + 4);
    if (buffer.toString("ascii", offset, offset + 4) === "ANMF") total += buffer.readUIntLE(offset + 8 + 12, 3);
    offset += 8 + size + (size % 2);
  }
  return total;
}

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

test("encode keeps every frame's real duration, including a long still ending", { skip: !hasFfmpeg && "needs FFmpeg" }, async () => {
  const work = await mkdtemp(path.join(os.tmpdir(), "showcase-encode-"));
  const frame = (color) => {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `color=${color}:s=320x180`, "-frames:v", "1", path.join(work, `${color}.jpg`)]);
    return readFile(path.join(work, `${color}.jpg`), "base64");
  };
  const [red, green, blue] = await Promise.all(["red", "green", "blue"].map(frame));
  const out = path.join(work, "clip.webp");
  await encode([{ at: 0, data: red }, { at: 1000, data: green }, { at: 2000, data: blue }], 7000, work, { out, width: 320, fps: 20, quality: 50 });
  assert.equal(webpDuration(await readFile(out)), 7000);
});
