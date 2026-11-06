import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVEL} from '../src/level.js';
import {createLadder,canMountLadder} from '../src/ladder.js';
import {MOVEMENT,groundStepY} from '../src/movement.js';

const config=LEVEL.ladder;
const player=(x=config.x-.2,y=config.bottomY)=>({x,y,vx:0,vy:0,grounded:true,face:1});
function mounted(entry='bottom',fps=120) {
  const ladder=createLadder(),p=entry==='top'?player(config.exitX,config.topY):player();
  assert(ladder.begin(p,entry));
  for(let frame=0;frame<fps*3&&ladder.state?.phase!=='climb';frame++)ladder.update(1/fps,{},p);
  assert.equal(ladder.state?.phase,'climb','Mounting should reach a controllable rung, not leave the child in a transition.');
  return {ladder,p};
}
function finish(ladder,p,input,fps=120,seconds=20) {
  const events=[];
  for(let frame=0;frame<fps*seconds&&ladder.active;frame++) {
    const event=ladder.update(1/fps,input,p);if(event)events.push(event);
    assert([p.x,p.y,p.vx,p.vy].every(Number.isFinite),'Ladder traversal must preserve finite root motion.');
  }
  assert(!ladder.active,'The ladder route must finish within a reasonable traversal time.');
  return events;
}

test('only grounded children beside the real lower or upper entry can mount the ladder',()=>{
  assert(canMountLadder(player()));
  assert(canMountLadder(player(config.exitX,config.topY),config,'top'));
  const invalid=[player(config.x-3),player(config.wallX+.4),player(config.x,config.bottomY+.4),{...player(),grounded:false}];
  for(const p of invalid) {
    const ladder=createLadder();assert.equal(canMountLadder(p),false);assert.equal(ladder.begin(p),false);assert.equal(ladder.active,false);
  }
  assert.equal(canMountLadder(player(config.exitX+2,config.topY),config,'top'),false);
  assert.equal(canMountLadder(player(config.exitX,config.topY-.3),config,'top'),false);
  assert.equal(canMountLadder({...player(config.exitX,config.topY),grounded:false},config,'top'),false);
});

test('mounting is a continuous supported approach and cannot be restarted while active',()=>{
  const ladder=createLadder(),p=player();assert(ladder.begin(p));
  const state=ladder.state;assert.equal(p.grounded,false,'Ladder control must own gravity while a child is mounted.');
  assert.equal(ladder.begin(p),false);assert.equal(ladder.state,state,'Repeated interaction must not reset the active mount.');
  let previous={x:p.x,y:p.y},largestStep=0;
  for(let frame=0;frame<150&&ladder.state?.phase!=='climb';frame++) {
    ladder.update(1/120,{},p);
    largestStep=Math.max(largestStep,Math.hypot(p.x-previous.x,p.y-previous.y));previous={x:p.x,y:p.y};
    assert(p.x<config.wallX-.18,'Mounting must stay on the exposed ladder side of the wall.');
    assert(p.y>=config.bottomY-.001&&p.y<=config.rungBaseY+.03,'Mounting should approach the first rung rather than jump high up the wall.');
    assert.equal(p.grounded,false);assert.equal(p.vx,0);assert.equal(p.vy,0);
  }
  assert.equal(ladder.state?.phase,'climb');
  assert(Math.abs(p.x-config.x)<.001&&Math.abs(p.y-config.rungBaseY)<.03);
  assert(largestStep<.02,'The mount must not teleport the child onto the ladder.');
});

test('releasing ladder input settles to a real stop and opposing directions do not drift',()=>{
  const {ladder,p}=mounted();
  for(let n=0;n<120;n++)ladder.update(1/120,{up:true},p);
  const releasedY=p.y;
  for(let n=0;n<120;n++)ladder.update(1/120,{},p);
  assert.equal(ladder.state?.phase,'climb');
  assert(p.y-releasedY<config.spacing*.5,'Releasing input must settle within a rung, not coast into another climb step.');
  const stopped={x:p.x,y:p.y,distance:ladder.state.distance};
  for(let n=0;n<240;n++)ladder.update(1/120,{},p);
  assert(Math.abs(p.x-stopped.x)<1e-9&&Math.abs(p.y-stopped.y)<1e-9,'A resting child must stay attached to the same ladder height.');
  assert.equal(ladder.state.velocity,0);
  for(let n=0;n<120;n++)ladder.update(1/120,{up:true,down:true},p);
  assert(Math.abs(p.y-stopped.y)<1e-9,'Opposing climb inputs should cancel rather than move the child.');
});

