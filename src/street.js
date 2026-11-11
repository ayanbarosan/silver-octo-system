import {MOVEMENT,movementVelocity} from './movement.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// One pedestrian lane shared by the street set, movement and Continue data.
export const STREET=Object.freeze({
  minX:-.2,maxX:54,groundY:0,z:0,
  entry:Object.freeze({x:2.8,y:0,face:1}),doorX:1.2,endX:51.5
});

export function normalizeStreetSave(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const {x,face}=value;
  if(!Number.isFinite(x)||x<STREET.minX||x>STREET.maxX||(face!==1&&face!==-1))return null;
  return {x,face};
}

// Cars and scenery sit behind this supported path. The same grounded weight
// and jump arc as the rooftop remain available without invisible car colliders.
export function createStreet(){
  let state=null,lastPlayer=null;
  function begin(player,saved=null){
    if(state||!player||typeof player!=='object')return false;
    const restore=normalizeStreetSave(saved)??STREET.entry;
    state={direction:0,running:false,acceleration:0,landImpact:0,jumpHeld:false,buffer:0,coyote:MOVEMENT.coyote,
      jump:{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0}};
    Object.assign(player,{x:restore.x,y:STREET.groundY,z:STREET.z,vx:0,vy:0,vz:0,grounded:true,face:restore.face});
    lastPlayer=player;return true;
  }
  function update(dt,input,player){
    if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;
    dt=Math.min(dt,.1);lastPlayer=player;state.landImpact=0;
    const direction=Number.isFinite(input?.direction)?Math.sign(input.direction):0;
    const running=!!input?.running,wantsJump=!!input?.jump,jump=state.jump;
    state.direction=direction;state.running=running;
    if(wantsJump&&!state.jumpHeld)state.buffer=MOVEMENT.buffer;
    state.jumpHeld=wantsJump;
    state.buffer=Math.max(0,state.buffer-dt);
    state.coyote=player.grounded?MOVEMENT.coyote:Math.max(0,state.coyote-dt);
    const oldVX=player.vx;
    player.vx=movementVelocity(player.vx,direction,running,player.grounded,dt);
    if(!direction&&player.grounded&&Math.abs(player.vx)<.002)player.vx=0;
    if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.2))player.face=direction;
    if(state.buffer>0&&state.coyote>0&&!jump.preparing&&!jump.launched){
      jump.preparing=true;jump.elapsed=0;jump.duration=running&&Math.abs(player.vx)>1?.085:.12;
      state.buffer=0;state.coyote=0;
    }
    let event=null;
    if(jump.preparing){
      jump.elapsed=Math.min(jump.duration,jump.elapsed+dt);
      if(jump.elapsed>=jump.duration){
        jump.preparing=false;jump.launched=true;jump.airTime=0;jump.launchSpeed=Math.abs(player.vx);
        player.vy=MOVEMENT.jumpVelocity;player.grounded=false;state.coyote=0;event='takeoff';
      }
    }
    const preparationScale=jump.preparing?(running?.85:.5):1;
    const nextX=player.x+(oldVX+player.vx)*.5*dt*preparationScale;
    player.x=clamp(nextX,STREET.minX,STREET.maxX);
    if(player.x!==nextX)player.vx=0;
    state.acceleration=clamp((player.vx-oldVX)/dt,-16,16);
    player.z=STREET.z;player.vz=0;
    if(!player.grounded){
      const gravity=jump.launched?MOVEMENT.gravity:MOVEMENT.fallGravity;
      player.y+=player.vy*dt-.5*gravity*dt*dt;player.vy-=gravity*dt;jump.airTime+=dt;
      if(player.y<=STREET.groundY&&player.vy<=0){
        state.landImpact=clamp(-player.vy/8,0,1);
        player.y=STREET.groundY;player.vy=0;player.grounded=true;
        jump.launched=false;jump.airTime=0;event='land';
      }
    }else{
      player.y=STREET.groundY;player.vy=0;jump.airTime=0;
    }
    return event;
  }
  return {
    get active(){return !!state;},get state(){return state;},begin,update,
    snapshot(){
      if(!state||!lastPlayer||lastPlayer.grounded!==true||state.jump.preparing||state.jump.launched
        ||Math.abs(lastPlayer.y-STREET.groundY)>.025||Math.abs(lastPlayer.z-STREET.z)>.025)return null;
      return normalizeStreetSave(lastPlayer);
    },
    reset(){state=null;lastPlayer=null;}
  };
}
