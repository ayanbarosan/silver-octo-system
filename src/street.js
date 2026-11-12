import {MOVEMENT,movementVelocity,crateSideContact} from './movement.js';
import {createClimb,sampleClimb} from './climb.js';
import {createSlide} from './slide.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const RADIUS=.22,CRAWL_RADIUS=.72,EPS=.001;
export const STREET=Object.freeze({
  minX:-.2,maxX:77.5,groundY:0,z:0,
  entry:Object.freeze({x:2.8,y:0,face:1}),doorX:1.2,endX:54.65,
  dumpster:Object.freeze({id:'dumpster',startX:43.5,w:1.9,y:1.05,z:0,minX:8.2,maxX:53.25}),
  fence:Object.freeze({id:'street-fence',x:54.65,w:.16,y:2.45}),
  crawl:Object.freeze({x:61,w:1.8,bottomY:1.02,topY:2.55}),
  home:Object.freeze({x:71.8,doorX:70.5})
});
export const dumpsterCollider=x=>({id:'dumpster',x:x-STREET.dumpster.w/2,w:STREET.dumpster.w,y:STREET.dumpster.y});
export const beneathCrawlGate=x=>x+CRAWL_RADIUS>STREET.crawl.x+EPS&&x-CRAWL_RADIUS<STREET.crawl.x+STREET.crawl.w-EPS;

// Old ground saves remain usable even if a newly added bin occupies that spot.
export function normalizeStreetSave(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const {x,face}=value,y=value.y??0,D=STREET.dumpster,F=STREET.fence;
  const area=value.area===undefined?'street':value.area;
  if(area!=='street')return null;
  const bounds=STREET;
  if(!Number.isFinite(x)||x<bounds.minX||x>bounds.maxX||(face!==1&&face!==-1)||!Number.isFinite(y))return null;
  if(value.crouched!==undefined&&typeof value.crouched!=='boolean')return null;
  const pose=value.crouched?{crouched:true}:{};
  let dumpsterX=value.dumpsterX??D.startX;
  if(!Number.isFinite(dumpsterX)||dumpsterX<D.minX||dumpsterX>D.maxX)return null;
  const overlapsBin=()=>x+RADIUS>dumpsterX-D.w/2+EPS&&x-RADIUS<dumpsterX+D.w/2-EPS;
  if(value.dumpsterX===undefined&&Math.abs(y)<.025&&overlapsBin()){
    dumpsterX=clamp(x+D.w/2+RADIUS+.15,D.minX,D.maxX);
    if(overlapsBin())dumpsterX=clamp(x-D.w/2-RADIUS-.15,D.minX,D.maxX);
  }
  if(Math.abs(y)<.025){
    if(overlapsBin()||x+RADIUS>F.x+EPS&&x-RADIUS<F.x+F.w-EPS)return null;
    if(beneathCrawlGate(x)&&!value.crouched)return null;
    return {x,y:0,face,dumpsterX,...pose};
  }
  if(Math.abs(y-D.y)<.025&&x>=dumpsterX-D.w/2+.23-EPS&&x<=dumpsterX+D.w/2-.23+EPS)return {x,y:D.y,face,dumpsterX,...pose};
  return null;
}

