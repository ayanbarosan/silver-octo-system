import {LEVEL} from './level.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=(value,min=0,max=1)=>{const p=clamp((value-min)/(max-min),0,1);return p*p*(3-2*p)};
const mix=(a,b,p)=>a+(b-a)*p;
const MOUNT_TIME=.68,EXIT_TIME=1.70,BOTTOM_TIME=.55;
const CLIMB_SPEED=.78,RESPONSE=9;

// Monotone Hermite channels carry velocity through each weight transfer. Only
// the beginning/end and the small vertical settling crest come to rest.
function curve(keys,startSlope=0) {
  const tangents=keys.map(()=>0);tangents[0]=startSlope;
  for(let i=1;i<keys.length-1;i++) {
    const h0=keys[i][0]-keys[i-1][0],h1=keys[i+1][0]-keys[i][0];
    const d0=(keys[i][1]-keys[i-1][1])/h0,d1=(keys[i+1][1]-keys[i][1])/h1;
    if(d0*d1>0){const w0=2*h1+h0,w1=h1+2*h0;tangents[i]=(w0+w1)/(w0/d0+w1/d1);}
  }
  return p=>{
    p=clamp(p,0,1);let i=keys.length-2;
    for(let n=1;n<keys.length;n++)if(p<=keys[n][0]){i=n-1;break;}
    const a=keys[i],b=keys[i+1],h=b[0]-a[0],u=(p-a[0])/h,u2=u*u,u3=u2*u;
    return (2*u3-3*u2+1)*a[1]+(u3-2*u2+u)*h*tangents[i]+(-2*u3+3*u2)*b[1]+(u3-u2)*h*tangents[i+1];
  };
}
const exitForward=curve([[0,0],[.2,.02/1.07],[.4,.10/1.07],[.55,.17/1.07],[.7,.44/1.07],[.85,.80/1.07],[1,1]]);
const exitHeight=curve([[0,-.60],[.2,-.45],[.4,-.22],[.55,-.04],[.7,.02],[.85,.01],[1,0]],CLIMB_SPEED*EXIT_TIME);


export function canMountLadder(player,config=LEVEL.ladder,entry='bottom') {
  if(!player.grounded)return false;
  if(entry==='top')return Math.abs(player.y-config.topY)<.09&&player.x>=config.wallX-.02&&player.x<=config.exitX+.6;
  return Math.abs(player.y-config.bottomY)<.09&&player.x>=config.x-.7&&player.x<=config.wallX-.19;
}

// Climbing owns the root until a real floor is reached. No gravity or horizontal
// input can pull a supporting hand off its rung during a stop or direction change.
export function createLadder(config=LEVEL.ladder) {
  let state=null,velocity=0;
  const low=config.bottomY+.2,high=config.topY-.6;
  function sync(player) {
    state.distance=player.y-config.bottomY;
    state.velocity=velocity;
    player.vx=0;player.vy=0;player.grounded=false;player.face=1;
  }
  function begin(player,entry='bottom') {
    if(state||!canMountLadder(player,config,entry))return false;
    state={...config,phase:entry==='top'?'top-in':'mount',progress:0,distance:player.y-config.bottomY,direction:0,velocity:0,startX:player.x,startY:player.y};
    velocity=0;sync(player);return true;
  }
  function topPath(player,p,exitX=config.exitX) {
    player.x=mix(config.x,exitX,exitForward(p));
    player.y=config.topY+exitHeight(p);
  }
  function update(dt,input,player) {
    if(!state)return;
    dt=clamp(Number.isFinite(dt)?dt:0,0,.1);
    if(dt===0)return;
    const direction=Number(!!input?.up)-Number(!!input?.down);
    state.direction=direction;
    if(state.phase==='mount') {
      state.progress=Math.min(1,state.progress+dt/MOUNT_TIME);
      const p=smooth(state.progress);
      player.x=mix(state.startX,config.x,p);player.y=mix(state.startY,low,p);
      if(state.progress===1){state.phase='climb';state.progress=0;}
    } else if(state.phase==='top-in') {
      state.progress=Math.min(1,state.progress+dt/EXIT_TIME);
      topPath(player,1-state.progress,state.startX);
      if(state.progress===1){state.phase='climb';state.progress=0;}
    } else if(state.phase==='top-out') {
      state.progress=Math.min(1,state.progress+dt/EXIT_TIME);topPath(player,state.progress);
      if(state.progress===1){player.x=config.exitX;player.y=config.topY;player.grounded=true;state=null;velocity=0;return 'complete-top';}
    } else if(state.phase==='bottom-out') {
      state.progress=Math.min(1,state.progress+dt/BOTTOM_TIME);
      const p=smooth(state.progress);
      player.x=mix(config.x,config.x-.30,p);player.y=mix(low,config.bottomY,p);
      if(state.progress===1){player.grounded=true;state=null;velocity=0;return 'complete-bottom';}
    } else {
      const target=direction*CLIMB_SPEED,oldVelocity=velocity,decay=Math.exp(-RESPONSE*dt);
      // Integrating the damped speed analytically makes stops and reversals
      // follow the same trajectory at 30, 60 and 120 frames per second.
      const travel=target*dt+(oldVelocity-target)*(1-decay)/RESPONSE;
      velocity=target+(oldVelocity-target)*decay;
      if(!direction&&Math.abs(velocity)<.002)velocity=0;
      const oldY=player.y;player.x=config.x;player.y=clamp(player.y+travel,low,high);
      if(direction>0&&player.y>=high-1e-8){state.phase='top-out';state.progress=0;velocity=0;}
      else if(direction<0&&player.y<=low+1e-8){state.phase='bottom-out';state.progress=0;velocity=0;}
      sync(player);
      if(Math.floor((oldY-low)/config.spacing)!==Math.floor((player.y-low)/config.spacing))return 'rung';
      return;
    }
    sync(player);
  }
  return {get state(){return state},get active(){return !!state},begin,update,reset(){state=null;velocity=0}};
}
