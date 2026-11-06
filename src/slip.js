import {LEVEL} from './level.js';

export const SLIP_PHASES=Object.freeze([
  Object.freeze({name:'slip',duration:.38}),
  Object.freeze({name:'fall',duration:.62}),
  Object.freeze({name:'ragdoll',duration:.85}),
  Object.freeze({name:'recover',duration:1.8}),
  Object.freeze({name:'brush',duration:1.15}),
  Object.freeze({name:'look',duration:.9}),
  Object.freeze({name:'settle',duration:.4})
]);
const TOTAL=6.1,IMPACT=.8,STEP=1/120;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const joints={hips:[10,.66,.10],torso:[9,.48,-.15],head:[13,.68,.11],leftArm:[8,.34,.43],rightArm:[7,.38,-.39],leftLeg:[9,.42,.32],rightLeg:[8,.40,-.28]};
const jointKeys=Object.keys(joints),jointEntries=Object.entries(joints);
const cues=[['impact',IMPACT],['rebound',1.04],['recover',1.85],['brush',3.65],['brush',4.18],['look',4.8],['complete',TOTAL]];

// A brief physical recoil drives loose joints, then authored support takes over.
// The root stays on this safe roof; the event cannot move through the crate or
// continuously retrigger while the child is trying to stand in the same water.
export function createSlip(config=LEVEL.slipPuddle) {
  let state=null,played=false,springTime=0,accumulator=0;
  const velocities=Object.fromEntries(jointKeys.map(key=>[key,0]));
  function reset(){state=null;played=false;springTime=0;accumulator=0;for(const key of jointKeys)velocities[key]=0;}
  function tryStart(player,previousX=player.x){
    if(state||played||!player.grounded||![player.x,player.y,player.vx,previousX].every(Number.isFinite))return false;
    if(Math.abs(player.y-config.y)>.04||Math.abs(player.vx)<.3)return false;
    const left=Math.min(previousX,player.x),right=Math.max(previousX,player.x);
    if(right<config.x||left>config.x+config.w||player.x<config.x-.55||player.x>config.x+config.w+.55)return false;
    const face=Math.sign(player.vx),distance=clamp(.36+Math.abs(player.vx)*.14,.42,.8);
    const endX=clamp(player.x+face*distance,config.x-.6,config.x+config.w+.45);
    state={phase:'slip',elapsed:0,phaseTime:0,progress:0,duration:.38,face,impact:0,impulse:clamp(Math.abs(player.vx)/3.3,.45,1),seed:17,startX:player.x,endX,wobble:Object.fromEntries(jointKeys.map(key=>[key,0]))};
    played=true;springTime=0;accumulator=0;
    player.vx=0;player.vy=0;player.face=face;player.grounded=true;
    return true;
  }
  function advanceSprings(dt){
    accumulator+=dt;
    while(accumulator>=STEP-1e-10){
      const before=springTime;springTime+=STEP;accumulator-=STEP;
      const kick=before<IMPACT-1e-9&&springTime>=IMPACT-1e-9?1:before<1.04-1e-9&&springTime>=1.04-1e-9?-.22:0;
      for(const [key,[omega,damping,amplitude]] of jointEntries){
        if(kick)velocities[key]+=amplitude*omega*1.5*kick*state.impulse;
        const x=state.wobble[key],v=velocities[key],decay=damping*omega,frequency=omega*Math.sqrt(1-damping*damping);
        const sine=Math.sin(frequency*STEP),cosine=Math.cos(frequency*STEP),envelope=Math.exp(-decay*STEP);
        const b=(v+decay*x)/frequency;
        const next=envelope*(x*cosine+b*sine);
        velocities[key]=envelope*(-decay*(x*cosine+b*sine)-x*frequency*sine+b*frequency*cosine);
        state.wobble[key]=next;
      }
    }
  }
  function update(dt,player){
    if(!state||!Number.isFinite(dt)||dt<=0)return [];
    const previous=state.elapsed,elapsed=Math.min(TOTAL,previous+dt),events=[];
    advanceSprings(elapsed-previous);state.elapsed=elapsed;
    for(const [name,at] of cues)if(previous<at-1e-9&&elapsed>=at-1e-9)events.push(name);
    let start=0;
    for(let i=0;i<SLIP_PHASES.length;i++){
      const phase=SLIP_PHASES[i];
      if(elapsed<start+phase.duration-1e-9||i===SLIP_PHASES.length-1){
        state.phase=phase.name;state.duration=phase.duration;state.phaseTime=clamp(elapsed-start,0,phase.duration);state.progress=state.phaseTime/phase.duration;break;
      }
      start+=phase.duration;
    }
    state.impact=elapsed>=IMPACT?Math.exp(-(elapsed-IMPACT)*12)*state.impulse:0;
    const slide=(1-Math.exp(-3*Math.min(1,elapsed)))/(1-Math.exp(-3));
    player.x=state.startX+(state.endX-state.startX)*slide;player.y=config.y;
    player.vx=0;player.vy=0;player.face=state.face;player.grounded=true;
    if(elapsed>=TOTAL-1e-9)state=null;
    return events;
  }
  function restore(wasPlayed=false){reset();played=wasPlayed===true;}
  return {get state(){return state},get active(){return !!state},get played(){return played},tryStart,update,reset,restore};
}
