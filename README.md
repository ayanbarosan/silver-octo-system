# RUNAWAY

An original **2.5D adventure prototype** with a fully 3D character and city, played from a side view. A boy in a black tracksuit with white stripes and a lime backpack wakes on a torn mattress in a small rooftop shelter above a quiet city of apartment blocks. A fixed railing and concrete base guard the edge beside his bedding.

Cross three rooftops: climb past the vent, move the crate to clear the pipe, take a running jump to the middle block, then cross a wooden plank to a lower landing beside the final building. The plank breaks behind you after you reach the landing safely. Climb the wall ladder to the upper roof and enter the lit door to reach the interior stairwell. Descend four flights, alternating direction at each landing, then follow the ground-floor corridor to its door and step out onto the rain-soaked street. Move a dumpster to reach and cross the tall fence. The scene uses concrete textures, layered city silhouettes, fog, shadows, and a subdued early morning palette. Walking, running, waking, jumping, landing, and climbing use animated character poses.

## Opening

**New Game** begins on the torn mattress, beside a pillow and a folded blanket. The railing protects the left edge while a searchlight sweeps the roof. Gameplay has no chapter banners, objective panels, control legend or branding. Each new mechanic receives one brief caption on its first encounter; recurring hints are disabled by default.

The menu and opening use the same restrained, darker palette as the city, with the lime backpack and warm doorway providing clear landmarks.

## Menu and settings

The main menu uses an original green RUNAWAY wordmark drawn as local vector lettering over the live city. **New Game** starts over; **Continue Game** restores the most recent safe grounded position, the crate, broken crossing and puddle progress. Continue is disabled until a valid save exists. Pausing and returning to the menu also save when the current position is safe. Jumps, ladders and other unfinished actions resume from the preceding stable position.

**Settings** contains sound, volume, brightness and an optional **Hints** switch. Hints stay off unless enabled; enabling them adds one quiet contextual caption. First-encounter messages introduce moving objects, crate climbing, running jumps, ladders and the door once each, with touch-specific text on phones. Continue remembers messages already shown; New Game resets them. Preferences and progress are kept in this browser. If an offline browser blocks storage, the current session still supports settings and Continue in memory.

## Play

Open the generated `dist/Runaway.html` file in Chrome, Edge, or Firefox. No server or internet connection is needed. The game requires WebGL 2 and graphics acceleration; rendering quality is reduced automatically when software rendering is detected.

- **A / D** or **Left / Right**: move.
- **Shift + a direction**: run. Use a running jump to cross the gap between buildings.
- **Space**, **W**, or **Up**: jump; near a reachable ledge, climb up.
- **Hold a direction toward a reachable vent or pipe ledge**: automatically grab the edge and pull yourself up.
- **Space**, **W**, or **Up** beside the crate: climb onto it. Walking into the crate or waiting beside it does not start a climb.
- **W**, **Up**, or **Space** at the wall ladder: climb up.
- **Jump toward the ladder**: catch a reachable rung at the height reached, then climb or hold still.
- **S** or **Down** at the wall ladder: climb down, including entering the ladder from the upper roof.
- **D / Right** or **A / Left** while on the ladder: climb up or down, respectively. Release the controls to hold still; reverse direction at any point.
- **Hold E + a direction**: push the crate; push or pull the street dumpster.
- **Hold Ctrl or C** on the street: crouch and move slowly. Release to stand after clearing low obstacles.
- **E**: open the lit door.
- **Esc**: pause or resume; close Settings to return to its previous menu. On a touchscreen, the small pause icon opens the pause menu.
- **R**: restart the level.

Small touch icons appear on touchscreen devices. The running figure toggles running; the open hand interacts. Hold the hand icon and a direction to push or pull the dumpster. Press **↑** beside the crate or dumpster to climb onto it. Near the ladder, an extra **↓** button appears for climbing down; the **↑** button climbs up. The **← / →** buttons also move down or up while on the ladder. Release the buttons to hold your place. The crouching figure toggles crouch on the street; tap it again to stand when there is room. Sound and volume are controlled from **Settings**.

After **New Game**, the boy automatically braces his palms against the roof, brings a knee beneath him, and stands. Jumps preserve forward momentum, choose a leading leg from the current stride, and blend through anticipation, takeoff, airborne recovery, landing reach, and a step back into movement. A short input buffer and edge grace make repeated jumps more forgiving. At reachable vent and pipe ledges, he grabs the edge and pulls himself onto the roof automatically. Climbing onto the crate requires **Space**, **W**, **Up**, or the phone’s **↑** button.

## Rooftop route

