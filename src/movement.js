// Responsive control with grounded weight and retained airborne momentum.
export const MOVEMENT=Object.freeze({walk:1.9,run:3.3,groundAcceleration:6.2,groundBrake:8.5,airAcceleration:4.2,airDrag:.35,jumpVelocity:4.7,gravity:10.7,fallGravity:15,coyote:.12,buffer:.16});
export function movementVelocity(current,direction,running,grounded,dt){
 let target=direction*(running?MOVEMENT.run:MOVEMENT.walk);
 if(!grounded&&direction&&Math.sign(current)===direction)target=direction*Math.max(Math.abs(current),Math.abs(target));
 const rate=grounded?(direction?MOVEMENT.groundAcceleration:MOVEMENT.groundBrake):(direction?MOVEMENT.airAcceleration:MOVEMENT.airDrag);
 return target+(current-target)*Math.exp(-rate*Math.max(0,dt));
}
export function preparationX({x,y,vx,running,dt,grounded,surfaces}){
 let next=x+vx*dt*(running?.85:.5);
 if(!grounded)return next;
 // Keep the loading foot supported at a roof edge while preserving launch speed.
 for(const p of surfaces){
  if(Math.abs(y-p.y)>.04||x<p.x-.02||x>p.x+p.w+.02)continue;
  next=vx>0?Math.min(next,p.x+p.w-.025):vx<0?Math.max(next,p.x+.025):next;
  break;
 }
 return next;
}
export function landingDistance(x,y,surfaces){
 let nearest=Infinity;
 for(const p of surfaces)if(x>=p.x-.08&&x<=p.x+p.w+.08&&y>=p.y-.04)nearest=Math.min(nearest,Math.max(0,y-p.y));
 return Number.isFinite(nearest)?nearest:undefined;
}
