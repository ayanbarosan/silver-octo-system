import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {createStairwell,STAIRWELL,stairDirection,stairLane} from '../src/stairwell.js';

// Physical body clearance is independent of the foot IK tests: a correctly
// planted shoe does not prevent the child's chest going through another flight.
const C=STAIRWELL;
function stairSolids(){
  const solids=[];
  for(let flight=0;flight<C.flights;flight++){
    const direction=stairDirection(flight),start=direction<0?C.right:C.left;
    const high=(C.flights-flight)*C.rise,run=(C.right-C.left)/C.steps,z=stairLane(flight);
    for(let step=0;step<C.steps;step++){
      const x=start+direction*(step+.5)*run,y=high-(step+1)*C.rise/C.steps;
      solids.push({flight,name:`flight ${flight} tread ${step}`,box:new THREE.Box3(
        new THREE.Vector3(x-(run+.012)/2,y-.19,z-C.stairWidth/2-.035),
        new THREE.Vector3(x+(run+.012)/2,y+.005,z+C.stairWidth/2+.035))});
    }
    for(const side of [-1,1]){
      const railZ=z+side*.58,end=direction<0?C.left:C.right;
      // The stringer and rails are capsules along their actual sloping centres.
      for(const [height,radius,name]of[[-.17,.10,'stringer'],[.82,.03,'handrail'],[.82*.47,.018,'midrail']]){
        solids.push({flight,name:`flight ${flight} ${name}`,a:new THREE.Vector3(start,high+height,railZ),b:new THREE.Vector3(end,high-C.rise+height,railZ),radius});
      }
      for(let post=0;post<=10;post++){
        const t=post/10,x=start+(end-start)*t,y=high-C.rise*t;
        solids.push({flight,name:`flight ${flight} post ${post}`,a:new THREE.Vector3(x,y,railZ),b:new THREE.Vector3(x,y+.84,railZ),radius:.027});
      }
    }
  }
  return solids;
}
const solids=stairSolids();
function hits(solid,point,radius){
  if(solid.box)return solid.box.distanceToPoint(point)<radius-1e-5;
  const projection=new THREE.Line3(solid.a,solid.b).closestPointToPoint(point,true,new THREE.Vector3());
  return point.distanceTo(projection)<radius+solid.radius-1e-5;
}
function physicalProbes(boy){
  const marker=(name,radius,offset=null)=>{
    const object=boy.group.getObjectByName(name),point=offset?object.localToWorld(new THREE.Vector3(...offset)):object.getWorldPosition(new THREE.Vector3());
    return {name,point,radius};
  };
  return [marker('head',.17),marker('pelvis',.15,[0,.025,0]),marker('pelvis',.16,[0,.27,0]),
    marker('leftKnee',.065),marker('rightKnee',.065),marker('leftSole',.02),marker('rightSole',.02)];
}
function rig(saved=null){
  const controller=createStairwell(),player={},boy=createBoy(THREE);controller.begin(player,saved);
  boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=controller.state.heading;boy.reset();
  let time=0;
  return {controller,player,boy,step(direction,dt=1/120){
    const before={x:player.x,z:player.z};controller.update(dt,{direction},player);time+=dt;
    boy.group.position.set(player.x,player.y,player.z);
    boy.group.rotation.y=THREE.MathUtils.damp(boy.group.rotation.y,controller.state.heading,8,dt);
    boy.animate({time,dt,speed:Math.hypot(player.vx,player.vz),travel:Math.hypot(player.x-before.x,player.z-before.z),grounded:true,wake:1,stairs:controller.state});
    boy.group.updateWorldMatrix(true,true);return physicalProbes(boy);
  }};
}

test('the actual head, torso, knees and shoes clear other flights through every landing turn',()=>{
  const r=rig(),visited=new Set(),turns=new Set();let groundSamples=0;
  for(let frame=0;frame<8000&&!r.controller.state.completed;frame++){
    const state=r.controller.state,probes=r.step(state.flight<C.flights?state.direction:-1);
    visited.add(state.flight);if(state.phase==='turn')turns.add(state.flight);
    for(const probe of probes){
      assert([probe.point.x,probe.point.y,probe.point.z].every(Number.isFinite));
      for(const solid of solids){
        // Feet legitimately rest on the current flight. Its own sloping
        // stringer is close to a shoe at a step edge, so this test addresses
        // non-supporting flights; supporting contacts have separate rig tests.
        if(solid.flight===state.flight&&state.phase!=='turn')continue;
        // A trailing shoe can still be supported by the old flight while its
        // leading shoe reaches the landing. Allow contact above a tread's top,
        // but keep checking any sole that penetrates below that surface.
        if(state.phase==='turn'&&solid.flight===state.flight-1&&probe.name.endsWith('Sole')&&solid.box&&probe.point.y>=solid.box.max.y-.015)continue;
        assert(!hits(solid,probe.point,probe.radius),`${probe.name} intersects ${solid.name} at frame ${frame}: ${JSON.stringify({flight:state.flight,phase:state.phase,root:{...r.player},point:probe.point})}`);
      }
    }
    if(state.flight===C.flights&&state.phase!=='turn'){
      groundSamples++;assert.equal(r.player.z,C.groundZ);
      for(const probe of probes)assert(probe.point.z-probe.radius>C.lanes[1]+C.stairWidth/2,'The ground return must pass in front of the final staircase with the whole body.');
    }
  }
  assert(r.controller.state.completed,'The physical-clearance route must reach the actual ground exit.');
  assert.deepEqual([...visited],[0,1,2,3,4]);assert.deepEqual([...turns],[1,2,3,4]);
  assert(groundSamples>500,'The probe must cover the entire walk back beneath the stairs.');
});

test('legacy ground-floor saves restore beside the stairs instead of inside the last flight',()=>{
  const r=rig({flight:4,x:10.4,face:-1});let probes;
  for(let frame=0;frame<120;frame++)probes=r.step(0);
  assert.equal(r.player.z,C.groundZ);
  for(const probe of probes)for(const solid of solids)assert(!hits(solid,probe.point,probe.radius),`A restored ${probe.name} intersects ${solid.name}.`);
  // The previous route shared its depth with the final staircase. Putting a
  // ground-height torso in that lane must reproduce the reported intersection.
  const oldRoute=new THREE.Vector3(9.6,.62,stairLane(3));
  assert(solids.some(solid=>solid.flight===3&&hits(solid,oldRoute,.15)),'The collision probe must detect the previous route through the lowest flight.');
});
