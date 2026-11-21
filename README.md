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
- **Hold Ctrl or C** on the street or garage alley: crouch and move slowly. Release to stand after clearing low obstacles.
- **E**: open the lit door.
- **Esc**: pause or resume; close Settings to return to its previous menu. On a touchscreen, the small pause icon opens the pause menu.
- **R**: restart the level.

Small touch icons appear on touchscreen devices. The running figure toggles running; the open hand interacts. Hold the hand icon and a direction to push or pull the dumpster. Press **↑** beside the crate or dumpster to climb onto it. Near the ladder, an extra **↓** button appears for climbing down; the **↑** button climbs up. The **← / →** buttons also move down or up while on the ladder. Release the buttons to hold your place. The crouching figure toggles crouch on the street and garage alley; tap it again to stand when there is room. Sound and volume are controlled from **Settings**.

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

The path leads to his worn apartment building: broken plaster exposes individual brickwork, repaired walls surround a rough old wooden door, and a dim entrance lamp reflects in the wet sidewalk. In v0.23 the doorway opens with E and leads into the home stairwell.


## Running slide and home entrance — v0.23

While running, press **Ctrl** or **C** (tap the crouching icon on a phone) to slide. A fresh press at running speed starts the action: the boy drops onto a low sliding pose, carries momentum over the wet ground and recovers into a crouch if the control remains held or an obstacle is still overhead. Walking into a crouch keeps the existing slower movement. Held controls never repeat the slide automatically, and solid objects stop it.

At the worn wooden entrance, press **E** or the nearby hand icon. The door swings inward before the boy walks through the supported passage. Inside is a three-floor apartment block with upward switchback stairs, exposed brick, worn plaster and warm wall lamps. The child's apartment is on the **second floor**, on the left landing; the third floor remains above it. Continue remembers supported positions inside this building.

The children's playground is scenery behind the block for a later stage: faded swings, a metal slide, a seesaw, sandpit and benches sit in the rainy rear courtyard. It is visible in the background and is not the destination of the entrance door.


## Home landing fixes — v0.24

The third-floor landing reconnects to its staircase: walk left to descend the last flight and return to the child's second-floor apartment. Reversing on the staircase can go back upstairs. Existing top-floor saves and Continue during the descent remain supported.

The child's wooden apartment door now sits in the left side wall of the second-floor landing, with its taped drawing and warm light. The ground entrance keeps its position.

## Rainy rooftop graphics preview — v0.25

The opening rooftop chapter now uses a colder night palette, layered mist and rain at several depths. Apartment blocks have recessed windows, occasional warm interiors, curtains, balconies, air conditioners, antennas and suspended cables. A moving searchlight casts a soft beam through the haze.

Wet concrete, worn plaster, oxidized metal and wooden props use locally generated color, relief and roughness maps. Shallow puddles have irregular shores, broken reflections and animated rain rings; leaves, drains and small debris add detail along the roof. The original route, collision surfaces, jumps, slip event, plank and ladder mechanics remain in place.

This is a visual preview for the first chapter. The street, both interior stairwells and home courtyard keep their previous graphics. The standalone HTML includes every new texture and shader and still works offline.

## The apartment — v0.26

At the child's second-floor landing, press **E** near his wooden side-wall door, or tap the hand icon on a phone. The door swings open, the boy aligns with its threshold, and the view enters his apartment. Holding E before reaching the doorway does not open it automatically.

The kitchen is immediately visible from the entrance. His father sits slumped at a stained dining table, with brown and greying hair, his head resting on a folded arm and a glass held in his other hand. Only his breathing moves. Worn cabinets, dirty dishes, bottles, an old stove and peeling plaster surround the table beneath a dim pendant lamp.

Walk right into the living room, with its worn sofa, rug, books and flickering CRT television, then continue right into the child's bedroom. An iron bed, teddy bear, football, taped drawings and a desk lamp sit beside a cold courtyard window. Furniture stays behind a continuous supported walking lane; the passages pass beside the room partitions.

Continue remembers a safe position in any of the three rooms. Pausing freezes the door, character and father. At the apartment entrance, a fresh **E** press returns to the second-floor landing. New Game still begins on the rooftop. All apartment models, textures and animation are included in the offline HTML.