test('ladder reversal remains continuous and returns through real rung positions',()=>{
  const {ladder,p}=mounted();let previous=p.y,largestStep=0,rungs=0;
  for(let n=0;n<210;n++) {
    const event=ladder.update(1/120,{up:true},p);if(event==='rung')rungs++;
    largestStep=Math.max(largestStep,Math.abs(p.y-previous));previous=p.y;
  }
  const turningY=p.y;
  for(let n=0;n<170;n++) {
    const event=ladder.update(1/120,{down:true},p);if(event==='rung')rungs++;
    largestStep=Math.max(largestStep,Math.abs(p.y-previous));previous=p.y;
    assert.equal(p.grounded,false);assert(Math.abs(p.x-config.x)<1e-8);
  }
  assert.equal(ladder.state?.phase,'climb');assert(p.y<turningY-.5,'Reversing input must actually descend the ladder.');
  assert(largestStep<.012,'A reversal cannot jump the root to a different rung.');
  assert(rungs>=4&&rungs<20,'Rung cues should accompany actual height crossings without firing every frame.');
});

test('top-out raises the feet above the wall before crossing and ends on permanent roof support',()=>{
  const {ladder,p}=mounted();let previous={x:p.x,y:p.y},largestStep=0,sawTopOut=false;
  const events=[];
  for(let n=0;n<1800&&ladder.active;n++) {
    const event=ladder.update(1/120,{up:true},p);if(event)events.push(event);
    largestStep=Math.max(largestStep,Math.hypot(p.x-previous.x,p.y-previous.y));previous={x:p.x,y:p.y};
    if(ladder.state?.phase==='top-out')sawTopOut=true;
    if(p.x>config.wallX+.02)assert(p.y>=config.topY-.02,'Crossing the wall with the feet below its top would clip through the building.');
  }
  assert(sawTopOut,'The traversal must use a real top-out transition.');
  assert.equal(events.filter(e=>e==='complete-top').length,1);assert.equal(ladder.active,false);assert.equal(ladder.state,null);
  assert.equal(p.grounded,true);assert.equal(p.y,config.topY);assert.equal(p.x,config.exitX);
  assert.equal(groundStepY(p.x,p.y,[LEVEL.roofs.final]),config.topY,'Top-out must finish on the raised roof, not an invisible ladder floor.');
  assert(largestStep<.04,`Finishing the climb jumps the root by ${largestStep.toFixed(3)}m in a 1/120s frame.`);
  const finalCheckpoint=LEVEL.checkpoints.at(-1);
  assert.equal(groundStepY(finalCheckpoint.x,finalCheckpoint.y,[LEVEL.roofs.final]),config.topY,'The final checkpoint must have real raised-roof support.');
  assert.equal(ladder.update(.1,{up:true},p),undefined,'A completed climb cannot emit duplicate completion events.');
});

test('top entry and descent return smoothly to the lower landing without falling through it',()=>{
  const ladder=createLadder(),p=player(config.exitX,config.topY);assert(ladder.begin(p,'top'));
  let previous={x:p.x,y:p.y},largestStep=0,sawTopIn=false,sawBottomOut=false,events=[];
  for(let n=0;n<1800&&ladder.active;n++) {
    if(ladder.state.phase==='top-in')sawTopIn=true;if(ladder.state.phase==='bottom-out')sawBottomOut=true;
    const event=ladder.update(1/120,{down:true},p);if(event)events.push(event);
    largestStep=Math.max(largestStep,Math.hypot(p.x-previous.x,p.y-previous.y));previous={x:p.x,y:p.y};
    if(p.x>config.wallX+.02)assert(p.y>=config.topY-.02,'Entering from above must clear the wall before lowering the feet.');
    assert(p.y>=config.bottomY-.001,'Descent must not pass through the lower landing.');
  }
  assert(sawTopIn&&sawBottomOut,'Descent must include both the top-in grip and bottom release.');
  assert.equal(events.filter(e=>e==='complete-bottom').length,1);assert.equal(ladder.active,false);assert.equal(p.grounded,true);
  assert.equal(groundStepY(p.x,p.y,[LEVEL.roofs.landing]),config.bottomY,'Bottom-out must land on the permanent annex roof after the bridge has broken.');
  assert(largestStep<.04,`Descending or releasing the ladder jumps the root by ${largestStep.toFixed(3)}m in one frame.`);
});

