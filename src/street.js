import {MOVEMENT,movementVelocity,crateSideContact} from './movement.js';
import {createClimb,sampleClimb} from './climb.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const RADIUS=.22,EPS=.001;
export const STREET=Object.freeze({
  minX:-.2,maxX:58.5,groundY:0,z:0,
  entry:Object.freeze({x:2.8,y:0,face:1}),doorX:1.2,endX:54.65,
  dumpster:Object.freeze({id:'dumpster',startX:43.5,w:1.9,y:1.05,z:0,minX:8.2,maxX:53.25}),
  fence:Object.freeze({id:'street-fence',x:54.65,w:.16,y:2.45})
});
export const dumpsterCollider=x=>({id:'dumpster',x:x-STREET.dumpster.w/2,w:STREET.dumpster.w,y:STREET.dumpster.y});

// Old ground saves remain usable even if a newly added bin occupies that spot.
export function normalizeStreetSave(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const {x,face}=value,y=value.y??0,D=STREET.dumpster,F=STREET.fence;
  if(!Number.isFinite(x)||x<STREET.minX||x>STREET.maxX||(face!==1&&face!==-1)||!Number.isFinite(y))return null;
  let dumpsterX=value.dumpsterX??D.startX;
  if(!Number.isFinite(dumpsterX)||dumpsterX<D.minX||dumpsterX>D.maxX)return null;
  const overlapsBin=()=>x+RADIUS>dumpsterX-D.w/2+EPS&&x-RADIUS<dumpsterX+D.w/2-EPS;
  if(value.dumpsterX===undefined&&Math.abs(y)<.025&&overlapsBin()){
    dumpsterX=clamp(x+D.w/2+RADIUS+.15,D.minX,D.maxX);
    if(overlapsBin())dumpsterX=clamp(x-D.w/2-RADIUS-.15,D.minX,D.maxX);
  }
  if(Math.abs(y)<.025){
    if(overlapsBin()||x+RADIUS>F.x+EPS&&x-RADIUS<F.x+F.w-EPS)return null;
    return {x,y:0,face,dumpsterX};
  }
  if(Math.abs(y-D.y)<.025&&x>=dumpsterX-D.w/2+.23-EPS&&x<=dumpsterX+D.w/2-.23+EPS)return {x,y:D.y,face,dumpsterX};
  return null;
}