## Apartment pursuit and courtyard escape — v0.27

The father now uses continuous skinned clothing, a sculpted head and fitted brown-and-grey hair. He rises from his chair with the tumbler when the boy enters the living room, then follows him into the apartment. The kitchen has a large original family portrait showing the boy and both parents.

The apartment windows look onto actual 3D buildings, with recessed windows, sills and balconies. The bedroom's escape window is set into the right side wall beside the bed. **High detail**, enabled by default in Settings, preserves the chosen render resolution; **Balanced** enables automatic resolution reduction on slower devices.

Run into the bedroom and press **E** near its door to pull it closed. Hold **E + a direction** beside the bedside cabinet to push or pull it across the door. **Space / W / Up** jumps onto or over the cabinet. The father throws his tumbler against the closed wooden door, retrieves it and tries to force entry. The barricade gives the boy time to reach the window.

Press **E** at the window after securing the door. The boy opens the casement, braces on the sill and climbs onto the fire escape. Follow the metal stairs using left/right movement, turning at each landing to descend the next flight. The father forces his way into the bedroom and climbs out after him. On reaching the playground below, the boy can see his father standing motionless on the upper fire escape, looking down into the courtyard.

Being caught plays a brief, non-graphic impact and loose falling animation before restoring the preceding safe checkpoint. Continue preserves safe bedroom, fire-escape and playground positions; unfinished jumps, door actions and falls cannot overwrite them. Earlier apartment saves remain supported. Phone controls provide the same interaction, object movement and jumping actions. All geometry, textures, character surfaces and audio remain available offline.

## American fire escape and developer tools — v0.28

The exterior escape now resembles a traditional American iron fire escape: long picket-railed balconies, open metal grating, alternating flights and bolted cantilever brackets mounted directly to an aged brick courtyard facade. The previous freestanding columns and cross-bracing have been replaced with wall anchors. The supported stair route and the father's final watch point keep their existing positions.

A concealed Settings sequence and the owner's password reveal a session-only developer panel. Once unlocked, **F2** or the small **DEV** button opens its tools. It includes supported stage selection, capture and restoration of test checkpoints, pursuit freezing and free movement through geometry. **A/D** move horizontally, **W/S** rise or descend, **Q/E** change depth, and **Shift** increases travel speed. Touch devices receive separate rise, descend and depth controls.

Developer actions preserve the normal saved game. A captured test checkpoint remains available when changing stages; turning free movement off restores a supported test position. Returning to the saved game or locking the mode restores normal progress. Closing or reloading the page requires the unlock procedure again.

Access is checked locally in the downloadable web build, whose client code can be inspected or modified. The password verifier uses a salted SHA-256 digest, and authentication is kept in memory for the current page.

## Physical impact reaction — v0.29

When the father catches the boy, the guarded reaction now releases into an articulated ragdoll at the moment the tumbler connects. The impulse travels away from the father, with separate motion for the head, arms and legs, a delayed backpack swing, a small contact bounce and a weighted settle. Floor and furniture contacts constrain the fall. The reaction also works when caught during a jump, without moving the character origin twice.

The fall uses fixed physics steps and interpolated poses for consistent motion across display refresh rates. Pause freezes the reaction, and retry clears the simulated body before restoring the preceding safe checkpoint. The impact and first body contact have separate muted sounds. The sequence remains non-graphic.

## The father's appearance — v0.30

The father now has a drawn, weathered face, tired eyes, short greying stubble and tousled brown-and-grey hair. His slimmer silhouette wears a worn brown patterned cardigan over an aged grey shirt, loose trousers and checked house slippers. The face and garments are smooth three-dimensional surfaces; knitted patterns and fabric relief follow the animated clothing. Sculpted fingers preserve his grip on the tumbler.

The existing seated, rising, pursuit, strike, retrieval and window escape actions use the new model. The family portrait has matching brown clothing. All model geometry and fabric textures are generated locally and remain available in the downloadable offline game.

## One park beside the home — v0.31

The park visible to the right of the wooden street entrance is now the same park reached after escaping the apartment. Its swings, sandpit, slide, benches and seesaw retain their positions and scale in both views. The obsolete second park and duplicate rear entrance have been removed.