test('zero-time paused updates cannot start an exit or change the anchored root',()=>{
  const {ladder,p}=mounted();
  const before={player:{...p},phase:ladder.state.phase,progress:ladder.state.progress,distance:ladder.state.distance};
  for(let n=0;n<20;n++)ladder.update(0,{down:true},p);
  assert.deepEqual(p,before.player,'A paused ladder cannot move the child.');
  assert.equal(ladder.state.phase,before.phase,'A paused input cannot start a bottom-out transition.');
  assert.equal(ladder.state.progress,before.progress);assert.equal(ladder.state.distance,before.distance);
});

test('ladder travel and exit timing remain consistent at low and high update rates',()=>{
  const results=[];
  for(const fps of [30,60,120]) {
    const ladder=createLadder(),p=player();assert(ladder.begin(p));
    let time=0,event;
    for(let n=0;n<fps*15&&ladder.active;n++){time+=1/fps;event=ladder.update(1/fps,{up:true},p);}
    assert.equal(event,'complete-top');assert.equal(p.grounded,true);
    assert(Math.abs(p.x-config.exitX)<1e-9&&Math.abs(p.y-config.topY)<1e-9);
    results.push(time);
  }
  assert(Math.max(...results)-Math.min(...results)<.15,'The same ladder should not take materially different time at30 versus120fps.');
});

test('reset releases an interrupted ladder and starts a fresh complete traversal',()=>{
  const {ladder,p}=mounted();for(let n=0;n<120;n++)ladder.update(1/120,{up:true},p);
  assert(ladder.active&&ladder.state.distance>.3,'The reset test must interrupt an actual climb.');
  ladder.reset();assert.equal(ladder.active,false);assert.equal(ladder.state,null);
  const snapshot={...p};assert.equal(ladder.update(1,{down:true},p),undefined);assert.deepEqual(p,snapshot,'Inactive ladder control must not retain ownership of the root.');
  Object.assign(p,player());assert(ladder.begin(p));
  assert.equal(ladder.state.phase,'mount');assert.equal(ladder.state.progress,0);assert.equal(ladder.state.velocity,0);
  const events=finish(ladder,p,{up:true});assert.equal(events.filter(e=>e==='complete-top').length,1);
});

test('the upper mantle approaches the roof progressively without a late sideways rush',()=>{
  const {ladder,p}=mounted();
  for(let frame=0;frame<1800&&ladder.state?.phase!=='top-out';frame++)ladder.update(1/120,{up:true},p);
  assert.equal(ladder.state?.phase,'top-out');
  const startX=p.x;
  let previous=p.x,peakLateralSpeed=0,halfwayX,elapsed=0;
  for(let frame=0;frame<400&&ladder.active;frame++) {
    ladder.update(1/120,{up:true},p);elapsed+=1/120;
    peakLateralSpeed=Math.max(peakLateralSpeed,Math.abs(p.x-previous)*120);previous=p.x;
    if(halfwayX===undefined&&ladder.state?.progress>=.5)halfwayX=p.x;
    if(p.x>config.wallX+.02)assert(p.y>=config.topY-.02,'A smoother approach still has to lift the feet clear of the wall before crossing.');
  }
  assert.equal(ladder.active,false);assert(halfwayX!==undefined);
  assert(halfwayX-startX>.06,'The child should approach the roof during the pull, instead of waiting until the final moment to slide sideways.');
  assert(peakLateralSpeed<MOVEMENT.walk*1.15,`The mantle rushes sideways at ${peakLateralSpeed.toFixed(2)}m/s, faster than a deliberate normal step.`);
  assert(elapsed>1.45&&elapsed<2.2,'The pull and step should remain a readable continuous action.');
});
