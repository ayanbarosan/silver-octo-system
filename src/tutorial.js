import {LEVEL} from './level.js';
import {STREET} from './street.js';

export const TUTORIAL_IDS=Object.freeze(['push','crate-climb','running-jump','ladder','door','push-pull','crouch','running-slide']);
const copy={
  push:['Hold E + A / D to move objects.','Hold the hand icon and a direction to move objects.'],
  'crate-climb':['SPACE / W / UP — Climb the crate.','Tap ↑ to climb the crate.'],
  'running-jump':['Hold SHIFT to run, then SPACE to jump.','Use the running icon, then ↑ to jump.'],
  ladder:['W / UP — Climb. S / DOWN — Descend.','↑ climbs. ↓ descends. Release to hold on.'],
  door:['E — Open the door.','Tap the hand icon to open the door.'],
  'push-pull':['Hold E + A / D to push or pull. SPACE / W / UP to climb.','Hold the hand icon and a direction to push or pull. Tap ↑ to climb.'],
  crouch:['Hold CTRL or C to crouch.','Use the crouch icon to pass underneath.'],
  'running-slide':['While running, press CTRL or C to slide.','Run, then tap the crouch icon to slide.']
};

// Brief first encounters are separate from the optional recurring hints.
// Only a lesson that actually reached the screen is recorded as learned.
export function createTutorials({touch=false,learned=[]}={}){
  let seen=new Set(),current=null;
  function reset(ids=[]){seen=new Set(Array.isArray(ids)?ids.filter(id=>TUTORIAL_IDS.includes(id)):[]);current=null;}
  function update(dt,{playing=false,wake=0,player,chapter='rooftop',crateX=13,dumpsterX=43.5,busy=false,ladderActive=false}={}){
    if(!Number.isFinite(dt)||dt<=0||!playing||wake<1)return null;
    if(current){current.elapsed+=dt;if(current.elapsed<current.duration)return null;current=null;}
    if(!player||![player.x,player.y].every(Number.isFinite)||busy)return null;
    const x=player.x,y=player.y,grounded=player.grounded;
    const rooftop=chapter==='rooftop',street=chapter==='street';
    const nearCrate=rooftop&&Number.isFinite(crateX)&&grounded&&Math.abs(y)<.08&&Math.abs(x-crateX)<1.95;
    const nearLadder=rooftop&&(ladderActive||grounded&&(
      Math.abs(y-LEVEL.ladder.bottomY)<.1&&Math.abs(x-LEVEL.ladder.x)<1.0||
      Math.abs(y-LEVEL.ladder.topY)<.1&&x>=LEVEL.ladder.wallX-.02&&x<=LEVEL.ladder.exitX+.6
    ));
    const eligible={
      push:nearCrate,
      'crate-climb':nearCrate&&Math.abs(x-crateX)<1.25,
      'running-jump':rooftop&&grounded&&Math.abs(y-LEVEL.roofs.first.y)<.1&&x>=19.3&&x<=22.05,
      ladder:nearLadder,
      door:rooftop&&grounded&&Math.abs(y-LEVEL.roofs.final.y)<.1&&Math.abs(x-LEVEL.doorX)<1.55,
      'push-pull':street&&Number.isFinite(dumpsterX)&&grounded&&Math.abs(y)<.08&&Math.abs(x-dumpsterX)<2.65,
      crouch:street&&grounded&&Math.abs(y)<.08&&x>=STREET.crawl.x-2.5&&x<=STREET.crawl.x+STREET.crawl.w+1.1,
      'running-slide':street&&grounded&&Math.abs(y)<.08&&Number.isFinite(player.vx)&&Math.abs(player.vx)>=2.2&&x>=56&&x<=59.5
    };
    const id=TUTORIAL_IDS.find(id=>eligible[id]&&!seen.has(id));
    if(!id)return null;
    current={id,text:copy[id][touch?1:0],elapsed:0,duration:4.2};seen.add(id);return id;
  }
  reset(learned);
  return {get current(){return current?{...current}:null;},get learned(){return [...seen];},update,reset};
}