The fire escape descends into a bare service passage beside the home. Walking right follows the paving around the visible building corner and through an open side gate into the park; the street-facing access remains closed. Left/right movement follows this bend continuously, keeping the same walking pace. The camera briefly frames the boy and his father at the park entrance before following the boy farther into the park.

Existing courtyard saves restore onto the supported passage or park path. The developer park shortcut starts inside the actual park.


## Garage alley — v0.32

The open gate at the end of the park leads into a rain-soaked alley of concrete garages and corrugated metal doors. Original 3D scenery includes rusty pitched roofs, muddy puddles, weeds, discarded parts, a mechanic working under a car bonnet, and a sleeping territorial dog. Nearby dogs, a muffled television, tools and rain on metal roofs use spatial audio. The garage resident and the yard owner are separate characters.

Walk quietly past the dog, then move and climb the timber crates to cross the first locked fence. A second locked gate requires a route through the workshop: find the mechanical jack beside the old car, carry it to the stuck shutter, press **E** to place it, then hold **E** to operate the handle. The noisy door wakes the resident upstairs. Crouch under the raised shutter with **C / Ctrl**; inside, push the crate toward the rear window, climb onto it and press **E** at the latch. Use cover and the owner's changing gaze to cross the final yard. Running followed by **C / Ctrl** keeps the existing slide mechanic.

Safe progress stores crate positions, the carried or installed jack, partial door lift and the workshop/backyard route. Being caught returns to a nearby checkpoint; entering the workshop preserves the raised door. Pausing freezes movement, threats and alley audio. Continue restores safe grounded positions and completed runs show the ending. Optional captions appear only with **Hints** enabled. The concealed developer menu also offers Garage alley, Garage workshop and Backyard test locations; free movement reaches the entire new area.

The level emphasizes exploration and moderate tension, with nearby checkpoints to keep retries short.


## Building repairs and exploration — v0.33

The city now has recessed window apertures, connected door frames and continuous facade textures. Rooftop service equipment sits on its actual host roofs; plaster patches stay inside wall silhouettes. Street doorways open into recessed passages. The home exterior closes behind the fire escape after the boy descends below the apartment, while the open bedroom window retains a real interior recess. Alley buildings retain their roofs and structural frames during cutaways; visibility uses geometry bounds to keep parts of a building together.

A storage room beside the alley offers an alternative to the noisy jack puzzle. Press **E** at its wooden door, explore inside, collect the hanging gate key, then return to unlock the outdoor gate. Both routes lead to the final yard. The room's radio can be switched on or off, with matching sound and indicator light. In the yard, interact with the hanging chain to draw the owner away temporarily, or continue using cover and patrol timing. Discoveries and route choices are included in Continue; older saves remain compatible. The developer menu includes a **Storage room** shortcut.

The additional interactions use animated hand contacts. All captions remain optional through Settings → Hints, and the existing rooftop, stair, street, apartment and escape controls remain available.


## Hunger, kiosk pursuit and the market — v0.34

Leaving the garage courtyard now continues into a small neighbourhood street between apartment blocks. The boy slows and clutches his stomach as hunger sets in. At the kiosk, press **E** beside the reachable bread roll to take it. The shopkeeper notices, leaves through his actual side doorway and pursues the boy down the street. His appearance, clothing and apron are original 3D geometry; footsteps follow his movement.

The street ends at a railing above the market. Walking, crouching and sliding stop at the railing; press **Space**, **W** or **Up** nearby to vault it. The boy drops onto a stall's striped canvas, which sags and rebounds as his knees and hands absorb the landing. He steps across the canopy, drops into the lower market and eats once he reaches a quiet spot. The shopkeeper remains above at the railing.

The cloth mesh and character support use the same surface function. A safe checkpoint before the kiosk preserves the brief hunger introduction, while a second checkpoint after the descent avoids repeating the pursuit. Continue preserves the food stage and the shopkeeper's physical position. Previously completed alley saves automatically continue into this chapter. The concealed developer menu adds **Kiosk**, **Kiosk pursuit** and **Market** shortcuts. Existing touch controls work offline; hints remain optional in Settings.
