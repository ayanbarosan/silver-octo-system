import {MOVEMENT} from './movement.js';
import {STAIRWELL,stairHeight,stairDirection} from './stairwell.js';

/** A small, fully rigged child. Local forward is +Z and the soles rest on Y=0. */
export function createBoy(THREE) {
  const group = new THREE.Group();
  group.name = 'Boy';
  const pose = new THREE.Group();
  group.add(pose);
  const M = {
    jacket: new THREE.MeshStandardMaterial({ color: 0x11171b, roughness: 0.94 }),
    jacketLight: new THREE.MeshStandardMaterial({ color: 0x1b2226, roughness: 0.92 }),
    trousers: new THREE.MeshStandardMaterial({ color: 0x11181c, roughness: 0.96 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x354044, roughness: 0.88 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xd1d3c8, roughness: 0.8 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc49f89, roughness: 0.81 }),
    cheek: new THREE.MeshStandardMaterial({ color: 0xb88c78, roughness: 0.88 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x17171d, roughness: 0.99 }),
    hairHighlight: new THREE.MeshStandardMaterial({ color: 0x24222a, roughness: 0.96 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.7 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x0c1317, roughness: 0.92 }),
    shoe: new THREE.MeshStandardMaterial({ color: 0x202b30, roughness: 0.85 }),
    bag: new THREE.MeshStandardMaterial({ color: 0xb3da45, roughness: 0.88 }),
    bagSide: new THREE.MeshStandardMaterial({ color: 0x819e34, roughness: 0.93 }),
    bagTrim: new THREE.MeshStandardMaterial({ color: 0xd1e978, roughness: 0.86 }),
    strap: new THREE.MeshStandardMaterial({ color: 0x4d6031, roughness: 0.93 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x7d8780, roughness: 0.48, metalness: 0.65 }),
  };
  const sphereGeo = new THREE.SphereGeometry(1, 20, 16);
  function mesh(geometry, material, parent, x=0, y=0, z=0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x,y,z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function oval(parent, material, x,y,z, sx,sy,sz) {
    const m=mesh(sphereGeo,material,parent,x,y,z);
    m.scale.set(sx,sy,sz);
    return m;
  }
  function capsule(parent, material, x,y,z, radius,length, scaleZ=1) {
    const m=mesh(new THREE.CapsuleGeometry(radius,Math.max(.001,length-radius*2),5,12),material,parent,x,y,z);
    m.scale.z=scaleZ;
    return m;
  }
  function line(parent, points, material, radius=.004) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),14,radius,5,false),material,parent);
  }
  function softBox(parent,material,x,y,z,w,h,d,r=.035) {
    const hw=w/2,hh=h/2;
    const s=new THREE.Shape();
    s.moveTo(-hw+r,-hh); s.lineTo(hw-r,-hh);
    s.quadraticCurveTo(hw,-hh,hw,-hh+r);s.lineTo(hw,hh-r);
    s.quadraticCurveTo(hw,hh,hw-r,hh);s.lineTo(-hw+r,hh);
    s.quadraticCurveTo(-hw,hh,-hw,hh-r);s.lineTo(-hw,-hh+r);
    s.quadraticCurveTo(-hw,-hh,-hw+r,-hh);
    const bevel=Math.min(r*.45,d*.2);
    const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:6});
    geo.translate(0,0,-(d-2*bevel)/2);
    return mesh(geo,material,parent,x,y,z);
  }

  // Broad padded jacket, soft belly and small hips give a child's proportions.
  const torso=new THREE.Group();torso.name='pelvis';torso.position.y=.64;pose.add(torso);
  oval(torso,M.trousers,0,.025,0,.205,.145,.145);
  oval(torso,M.jacket,0,.25,0,.235,.285,.165);
  oval(torso,M.jacketLight,0,.14,.021,.225,.19,.17);
  capsule(torso,M.jacket,0,.038,.005,.193,.10,.78);
  oval(torso,M.jacket,0,.495,0,.119,.065,.118);
  line(torso,[[0,.04,.177],[0,.22,.186],[0,.42,.141],[0,.5,.1]],M.seam,.004);
  mesh(new THREE.BoxGeometry(.012,.027,.007),M.metal,torso,0,.43,.143);
  // Slightly curved pocket seams are visible when light grazes the jacket.
  for(const side of [-1,1]) line(torso,[[side*.165,.11,.133],[side*.12,.2,.168],[side*.11,.235,.164]],M.seam,.0025);

  const legs=[];
  for(const side of [-1,1]) {
    const hip=new THREE.Group();hip.name=side===-1?'leftHip':'rightHip';hip.position.set(side*.108,.64,0);pose.add(hip);
    capsule(hip,M.trousers,0,-.145,0,.086,.33,.98);
    oval(hip,M.jacketLight,0,-.276,.006,.079,.077,.079);
    const knee=new THREE.Group();knee.name=side===-1?'leftKnee':'rightKnee';knee.position.y=-.305;hip.add(knee);
    capsule(knee,M.trousers,0,-.139,0,.069,.306,.99);
    capsule(knee,M.jacket,0,-.282,0,.068,.05,1.05);
    // Two thin pale fabric stripes on the outside of both trouser legs.
    for(const z of [-.025,.018]) {
      capsule(hip,M.stripe,side*.079,-.147,z,.006,.276,1);
      capsule(knee,M.stripe,side*.064,-.137,z,.0055,.247,1);
    }
    const foot=new THREE.Group();foot.name=side===-1?'leftAnkle':'rightAnkle';foot.position.set(0,-.31,0);knee.add(foot);
    oval(foot,M.sole,0,-.027,.026,.085,.033,.145);
    oval(foot,M.shoe,0,.002,.018,.08,.057,.13);
    oval(foot,M.shoe,0,.015,-.046,.072,.062,.067);
    line(foot,[[-.047,.041,.017],[0,.05,.023],[.047,.041,.017]],M.seam,.003);
    line(foot,[[-.043,.033,.045],[0,.043,.055],[.043,.033,.045]],M.seam,.003);
    const sole=new THREE.Object3D();sole.name=side===-1?'leftSole':'rightSole';sole.position.set(0,-.06,.026);foot.add(sole);
    legs.push({hip,knee,foot,sole,side});
  }

  const arms=[];
  for(const side of [-1,1]) {
    const shoulder=new THREE.Group();shoulder.position.set(side*.227,.405,0);torso.add(shoulder);
    capsule(shoulder,M.jacketLight,0,-.09,0,.086,.235,.92);
    oval(shoulder,M.jacket,0,-.015,0,.092,.1,.089);
    const elbow=new THREE.Group();elbow.position.set(0,-.192,0);shoulder.add(elbow);
    capsule(elbow,M.jacket,0,-.082,0,.071,.205,.94);
    capsule(elbow,M.jacketLight,0,-.167,0,.07,.047,.96);
    for(const z of [-.024,.019]) {
      capsule(shoulder,M.stripe,side*.079,-.088,z,.006,.188,1);
      capsule(elbow,M.stripe,side*.065,-.077,z,.0055,.158,1);
    }
    const wrist=new THREE.Group();wrist.position.set(0,-.22,0);elbow.add(wrist);
    oval(wrist,M.skin,0,0,.008,.049,.061,.04);
    oval(wrist,M.skin,-side*.031,.006,.038,.018,.034,.023);
    const palm=new THREE.Object3D();palm.name=side===-1?'leftPalm':'rightPalm';palm.position.set(0,0,.048);wrist.add(palm);
    arms.push({shoulder,elbow,wrist,palm,side});
  }

  // A small face under a heavy fringe. No exaggerated cartoon eyes.
  capsule(torso,M.skin,0,.53,.011,.069,.13,1);
  const head=new THREE.Group();head.name='head';head.position.set(0,.679,.026);torso.add(head);
  oval(head,M.skin,0,0,0,.172,.198,.163);
  oval(head,M.skin,0,-.075,.049,.137,.133,.139);
  oval(head,M.skin,0,-.125,.046,.101,.069,.102);
  for(const side of [-1,1]) {
    oval(head,M.skin,side*.171,-.019,.007,.035,.058,.037);
    oval(head,M.cheek,side*.184,-.021,.022,.011,.031,.018);
    oval(head,M.eye,side*.061,.001,.153,.011,.014,.006);
    line(head,[[side*.084,.029,.144],[side*.061,.034,.157],[side*.041,.027,.158]],M.hair,.004);
  }
  oval(head,M.skin,0,-.027,.163,.028,.038,.029);
  line(head,[[-.024,-.081,.163],[0,-.085,.169],[.026,-.08,.163]],M.cheek,.003);
  // A cap plus asymmetrical locks avoids the spherical helmet appearance.
  const cap=mesh(new THREE.SphereGeometry(.183,24,16,0,Math.PI*2,0,Math.PI*.62),M.hair,head,0,.034,-.013);
  cap.scale.set(1.015,1.02,1.025);
  oval(head,M.hair,-.147,.025,-.026,.045,.12,.101);
  oval(head,M.hair,.146,.034,-.026,.04,.112,.095);
  const locks=[[-.122,.116,.092,.073,.064,.105],[-.065,.145,.121,.082,.07,.078],[.012,.138,.142,.071,.076,.067],[.071,.119,.134,.071,.086,.07],[.127,.083,.102,.055,.094,.073],[-.027,.169,-.024,.115,.045,.115]];
  locks.forEach((p,i)=>{const lock=oval(head,i%3===0?M.hairHighlight:M.hair,...p);lock.rotation.z=(i-2)*.12;});
  line(head,[[-.115,.162,.044],[-.06,.187,.079],[.012,.174,.137]],M.hairHighlight,.002);

  // Canvas backpack: rounded body, separate front pocket, zipper and shoulder straps.
  const bag=new THREE.Group();bag.name='backpack';bag.position.set(0,.263,-.195);torso.add(bag);
  softBox(bag,M.bagSide,0,0,-.012,.335,.415,.135,.052);
  softBox(bag,M.bag,0,.008,-.058,.319,.401,.133,.055);
  softBox(bag,M.bagSide,0,-.082,-.137,.267,.148,.047,.028);
  softBox(bag,M.bag,0,-.077,-.153,.256,.137,.037,.024);
  line(bag,[[-.112,-.037,-.177],[0,-.025,-.18],[.111,-.037,-.177]],M.bagTrim,.0035);
  mesh(new THREE.BoxGeometry(.012,.024,.005),M.metal,bag,.099,-.048,-.18);
  line(bag,[[-.13,-.16,-.13],[-.152,0,-.13],[-.112,.176,-.12],[0,.194,-.12],[.112,.176,-.12],[.152,0,-.13],[.13,-.16,-.13]],M.bagTrim,.003);
  line(bag,[[-.052,.206,-.025],[-.049,.253,-.025],[.049,.253,-.025],[.052,.206,-.025]],M.strap,.012);
  for(const side of [-1,1]) {
    line(torso,[[side*.135,.434,-.225],[side*.149,.511,-.069],[side*.17,.456,.096],[side*.167,.249,.164],[side*.137,.085,.106],[side*.128,.085,-.179]],M.strap,.017);
    softBox(torso,M.bagSide,side*.164,.203,.159,.039,.049,.013,.008);
    softBox(bag,M.bagSide,side*.167,-.093,-.044,.052,.126,.089,.015);
  }

  group.userData.height=1.56;
  const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
  const smooth=(x,a=0,b=1)=>THREE.MathUtils.smoothstep(x,a,b);
  const damp=(a,b,rate,dt)=>lerp(a,b,1-Math.exp(-rate*dt));
  const cycle=x=>((x%1)+1)%1;
  const TAU=Math.PI*2,THIGH=.305,SHIN=.31;
  const footWorld=new THREE.Vector3(),temporary=new THREE.Vector3();
  const animation={phase:0,mode:'idle',wakeStage:'awake',jumpStage:'grounded',climbStage:'none',ladderStage:'none',slipStage:'none',slideStage:'none',launchLead:0,launchSpeed:0,landingReach:0,feet:legs.map(()=>({stance:true,contactWeight:1,position:{x:0,y:0,z:0}})),hands:arms.map(()=>({contactWeight:0,position:{x:0,y:0,z:0}}))};
  group.userData.animation=animation;
  let phase=0,moving=0,running=0,pushing=0,air=0,lean=0,headLean=0,bagLean=0,locomotionActive=false,stairWeight=0;
  let interactionWeight=0,pullWeight=0,lastInteraction=null,interactionWasApplied=false;
  let slideWasActive=false;
  const interactionHands=[0,0],interactionTarget=new THREE.Vector3(),interactionActual=new THREE.Vector3();
  const interactionRest=arms.map(()=>[0,1,2].map(()=>({position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),solved:new THREE.Quaternion()})));
  let landing=0,landingVelocity=0,previousGrounded=true,previousTime=0,initialized=false;
  let internalAirTime=0,previousPrep=0,launchCrouch=0;
  let launchLead=0,takeoffSpeed=0,takeoffRun=0,landingReach=0,landingAge=Infinity,landingFoot=0,bagVelocity=0;
  const footState=legs.map(()=>({anchor:new THREE.Vector3(),hasAnchor:false,wasStance:false,landingPlant:false,roll:0,target:new THREE.Vector3(0,0,.025)}));
  const legTargets=legs.map(()=>new THREE.Vector3());
  const handTargets=arms.map(()=>new THREE.Vector3());
  const noHands=[0,0],stanceScratch=[true,true],weightScratch=[1,1],forwardScratch=[0,0];
  const stepResult={footstep:false,intensity:0};
  const climbEdge=new THREE.Vector3(),climbFeet=legs.map(()=>new THREE.Vector3()),climbAnchors=arms.map(()=>new THREE.Vector3()),climbRest=arms.map(()=>new THREE.Vector3());
  const climbContacts={hands:[0,0],stances:[false,false],weights:[0,0]};
  const wakeChannels=new Float64Array(12),flightChannels=new Float64Array(14);
  const ladderFeet=legs.map(()=>new THREE.Vector3()),ladderHands=arms.map(()=>new THREE.Vector3());
  const ladderContacts={hands:[0,0],stances:[false,false],weights:[0,0]};
  const ladderRolls=new Float64Array(2);
  const slipChannels=new Float64Array(16),slipContacts={hands:[0,0],stances:[false,false],weights:[0,0]};
  const slipDown=new THREE.Vector3(0,-1,0),slipOffset=new THREE.Vector3(0,0,.048);
  const slipTarget=new THREE.Vector3(),slipDirection=new THREE.Vector3(),slipBend=new THREE.Vector3(),slipElbow=new THREE.Vector3(),slipUpper=new THREE.Vector3(),slipFore=new THREE.Vector3();
  const slipInverse=new THREE.Quaternion(),slipDesired=new THREE.Quaternion(),slipUpperQ=new THREE.Quaternion(),slipForeQ=new THREE.Quaternion();
  const slipEuler=new THREE.Euler();

  function reset() {
    phase=.04;moving=running=pushing=air=lean=headLean=bagLean=stairWeight=0;locomotionActive=false;
    interactionWeight=pullWeight=0;lastInteraction=null;interactionWasApplied=false;interactionHands.fill(0);slideWasActive=false;
    landing=landingVelocity=0;previousGrounded=true;previousTime=0;initialized=false;internalAirTime=previousPrep=launchCrouch=0;launchLead=takeoffSpeed=takeoffRun=landingReach=landingFoot=bagVelocity=0;landingAge=Infinity;
    pose.position.set(0,0,0);pose.rotation.set(0,0,0);
    torso.position.set(0,.64,0);torso.rotation.set(0,0,0);torso.scale.set(1,1,1);
    head.position.set(0,.679,.026);head.rotation.set(.045,0,0);
    bag.position.set(0,.263,-.195);bag.rotation.set(0,0,0);
    footState.forEach((s,i)=>{s.anchor.set(0,0,0);s.hasAnchor=false;s.wasStance=false;s.landingPlant=false;s.roll=0;s.target.set(legs[i].side*.108,0,.025);});
    for(const arm of arms){arm.shoulder.position.x=arm.side*.227;arm.shoulder.rotation.set(.02,0,-arm.side*.045);arm.elbow.rotation.set(-.18,0,0);arm.wrist.rotation.set(0,0,0);}
    // Initialization uses the same IK as moving poses, so restarting cannot
    // retain a knee angle, a contact anchor or a backpack spring from last time.
    legs.forEach((leg,i)=>solveLeg(leg,footState[i].target,0,.64));
    animation.phase=phase;animation.mode='idle';animation.wakeStage='awake';animation.jumpStage='grounded';animation.climbStage='none';animation.ladderStage='none';animation.slipStage='none';animation.slideStage='none';animation.launchLead=0;animation.launchSpeed=0;animation.landingReach=0;
    updateDiagnostics([true,true],[1,1]);
  }

  function updateDiagnostics(stance,weights,handWeights=noHands) {
    group.updateWorldMatrix(true,true);
    for(let i=0;i<legs.length;i++) {
      const info=animation.feet[i];legs[i].sole.getWorldPosition(footWorld);
      info.stance=stance[i];info.contactWeight=weights[i];
      info.position.x=footWorld.x;info.position.y=footWorld.y;info.position.z=footWorld.z;
    }
    for(let i=0;i<arms.length;i++){const info=animation.hands[i];arms[i].palm.getWorldPosition(footWorld);info.contactWeight=handWeights[i];info.position.x=footWorld.x;info.position.y=footWorld.y;info.position.z=footWorld.z;}
    animation.phase=phase;
  }

  function solveLeg(leg,soleTarget,roll,hipHeight,hipZ=0) {
    // The ankle is offset from the shoe's real contact marker. Removing that
    // rotated offset before IK keeps the rendered sole planted, not just a
    // mathematical target somewhere inside the shoe.
    const ankleY=soleTarget.y+.06*Math.cos(roll)+.026*Math.sin(roll);
    const ankleZ=soleTarget.z+.06*Math.sin(roll)-.026*Math.cos(roll);
    const dy=ankleY-hipHeight,dz=ankleZ-hipZ;
    const distance=clamp(Math.hypot(dy,dz),.015,THIGH+SHIN-.001);
    const kneeAngle=Math.acos(clamp((distance*distance-THIGH*THIGH-SHIN*SHIN)/(2*THIGH*SHIN),-1,1));
    const hipAngle=Math.atan2(-dz,-dy)-Math.atan2(SHIN*Math.sin(kneeAngle),THIGH+SHIN*Math.cos(kneeAngle));
    leg.hip.position.set(soleTarget.x,hipHeight,hipZ);
    leg.hip.rotation.set(hipAngle,0,0);
    leg.knee.rotation.set(kneeAngle,0,0);
    leg.foot.rotation.set(roll-hipAngle-kneeAngle,0,0);
  }

  const wakeKeys=[
    // progress, pelvisY, pelvisZ, chest lean, left/right sole Y,Z, left/right palm Y,Z
    [0,   .21,-.10,1.50, .070,-.72,.065,-.70, .030,.65,.030,.67],
    [.10, .21,-.10,1.50, .070,-.72,.065,-.70, .030,.65,.030,.67],
    [.18, .215,-.10,1.42,.070,-.72,.065,-.70, .014,.50,.014,.55],
    [.30, .23,-.08,1.20, .070,-.72,.065,-.70, .014,.50,.014,.55],
    [.38, .350,-.07,1.47,.055,-.56,.055,-.52, .014,.50,.014,.55],
    [.42, .365,-.065,1.47,.055,-.34,.055,-.30, .014,.50,.014,.55],
    [.46, .355,-.06,1.47,.055,-.25,.055,-.20, .014,.50,.014,.55],
    [.60, .375,.015,1.43, 0,.24,.050,-.20, .300,.31,.014,.55],
    [.70, .430,.11,1.02, 0,.24,.050,-.16, .400,.32,.220,.50],
    [.82, .580,.065,.30, 0,.12,.025,-.07, .580,.23,.570,.10],
    [.93, .635,.008,.035,0,.04,0,.015, .642,.07,.642,.07],
    [1,   .640,0,.0,    0,.025,0,.025, .642,.07,.642,.07],
  ];
  const wakeObjects=[pose,torso,head,bag,...legs.flatMap(l=>[l.hip,l.knee,l.foot]),...arms.flatMap(a=>[a.shoulder,a.elbow,a.wrist])];
  const awakePose=wakeObjects.map(()=>({position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3()}));
  const slideEntry=wakeObjects.map(()=>({position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3()}));
  const slideEntryFeet=legs.map(()=>new THREE.Vector3()),slideBaseFeet=legs.map(()=>new THREE.Vector3()),slideLowFeet=legs.map(()=>new THREE.Vector3());
  const slideContacts={hands:[0,0],stances:[false,false],weights:[0,0]};
  function captureSlideEntry(){for(let i=0;i<wakeObjects.length;i++){const object=wakeObjects[i],base=slideEntry[i];base.position.copy(object.position);base.quaternion.copy(object.quaternion);base.scale.copy(object.scale);}group.updateWorldMatrix(true,true);for(let i=0;i<2;i++){legs[i].sole.getWorldPosition(slideEntryFeet[i]);group.worldToLocal(slideEntryFeet[i]);}}
  function capturePose(){for(let i=0;i<wakeObjects.length;i++){const object=wakeObjects[i],base=awakePose[i];base.position.copy(object.position);base.quaternion.copy(object.quaternion);base.scale.copy(object.scale);}}
  function blendPose(amount){for(let i=0;i<wakeObjects.length;i++){const object=wakeObjects[i],base=awakePose[i];object.position.lerp(base.position,amount);object.quaternion.slerp(base.quaternion,amount);object.scale.lerp(base.scale,amount);}}
  function solveArm(arm,palmTarget,palmPitch) {
    // Work in the actual shoulder's sagittal plane, then subtract the chest's
    // current angle. A chest push-up therefore extends elbows around fixed
    // palms rather than dragging the hands along with a rotating upper body.
    arm.shoulder.position.x=palmTarget.x-torso.position.x;
    arm.shoulder.rotation.set(0,0,0);
    torso.updateWorldMatrix(true,false);
    arm.shoulder.getWorldPosition(temporary);group.worldToLocal(temporary);
    const dy=palmTarget.y+.048*Math.sin(palmPitch)-temporary.y;
    const dz=palmTarget.z-.048*Math.cos(palmPitch)-temporary.z;
    const upper=.192,fore=.22,distance=clamp(Math.hypot(dy,dz),.025,upper+fore-.0005);
    const bend=-Math.acos(clamp((distance*distance-upper*upper-fore*fore)/(2*upper*fore),-1,1));
    const worldAngle=Math.atan2(-dz,-dy)-Math.atan2(fore*Math.sin(bend),upper+fore*Math.cos(bend));
    arm.shoulder.rotation.x=worldAngle-torso.rotation.x;
    arm.elbow.rotation.set(bend,0,0);
    arm.wrist.rotation.set(palmPitch-worldAngle-bend,0,0);
  }
  function applyWake(progress,time) {
    capturePose();
    let a=wakeKeys[0],b=wakeKeys[1];
    for(let i=1;i<wakeKeys.length;i++)if(progress<=wakeKeys[i][0]){a=wakeKeys[i-1];b=wakeKeys[i];break;}
    const u=smooth(progress,a[0],b[0]),v=wakeChannels;
    for(let i=0;i<a.length;i++)v[i]=i===0?progress:lerp(a[i],b[i],u);
    const hipY=v[1],hipZ=v[2],tilt=v[3];
    pose.position.set(0,0,0);pose.rotation.set(0,0,0);
    torso.position.set(0,hipY,hipZ);torso.rotation.set(tilt,0,0);torso.scale.set(1,1,1);
    head.position.set(0,.679,.026);
    head.rotation.set(-.10-.23*smooth(progress,.1,.31)+.36*smooth(progress,.64,.93),0,0);
    bag.position.set(0,.263,-.195);bag.rotation.set(-.025*Math.sin(progress*Math.PI),0,0);
    for(let i=0;i<legs.length;i++){
      const leg=legs[i],roll=lerp(.55,0,smooth(progress,.28,.62));
      const target=legTargets[i].set(leg.side*.108,v[4+i*2],v[5+i*2]);
      solveLeg(leg,target,roll,hipY,hipZ);
    }
    const palmPitch=lerp(Math.PI/2,-.16,smooth(progress,.70,.98));
    for(let i=0;i<arms.length;i++){const arm=arms[i];solveArm(arm,handTargets[i].set(arm.side*.255,v[8+i*2],v[9+i*2]),palmPitch);}
    // The last weight transfer blends into the live idle pose. This includes
    // breathing, so the end of the authored action cannot snap to another rig.
    const awakeBlend=smooth(progress,.88,1);
    if(awakeBlend>0)blendPose(awakeBlend);
    animation.wakeStage=progress<.12?'prone':progress<.31?'palms-support':progress<.48?'knees-under':progress<.63?'half-kneel':progress<.83?'push-to-stand':'balance';
    climbContacts.hands[0]=smooth(progress,.105,.17)*(1-smooth(progress,.46,.53));climbContacts.hands[1]=smooth(progress,.105,.17)*(1-smooth(progress,.60,.68));return climbContacts.hands;
  }

  // A long airborne silhouette: thighs stay below the pelvis and relaxed heels
  // trail behind. On descent the leading leg reaches first; the other follows.
  // Phase, hip offset, chest lean, lead Z/Y/roll, trail Z/Y/roll,
  // lead shoulder/elbow, trail shoulder/elbow, lateral arm balance.
  const flightKeys=[
    [0,   -.015,.060, .025,0,.06, -.025,0,.12, .18,-.27,.30,-.32,.025],
    [.12, .008,.075, -.025,.035,.09, -.120,.070,.20, -1.05,-.52,-.72,-.62,.045],
    [.28, .006,.050, -.060,.065,.12, -.185,.110,.30, -.62,-.66,-.46,-.72,.065],
    [.48, 0,.025, -.045,.060,.10, -.160,.105,.28, -.34,-.65,-.28,-.60,.075],
    [.64, 0,.040, .045,.028,-.09, -.135,.095,.25, -.44,-1.15,-.29,-.54,.065],
    [.82,-.004,.055, .100,.008,-.15, -.090,.055,.14, -.52,-1.08,-.36,-.43,.055],
    [1,   0,.060, .090,.001,-.12, -.065,.004,-.05, -.45,-.92,-.32,-.36,.045],
  ];
  // Shape-preserving Hermite tangents keep velocity flowing across poses.
  // Unlike smoothstep at every key, only a channel's actual extremum pauses.
  const flightTangents=flightKeys.map(row=>new Float64Array(row.length));
  for(let k=1;k<flightKeys.length-1;k++)for(let c=1;c<flightKeys[k].length;c++){
    const h0=flightKeys[k][0]-flightKeys[k-1][0],h1=flightKeys[k+1][0]-flightKeys[k][0];
    const d0=(flightKeys[k][c]-flightKeys[k-1][c])/h0,d1=(flightKeys[k+1][c]-flightKeys[k][c])/h1;
    if(d0*d1>0){const w0=2*h1+h0,w1=h1+2*h0;flightTangents[k][c]=(w0+w1)/(w0/d0+w1/d1);}
  }
  function sampleChannels(keys,progress,out=flightChannels) {
    let segment=keys.length-2;
    for(let i=1;i<keys.length;i++)if(progress<=keys[i][0]){segment=i-1;break;}
    const a=keys[segment],b=keys[segment+1],h=b[0]-a[0],t=clamp((progress-a[0])/h,0,1),t2=t*t,t3=t2*t;
    out[0]=progress;
    for(let i=1;i<a.length;i++)out[i]=(2*t3-3*t2+1)*a[i]+(t3-2*t2+t)*h*flightTangents[segment][i]+(-2*t3+3*t2)*b[i]+(t3-t2)*h*flightTangents[segment+1][i];
    return out;
  }
  function applyClimb(climb) {
    const p=clamp(climb.progress,0,1),face=climb.face===-1?-1:1;
    const startX=Number.isFinite(climb.startX)?climb.startX:climb.edgeX-face*.4;
    const startY=Number.isFinite(climb.startY)?climb.startY:climb.topY-.85;
    const endX=Number.isFinite(climb.endX)?climb.endX:climb.edgeX+face*.25;
    capturePose();
    pose.position.set(0,0,0);pose.rotation.set(0,0,0);
    group.updateWorldMatrix(true,false);
    const localEdge=climbEdge.set(climb.edgeX,climb.topY,0);group.worldToLocal(localEdge);
    const risingLean=lerp(.13,1.07,smooth(p,.22,.60));
    const tilt=lerp(risingLean,0,smooth(p,.69,.96));
    const supportHip=clamp(localEdge.y+.30-.405*Math.cos(risingLean),.18,.64);
    const hipHeight=lerp(supportHip,.64,smooth(p,.69,.96));
    const hipZ=-.015*Math.sin(Math.PI*smooth(p,.22,.90));
    torso.position.set(0,hipHeight,hipZ);torso.rotation.set(tilt,0,0);torso.scale.set(1,1,1);
    head.position.set(0,.679,.026);head.rotation.set(-tilt*.56+.035,0,0);
    bag.position.set(0,.263,-.195);bag.rotation.set(-.075*Math.sin(p*Math.PI),0,.025*Math.sin(p*TAU));

    const leadLift=smooth(p,.28,.48),leadReach=smooth(p,.48,.64);
    let leadWorldY=lerp(startY,climb.topY+.08,leadLift)-.072*smooth(p,.52,.65);
    let leadWorldX=lerp(startX+face*.025,climb.edgeX-face*.45,smooth(p,0,.28));
    leadWorldX=lerp(leadWorldX,climb.edgeX+face*.18,leadReach);
    leadWorldX=lerp(leadWorldX,endX+face*.025,smooth(p,.90,1));
    leadWorldY=lerp(leadWorldY,climb.topY,smooth(p,.90,1));
    let trailWorldX=lerp(startX-face*.025,climb.edgeX-face*.39,smooth(p,.14,.38));
    const trailLift=smooth(p,.74,.86);
    let trailWorldY=lerp(startY,climb.topY-.30,smooth(p,.22,.60));
    trailWorldY=lerp(trailWorldY,climb.topY+.12,trailLift);
    trailWorldX=lerp(trailWorldX,endX-face*.025,smooth(p,.82,.98));
    trailWorldY=lerp(trailWorldY,climb.topY,smooth(p,.90,1));
    const feetWorld=climbFeet;feetWorld[0].set(leadWorldX,leadWorldY,-face*legs[0].side*.108);feetWorld[1].set(trailWorldX,trailWorldY,-face*legs[1].side*.108);
    for(let i=0;i<legs.length;i++){
      const leg=legs[i],target=group.worldToLocal(feetWorld[i]);
      const roll=i===0?-.25*Math.sin(Math.PI*smooth(p,.27,.65)):.55*Math.sin(Math.PI*smooth(p,.20,.90));
      solveLeg(leg,target,roll,hipHeight,hipZ);
    }
    const handWeights=climbContacts.hands;
    for(let i=0;i<arms.length;i++){
      const arm=arms[i],anchor=climbAnchors[i].set(climb.edgeX,climb.topY+.015,-face*arm.side*.19);
      group.worldToLocal(anchor);
      const release=smooth(p,i===0?.58:.66,i===0?.66:.74);
      const rest=climbRest[i].set(arm.side*.227,hipHeight-.002,.07);
      // The gripping palm turns away only after it has unloaded its weight.
      const reach=smooth(p,0,.22);
      const target=handTargets[i].copy(rest).lerp(anchor,reach).lerp(rest,release);
      solveArm(arm,target,lerp(Math.PI/2,-.16,release));
      handWeights[i]=smooth(p,.17,.24)*(1-release);
    }
    const weight=smooth(p,0,.18)*(1-smooth(p,.92,1));
    if(weight<1)blendPose(1-weight);
    const plantedLead=smooth(p,.62,.67)*(1-smooth(p,.88,.94));
    const plantedTrail=smooth(p,.96,1);
    animation.mode='climb';animation.climbStage=p<.22?'reach-and-grip':p<.46?'pull-chest':p<.63?'knee-up':p<.74?'plant-and-press':p<.94?'step-over':'settle';
    animation.jumpStage='grounded';
    handWeights[0]*=weight;handWeights[1]*=weight;climbContacts.stances[0]=plantedLead>.5;climbContacts.stances[1]=plantedTrail>.5;climbContacts.weights[0]=plantedLead;climbContacts.weights[1]=plantedTrail;return climbContacts;
  }

  // Each contact is a world-space rung, rather than an orbit around the body.
  // Absolute height runs the same path backwards and stops it without easing a
  // supporting palm or shoe away from the steel.
  function sampleLadderRungs(ladder,rootY) {
    const base=ladder.rungBaseY,spacing=ladder.spacing,span=spacing*2;
    const coordinate=(rootY-base)/span;
    const maximum=Math.floor((ladder.topY-base-1e-5)/spacing);
    const face=ladder.face===-1?-1:1;
    for(let n=0;n<4;n++) {
      const hand=n>=2,i=n%2,offset=hand?(i===0?.5:0):(i===0?0:.5);
      const c=coordinate+offset,k=Math.floor(c),p=cycle(c),duty=hand?.65:.5;
      const index=2*k+(hand?4:1)-offset*2;
      const first=clamp(index,0,maximum),next=clamp(index+2,0,maximum);
      const u=clamp((p-duty)/(1-duty),0,1),reach=smooth(u);
      const target=hand?ladderHands[i]:ladderFeet[i];
      target.set(ladder.rungX-face*(hand?.055:.065)*Math.sin(Math.PI*u),base+lerp(first,next,reach)*spacing+.015,-face*(hand?arms[i].side*.19:legs[i].side*.108));
      const weight=smooth(p,0,.055)*(1-smooth(p,duty-.065,duty));
      if(hand)ladderContacts.hands[i]=weight;
      else{ladderContacts.weights[i]=weight;ladderContacts.stances[i]=p<duty;ladderRolls[i]=-.11*Math.sin(Math.PI*u);}
    }
  }

  const ladderPosture=[
    [0,.3914,.08335,-.025], [.18,.40,.50,-.015], [.36,.42,.55,-.015],
    [.50,.45,.48,0], [.62,.49,.34,.015], [.74,.54,.22,.015],
    [.88,.61,.08,.005], [1,.64,0,0]
  ];
  const ladderPostureSlopes=ladderPosture.map(()=>new Float64Array(4));
  const ladderPostureSample=new Float64Array(4);
  for(let k=1;k<ladderPosture.length-1;k++)for(let c=1;c<4;c++) {
    const h0=ladderPosture[k][0]-ladderPosture[k-1][0],h1=ladderPosture[k+1][0]-ladderPosture[k][0];
    const d0=(ladderPosture[k][c]-ladderPosture[k-1][c])/h0,d1=(ladderPosture[k+1][c]-ladderPosture[k][c])/h1;
    if(d0*d1>0){const w0=2*h1+h0,w1=h1+2*h0;ladderPostureSlopes[k][c]=(w0+w1)/(w0/d0+w1/d1);}
  }
  function sampleLadderPosture(p) {
    let k=ladderPosture.length-2;
    for(let n=1;n<ladderPosture.length;n++)if(p<=ladderPosture[n][0]){k=n-1;break;}
    const a=ladderPosture[k],b=ladderPosture[k+1],h=b[0]-a[0],u=(p-a[0])/h,u2=u*u,u3=u2*u;
    for(let c=1;c<4;c++)ladderPostureSample[c]=(2*u3-3*u2+1)*a[c]+(u3-2*u2+u)*h*ladderPostureSlopes[k][c]+(-2*u3+3*u2)*b[c]+(u3-u2)*h*ladderPostureSlopes[k+1][c];
    return ladderPostureSample;
  }

  function applyLadder(ladder) {
    capturePose();
    pose.position.set(0,0,0);pose.rotation.set(0,0,0);
    group.updateWorldMatrix(true,false);
    const phaseName=ladder.phase||'climb',progress=clamp(ladder.progress||0,0,1);
    const top=phaseName==='top-out'||phaseName==='top-in';
    const p=phaseName==='top-in'?1-progress:progress;
    const high=ladder.topY-.60;
    const rootY=top?high:group.position.y;
    const face=ladder.face===-1?-1:1;
    sampleLadderRungs(ladder,rootY);
    const coordinate=(rootY-ladder.rungBaseY)/(ladder.spacing*2);
    let tilt=.105+.025*Math.sin(coordinate*TAU);
    let hipZ=-.025;
    let hipHeight=Math.min(.61,Math.min(ladderHands[0].y,ladderHands[1].y)-rootY+.28-.405*Math.cos(tilt));
    hipHeight=Math.max(.32,hipHeight);
    let authoredWeight=1;
    if(top) {
      const posture=sampleLadderPosture(p);hipHeight=posture[1];tilt=posture[2];hipZ=posture[3];
      const exitX=phaseName==='top-in'&&Number.isFinite(ladder.startX)?ladder.startX:ladder.exitX;
      const wallX=Number.isFinite(ladder.wallX)?ladder.wallX:ladder.rungX+face*.18;
      for(let i=0;i<2;i++) {
        const target=ladderFeet[i],initialX=target.x,initialY=target.y,lead=i===0;
        const lift=smooth(p,lead?.02:.25,lead?.28:.60);
        target.y=lerp(initialY,ladder.topY+(lead?.12:.13),lift);
        target.x=lerp(initialX,lead?wallX+face*.13:exitX+face*.025,smooth(p,lead?.24:.57,lead?.44:.86));
        target.y=lerp(target.y,ladder.topY,smooth(p,lead?.39:.76,lead?.49:.91));
        const step=lead?smooth(p,.79,1):0;
        if(lead){target.x=lerp(target.x,exitX+face*.025,step);target.y+=.115*Math.sin(Math.PI*step);}
        // The loaded shoe stays flat; the heel only rolls while unloaded.
        ladderRolls[i]=lead?-.10*Math.sin(Math.PI*smooth(p,.02,.49))*(1-smooth(p,.42,.49)):.12*Math.sin(Math.PI*smooth(p,.25,.91))*(1-smooth(p,.82,.91));
        const planted=lead?smooth(p,.49,.52)*(1-smooth(p,.77,.81)):smooth(p,.91,.94);
        ladderContacts.weights[i]=planted;ladderContacts.stances[i]=planted>.5;
      }
      for(let i=0;i<2;i++) {
        const target=ladderHands[i],upper=i===0;
        const transfer=smooth(p,upper?.22:.02,upper?.44:.16);
        target.x=lerp(target.x,upper?ladder.rungX+face*.38:ladder.rungX-face*.024,transfer);
        target.y=lerp(target.y,ladder.topY+(upper?.825:.45),transfer);
        target.z=lerp(target.z,-face*arms[i].side*ladder.width*.5,transfer);
        const unload=upper?1-smooth(p,.19,.22):0;
        const regrip=smooth(p,upper?.44:.16,upper?.47:.20);
        const release=smooth(p,upper?.885:.52,upper?.915:.545);
        const initialWeight=ladderContacts.hands[i];
        ladderContacts.hands[i]=Math.max(initialWeight*unload,regrip)*(1-release);
      }
      if(phaseName==='top-in')authoredWeight=smooth(progress,0,.26);
      animation.ladderStage=p<.20?'grip-handrail':p<.44?'pull-and-knee-over':p<.60?'load-leading-foot':p<.80?'weight-transfer':p<.94?'bring-trailing-foot':'stand-and-balance';
    } else {
      if(phaseName==='mount')authoredWeight=smooth(progress,.18,.88);
      if(phaseName==='catch') {
        authoredWeight=smooth(progress,0,.88);
        const absorb=Math.sin(Math.PI*progress);
        hipHeight-=.025*absorb;tilt+=.12*absorb;
      }
      if(phaseName==='bottom-out')authoredWeight=1-smooth(progress,.08,.94);
      animation.ladderStage=phaseName==='catch'?(progress<.50?'catch-reach':progress<.82?'catch-grip':'catch-settle'):phaseName==='mount'?'mount':phaseName==='bottom-out'?'step-off':ladder.direction<0?'descend':ladder.direction>0?'ascend':'hold';
    }
    torso.position.set(.009*Math.sin(coordinate*TAU)*(top?1-smooth(p,0,.4):1),hipHeight,hipZ);
    torso.rotation.set(tilt,0,.012*Math.sin(coordinate*TAU)*(top?1-smooth(p,0,.4):1));
    torso.scale.set(1,1,1);
    head.position.set(0,.679,.026);head.rotation.set(-tilt*.58-.055,0,-torso.rotation.z*.6);
    bag.position.set(0,.263,-.195);bag.rotation.set(-.04-.027*Math.sin(coordinate*TAU),0,.018*Math.sin(coordinate*TAU));
    for(let i=0;i<2;i++) {
      const target=group.worldToLocal(ladderFeet[i]);
      solveLeg(legs[i],target,ladderRolls[i],hipHeight,hipZ);
    }
    for(let i=0;i<2;i++) {
      const target=group.worldToLocal(ladderHands[i]);
      const release=top?smooth(p,i===0?.89:.545,i===0?1:.65):0;
      if(release>0)target.lerp(handTargets[i].set(arms[i].side*.227,hipHeight-.002,.07),release);
      if(top) {
        const transfer=smooth(p,i===0?.22:.02,i===0?.44:.16);
        const railPitch=i===0?lerp(0,Math.PI/2,smooth(p,.47,.67)):0;
        solveSpatialArm(arms[i],target,lerp(lerp(Math.PI/2,railPitch,transfer),-.16,release));
      } else solveArm(arms[i],target,Math.PI/2);
    }
    if(top) {
      // Preserve the real roof foot anchors while the upper body relaxes into
      // the live idle pose, ready for the first walking step after release.
      const awake=smooth(p,.94,1);
      if(awake>0)for(let i=0;i<4;i++){const object=wakeObjects[i],base=awakePose[i];object.position.lerp(base.position,awake);object.quaternion.slerp(base.quaternion,awake);object.scale.lerp(base.scale,awake);}
    }
    if(authoredWeight<1)blendPose(1-authoredWeight);
    for(let i=0;i<2;i++) {
      ladderContacts.hands[i]*=authoredWeight*(phaseName==='catch'?smooth(progress,.62,.86):1);
      ladderContacts.weights[i]*=authoredWeight*(phaseName==='catch'?smooth(progress,.72,.96):1);
      ladderContacts.stances[i]=ladderContacts.stances[i]&&authoredWeight>.5;
    }
    animation.mode='ladder';animation.jumpStage='grounded';
    return ladderContacts;
  }

  // The short fall uses joint targets; recovery changes support from a side
  // palm to two forward palms, a knee and finally the feet. No root tilt is
  // used, so the head, pelvis, arms and legs can respond independently.
  const slipPoseKeys={
    slip:[
      [0,.64,0,0,0, 0,.025,0,.025, .65,.09,.65,.09,.04,0,0],
      [.45,.62,-.015,-.09,-.025, .02,.18,.015,.10, .85,-.03,.79,-.02,.10,0,0],
      [1,.58,-.025,-.20,-.035, .04,.42,.025,.15, .95,-.12,.88,-.12,.18,0,0]
    ],
    fall:[
      [0,.58,-.025,-.20,-.035, .04,.42,.025,.15, .95,-.12,.88,-.12,.18,0,0],
      [.35,.52,-.045,-.65,-.045, .08,.55,.12,.40, 1.0,-.38,.93,-.34,.24,0,0],
      [.68,.415,-.08,-1.26,-.025, .10,.50,.08,.32, .46,-.63,.48,-.55,.30,0,0],
      [1,.40,-.08,-1.40,0, .035,.44,.05,.34, .13,-.53,.15,-.50,.24,0,0]
    ],
    ragdoll:[
      [0,.40,-.08,-1.40,0, .035,.44,.05,.34, .13,-.53,.15,-.50,.24,0,0],
      [1,.40,-.08,-1.40,0, .035,.44,.05,.34, .13,-.53,.15,-.50,.24,0,0]
    ],
    recover:[
      [0,.40,-.08,-1.40,0, .035,.44,.05,.34, .13,-.53,.15,-.50,.24,0,0],
      [.09,.43,-.08,-1.32,.52, .08,.38,.15,.26, .014,-.42,.50,-.40,.22,0,0],
      [.15,.43,-.08,-1.32,.52, .08,.38,.15,.26, .014,-.42,.50,-.40,.22,0,0],
      [.22,.37,-.075,-.90,.36, .03,.40,.11,.22, .12,-.36,.62,-.10,.20,0,0],
      [.34,.35,-.06,.10,.08, .015,.28,.08,-.10, .30,.22,.40,.30,.13,0,0],
      [.46,.26,-.04,1.43,0, 0,.24,.10,.02, .014,.37,.014,.40,-.20,0,0],
      [.62,.34,-.025,1.27,0, 0,.24,.07,-.12, .014,.37,.014,.40,-.32,0,0],
      [.68,.34,-.025,1.27,0, 0,.24,.07,-.12, .014,.37,.014,.40,-.32,0,0],
      [.76,.48,.025,.65,0, 0,.20,.035,-.10, .42,.25,.40,.30,-.20,0,0],
      [.82,.56,.04,.35,0, 0,.12,.025,-.07, .55,.15,.55,.10,-.12,0,0],
      [1,.64,0,0,0, 0,.025,0,.025, .65,.09,.65,.09,.06,0,0]
    ],
    brush:[
      [0,.64,0,0,0, 0,.025,0,.025, .65,.09,.65,.09,.06,0,0],
      [1,.64,0,.025,0, 0,.025,0,.025, .65,.09,.65,.09,.04,0,0]
    ],
    look:[
      [0,.64,0,.025,0, 0,.025,0,.025, .65,.09,.65,.09,.04,0,0],
      [.34,.64,0,.025,0, 0,.025,0,.025, .65,.09,.65,.09,.025,-.48,-1.45],
      [1,.64,0,.025,0, 0,.025,0,.025, .65,.09,.65,.09,.025,-.48,-1.45]
    ],
    settle:[
      [0,.64,0,.025,0, 0,.025,0,.025, .65,.09,.65,.09,.025,-.48,-1.45],
      [1,.64,0,0,0, 0,.025,0,.025, .65,.09,.65,.09,.04,0,0]
    ]
  };
  // Contact targets keep their flat support intervals. Body channels share a
  // continuous-velocity curve across phase boundaries and only stop at real
  // extrema or authored weight-bearing holds.
  const slipBodyFields=[1,2,3,4,13,14,15];
  const slipDurations={slip:.38,fall:.62,ragdoll:.85,recover:1.8,brush:1.15,look:.9,settle:.4};
  const slipStarts={},slipBodyKeys=[];
  let slipClock=0;
  for(const name of Object.keys(slipPoseKeys)) {
    slipStarts[name]=slipClock;
    for(const row of slipPoseKeys[name]) {
      const key=[slipClock+row[0]*slipDurations[name],...slipBodyFields.map(field=>row[field])];
      if(slipBodyKeys.length&&Math.abs(slipBodyKeys.at(-1)[0]-key[0])<1e-9)slipBodyKeys[slipBodyKeys.length-1]=key;
      else slipBodyKeys.push(key);
    }
    slipClock+=slipDurations[name];
  }
  const slipBodySlopes=slipBodyKeys.map(()=>new Float64Array(slipBodyFields.length+1));
  for(let k=1;k<slipBodyKeys.length-1;k++)for(let c=1;c<=slipBodyFields.length;c++) {
    const h0=slipBodyKeys[k][0]-slipBodyKeys[k-1][0],h1=slipBodyKeys[k+1][0]-slipBodyKeys[k][0];
    const d0=(slipBodyKeys[k][c]-slipBodyKeys[k-1][c])/h0,d1=(slipBodyKeys[k+1][c]-slipBodyKeys[k][c])/h1;
    if(d0*d1>0){const w0=2*h1+h0,w1=h1+2*h0;slipBodySlopes[k][c]=(w0+w1)/(w0/d0+w1/d1);}
  }
  function sampleSlipBody(seconds) {
    seconds=clamp(seconds,0,slipClock);let k=slipBodyKeys.length-2;
    for(let n=1;n<slipBodyKeys.length;n++)if(seconds<=slipBodyKeys[n][0]){k=n-1;break;}
    const a=slipBodyKeys[k],b=slipBodyKeys[k+1],h=b[0]-a[0],u=(seconds-a[0])/h,u2=u*u,u3=u2*u;
    for(let c=1;c<=slipBodyFields.length;c++)slipChannels[slipBodyFields[c-1]]=(2*u3-3*u2+1)*a[c]+(u3-2*u2+u)*h*slipBodySlopes[k][c]+(-2*u3+3*u2)*b[c]+(u3-u2)*h*slipBodySlopes[k+1][c];
  }
  const recoil=(w,name)=>w&&Number.isFinite(w[name])?w[name]:0;
  function sampleSlipPose(keys,p,seconds) {
    let a=keys[0],b=keys[keys.length-1];
    for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){a=keys[i-1];b=keys[i];break;}
    const u=smooth(p,a[0],b[0]);
    for(let i=1;i<16;i++)slipChannels[i]=lerp(a[i],b[i],u);
    sampleSlipBody(seconds);
    return slipChannels;
  }
  function solveSpatialArm(arm,target,palmPitch) {
    // Three-dimensional arm IK allows a real supporting palm during the side
    // roll, and an opposite hand to cross the chest while brushing the jacket.
    arm.shoulder.position.set(arm.side*.227,.405,0);
    slipInverse.copy(torso.quaternion).invert();
    slipDesired.setFromEuler(slipEuler.set(palmPitch,0,0)).premultiply(slipInverse);
    slipTarget.copy(target).sub(torso.position).applyQuaternion(slipInverse);
    slipFore.copy(slipOffset).applyQuaternion(slipDesired);slipTarget.sub(slipFore);
    slipDirection.copy(slipTarget).sub(arm.shoulder.position);
    const distance=clamp(slipDirection.length(),.025,.4115);slipDirection.normalize();
    const a=(.192*.192-.22*.22+distance*distance)/(2*distance),h=Math.sqrt(Math.max(0,.192*.192-a*a));
    slipBend.set(0,0,-1).applyQuaternion(slipInverse);slipBend.addScaledVector(slipDirection,-slipBend.dot(slipDirection));
    if(slipBend.lengthSq()<.00001)slipBend.set(1,0,0).addScaledVector(slipDirection,-slipDirection.x);
    slipBend.normalize();
    slipElbow.copy(arm.shoulder.position).addScaledVector(slipDirection,a).addScaledVector(slipBend,h);
    slipUpper.copy(slipElbow).sub(arm.shoulder.position).normalize();
    slipFore.copy(arm.shoulder.position).addScaledVector(slipDirection,distance).sub(slipElbow).normalize();
    slipUpperQ.setFromUnitVectors(slipDown,slipUpper);slipForeQ.setFromUnitVectors(slipDown,slipFore);
    arm.shoulder.quaternion.copy(slipUpperQ);
    arm.elbow.quaternion.copy(slipUpperQ).invert().multiply(slipForeQ);
    arm.wrist.quaternion.copy(slipForeQ).invert().multiply(slipDesired);
  }
  function applyInteraction(weight) {
    interactionHands.fill(0);
    if(!lastInteraction||weight<.0001)return interactionHands;
    group.updateWorldMatrix(true,true);
    for(let i=0;i<arms.length;i++) {
      const arm=arms[i],joints=[arm.shoulder,arm.elbow,arm.wrist],rest=interactionRest[i];
      joints.forEach((joint,j)=>{rest[j].position.copy(joint.position);rest[j].quaternion.copy(joint.quaternion);});
      // The contact belongs to the moving bin, rather than to the child's
      // swaying chest. The two palms keep their near/far sides when mirrored.
      interactionTarget.set(lastInteraction.objectX+lastInteraction.side*.965,(lastInteraction.topY??1.05)-.23,arm.side*.16*lastInteraction.side);
      group.worldToLocal(interactionTarget);
      solveSpatialArm(arm,interactionTarget,0);
      joints.forEach((joint,j)=>{joint.position.lerp(rest[j].position,1-weight);rest[j].solved.copy(joint.quaternion);joint.quaternion.slerpQuaternions(rest[j].quaternion,rest[j].solved,weight);});
      group.updateWorldMatrix(true,true);arm.palm.getWorldPosition(interactionActual);group.worldToLocal(interactionActual);
      interactionHands[i]=weight*(1-smooth(interactionActual.distanceTo(interactionTarget),.008,.035));
    }
    interactionWasApplied=true;
    return interactionHands;
  }
  function applySlip(slip) {
    capturePose();pose.position.set(0,0,0);pose.rotation.set(0,0,0);
    const stage=slip.phase||'slip',p=clamp(slip.progress||0,0,1),v=sampleSlipPose(slipPoseKeys[stage]||slipPoseKeys.slip,p,(slipStarts[stage]||0)+p*(slipDurations[stage]||.38));
    const loose=stage==='fall'||stage==='ragdoll',w=loose?slip.wobble:null;
    const hipWobble=recoil(w,'hips'),chestWobble=recoil(w,'torso');
    const hipY=v[1]+Math.abs(hipWobble)*.06+(loose?(slip.impact||0)*.018:0),hipZ=v[2]+hipWobble*.035;
    torso.position.set(0,hipY,hipZ);torso.scale.set(1,1,1);
    // Applying the side roll after the sagittal lean lowers the supporting
    // shoulder, rather than rolling around an upright chest's vertical axis.
    torso.quaternion.setFromEuler(slipEuler.set(v[3]+chestWobble*.65,v[14],0));
    slipUpperQ.setFromEuler(slipEuler.set(0,0,v[4]+hipWobble*.45));torso.quaternion.premultiply(slipUpperQ);
    head.position.set(0,.679,.026);head.rotation.set(v[13]+recoil(w,'head')*.9,v[15],-hipWobble*.25);
    bag.position.set(0,.263,-.195);bag.rotation.set(-chestWobble*.35,0,-hipWobble*.25);
    slipContacts.hands[0]=slipContacts.hands[1]=0;
    for(let i=0;i<2;i++) {
      const legWobble=recoil(w,i===0?'leftLeg':'rightLeg');
      const target=legTargets[i].set(legs[i].side*.108,v[5+i*2]+Math.abs(legWobble)*.20,v[6+i*2]+legWobble*.18);
      const recoverRoll=stage==='recover'&&i===1?lerp(.18,.35,smooth(p,.24,.46))*(1-smooth(p,.68,.88)):0;
      solveLeg(legs[i],target,recoverRoll+legWobble*.45,hipY,hipZ);
      slipContacts.weights[i]=stage==='brush'||stage==='look'||stage==='settle'?1:stage==='recover'?smooth(p,i===0?.39:.84,i===0?.46:.98):stage==='slip'?1-smooth(p,0,.35):0;
      slipContacts.stances[i]=slipContacts.weights[i]>.5;
    }
    for(let i=0;i<2;i++) {
      const armWobble=recoil(w,i===0?'leftArm':'rightArm');
      const target=handTargets[i].set(arms[i].side*.255,v[9+i*2]+armWobble*.20,v[10+i*2]+armWobble*.14);
      let pitch=stage==='brush'||stage==='look'||stage==='settle'?0:Math.PI/2;
      if(stage==='recover') {
        const early=i===0?smooth(p,.04,.09)*(1-smooth(p,.135,.15)):0;
        const planted=smooth(p,.40,.46)*(1-smooth(p,i===0?.62:.64,i===0?.68:.70));
        slipContacts.hands[i]=Math.max(early,planted);
        pitch=lerp(Math.PI/2,0,smooth(p,.70,.90));
      }
      if(stage==='brush') {
        const left=i===0,weight=left?smooth(p,0,.10)*(1-smooth(p,.36,.48)):smooth(p,.36,.46)*(1-smooth(p,.82,.98));
        const stroke=left?smooth(p,.10,.34):smooth(p,.46,.78);
        target.x=lerp(target.x,left?lerp(.10,-.13,stroke):lerp(-.10,.13,stroke),weight);
        target.y=lerp(target.y,lerp(1.01,.81,stroke),weight);
        target.z=lerp(target.z,.19+.02*Math.sin(stroke*Math.PI),weight);
      }
      solveSpatialArm(arms[i],target,pitch);
    }
    let weight=stage==='slip'?smooth(p,0,.25):stage==='settle'?1-smooth(p,0,1):1;
    if(weight<1)blendPose(1-weight);
    for(let i=0;i<2;i++){slipContacts.hands[i]*=weight;slipContacts.weights[i]*=weight;}
    animation.mode='slip';animation.slipStage=stage;animation.jumpStage='grounded';
    return slipContacts;
  }

  function applySlide(slide) {
    // The low pose is separate from walking: one leg reaches along the wet
    // ground while the other tucks beneath the child and a palm balances him.
    // Blend from the actual running joints, then into the live crouch/standing
    // pose so a beam can retain the low posture through the recovery.
    capturePose();group.updateWorldMatrix(true,true);
    for(let i=0;i<2;i++){legs[i].sole.getWorldPosition(slideBaseFeet[i]);group.worldToLocal(slideBaseFeet[i]);}
    pose.position.set(0,0,0);pose.rotation.set(0,0,0);
    const stage=slide.phase,p=clamp(slide.progress??0,0,1),low=clamp(slide.lowAmount??1,0,1);
    const glide=stage==='glide'?smooth(p):stage==='recover'?1:0;
    const pulse=Math.sin((slide.elapsed??0)*8)*.005;
    const hipY=.270+pulse,hipZ=-.120;
    torso.position.set(0,hipY,hipZ);torso.rotation.set(1.08+pulse*.6,0,0);torso.scale.set(1,1,1);
    head.position.set(0,.615,.026);head.rotation.set(-.48+pulse*1.8,0,0);
    bag.position.set(0,.263,-.195);bag.rotation.set(-.035+pulse*1.2,0,0);
    const front=(slide.face??1)>0?0:1;
    for(let i=0;i<2;i++) {
      const leading=i===front;
      const target=legTargets[i].set(legs[i].side*.108,leading?.016:.040,leading?lerp(.42,.46,glide):-.130);
      slideLowFeet[i].copy(target);
      solveLeg(legs[i],target,leading?.035:.12,hipY,hipZ);
      const palm=handTargets[i].set(arms[i].side*.255,leading?.016:.48,leading?.280:.51);
      solveSpatialArm(arms[i],palm,leading?Math.PI/2:0);
      slideContacts.hands[i]=leading?.65:0;
      slideContacts.stances[i]=false;slideContacts.weights[i]=0;
    }
    let weight=low;
    if(stage==='drop') {
      for(let i=0;i<wakeObjects.length;i++) {
        const object=wakeObjects[i],base=slideEntry[i];
        object.position.lerp(base.position,1-weight);object.quaternion.slerp(base.quaternion,1-weight);object.scale.lerp(base.scale,1-weight);
      }
    } else {
      if(stage==='recover')weight*=1-smooth(p);
      if(weight<1)blendPose(1-weight);
    }
    for(let i=0;i<2;i++){
      // Interpolating bent joint angles can sweep a shoe through the floor.
      // Blend the sole targets, then solve both legs at the blended hip height.
      const target=legTargets[i].copy(stage==='drop'?slideEntryFeet[i]:slideBaseFeet[i]).lerp(slideLowFeet[i],weight);
      target.y=Math.max(.004,target.y);
      solveLeg(legs[i],target,0,torso.position.y,torso.position.z);
      slideContacts.hands[i]*=weight;
      if(stage==='recover'&&weight<.25){slideContacts.stances[i]=true;slideContacts.weights[i]=1-weight;}
    }
    animation.mode='slide';animation.slideStage=stage;animation.jumpStage='grounded';
    return slideContacts;
  }

  /**
   * Distance advances a gait; time only drives breathing and secondary motion.
   * Both legs use a planted stance and an airborne Hermite recovery arc. The
   * foot's world anchor survives changing speeds, which avoids skating while
   * accelerating or settling into a stop.
   */
  function animate({time=0,speed=0,grounded=true,wake=1,push=false,interaction=null,crouch=0,slide=null,vy=0,dt,travel,acceleration=0,landImpact=0,jumpPrep=0,airTime,takeoff,climb=null,ladder=null,slip=null,stairs=null,launchSpeed,landingDistance}={}) {
    const sliding=slide&&['drop','glide','recover'].includes(slide.phase)&&grounded&&wake>=1&&!climb&&!ladder&&!slip&&!stairs;
    if(climb||ladder||slip||sliding){grounded=true;speed=0;travel=0;jumpPrep=0;airTime=0;takeoff=0;}
    const delta=clamp(Number.isFinite(dt)?dt:(initialized?time-previousTime:1/60),0,.1);
    previousTime=time;
    stepResult.footstep=false;stepResult.intensity=0;
    if(initialized&&delta===0)return stepResult;
    initialized=true;
    if(sliding&&!slideWasActive)captureSlideEntry();
    if(!sliding&&slideWasActive)for(const foot of footState){foot.hasAnchor=false;foot.wasStance=false;foot.landingPlant=false;}
    slideWasActive=!!sliding;
    const gripping=interaction&&['push','pull','hold'].includes(interaction.kind)&&Number.isFinite(interaction.objectX)&&(interaction.side===-1||interaction.side===1)&&grounded&&wake>=1&&!climb&&!ladder&&!slip;
    if(gripping)lastInteraction={...interaction};
    interactionWeight=damp(interactionWeight,gripping?1:0,14,delta);
    pullWeight=damp(pullWeight,gripping&&interaction.kind==='pull'?1:0,11,delta);
    const manipulation=grounded&&wake>=1&&!climb&&!ladder&&!slip?interactionWeight:0;
    // The controller interpolates this channel together with the root. A
    // second smoothing filter here would leave the visible head above a low
    // opening after the collision capsule had already ducked underneath it.
    const duck=grounded&&wake>=1&&!climb&&!ladder&&!slip&&!stairs&&!push&&manipulation<.001?smooth(clamp(Number.isFinite(crouch)?crouch:0,0,1)):0;
    const gaitSign=1-2*pullWeight;
    const stairSupport=!!stairs&&grounded&&!climb&&!ladder&&!slip;
    const stairPoseDirection=stairs?.ascending?(stairs.flight%2===0?1:-1):stairs?stairDirection(stairs.flight):1;
    const stairStart=stairPoseDirection<0?STAIRWELL.right:STAIRWELL.left;
    // Prepare the knees while approaching the first nosing, leaving enough
    // reach for the lower shoe before it takes weight. This avoids a sudden
    // pelvis correction at touchdown on a sixteen-centimetre step.
    const approachStair=stairSupport&&stairs.flight<(stairs.totalFlights??STAIRWELL.flights)&&Math.abs(group.position.x-stairStart)<.65&&Math.abs(speed)>.05;
    stairWeight=damp(stairWeight,stairSupport&&(stairs.onStairs||approachStair)?1:0,9,delta);
    const supportHeight=x=>{
      const floor=stairs?.flight??STAIRWELL.flights;
      if(stairs?.ascending){
        if(floor>=stairs.totalFlights)return stairs.totalFlights*STAIRWELL.rise;
        const direction=floor%2===0?1:-1,start=direction>0?STAIRWELL.left:STAIRWELL.right;
        const progress=(x-start)*direction/(STAIRWELL.right-STAIRWELL.left);
        if(progress<=0)return floor*STAIRWELL.rise;
        if(progress>=1)return (floor+1)*STAIRWELL.rise;
        return (floor+(Math.floor(progress*STAIRWELL.steps)+1)/STAIRWELL.steps)*STAIRWELL.rise;
      }
      if(!stairSupport||floor>=STAIRWELL.flights)return stairSupport?0:group.position.y;
      const direction=stairDirection(floor),start=direction<0?STAIRWELL.right:STAIRWELL.left;
      const progress=(x-start)*direction/(STAIRWELL.right-STAIRWELL.left);
      if(progress<=0||progress>=1)return stairHeight(floor,x);
      // The body follows a continuous support ramp; a shoe lands on a real,
      // horizontal concrete tread rather than on that invisible ramp.
      return (STAIRWELL.flights-floor)*STAIRWELL.rise-(Math.floor(progress*STAIRWELL.steps)+1)*STAIRWELL.rise/STAIRWELL.steps;
    };
    // Rung contacts belong to the ladder; the first floor step acquires a new
    // ground anchor at the exit instead of reusing one from the entry roof.
    if((!ladder&&animation.mode==='ladder')||(!slip&&animation.mode==='slip'))for(const foot of footState){foot.hasAnchor=false;foot.wasStance=false;foot.landingPlant=false;}
    const speedAbs=Math.abs(speed),wakeProgress=clamp(wake,0,1),stand=1;
    const justLanded=!previousGrounded&&grounded;
    const beginsWalk=grounded&&speedAbs>.025&&!locomotionActive;
    locomotionActive=grounded&&speedAbs>.025;
    if(!grounded&&previousGrounded){
      internalAirTime=0;launchCrouch=previousPrep;
      launchLead=footState[0].target.z>=footState[1].target.z?0:1;
      takeoffSpeed=Math.abs(Number.isFinite(launchSpeed)?launchSpeed:speed);takeoffRun=smooth(takeoffSpeed,2.15,3.35);
      landingAge=Infinity;
    }
    if(grounded){internalAirTime=0;previousPrep=jumpPrep;}else internalAirTime+=delta;
    const flightTime=Number.isFinite(airTime)?airTime:internalAirTime;
    const launchProgress=Number.isFinite(takeoff)?takeoff:clamp(flightTime/.12,0,1);
    const tuck=smooth(flightTime,.075,.29)*(1-smooth(-vy,1.0,4.8));
    const burst=grounded?0:Math.sin(Math.PI*clamp(flightTime/.18,0,1));
    const flightDuration=2*MOVEMENT.jumpVelocity/MOVEMENT.gravity;
    const velocityProgress=(MOVEMENT.jumpVelocity-vy)/(2*MOVEMENT.jumpVelocity);
    const flightProgress=clamp(.65*flightTime/flightDuration+.35*velocityProgress,0,1);
    const flight=sampleChannels(flightKeys,flightProgress);
    const squat=(grounded?smooth(jumpPrep):launchCrouch*(1-smooth(launchProgress,0,.6)))*lerp(1,.64,grounded?smooth(speedAbs,2.15,3.35):takeoffRun);
    let reachTarget=grounded?0:smooth(-vy,.5,4.6)*smooth(flightProgress,.57,.90);
    if(!grounded&&Number.isFinite(landingDistance))reachTarget=Math.max(reachTarget,(1-smooth(Math.max(0,landingDistance),.06,.65))*smooth(-vy,.2,2));
    landingReach=damp(landingReach,reachTarget,grounded?9:15,delta);
    if(justLanded){landingAge=0;landingFoot=Math.abs(footState[0].target.y-footState[1].target.y)>.035?(footState[0].target.y<footState[1].target.y?0:1):(footState[0].target.z>=footState[1].target.z?0:1);}
    else if(grounded&&Number.isFinite(landingAge))landingAge+=delta;
    const runTarget=smooth(speedAbs,2.2,3.35);
    moving=damp(moving,smooth(speedAbs,.035,.65),10,delta);
    running=damp(running,runTarget,7,delta);
    pushing=damp(pushing,push?1:0,9,delta);
    air=damp(air,grounded?0:1,grounded?15:11,delta);
    if(landImpact>0&&previousGrounded===false)landingVelocity+=clamp(landImpact,0,1.7)*1.65;
    // Exact critically damped spring: consistent compression at any frame rate.
    const landingFrequency=12,decay=Math.exp(-landingFrequency*delta);
    const transient=landingVelocity+landingFrequency*landing;
    landing=(landing+transient*delta)*decay;
    landingVelocity=(landingVelocity-landingFrequency*transient*delta)*decay;
    if(justLanded)for(const f of footState){f.hasAnchor=false;f.wasStance=false;f.landingPlant=false;}
    previousGrounded=grounded;

    // The short walking stride has double support; sprinting has short contact
    // and a recovery flight. Feet retract before touch-down rather than tracing
    // a circular clockwork motion.
    const stride=lerp(lerp(lerp(lerp(.66+Math.min(speedAbs,2.2)*.235,1.82,runTarget),2*(STAIRWELL.right-STAIRWELL.left)/STAIRWELL.steps,stairWeight),.72,manipulation),.50,duck);
    const duty=lerp(lerp(lerp(lerp(.57,.36,runTarget),.64,stairWeight),.67,manipulation),.72,duck);
    const actualTravel=Number.isFinite(travel)?Math.max(0,travel):speedAbs*delta;
    if(beginsWalk&&!justLanded) {
      // A resting shoe begins under the pelvis, already halfway through its
      // supporting stride. Starting at heel strike would demand a long slide
      // or an overextended leg before the other foot can step forward.
      const support=cycle(phase)<.5?0:1;
      phase=cycle(duty*.5-support*.5);
      for(let i=0;i<legs.length;i++) {
        const foot=footState[i],actual=animation.feet[i].position;
        foot.anchor.set(actual.x,supportHeight(actual.x),actual.z);
        foot.hasAnchor=true;foot.wasStance=cycle(phase+i*.5)<duty;
      }
    }
    if(justLanded&&speedAbs>.15){const footPhase=clamp((.025+stride*duty*.5-footState[landingFoot].target.z)/stride,.055,duty-.085);phase=cycle(footPhase-landingFoot*.5);}
    if(grounded&&wakeProgress>.98&&speedAbs>.025)phase=cycle(phase+actualTravel/Math.max(.5,stride));
    const angle=phase*TAU,breathe=Math.sin(time*1.85),bodyMotion=moving*(1-air);
    const gaitHeight=lerp(.595,.607,running)-lerp(.017,.035,running)*Math.cos(angle*2);
    let hipHeight=lerp(.64+.0015*breathe,gaitHeight,bodyMotion)-landing-.095*squat+air*flight[1]+(stairs?.ascending?.015:-.105)*stairWeight-.025*manipulation;
    hipHeight=lerp(hipHeight,.34-.006*Math.cos(angle*2)*bodyMotion,duck);
    const hipZ=-.13*duck;
    pose.rotation.x=(1-stand)*Math.PI*.5;
    pose.position.y=(1-stand)*.205;
    const accelerationLean=clamp(acceleration,-10,10)*.0065;
    const effortLean=lastInteraction?.kind==='pull'?-.16:lastInteraction?.kind==='push'?.23:.035;
    lean=damp(lean,lerp(lerp(.065,.225,running)*moving+accelerationLean+pushing*.19,effortLean,manipulation),9,delta);
    torso.position.set(Math.sin(angle)*.013*bodyMotion,hipHeight,hipZ);
    torso.rotation.x=lerp(lean+.17*squat+landing*.7+.055*stairWeight,flight[2]+.025*takeoffRun,air);
    torso.rotation.x=lerp(torso.rotation.x,.95+.012*Math.sin(angle*2)*bodyMotion,duck);
    torso.rotation.y=Math.cos(angle)*lerp(.045,.07,running)*moving*(1-pushing)*(1-manipulation*.75);
    torso.rotation.z=Math.sin(angle)*.019*bodyMotion*(1-manipulation*.6)+air*Math.sin(flightProgress*TAU)*.012;
    torso.scale.set(1,1+.003*breathe*(1-moving),1+.008*breathe*(1-moving));
    // The upper body responds after the pelvis: less head bounce, no rigid bag.
    headLean=damp(headLean,-torso.rotation.x*.76+landing*.18,7.5,delta);
    head.rotation.set(.025+headLean+(1-stand)*.12,Math.sin(time*.42)*.018*(1-moving),-torso.rotation.z*.6);
    head.position.y=.679-(hipHeight-.64)*.42-.003*Math.cos(angle*2)*moving;
    head.position.y=lerp(head.position.y,.635,duck);
    head.rotation.x=lerp(head.rotation.x,-.55,duck);
    const bagTarget=-lean*.32+Math.sin(angle*2-.7)*.055*moving+landing*1.1+air*Math.sin(flightProgress*TAU-.4)*.035;
    const bagFrequency=10,bagDecay=Math.exp(-bagFrequency*delta),bagError=bagLean-bagTarget,bagTransient=bagVelocity+bagFrequency*bagError;
    bagLean=bagTarget+(bagError+bagTransient*delta)*bagDecay;bagVelocity=(bagVelocity-bagFrequency*bagTransient*delta)*bagDecay;
    bag.rotation.set(bagLean,Math.sin(angle-.6)*.025*moving,Math.sin(angle-.5)*.026*moving);
    bag.position.y=.263+Math.sin(angle*2-.8)*.009*moving+landing*.42;

    group.updateWorldMatrix(true,false);
    let footstep=false,contactIntensity=0;
    const stances=stanceScratch,weights=weightScratch,forward=forwardScratch;
    for(let i=0;i<legs.length;i++) {
      const leg=legs[i],f=footState[i],p=cycle(phase+i*.5);
      const isStance=p<duty;
      const span=stride*duty,front=.025+span*.5,rear=.025-span*.5;
      let z,y=0,supportY=0,roll=0,weight=0;
      if(isStance) {
        z=(front-p*stride)*gaitSign;
        weight=smooth(p,0,stairSupport ? .13 : .07)*(1-smooth(p,duty-.085,duty));
        // Flat support through most of stance; heel acceptance and toe-off only
        // occupy the ends, with enough lift to keep the full shoe above concrete.
        roll=(-.19*(1-smooth(p,0,.095))+.43*smooth(p,duty-.10,duty))*gaitSign;
        y=.12*Math.abs(Math.sin(roll));
        if(!f.hasAnchor||!f.wasStance||stand<.98) {
          if(locomotionActive&&moving<.985) {
            const actual=animation.feet[i].position;f.anchor.set(actual.x,supportHeight(actual.x),actual.z);
          } else {
            temporary.set(leg.side*.108,0,z);group.localToWorld(temporary);
            if(stairSupport) {
              // On a descent the next tread can be lower than a short child's
              // relaxed leg can reach. Shorten that first contact naturally.
              for(let attempt=0;attempt<7;attempt++) {
                const y=supportHeight(temporary.x)-group.position.y;
                if(Math.hypot(y+.06-hipHeight,z)<THIGH+SHIN-.012)break;
                z*=.76;temporary.set(leg.side*.108,0,z);group.localToWorld(temporary);
              }
              temporary.y=supportHeight(temporary.x);
            }
            f.anchor.copy(temporary);
          }
          f.hasAnchor=true;
          if(f.wasStance===false&&moving>.6&&grounded&&stand>.99&&air<.35){footstep=true;contactIntensity=Math.max(contactIntensity,lerp(.45,1,running));}
        }
        temporary.copy(f.anchor);group.worldToLocal(temporary);
        z=temporary.z;
        if(stairSupport)supportY=temporary.y;
      }else{
        f.hasAnchor=false;
        const u=(p-duty)/(1-duty),u2=u*u,u3=u2*u;
        const tangent=-stride*(1-duty);
        z=((2*u3-3*u2+1)*rear+(u3-2*u2+u)*tangent+(-2*u3+3*u2)*front+(u3-u2)*tangent)*gaitSign;
        const lift=Math.sin(Math.PI*u)**2;
        y=lerp(.14,.34,running)*lift*(1+.35*Math.cos(Math.PI*u));
        roll=(lerp(.43,-.19,smooth(u))+.12*Math.sin(Math.PI*u))*gaitSign;
        if(stairSupport) {
          temporary.set(leg.side*.108,0,z);group.localToWorld(temporary);
          // A smooth swing baseline clears the risers without inheriting
          // discontinuous changes from the next concrete tread.
          if(stairs.ascending){
            // Lift before the toe reaches the next riser, rather than letting
            // a continuous ramp guide the shin through its vertical face.
            supportY=supportHeight(temporary.x+stairPoseDirection*.18)-group.position.y+.015;
          }else supportY=stairHeight(stairs.flight,temporary.x)-group.position.y-.025;
          y+=.06*lift*stairWeight;
        }
      }
      f.wasStance=isStance;
      // Feet settle to a relaxed parallel stance when the actual root stops.
      if(!isStance||!locomotionActive)z=lerp(.025,z,moving);
      y*=moving*lerp(1,.40,duck);roll*=moving*lerp(1,.35,duck);
      if(stairSupport) {
        if(!locomotionActive) {
          temporary.set(leg.side*.108,0,z);group.localToWorld(temporary);
          supportY=supportHeight(temporary.x)-group.position.y;
        }
        y+=supportY;
      }
      const role=i===launchLead?0:1;
      let airFront=flight[3+role*3]*lerp(.88,1.14,takeoffRun);
      let airHeight=flight[4+role*3]*lerp(.94,1.06,takeoffRun);
      airFront=lerp(airFront,role===0?.15+.07*takeoffRun:-.10,landingReach*.70);airHeight*=1-landingReach*.55;
      if(!grounded||!isStance)f.landingPlant=false;
      // Acquire the rendered shoe's last world contact, not a distant ideal
      // stride target. This avoids a visible catch-up slide after touchdown.
      if(grounded&&isStance&&landingAge<.65&&!f.landingPlant&&f.target.y<.025){
        const actual=animation.feet[i].position;f.anchor.set(actual.x,supportHeight(actual.x),actual.z);
        temporary.copy(f.anchor);group.worldToLocal(temporary);z=temporary.z;f.hasAnchor=true;f.landingPlant=true;
      }
      const contactBlend=grounded&&f.landingPlant?0:air;
      z=lerp(z,airFront,contactBlend);y=lerp(y,airHeight,contactBlend);
      roll=lerp(roll,lerp(flight[5+role*3],role===0?-.16:-.08,landingReach),contactBlend);
      if(stand<.99){z=lerp(.025,z,stand);y*=stand;roll*=stand;}
      const target=legTargets[i].set(leg.side*.108,y,z);
      // Smooth state transitions, not the planted ground constraint. Once fully
      // supporting the body the IK uses the anchor directly, with zero lag.
      const landingContact=grounded&&f.landingPlant;
      const planted=isStance&&(!stairSupport||p>.13)&&grounded&&(moving>.985||locomotionActive)&&(air<.015||landingContact)&&stand>.999;
      const reachDistance=f.target.distanceTo(target),acceptanceTravel=4*delta;
      if(stairSupport&&reachDistance>acceptanceTravel) {
        temporary.copy(target).sub(f.target);f.target.addScaledVector(temporary,acceptanceTravel/reachDistance);
      }else if(planted)f.target.copy(target);else f.target.lerp(target,1-Math.exp(-25*delta));
      f.roll=damp(f.roll,roll,22,delta);
      solveLeg(leg,f.target,f.roll,hipHeight,hipZ);
      stances[i]=grounded&&(moving<.05||isStance);
      weights[i]=grounded?lerp(1,weight,moving)*(landingContact?1:1-air)*stand*(stairSupport?1-smooth(f.target.distanceTo(target),.005,.035):1):0;
      forward[i]=clamp((z-.025)/Math.max(.2,span*.5),-1,1);
    }
    if(stairSupport) {
      // Lower the pelvis just enough for the loaded leg to reach its tread;
      // knee flexion carries the descent rather than stretching the skeleton.
      for(let i=0;i<legs.length;i++) {
        // An ascending swing leg must clear the next riser. Only a genuinely
        // loaded shoe may lower the pelvis; a reaching shoe cannot drag it down.
        if(stairs.ascending&&weights[i]<.98)continue;
        const f=footState[i],ankleY=f.target.y+.06*Math.cos(f.roll)+.026*Math.sin(f.roll);
        const ankleZ=f.target.z+.06*Math.sin(f.roll)-.026*Math.cos(f.roll);
        const reach=THIGH+SHIN-.003;
        hipHeight=Math.min(hipHeight,ankleY+Math.sqrt(Math.max(.01,reach*reach-ankleZ*ankleZ)));
      }
      torso.position.y=hipHeight;
      head.position.y=.679-(hipHeight-.64)*.42-.003*Math.cos(angle*2)*moving;
      for(let i=0;i<legs.length;i++)solveLeg(legs[i],footState[i].target,footState[i].roll,hipHeight);
    }
    // Advance the underlying free arm pose independently. Feeding last frame's
    // IK pose back into it would make grip acquisition snap and release stick.
    if(interactionWasApplied) {
      arms.forEach((arm,i)=>[arm.shoulder,arm.elbow,arm.wrist].forEach((joint,j)=>{
        joint.position.copy(interactionRest[i][j].position);joint.quaternion.copy(interactionRest[i][j].quaternion);
      }));
      interactionWasApplied=false;
    }
    for(let i=0;i<arms.length;i++) {
      const arm=arms[i];
      const swing=forward[i]*lerp(.44,.84,running)*moving;
      const shoulderTarget=lerp(lerp(swing,-1.04,pushing)+.72*squat-.10*stairWeight,-.72+forward[i]*.055*moving,duck);
      const elbowTarget=lerp(lerp(lerp(-.23,-1.14,running)-Math.max(0,-forward[i])*.12*moving,-.31,pushing)-.08*stairWeight,-.84,duck);
      const armRole=i===launchLead?0:1;
      const jumpArm=flight[9+armRole*2]-.09*takeoffRun;
      arm.shoulder.position.x=damp(arm.shoulder.position.x,arm.side*.227,14,delta);
      arm.shoulder.rotation.x=damp(arm.shoulder.rotation.x,lerp(shoulderTarget,jumpArm,air),15,delta);
      arm.shoulder.rotation.z=damp(arm.shoulder.rotation.z,-arm.side*(lerp(.055,.023,running)+air*flight[13]+.075*stairWeight),12,delta);
      arm.elbow.rotation.x=damp(arm.elbow.rotation.x,lerp(elbowTarget,flight[10+armRole*2]-.12*takeoffRun,air),12,delta);
      arm.wrist.rotation.x=damp(arm.wrist.rotation.x,air*(-.10+.12*tuck),12,delta);
      arm.shoulder.rotation.y=damp(arm.shoulder.rotation.y,0,14,delta);
      arm.elbow.rotation.y=damp(arm.elbow.rotation.y,0,14,delta);arm.elbow.rotation.z=damp(arm.elbow.rotation.z,0,14,delta);
      arm.wrist.rotation.y=damp(arm.wrist.rotation.y,0,14,delta);arm.wrist.rotation.z=damp(arm.wrist.rotation.z,0,14,delta);
    }
    animation.mode=wakeProgress<1?'wake':!grounded?'air':pushing>.5?'push':moving<.05?'idle':stairWeight>.5?'stairs':running>.5?'run':'walk';
    if(duck>.5)animation.mode=moving<.05?'crouch':'crouch-walk';
    animation.wakeStage='awake';
    animation.jumpStage=grounded?(jumpPrep>0?'anticipation':landing>.008?'landing':'grounded'):(launchProgress<1?'takeoff':vy>1.2?'rising':vy>-.9?'apex':'descent');
    let handWeights=wakeProgress<1?applyWake(wakeProgress,time):noHands;
    if(manipulation>.0001){handWeights=applyInteraction(manipulation);if(manipulation>.5)animation.mode=lastInteraction.kind;}
    animation.climbStage='none';animation.ladderStage='none';animation.slipStage='none';animation.slideStage='none';
    if(climb){const contacts=applyClimb(climb);handWeights=contacts.hands;stances[0]=contacts.stances[0];stances[1]=contacts.stances[1];weights[0]=contacts.weights[0];weights[1]=contacts.weights[1];footstep=false;}
    if(ladder){const contacts=applyLadder(ladder);handWeights=contacts.hands;stances[0]=contacts.stances[0];stances[1]=contacts.stances[1];weights[0]=contacts.weights[0];weights[1]=contacts.weights[1];footstep=false;}
    if(slip){const contacts=applySlip(slip);handWeights=contacts.hands;stances[0]=contacts.stances[0];stances[1]=contacts.stances[1];weights[0]=contacts.weights[0];weights[1]=contacts.weights[1];footstep=false;}
    if(sliding){const contacts=applySlide(slide);handWeights=contacts.hands;stances[0]=contacts.stances[0];stances[1]=contacts.stances[1];weights[0]=contacts.weights[0];weights[1]=contacts.weights[1];footstep=false;}
    if(wakeProgress<1){stances.fill(false);weights.fill(0);}
    animation.launchLead=launchLead;animation.launchSpeed=takeoffSpeed;animation.landingReach=landingReach;
    updateDiagnostics(stances,weights,handWeights);
    stepResult.footstep=footstep;stepResult.intensity=contactIntensity;return stepResult;
  }
  reset();
  return {group,animate,reset};
}