export function createStreet(){
  let state=null,lastPlayer=null;
  function resetJump(){Object.assign(state.jump,{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0});state.buffer=0;state.coyote=0;}
  function begin(player,saved=null){
    if(state||!player||typeof player!=='object')return false;
    const restore=normalizeStreetSave(saved)??normalizeStreetSave(STREET.entry);
    state={direction:0,running:false,acceleration:0,landImpact:0,jumpHeld:false,buffer:0,coyote:MOVEMENT.coyote,
      dumpsterX:restore.dumpsterX,objectVelocity:0,grabbedSide:0,grabOffset:0,interaction:null,climb:null,climbsCompleted:0,
      jump:{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0}};
    Object.assign(player,{x:restore.x,y:restore.y,z:0,vx:0,vy:0,vz:0,grounded:true,face:restore.face});
    lastPlayer=player;return true;
  }
  function startClimb(player,target){
    const thin=target.id==='street-fence';
    const climb=createClimb({x:player.x,y:player.y,face:player.face,target:thin?{...target,w:.8}:target});
    if(!climb)return false;
    if(thin){climb.endX=player.face>0?target.x+target.w+.38:target.x-.38;climb.vault=true;}
    state.climb=climb;state.interaction=null;state.grabbedSide=0;state.objectVelocity=0;resetJump();
    player.vx=player.vy=0;player.grounded=false;return true;
  }
  function reachable(player,target){
    const edge=player.face>0?target.x:target.x+target.w,ahead=(edge-player.x)*player.face,rise=target.y-player.y;
    return ahead>=.17&&ahead<=.65&&rise>=.25&&rise<=1.08;
  }
  function supportAt(x){const b=dumpsterCollider(state.dumpsterX);return x>b.x+.015&&x<b.x+b.w-.015?b.y:0;}
  function update(dt,input,player){
    if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;
    dt=Math.min(dt,.1);lastPlayer=player;state.landImpact=0;
    const D=STREET.dumpster,F=STREET.fence,jump=state.jump;
    const direction=Number.isFinite(input?.direction)?Math.sign(input.direction):0;
    const running=!!input?.running,wantsJump=!!input?.jump,interact=!!input?.interact;
    state.direction=direction;state.running=running;
    const freshJump=wantsJump&&!state.jumpHeld;state.jumpHeld=wantsJump;
    if(state.climb){
      const c=state.climb;c.elapsed+=dt;c.progress=Math.min(1,c.elapsed/c.duration);
      const point=sampleClimb(c);player.x=point.x;player.y=point.y;player.vx=player.vy=player.vz=0;player.z=0;player.face=c.face;player.grounded=false;
      if(c.progress===1){
        state.climb=null;state.climbsCompleted++;player.grounded=!c.vault;player.y=c.topY;
        resetJump();if(c.vault)jump.airTime=.25;return 'climb-end';
      }
      return null;
    }
    if(freshJump)state.buffer=MOVEMENT.buffer;
    state.buffer=Math.max(0,state.buffer-dt);state.coyote=player.grounded?MOVEMENT.coyote:Math.max(0,state.coyote-dt);
    const b=dumpsterCollider(state.dumpsterX);
    if(!interact||!player.grounded||Math.abs(player.y)>.04||wantsJump){state.grabbedSide=0;state.interaction=null;state.objectVelocity=0;}
    if(interact&&player.grounded&&Math.abs(player.y)<.04&&!wantsJump&&!jump.preparing){
      const side=Math.sign(player.x-state.dumpsterX)||-player.face,edge=state.dumpsterX+side*D.w/2;
      const gap=(player.x-edge)*side;
      if(!state.grabbedSide&&gap>=RADIUS-.025&&gap<=.40){state.grabbedSide=side;state.grabOffset=player.x-state.dumpsterX;}
      if(state.grabbedSide){
        const s=state.grabbedSide;player.face=-s;
        const target=direction*(direction===s?.52:.70),decay=Math.exp(-(direction?6:11)*dt);
        state.objectVelocity=target+(state.objectVelocity-target)*decay;
        if(!direction&&Math.abs(state.objectVelocity)<.002)state.objectVelocity=0;
        let low=D.minX,high=D.maxX;
        if(s>0&&player.x<F.x)high=Math.min(high,F.x-RADIUS-state.grabOffset);
        const next=clamp(state.dumpsterX+state.objectVelocity*dt,low,high),delta=next-state.dumpsterX;
        state.dumpsterX=next;player.x+=delta;player.vx=delta/dt;player.vy=player.vz=0;player.z=0;player.grounded=true;
        if(Math.abs(delta)<.000001)state.objectVelocity=0;
        state.interaction={kind:Math.abs(player.vx)<.015?'hold':player.vx*player.face>0?'push':'pull',side:s,objectX:next,topY:D.y};
        state.acceleration=0;return null;
      }
    }
    state.interaction=null;
    const oldVX=player.vx;
    player.vx=movementVelocity(player.vx,direction,running,player.grounded,dt);
    if(!direction&&player.grounded&&Math.abs(player.vx)<.002)player.vx=0;
    if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.2))player.face=direction;
    if(!interact||wantsJump||jump.launched){
      const targets=[b,F];
      for(const target of targets)if(reachable(player,target)&&(
        player.grounded&&state.buffer>0||!player.grounded&&(wantsJump||jump.launched)&&direction===player.face)){
        if(startClimb(player,target))return 'climb-start';
      }
    }
    if(state.buffer>0&&state.coyote>0&&!jump.preparing&&!jump.launched){
      jump.preparing=true;jump.elapsed=0;jump.duration=running&&Math.abs(player.vx)>1?.085:.12;
      state.buffer=0;state.coyote=0;
    }
    let event=null;
    if(jump.preparing){
      jump.elapsed=Math.min(jump.duration,jump.elapsed+dt);
      if(jump.elapsed>=jump.duration){jump.preparing=false;jump.launched=true;jump.airTime=0;jump.launchSpeed=Math.abs(player.vx);player.vy=MOVEMENT.jumpVelocity;player.grounded=false;state.coyote=0;event='takeoff';}
    }
    const previousY=player.y;
    let nextX=player.x+(oldVX+player.vx)*.5*dt*(jump.preparing?(running?.85:.5):1);
    if(jump.preparing&&player.grounded&&Math.abs(player.y-D.y)<.03)nextX=clamp(nextX,b.x+.04,b.x+b.w-.04);
    for(const obstacle of [b,F]){
      const contact=crateSideContact(player,nextX,obstacle,RADIUS);
      if(contact){nextX=contact.x;player.vx=0;}
    }
    player.x=clamp(nextX,STREET.minX,STREET.maxX);if(player.x!==nextX)player.vx=0;
    state.acceleration=clamp((player.vx-oldVX)/dt,-16,16);player.z=0;player.vz=0;
    if(player.grounded&&!jump.launched&&supportAt(player.x)<player.y-.03)player.grounded=false;
    if(!player.grounded){
      const gravity=jump.launched?MOVEMENT.gravity:MOVEMENT.fallGravity;
      player.y+=player.vy*dt-.5*gravity*dt*dt;player.vy-=gravity*dt;jump.airTime+=dt;
      const floor=previousY>=b.y-.025&&player.x>b.x+.015&&player.x<b.x+b.w-.015?b.y:0;
      if(player.y<=floor&&player.vy<=0){
        state.landImpact=clamp(-player.vy/8,0,1);player.y=floor;player.vy=0;player.grounded=true;
        jump.launched=false;jump.airTime=0;event='land';
      }
    }else{player.y=supportAt(player.x);player.vy=0;jump.airTime=0;}
    return event;
  }
  return {get active(){return !!state;},get state(){return state;},begin,update,supportY(x){return state?supportAt(x):0;},
    snapshot(){if(!state||!lastPlayer||!lastPlayer.grounded||state.climb||state.jump.preparing||state.jump.launched||Math.abs(lastPlayer.z)>.025)return null;
      return normalizeStreetSave({...lastPlayer,dumpsterX:state.dumpsterX});},
    reset(){state=null;lastPlayer=null;}};
}
