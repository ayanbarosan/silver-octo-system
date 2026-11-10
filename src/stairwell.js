const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const EPSILON=1e-8;

// The scenery, feet and controller share the same switchback dimensions.
export const STAIRWELL=Object.freeze({
  left:3.4,right:11.6,rise:3.2,flights:4,steps:20,minX:1.8,maxX:14.2,
  entry:Object.freeze({x:13,y:12.8,face:-1}),
  exit:Object.freeze({x:2.2,y:0}),depth:3.5
});

export function stairDirection(flight){return flight%2===0?-1:1;}

// Root support is continuous so twenty shallow treads never shake the camera.
// The character samples this same surface for its independent foot contacts.
export function stairHeight(flight,x){
  if(flight>=STAIRWELL.flights)return 0;
  const progress=clamp((x-STAIRWELL.left)/(STAIRWELL.right-STAIRWELL.left),0,1);
  const descending=stairDirection(flight)<0?1-progress:progress;
  return (STAIRWELL.flights-flight-descending)*STAIRWELL.rise;
}

function limits(flight){
  if(flight>=STAIRWELL.flights)return [STAIRWELL.minX,STAIRWELL.maxX];
  return stairDirection(flight)<0?[STAIRWELL.left,STAIRWELL.maxX]:[STAIRWELL.minX,STAIRWELL.right];
}

export function normalizeStairSave(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const {flight,x,face}=value;
  if(!Number.isInteger(flight)||flight<0||flight>STAIRWELL.flights||!Number.isFinite(x)||(face!==1&&face!==-1))return null;
  const [min,max]=limits(flight);
  if(x<min-EPSILON||x>max+EPSILON)return null;
  return {flight,x:clamp(x,min,max),face};
}

// A completed flight is retired permanently. At its landing, turning around
// therefore selects the next downward flight instead of retracing upstairs.
export function createStairwell(){
  let state=null,lastPlayer=null;
  function sync(player){
    const onStairs=state.flight<STAIRWELL.flights&&player.x>STAIRWELL.left+EPSILON&&player.x<STAIRWELL.right-EPSILON;
    state.onStairs=onStairs;
    state.slope=onStairs?-stairDirection(state.flight)*STAIRWELL.rise/(STAIRWELL.right-STAIRWELL.left):0;
    state.direction=state.flight<STAIRWELL.flights?stairDirection(state.flight):-1;
    state.completedFlights=state.flight;
    state.velocity=player.vx;
    player.y=stairHeight(state.flight,player.x);player.vy=0;player.grounded=true;
  }
  function begin(player,saved=null){
    if(!player||state)return false;
    const restore=normalizeStairSave(saved)??{flight:0,x:STAIRWELL.entry.x,face:STAIRWELL.entry.face};
    state={flight:restore.flight,completedFlights:restore.flight,onStairs:false,slope:0,direction:stairDirection(restore.flight),velocity:0,completed:false};
    Object.assign(player,{x:restore.x,y:stairHeight(restore.flight,restore.x),face:restore.face,vx:0,vy:0,grounded:true});
    lastPlayer=player;sync(player);return true;
  }
  function update(dt,input,player){
    if(!state||!player||state.completed||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.1);
    const direction=Number.isFinite(input?.direction)?Math.sign(input.direction):0;
    const target=direction*(input?.running?2:1.45),response=direction?5.3:8.5;
    const oldVelocity=player.vx,decay=Math.exp(-response*dt);
    const travel=target*dt+(oldVelocity-target)*(1-decay)/response;
    player.vx=target+(oldVelocity-target)*decay;
    if(!direction&&Math.abs(player.vx)<.002)player.vx=0;
    if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.18))player.face=direction;
    const nextX=player.x+travel;
    let event;
    if(state.flight<STAIRWELL.flights){
      const descending=stairDirection(state.flight);
      if(descending<0&&nextX<=STAIRWELL.left+EPSILON||descending>0&&nextX>=STAIRWELL.right-EPSILON){state.flight++;event='floor';}
    }
    const [min,max]=limits(state.flight);
    player.x=clamp(nextX,min,max);
    if(player.x!==nextX)player.vx=0;
    sync(player);lastPlayer=player;
    if(state.flight===STAIRWELL.flights&&player.x<=STAIRWELL.exit.x){
      player.x=STAIRWELL.exit.x;player.vx=0;sync(player);state.completed=true;return 'complete';
    }
    return event;
  }
  return {
    get active(){return state!==null;},get state(){return state;},begin,update,
    sample(x){return state?stairHeight(state.flight,x):undefined;},
    snapshot(){return state&&lastPlayer?{flight:state.flight,x:lastPlayer.x,face:lastPlayer.face}:null;},
    reset(){state=null;lastPlayer=null;}
  };
}
