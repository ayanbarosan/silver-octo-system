import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVEL} from '../src/level.js';
import {createBridge} from '../src/bridge.js';
import {MOVEMENT,groundStepY} from '../src/movement.js';

const board=LEVEL.bridge,middle=LEVEL.roofs.middle,finalRoof=LEVEL.roofs.final;
const boardEnd=board.x+board.w;
const player=(x,y=board.y,grounded=true)=>({x,y,grounded,vx:0,face:1});
const surfaces=bridge=>[middle,finalRoof,...(bridge.supported?[{x:board.x,w:board.w,y:board.y}]:[])];
const arm=bridge=>bridge.update(1/120,player(board.x+board.w*.25));
const trigger=bridge=>{arm(bridge);return bridge.update(.221,player(board.safeX,finalRoof.y));};

test('the board overlaps both roofs and its safe point supports the whole child',()=>{
  assert(board.x<middle.x+middle.w&&boardEnd>finalRoof.x,'A walkable board must overlap both roof edges rather than leave narrow unsupported seams.');
  assert(Math.abs(board.y-middle.y)<.16&&Math.abs(board.y-finalRoof.y)<.16,'Both joins must be ordinary low steps, not jumps.');
  assert(board.safeX-boardEnd>=.2,'Breaking must wait until the rear of the child clears the board.');
  for(const x of [board.safeX-.2,board.safeX,board.safeX+.2]) {
    assert.equal(groundStepY(x,board.y,[finalRoof]),finalRoof.y,'The safe trigger point and both foot extents need permanent final-roof support.');
  }
});

test('walking crosses the middle roof, board and final roof without a vertical jump',()=>{
  const bridge=createBridge();
  const p=player(middle.x+.5,middle.y);
  let crossedGap=false,breaks=0,creaks=0,largestStep=0,previousY=p.y;
  const dt=1/120;
  for(let frame=0;frame<2400&&p.x<finalRoof.x+1.5;frame++) {
    const nextX=p.x+MOVEMENT.walk*dt;
    const nextY=groundStepY(nextX,p.y,surfaces(bridge));
    assert.notEqual(nextY,undefined,`Grounded walking unexpectedly loses support at x=${nextX.toFixed(3)}.`);
    p.x=nextX;p.y=nextY;p.vx=MOVEMENT.walk;
    largestStep=Math.max(largestStep,Math.abs(p.y-previousY));previousY=p.y;
    if(p.x>middle.x+middle.w+.05&&p.x<finalRoof.x-.05) {
      crossedGap=true;assert.equal(p.y,board.y,'The middle of the gap must be supported by the actual board surface.');
    }
    const event=bridge.update(dt,p);
    if(event==='creak')creaks++;
    if(event==='break') {
      breaks++;assert(p.x>=board.safeX,'The board cannot break underneath a crossing child.');
      assert.equal(groundStepY(p.x,p.y,[finalRoof]),finalRoof.y,'The child must retain permanent support at the instant the board falls.');
    }
  }
  assert(p.x>=finalRoof.x+1.5,'The grounded route must complete rather than stall before the final roof.');
  assert(crossedGap,'The route must exercise the unsupported gap rather than just the overlapping ends.');
  assert(largestStep<.04,'The crossing should use small roof-to-board steps, without an artificial jump.');
  assert.equal(creaks,1,'A single continuous crossing should produce one initial loaded-board cue.');
  assert.equal(breaks,1,'A complete safely grounded crossing should trigger one collapse behind the child.');
  assert.equal(bridge.supported,false);
});

test('stopping or turning on the board never starts a collapse',()=>{
  const bridge=createBridge();
  arm(bridge);
  const dt=1/60;
  const positions=[board.x+.12,board.x+board.w*.5,boardEnd-.08];
  for(const x of positions)for(let n=0;n<240;n++) {
    const event=bridge.update(dt,player(x));
    assert.notEqual(event,'break','Waiting on a loaded board must remain safe.');
  }
  for(let n=0;n<900;n++) {
    const x=board.x+.2+(board.w-.4)*(.5+.5*Math.sin(n/70));
    const event=bridge.update(dt,{...player(x),vx:Math.cos(n/70),face:Math.cos(n/70)>0?1:-1});
    assert.notEqual(event,'break','Changing direction during a crossing must not consume a hidden countdown.');
  }
  assert(bridge.supported,'A board occupied by a stationary or turning child must retain collision support.');
  assert.equal(bridge.state.safeTime,0);
  assert(bridge.state.load>.9,'The test must genuinely exercise a loaded board.');
});

test('collapse waits for continuous grounded clearance beyond the safe point',()=>{
  const bridge=createBridge();arm(bridge);
  for(let n=0;n<60;n++)assert.notEqual(bridge.update(1/60,player(board.safeX-.01,finalRoof.y)),'break');
  assert(bridge.supported,'A child just short of complete clearance must still be protected.');
  assert.notEqual(bridge.update(.20,player(board.safeX,finalRoof.y)),'break');
  assert.notEqual(bridge.update(.019,player(board.safeX,finalRoof.y)),'break');
  assert(bridge.supported,'The creak warning must preserve support until the full safety delay elapses.');
  assert.equal(bridge.update(.002,player(board.safeX,finalRoof.y)),'break');
  assert.equal(bridge.supported,false,'Collision support must disappear at the actual start of falling.');
});