1. Leave the mattress shelter and get over the vent.
2. Cross the marked puddle before the crate. The first grounded crossing causes a slip and automatic recovery; jump clear of it to avoid the fall.
3. Push the crate toward the tall pipe, then stand beside it and press **Space**, **W**, or **Up** (**↑** on a phone) to climb onto it. Continue over the pipe. The crate does not trigger an automatic climb when you approach, wait beside it, or return after stepping off.
4. Take a running jump over the first gap to the middle apartment block.
5. Walk across the wooden plank spanning the second gap to the lower landing beside the final building. It breaks behind you only after you reach the landing safely.
6. At the left wall, hold **W**, **Up**, or **Space** to climb the ladder, or jump toward it to catch a rung without dropping to the base. Stop to hold still, or use **S / Down** to reverse. You can also use **D / A** while climbing.
7. Step onto the upper roof to set the final checkpoint, then continue to the lit door and press **E** (the hand icon on a phone). To go back down the outdoor ladder, hold **S / Down** at its top.
8. Inside, walk left down the first flight. At each landing, turn around to descend the next flight: left, right, left, right. Completed flights cannot be selected again. On the ground floor, walk left to the corridor door and press **E** (the hand icon on a phone) to open it and step onto the street.

## Android: play the downloaded ZIP offline

1. On the GitHub repository page, choose **Code → Download ZIP**.
2. Extract the ZIP with your phone’s file manager.
3. Inside the extracted repository folder, open **`docs/index.html`** in Chrome or another browser with WebGL 2 support. Use this self-contained file, **not the `index.html` in the repository root**.
4. Turn the phone sideways for more room, choose **New Game** or **Continue Game**, and use the touch controls. No internet connection is needed after downloading the ZIP.

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

`npm run build` bundles `src/main.js` into `game.js` and generates `dist/Runaway.html` and the GitHub Pages site in `docs/`. `npm start` serves the existing build. `npm test` checks animation contacts, collision, movement, bridge and slip behavior, stair descent and tread contacts, safe save snapshots, settings validation and storage fallback. WebGL rendering, menus and the complete level also need verification in a browser.

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

A third apartment block forms the middle stage of the route. The first crossing remains a running jump; a wooden plank connects the middle block to the far building. It stays intact while you cross and breaks only after you are safely on the far side. The mattress shelter and protective railing remain at the start. In v0.10, the far side is a lower landing, with a ladder leading to the final door roof.

## Wall ladder and upper roof — v0.10

The final building rises above the plank landing. A wall ladder connects the lower landing to its upper roof. Climbing follows alternating hand and foot contacts, holds still when you release the controls, and reverses when you change direction. You can enter from the bottom or climb down from the top. The upper roof sets the final checkpoint, so later falls return you near the door rather than across the broken plank.

## Puddle slip and recovery — v0.11

The marked puddle between the vent and the crate causes a slip on the first grounded crossing of each restart. The boy falls backward, settles briefly, supports himself to stand, brushes his jacket, and looks back before normal movement resumes. The sequence is automatic and needs no new controls. Jumping over the puddle does not trigger it, and crossing it again after the recovery does not repeat the fall until you restart.

For a browser check, walk into the puddle and let the complete recovery finish, then cross it again to confirm it does not repeat. Restart and jump clear of it to check that passing overhead does not trigger the sequence.

## Deliberate crate climb and ladder transfer — v0.12

The crate now requires a jump/climb press: **Space**, **W**, **Up**, or **↑** on a phone. Walking into it, staying beside it, or returning after stepping off never starts a climb by itself. Stepping off the crate returns to normal falling and movement instead of leaving the boy frozen at its edge. Automatic ledge climbing remains available on the vent and pipe.

At the top of the ladder, the boy gradually transfers support from the handrails to a planted leading foot, brings the trailing leg up, and stands on the roof. The body moves progressively instead of rushing sideways at the end.

Slip and recovery body poses carry motion through their intermediate positions while hands and feet retain their supporting contacts. Climbing, ladder and slip poses use the same interpolated render time as the character's position, keeping their motion even between physics steps.

## Finished railings and airborne ladder catch — v0.14

All four rooftop railings have terminal posts, capped tubing, short end returns and anchored feet. The ends sit inside each roof's edge, behind the playable lane.

Jumping toward a reachable ladder now blends into a short reach, grip and settle at the height already reached. The boy can hold there, climb up or reverse down. Brief first-encounter captions appear once per mechanic and are saved separately from the optional recurring hints.

## Interior stairwell — v0.15

The rooftop door opens into a sealed interior view with four concrete stair flights, worn two-tone plaster, numbered landings, capped railings, electrical boxes and caged wall lamps. The city and rain are hidden during this chapter. The camera follows the descent, and foot placement follows the individual treads.

