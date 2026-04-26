// Embed an sRGB ICC profile in every PNG under screenshots/. Without an
// embedded profile, App Store Connect renders the upload through its
// default color pipeline (Display P3) and the colors come out faded.
//
// Sharp adds the iCCP chunk without recompressing the pixel data, so the
// rewrite is effectively lossless.

import sharp from "sharp";
import { readdirSync, renameSync, statSync, existsSync } from "fs";
import path from "path";

const TARGETS = [
  "screenshots/ios-iphone",
  "screenshots/ios-ipad",
  "screenshots/android-phone",
  "screenshots/android-tablet",
  "screenshots/ipad-13",
];

let total = 0;
for (const dir of TARGETS) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".png")) continue;
    const fp = path.join(dir, f);
    const tmp = fp + ".tmp";
    // Use the input file directly. Sharp's PNG encoder defaults to lossless
    // and withIccProfile only writes the iCCP chunk.
    await sharp(fp)
      .withIccProfile("srgb")
      .png({ compressionLevel: 9, palette: false })
      .toFile(tmp);
    renameSync(tmp, fp);
    const m = await sharp(fp).metadata();
    if (!m.hasProfile) throw new Error(`Tag failed for ${fp}`);
    total++;
    console.log(`✓ ${fp}  (${(statSync(fp).size / 1024).toFixed(0)} KB, profile: ${m.hasProfile})`);
  }
}
console.log(`\nTagged ${total} screenshot(s) with embedded sRGB profile.`);
