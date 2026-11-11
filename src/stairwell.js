const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const EPSILON=1e-8;
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
const nearAngle=(angle,reference)=>reference+Math.atan2(Math.sin(angle-reference),Math.cos(angle-reference));
const OUTWARD_TIME=.62,CROSS_TIME=1.05;

// The scenery, feet and controller share the same switchback dimensions.
export const STAIRWELL=Object.freeze({
  left:3.4,right:11.6,rise:3.2,flights:4,steps:20,minX:1.8,maxX:14.2,
  lanes:Object.freeze([-.65,.95]),stairWidth:1.0,groundZ:-.95,turnOutside:.72,
  entry:Object.freeze({x:13,y:12.8,face:-1}),
  exit:Object.freeze({x:2.2,y:0}),depth:3.5
});

export function stairDirection(flight){return flight%2===0?-1:1;}
export function stairLane(flight){return flight>=STAIRWELL.flights?STAIRWELL.groundZ:STAIRWELL.lanes[flight%STAIRWELL.lanes.length];}
export function canOpenStairExit(player,state){
  return !!state&&state.flight===STAIRWELL.flights&&state.phase==='walk'&&!state.completed
    &&player?.grounded===true&&Math.abs(player.x-STAIRWELL.exit.x)<=.8
    &&Math.abs(player.y-STAIRWELL.exit.y)<.06&&Math.abs(player.z-STAIRWELL.groundZ)<.15;
}

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
    const onStairs=state.phase==='walk'&&state.flight<STAIRWELL.flights&&player.x>STAIRWELL.left+EPSILON&&player.x<STAIRWELL.right-EPSILON;
    state.onStairs=onStairs;
    state.slope=onStairs?-stairDirection(state.flight)*STAIRWELL.rise/(STAIRWELL.right-STAIRWELL.left):0;
    state.direction=state.flight<STAIRWELL.flights?stairDirection(state.flight):-1;
    state.completedFlights=state.flight;
    state.velocity=Math.hypot(player.vx,player.vz);
    player.y=state.phase==='turn'?state.turn.floorY:stairHeight(state.flight,player.x);player.vy=0;player.grounded=true;
    state.nearExit=canOpenStairExit(player,state);
  }
  function begin(player,saved=null){
    if(!player||state)return false;
    const restore=normalizeStairSave(saved)??{flight:0,x:STAIRWELL.entry.x,face:STAIRWELL.entry.face};
    state={phase:'walk',flight:restore.flight,completedFlights:restore.flight,onStairs:false,slope:0,direction:stairDirection(restore.flight),velocity:0,heading:restore.face*Math.PI/2,completed:false,exitProgress:0,interactHeld:false};
    Object.assign(player,{x:restore.x,y:stairHeight(restore.flight,restore.x),z:stairLane(restore.flight),face:restore.face,vx:0,vy:0,vz:0,grounded:true});
    lastPlayer=player;sync(player);return true;
  }
  function beginTurn(player,oldFlight){
    const direction=stairDirection(oldFlight),end=direction<0?STAIRWELL.left:STAIRWELL.right;
    const startHeading=nearAngle(direction*Math.PI/2,state.heading);
    const nextZ=stairLane(oldFlight+1),depthHeading=nearAngle(nextZ>player.z?0:Math.PI,startHeading);
    state.flight=oldFlight+1;state.phase='turn';
    state.turn={elapsed:0,endX:end,outsideX:end+direction*STAIRWELL.turnOutside,startZ:player.z,endZ:nextZ,
      floorY:(STAIRWELL.flights-state.flight)*STAIRWELL.rise,incomingVx:player.vx,startHeading,depthHeading,
      endHeading:nearAngle((state.flight<STAIRWELL.flights?stairDirection(state.flight):-1)*Math.PI/2,depthHeading)};
    player.x=end;player.vz=0;sync(player);
  }
  function updateTurn(dt,player){
    const turn=state.turn;
    turn.elapsed=Math.min(OUTWARD_TIME+CROSS_TIME,turn.elapsed+dt);
    if(turn.elapsed<OUTWARD_TIME){
      const p=turn.elapsed/OUTWARD_TIME,p2=p*p,p3=p2*p;
      // Carry the incoming walk speed out onto the landing, then come to rest
      // beyond the stair end before changing depth between the two flights.
      player.x=(2*p3-3*p2+1)*turn.endX+(p3-2*p2+p)*OUTWARD_TIME*turn.incomingVx+(-2*p3+3*p2)*turn.outsideX;
      player.vx=((6*p2-6*p)*turn.endX+(3*p2-4*p+1)*OUTWARD_TIME*turn.incomingVx+(-6*p2+6*p)*turn.outsideX)/OUTWARD_TIME;
      player.z=turn.startZ;player.vz=0;
      state.heading=turn.startHeading+(turn.depthHeading-turn.startHeading)*smooth((p-.5)/.5);
    }else{
      const p=clamp((turn.elapsed-OUTWARD_TIME)/CROSS_TIME,0,1),weight=smooth(p);
      player.x=turn.outsideX;player.vx=0;
      player.z=turn.startZ+(turn.endZ-turn.startZ)*weight;
      player.vz=(turn.endZ-turn.startZ)*6*p*(1-p)/CROSS_TIME;
      state.heading=turn.depthHeading+(turn.endHeading-turn.depthHeading)*smooth((p-.6)/.4);
    }
    sync(player);lastPlayer=player;
    if(turn.elapsed>=OUTWARD_TIME+CROSS_TIME){
      player.z=turn.endZ;player.vx=player.vz=0;player.face=state.flight<STAIRWELL.flights?stairDirection(state.flight):-1;
      state.heading=turn.endHeading;state.phase='walk';delete state.turn;sync(player);return 'floor';
    }
  }
  function update(dt,input,player){
    if(!state||!player||state.completed||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.1);
    const interact=!!input?.interact,pressed=interact&&!state.interactHeld;state.interactHeld=interact;
    if(state.phase==='opening'){
      state.exitElapsed=Math.min(state.exitDuration,state.exitElapsed+dt);
      const p=clamp(state.exitElapsed/state.exitAlignTime,0,1);
      player.x=state.exitFromX+(STAIRWELL.exit.x-state.exitFromX)*smooth(p);
      player.vx=p<1?(STAIRWELL.exit.x-state.exitFromX)*6*p*(1-p)/state.exitAlignTime:0;
      player.vz=0;state.exitProgress=smooth((state.exitElapsed-state.exitAlignTime)/.66);sync(player);lastPlayer=player;
      if(state.exitElapsed>=state.exitDuration){state.exitProgress=1;state.completed=true;player.vx=0;sync(player);return 'complete';}
      return;
    }
    if(state.phase==='turn')return updateTurn(dt,player);
    if(pressed&&canOpenStairExit(player,state)){
      state.phase='opening';state.exitElapsed=0;state.exitFromX=player.x;state.exitProgress=0;
      state.exitAlignTime=Math.max(.24,Math.abs(player.x-STAIRWELL.exit.x)*.75);state.exitDuration=state.exitAlignTime+.71;
      state.heading=nearAngle(Math.PI,state.heading);player.vx=player.vz=0;sync(player);lastPlayer=player;return 'open-exit';
    }
    const direction=Number.isFinite(input?.direction)?Math.sign(input.direction):0;
    const target=direction*(input?.running?2:1.45),response=direction?5.3:8.5;
    const oldVelocity=player.vx,decay=Math.exp(-response*dt);
    const travel=target*dt+(oldVelocity-target)*(1-decay)/response;
    player.vx=target+(oldVelocity-target)*decay;
    if(!direction&&Math.abs(player.vx)<.002)player.vx=0;
    if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.18))player.face=direction;
    state.heading=nearAngle(player.face*Math.PI/2,state.heading);
    player.z=stairLane(state.flight);player.vz=0;
    const nextX=player.x+travel;
    let event;
    if(state.flight<STAIRWELL.flights){
      const descending=stairDirection(state.flight);
      if(descending<0&&nextX<=STAIRWELL.left+EPSILON||descending>0&&nextX>=STAIRWELL.right-EPSILON){beginTurn(player,state.flight);lastPlayer=player;return;}
    }
    const [min,max]=limits(state.flight);
    player.x=clamp(nextX,min,max);
    if(player.x!==nextX)player.vx=0;
    sync(player);lastPlayer=player;
    return event;
  }
  return {
    get active(){return state!==null;},get state(){return state;},begin,update,
    sample(x){return state?stairHeight(state.flight,x):undefined;},
    snapshot(){return state?.phase==='walk'&&lastPlayer?{flight:state.flight,x:lastPlayer.x,face:lastPlayer.face}:null;},
    reset(){state=null;lastPlayer=null;}
  };
}
