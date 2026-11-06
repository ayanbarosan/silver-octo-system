# The Last Floor

An original **2.5D adventure prototype** with a fully 3D character and city, played from a side view. A boy in a black tracksuit with white stripes and a lime backpack wakes on a torn mattress in a small rooftop shelter above a quiet city of apartment blocks. A fixed railing and concrete base guard the edge beside his bedding.

Cross three rooftops: climb past the vent, move the crate to clear the pipe, take a running jump to the middle block, then cross a wooden plank to the lit door on the final roof. The plank breaks behind you after you reach safety, with a checkpoint on the final roof. The scene uses concrete textures, layered city silhouettes, fog, shadows, and a subdued early morning palette. Walking, running, waking, jumping, landing, and climbing use animated character poses.

## Opening

**WAKE UP** begins a short cinematic sequence on the torn mattress, beside a pillow and a folded blanket. The railing protects the left edge while a searchlight sweeps the roof. A chapter cue and brief prompts guide the first steps out of the shelter. Movement controls remain visible throughout the sequence.

The menu and opening use the same restrained, darker palette as the city, with the lime backpack and warm doorway providing clear landmarks.

## Play

Open the generated `dist/The-last-floor.html` file in Chrome, Edge, or Firefox. No server or internet connection is needed. The game requires WebGL 2 and graphics acceleration; rendering quality is reduced automatically when software rendering is detected.

- **A / D** or **Left / Right**: move.
- **Shift + a direction**: run. Use a running jump to cross the gap between buildings.
- **Space**, **W**, or **Up**: jump; near a reachable ledge, climb up.
- **Hold a direction toward a reachable ledge**: automatically grab the edge and pull yourself up.
- **E + a direction**: push the crate.
- **E**: open the lit door.
- **Esc**: pause or resume. On a touchscreen, tap the scene to resume.
- **R**: restart the level.

Touch controls appear on touchscreen devices. **RUN** toggles running so you can jump without holding three buttons at once. Use the **SOUND** button in the top right to turn the ambient audio on or off.

After **WAKE UP**, the boy automatically braces his palms against the roof, brings a knee beneath him, and stands. Jumps preserve forward momentum, choose a leading leg from the current stride, and blend through anticipation, takeoff, airborne recovery, landing reach, and a step back into movement. A short input buffer and edge grace make repeated jumps more forgiving. Near a reachable ledge, he grabs the edge and pulls himself onto the roof.

## Rooftop route

1. Leave the mattress shelter and get over the vent.
2. Push the crate toward the tall pipe, then use it as a step to climb across.
3. Take a running jump over the first gap to the middle apartment block.
4. Walk across the wooden plank spanning the second gap to the final roof.
5. Once you reach the far roof safely, the plank breaks behind you and the final checkpoint is saved. Continue to the lit door and press **E**.

## Android: play the downloaded ZIP offline

1. On the GitHub repository page, choose **Code → Download ZIP**.
2. Extract the ZIP with your phone’s file manager.
3. Inside the extracted repository folder, open **`docs/index.html`** in Chrome or another browser with WebGL 2 support. Use this self-contained file, **not the `index.html` in the repository root**.
4. Turn the phone sideways for more room, tap **WAKE UP**, and use the touch controls. No internet connection is needed after downloading the ZIP.

## Development

Use Node.js 20 or later and npm. Work in the existing checkout; no separate Git worktree is needed.

```sh
npm ci
npm run dev
```

The development command builds the game and starts the server on port 3000, or the port specified by `PORT`.

```sh
npm run build
npm start
npm test
```

`npm run build` bundles `src/main.js` into `game.js` and generates the standalone HTML file in `dist/` and the GitHub Pages site in `docs/`. `npm start` serves the existing build. `npm test` checks JavaScript syntax and the character animation rig, including foot contact and animation continuity. WebGL rendering and the complete level also need verification in a browser.

Character geometry, buildings, windows, materials, and audio are generated locally. Three.js and the build tools are pinned in the dependency manifest and lockfile. The compiled game uses no external fonts, CDNs, or other network resources.

## Jump reference study — v0.7

This update focuses on the jump animation. Its lower arc reaches about 1.03 world units and lasts about 0.88 seconds on a level surface. The legs stay below the pelvis with the heels trailing; the leading leg reaches down first and one forearm rises for balance during descent. Walking off ledges retains the previous falling gravity.

## Play on a phone with GitHub Pages

The `docs/` directory contains the complete game as a static page, including its graphics and audio code. Once the files are pushed to GitHub, enable hosting if it is not already configured:

1. Open [the repository’s Pages settings](https://github.com/ayanbarosan/silver-octo-system/settings/pages).
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the **main** branch and **/docs** folder, then click **Save**.
4. When deployment finishes, open the site address shown in Pages settings on your phone. Landscape orientation gives the scene and touch controls more room.

For later updates, run `npm run build` and commit the updated `docs/index.html` along with the source changes. Keep `docs/.nojekyll` so GitHub serves the generated page directly.

## Rooftop shelter — v0.8

The boy wakes on a torn mattress with a pillow and a folded blanket. A fixed railing and concrete base guard the left edge. Bedding is a low walkable surface, and the guard blocks movement and ordinary jumps toward the drop. The searchlight opening remains; the loose falling coping stone has been removed.

## Middle rooftop and breakaway plank — v0.9

A third apartment block now forms the middle stage of the route. The first crossing remains a running jump; a wooden plank connects the middle block to the final door roof. It stays intact while you cross and breaks only after you are safely on the final roof. The final checkpoint keeps a later fall from sending you back across the broken plank. The mattress shelter and protective railing remain at the start.