Use the usual left and right controls. Each completed flight retires from the route, so turning at its landing selects the next downward flight. Reversing before reaching a landing can still retrace the current flight. Jump inputs keep the boy supported on the stairs. Continue restores the current flight and position, including after reloading; New Game starts back on the roof. Reaching the ground-floor corridor door ends this prototype section.

## Stair clearance and interior cleanup — v0.16

Stair flights now alternate between two physical depths. After each descent, the boy walks out onto the connected landing and turns around the end before entering the next lane. The ground-floor return runs in front of the lowest staircase. Normal left/right controls remain the same; the brief landing turn happens automatically. Pausing freezes the turn, and Continue uses the last safe supported position until the turn finishes. Existing stairwell saves restore into the correct lane.

Floor numbers, disconnected opposite-side platforms and repeated electrical boxes have been removed. Only the necessary turning landings and the electrical box beside the former third-floor marking remain. Regression checks measure the actual head, torso, knees and shoes against stair geometry, including the ground-floor return.

## Door-side ground route and hallway doors — v0.17

After the final flight, the landing turn takes the boy behind the lowest staircase, on the same side as the ground-floor door. Walking left reaches that door with the existing controls; no manual depth movement is needed. Earlier flights and their controls stay the same, and older ground-floor saves restore onto this rear route.

Floors 1, 2 and 3 have closed decorative doors suggesting corridors beyond the stairwell. These doors cannot open and do not lead to playable hallways. Floor 4 keeps only its roof-access door.

## Side-wall doors and deliberate exit — v0.18

The closed hallway doors on floors 1–3 sit in the left/right side walls, with supported thresholds and landings connected to those walls. The fourth floor has no interior door, including the former roof-access door.

Walking to the ground-floor exit no longer ends the section. Press **E** near the door, or tap the hand icon that appears there on a phone, to open the hinged leaf and finish. Holding E before reaching the door does not activate it later. Pause freezes the opening; Continue restores the previous safe position with the exit closed.

## Roof entrance and first landing — v0.19

The roof-access entrance is restored on the upper-right wall where the boy enters the stairwell. The hallway door on the first landing below it has been removed. The two lower side-wall hallway doors remain closed scenery, and the ground exit still requires E or the phone hand button.

## Empty street — v0.20

Opening the ground-floor exit with **E** (the hand icon on a phone) now leads outside into a rain-soaked street. The boy emerges beside the apartment entrance and can explore the sidewalk with the usual walking, running and jump controls. Continue saves the street position and restores it after reloading.

The street has five parked old sedans and hatchbacks, worn apartment façades, a fenced courtyard, trees, bins, overhead wires and muted street lamps reflected in wet paving. Cars and street furniture stay behind the walking lane. The camera follows the boy along the street, and rainwater splashes accompany steps and landings.


## Movable dumpster and fence crossing — v0.21

A large wheeled steel dumpster occupies the sidewalk. Walking into it stops the boy; **Space / W / Up** deliberately climbs onto its lid. Jumping toward a reachable ledge catches it from the height attained. Stepping off either side returns to normal falling.

Hold **E** beside either handle and use **A / D** to push or pull. The boy keeps facing the dumpster, braces both hands on its handles, and leans into the load or steps backward while pulling. On a phone, hold the nearby hand icon and a direction; **↑** climbs. A short first-encounter caption introduces these controls once.

Move the dumpster toward the end fence, climb onto it, then jump toward the fence to pull up and pass over. The far side has a safe landing for the next update. Continue remembers the dumpster position and safe ground or lid positions, including beyond the fence; older street saves remain compatible. New Game resets the object.

The exit building now has a larger faded graffiti tag to the left of the entrance, and an adjoining apartment block fills the far-left view.


## Low fence and home courtyard — v0.22

Beyond the dumpster crossing, a raised damaged fence panel leaves a low passage into the next courtyard. Hold **Ctrl** or **C** and walk underneath. On a phone, tap the crouching figure to toggle the low posture, then use the direction icons. The boy lowers his hips, tucks his head and takes short planted steps; his backpack passes below the fence with him. Running and jumping are unavailable while crouched. Releasing the control inside the passage keeps him low until his whole body clears the panel.

A brief first encounter introduces crouching once. Continue safely restores crouched positions inside the opening, while older street saves keep working. Pause freezes the posture and New Game resets the route.

The path leads to his worn apartment building: broken plaster exposes individual brickwork, repaired walls surround a rough old wooden door, and a dim entrance lamp reflects in the wet sidewalk. The doorway is scenery for this stage.
