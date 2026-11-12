const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};

export const SLIDE=Object.freeze({minSpeed:2.2,maxSpeed:3.6,exitSpeed:.8,drop:.16,glide:.48,recover:.31,duration:.95});
const RECOVER_AT=SLIDE.drop+SLIDE.glide;

// This action owns momentum and the low pose, never the root position. The
// caller integrates vx through its ordinary world collisions and owns the
// fresh crouch press, so holding a key cannot repeatedly start another slide.
export function createSlide(){
  let state=null;
  function begin(player){
    if(state||!player||!player.grounded||![player.x,player.y,player.vx,player.vy].every(Number.isFinite)||Math.abs(player.vx)<SLIDE.minSpeed||Math.abs(player.vy)>.1)return false;
    const face=Math.sign(player.vx),speed=Math.min(SLIDE.maxSpeed,Math.abs(player.vx));
    state={phase:'drop',elapsed:0,motionElapsed:0,phaseTime:0,progress:0,duration:SLIDE.drop,
      face,speed,startSpeed:speed,lowAmount:0,recoveryLow:1,recoverLow:false,blocked:false,startX:player.x,startY:player.y};
    player.vx=face*speed;player.vy=0;player.face=face;
    return true;
  }
  function complete(){state=null;return 'complete';}
  function update(dt,{blocked=false,underLowGate=false}={},player){
    if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;
    // Leaving an actual ledge hands vertical motion back to normal gravity.
    if(!player.grounded)return complete();
    if(blocked){
      state.blocked=true;state.speed=0;player.vx=0;
      // The caller keeps its ordinary ceiling-constrained crouch here. This
      // handoff allows the player to reverse out instead of waiting forever.
      if(underLowGate)return complete();
      if(state.phase!=='recover'){
        state.recoveryLow=state.lowAmount;state.elapsed=RECOVER_AT;
      }
    }
    state.motionElapsed+=dt;
    state.elapsed=Math.min(SLIDE.duration,state.elapsed+dt);
    if(state.elapsed<SLIDE.drop){
      state.phase='drop';state.duration=SLIDE.drop;state.phaseTime=state.elapsed;
      state.progress=state.phaseTime/state.duration;state.lowAmount=smooth(state.progress);
    }else if(state.elapsed<RECOVER_AT){
      state.phase='glide';state.duration=SLIDE.glide;state.phaseTime=state.elapsed-SLIDE.drop;
      state.progress=state.phaseTime/state.duration;state.lowAmount=1;
    }else{
      state.phase='recover';state.duration=SLIDE.recover;state.phaseTime=state.elapsed-RECOVER_AT;
      if(underLowGate)state.recoverLow=true;
      state.progress=clamp(state.phaseTime/state.duration,0,1);state.lowAmount=state.recoverLow?1:state.recoveryLow*(1-smooth(state.progress));
    }
    state.speed=state.blocked?0:SLIDE.exitSpeed+(state.startSpeed-SLIDE.exitSpeed)*(1-smooth(state.motionElapsed/SLIDE.duration));
    player.vx=state.face*state.speed;player.vy=0;player.face=state.face;
    if(state.elapsed>=SLIDE.duration-1e-9)return complete();
    return null;
  }
  return {get active(){return !!state;},get state(){return state;},begin,update,reset(){state=null;}};
}