test('an armed airborne crossing waits for a real safe landing before its warning can finish',()=>{
  const bridge=createBridge();
  // A real approach arms the event; teleporting onto the far roof must not.
  bridge.update(.05,player(middle.x+middle.w-.6,middle.y));
  assert(bridge.state.armed);
  for(let n=0;n<120;n++) {
    const x=board.x+(board.safeX-board.x+1)*n/119;
    assert.notEqual(bridge.update(1/60,player(x,board.y+.5,false)),'break');
  }
  assert.equal(bridge.state.safeTime,0);
  assert(bridge.supported,'Passing the far end in the air cannot remove support prematurely.');
  for(let n=0;n<60;n++)bridge.update(1/60,player(board.safeX+.3,board.y+.2,true));
  assert.equal(bridge.state.safeTime,0,'A grounded flag at the wrong height is not a safe landing on the final roof.');
  assert.notEqual(bridge.update(.219,player(board.safeX+.3,finalRoof.y)),'break');
  assert.equal(bridge.update(.002,player(board.safeX+.3,finalRoof.y)),'break');
  const untouched=createBridge();
  for(let n=0;n<240;n++)assert.notEqual(untouched.update(1/60,player(board.safeX+1,finalRoof.y)),'break');
  assert(untouched.supported,'A board that was never approached or crossed must not collapse spontaneously.');
});

test('stepping back during the warning cancels it and requires fresh safe clearance',()=>{
  const bridge=createBridge();arm(bridge);
  bridge.update(.16,player(board.safeX+.1,finalRoof.y));
  assert(bridge.state.safeTime>.15&&bridge.supported,'The cancellation test must enter the real warning interval.');
  assert.notEqual(bridge.update(.01,player(boardEnd-.08)),'break');
  assert.equal(bridge.state.safeTime,0,'Returning toward the board must discard the old safe-time credit.');
  for(let n=0;n<180;n++)assert.notEqual(bridge.update(1/60,player(boardEnd-.08)),'break');
  assert(bridge.supported);
  assert.notEqual(bridge.update(.219,player(board.safeX+.1,finalRoof.y)),'break');
  assert.equal(bridge.update(.002,player(board.safeX+.1,finalRoof.y)),'break');
});

test('a falling board removes gap support, advances debris time and resets for another crossing',()=>{
  const bridge=createBridge();
  const gapX=(middle.x+middle.w+finalRoof.x)/2;
  assert.equal(groundStepY(gapX,board.y,surfaces(bridge)),board.y);
  assert.equal(trigger(bridge),'break');
  assert.equal(bridge.supported,false);
  assert.equal(bridge.state.breakTime,0,'Debris motion should start at the collapse, not during the safety warning.');
  assert.equal(groundStepY(gapX,board.y,surfaces(bridge)),undefined,'The falling bridge must no longer provide an invisible collision floor.');
  bridge.update(.6,player(board.safeX+1,finalRoof.y));
  assert(Math.abs(bridge.state.breakTime-.6)<1e-8,'The falling debris must advance with elapsed simulation time.');
  assert.equal(bridge.update(3,player(board.safeX+1,finalRoof.y)),undefined,'Debris updates must not emit duplicate break events.');
  assert.equal(bridge.state.phase,'broken');assert.equal(bridge.supported,false);
  const completedTime=bridge.state.breakTime;
  bridge.update(10,player(board.x+1));assert.equal(bridge.state.breakTime,completedTime,'Finished debris should stay in its terminal state.');
  bridge.reset();
  assert(bridge.supported);assert.equal(bridge.state.phase,'intact');assert.equal(bridge.state.breakTime,0);
  assert.equal(bridge.state.safeTime,0);assert.equal(bridge.state.load,0);assert.equal(bridge.state.armed,false);
  assert.equal(groundStepY(gapX,board.y,surfaces(bridge)),board.y,'Restart must restore the physical walking route.');
  assert.equal(trigger(bridge),'break','A new crossing after reset must replay the actual event.');
});

test('safe clearance delay has the same duration at low and high update rates',()=>{
  for(const fps of [30,60,120]) {
    const bridge=createBridge();arm(bridge);
    let elapsed=0,event;
    while(event!=='break'&&elapsed<1) {
      elapsed+=1/fps;event=bridge.update(1/fps,player(board.safeX+.2,finalRoof.y));
    }
    assert.equal(event,'break');
    assert(elapsed>=.22-1e-9&&elapsed<=.22+1/fps+1e-9,`Safety delay changed at ${fps}Hz: ${elapsed.toFixed(3)}s.`);
  }
});