export function createStreet(){
  let state=null,lastPlayer=null;const slide=createSlide();
  function resetJump(){Object.assign(state.jump,{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0});state.buffer=0;state.coyote=0;}
  function begin(player,saved=null){
    if(state||!player||typeof player!=='object')return false;
    const restore=normalizeStreetSave(saved)??normalizeStreetSave(STREET.entry);
    slide.reset();
    state={direction:0,running:false,acceleration:0,landImpact:0,jumpHeld:false,crouchHeld:false,interactHeld:false,buffer:0,coyote:MOVEMENT.coyote,crouch:restore.crouched?1:0,underLowGate:beneathCrawlGate(restore.x),
      slide:null,slidesCompleted:0,nearHomeDoor:false,homeDoor:{phase:'closed',elapsed:0,progress:0},
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
    const bounds=STREET;
    const direction=Number.isFinite(input?.direction)?Math.sign(input.direction):0;
    const crouchInput=!!input?.crouch,freshCrouch=crouchInput&&!state.crouchHeld;state.crouchHeld=crouchInput;
    const interactInput=!!input?.interact,freshInteract=interactInput&&!state.interactHeld;state.interactHeld=interactInput;
    const door=state.homeDoor;
    state.nearHomeDoor=player.grounded&&Math.abs(player.y)<.03&&Math.abs(player.z)<.04&&Math.abs(player.x-STREET.home.doorX)<1.10&&!slide.active&&!state.climb;
    if(door.phase==='opening'){
      const oldX=player.x,oldZ=player.z;door.elapsed+=dt;door.progress=Math.min(1,door.elapsed/.85);
      const p=clamp((door.elapsed-.35)/1.20,0,1),walk=p*p*(3-2*p);
      player.x=door.startX+(STREET.home.doorX-door.startX)*walk;player.z=walk?-2.3*walk:0;
      player.vx=(player.x-oldX)/dt;player.vz=(player.z-oldZ)/dt;player.vy=0;player.grounded=true;
      state.nearHomeDoor=false;state.acceleration=0;
      if(door.elapsed>=1.65){door.phase='open';player.vx=player.vz=0;return 'home-complete';}
      return null;
    }
    if(door.phase==='open'){player.vx=player.vy=player.vz=0;return null;}
    if(door.phase==='closed'&&freshInteract&&state.nearHomeDoor&&state.crouch<.01){
      state.homeDoor={phase:'opening',elapsed:0,progress:0,startX:player.x,startFace:player.face};
      player.vx=player.vy=player.vz=0;state.interaction=null;state.grabbedSide=0;state.nearHomeDoor=false;resetJump();return 'open-home';
    }
    const underGate=beneathCrawlGate(player.x)&&player.y<STREET.crawl.topY&&player.y+.96>STREET.crawl.bottomY;
    state.underLowGate=beneathCrawlGate(player.x)&&Math.abs(player.y)<.03;
    let slideEvent=null;
    if(freshCrouch&&!!input?.running&&player.grounded&&!state.climb&&!state.interaction&&state.crouch<.02&&!jump.preparing&&!jump.launched&&slide.begin(player)){
      state.slide=slide.state;state.grabbedSide=0;state.interaction=null;resetJump();slideEvent='slide-start';
    }
    if(slide.active){
      state.jumpHeld=!!input?.jump;
      const oldVX=player.vx;
      const finished=slide.update(dt,{underLowGate:state.underLowGate},player);
      const b=dumpsterCollider(state.dumpsterX);
      let nextX=player.x+(oldVX+player.vx)*.5*dt,blocked=false;
      for(const obstacle of [b,F]){const contact=crateSideContact(player,nextX,obstacle,RADIUS);if(contact){nextX=contact.x;blocked=true;}}
      const g=STREET.crawl,low=slide.state?.lowAmount??1;
      if(low<.98&&beneathCrawlGate(nextX)){
        nextX=player.x<=g.x-CRAWL_RADIUS+EPS?Math.min(nextX,g.x-CRAWL_RADIUS):player.x>=g.x+g.w+CRAWL_RADIUS-EPS?Math.max(nextX,g.x+g.w+CRAWL_RADIUS):player.x;blocked=true;
      }
      const clamped=clamp(nextX,bounds.minX,bounds.maxX);blocked||=clamped!==nextX;player.x=clamped;player.z=player.vz=0;
      if(blocked&&slide.active)slide.update(.000001,{blocked:true,underLowGate:state.underLowGate},player);
      state.slide=slide.state;state.crouch=state.underLowGate||state.slide?.recoverLow||state.slide?.phase==='recover'&&crouchInput?1:state.slide?.lowAmount??(crouchInput?1:0);
      state.direction=direction;state.running=false;state.acceleration=clamp((player.vx-oldVX)/dt,-16,16);
      if(supportAt(player.x)<player.y-.03){player.grounded=false;slide.reset();state.slide=null;}
      if(finished||!slide.active){state.slidesCompleted++;state.slide=null;state.crouch=state.underLowGate||crouchInput?1:0;resetJump();}
      return slideEvent;
    }
    const wantsCrouch=player.grounded&&!state.climb&&(!!input?.crouch||state.underLowGate);
    if(wantsCrouch&&state.jump.preparing)resetJump();
    const targetCrouch=wantsCrouch?1:0,step=dt/.36;
    if(targetCrouch>state.crouch)state.crouch=Math.min(1,state.crouch+step);
    else if(targetCrouch<state.crouch)state.crouch=Math.max(0,state.crouch-step);
    // A low beam keeps the complete bent torso/backpack beneath it after release.
    if(state.underLowGate&&player.grounded)state.crouch=1;
    const crouching=state.crouch>.001||wantsCrouch||underGate;
    const running=!!input?.running&&!crouching,wantsJump=!!input?.jump,interact=!!input?.interact&&!crouching;
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
    if(freshJump&&!crouching)state.buffer=MOVEMENT.buffer;
    if(crouching)state.buffer=state.coyote=0;
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
    const normalVelocity=movementVelocity(player.vx,direction,running,player.grounded,dt);
    const lowVelocity=direction*.80+(player.vx-direction*.80)*Math.exp(-(direction?8:12)*dt);
    player.vx=normalVelocity+(lowVelocity-normalVelocity)*state.crouch;
    if(!direction&&player.grounded&&Math.abs(player.vx)<.002)player.vx=0;
    if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.2))player.face=direction;
    if(!crouching&&(!interact||wantsJump||jump.launched)){
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
    const gate=STREET.crawl,gateHeight=state.crouch>=.98&&player.grounded?.96:1.60;
    if(player.y<gate.topY&&player.y+gateHeight>gate.bottomY&&beneathCrawlGate(nextX)){
      if(player.x<=gate.x-CRAWL_RADIUS+EPS)nextX=Math.min(nextX,gate.x-CRAWL_RADIUS);
      else if(player.x>=gate.x+gate.w+CRAWL_RADIUS-EPS)nextX=Math.max(nextX,gate.x+gate.w+CRAWL_RADIUS);
      else nextX=player.x;
      player.vx=0;
    }
    player.x=clamp(nextX,bounds.minX,bounds.maxX);if(player.x!==nextX)player.vx=0;
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
    snapshot(){if(!state||!lastPlayer||!lastPlayer.grounded||state.climb||slide.active||state.homeDoor.phase==='opening'||state.jump.preparing||state.jump.launched||Math.abs(lastPlayer.z)>.025||state.crouch>.001&&state.crouch<.98)return null;
      return normalizeStreetSave({...lastPlayer,dumpsterX:state.dumpsterX,...(state.crouch>=.98?{crouched:true}:{})});},
    reset(){slide.reset();state=null;lastPlayer=null;}};
}
