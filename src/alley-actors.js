import {createFatherSurface,createFatherHead} from './father-mesh.js';
import {createFatherHands} from './father-details.js';

const workerCache=new WeakMap();

// Workmen reuse the continuous clothing topology, not the father's appearance.
// The expensive immutable surfaces are shared; each actor owns its skeleton,
// clothing materials, face materials and animation state.
function workerAssets(THREE){
 if(workerCache.has(THREE))return workerCache.get(THREE);
 const segments={
  pelvis:[[0,.995,0],[0,1.10,0]],torso:[[0,.995,0],[0,1.620,0]],
  leftUpper:[[-.282,1.565,0],[-.495,1.270,.015]],leftLower:[[-.495,1.270,.015],[-.610,.948,.035]],
  rightUpper:[[.282,1.565,0],[.495,1.270,.015]],rightLower:[[.495,1.270,.015],[.610,.948,.035]],
  leftThigh:[[-.128,.995,0],[-.143,.555,.020]],leftShin:[[-.143,.555,.020],[-.143,.135,.025]],
  rightThigh:[[.128,.995,0],[.143,.555,.020]],rightShin:[[.143,.555,.020],[.143,.135,.025]]
 };
 const boneIds=Object.fromEntries(Object.keys(segments).map((name,i)=>[name,i]));
 const assets={segments,boneIds,coat:createFatherSurface(THREE,{kind:'coat',segments,boneIds}),trousers:createFatherSurface(THREE,{kind:'trousers',segments,boneIds}),head:createFatherHead(THREE).group,hands:createFatherHands(THREE)};
 workerCache.set(THREE,assets);return assets;
}

export function createAlleyActors(THREE,parent){
 // Build the immutable surfaces while the alley transition is still covered.
 // Individual rigs remain lazy, so approaching a workman never stalls walking.
 workerAssets(THREE);
 const group=new THREE.Group();group.name='garage-alley-actors';parent.add(group);
 const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(n,min=0,max=1)=>THREE.MathUtils.clamp(n,min,max),lerp=THREE.MathUtils.lerp;
 const mat=(color,roughness=.94,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 const sphere=new THREE.SphereGeometry(1,24,18),up=v(0,1,0),down=v(0,-1,0);
 const material={fur:mat('#65543c'),darkFur:mat('#30332b'),muzzle:mat('#625d4c'),nose:mat('#171e1b',.65),eye:mat('#9e9270',.46),pupil:mat('#111714',.4),collar:mat('#655346',.95),metal:mat('#737c75',.52,{metalness:.6})};
 function mesh(geo,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function oval(parent,m,x,y,z,sx,sy,sz){const o=mesh(sphere,m,parent,x,y,z);o.scale.set(sx,sy,sz);return o;}
 function segment(parent,radius,length,m){return mesh(new THREE.CapsuleGeometry(radius,Math.max(.005,length-radius*2),4,10),m,parent);}
 function setSegment(object,a,b,length){object.position.copy(a).add(b).multiplyScalar(.5);object.quaternion.setFromUnitVectors(up,v().subVectors(b,a).normalize());object.scale.y=a.distanceTo(b)/length;}
 function ik(a,b,l1,l2,pole){
  const axis=v().subVectors(b,a),d=clamp(axis.length(),.015,l1+l2-.0005);axis.normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const bend=v().subVectors(pole,a).addScaledVector(axis,-v().subVectors(pole,a).dot(axis));
  if(bend.lengthSq()<1e-8)bend.set(0,0,1).addScaledVector(axis,-axis.z);bend.normalize();
  return a.clone().addScaledVector(axis,along).addScaledVector(bend,height);
 }
 function boundsOf(object){const b=new THREE.Box3().setFromObject(object,true);return {min:b.min.toArray(),max:b.max.toArray()};}
 const metadata={dog:{visible:true,phase:'sleep',bounds:null,probes:{}},owner:{visible:false,phase:'repair',bounds:null,probes:{}},mechanic:{visible:false,phase:'repair',bounds:null,probes:{}}};

 const dog=new THREE.Group();dog.name='territorial-garage-dog';group.add(dog);
 const bodyGeo=new THREE.SphereGeometry(1,36,24),bp=bodyGeo.attributes.position,bc=[];
 const furColor=new THREE.Color('#67563d'),saddle=new THREE.Color('#292e28');
 for(let i=0;i<bp.count;i++){
  const px=bp.getX(i),py=bp.getY(i),pz=bp.getZ(i),waist=1-.13*Math.exp(-(((pz+.08)/.36)**2));
  bp.setXYZ(i,px*(.226+.018*pz)*waist,py*.245+.018*pz,pz*.56);
  const c=furColor.clone().lerp(saddle,clamp((py+.12)*.82)*(.70+.15*Math.sin(pz*5)));bc.push(c.r,c.g,c.b);
 }
 bodyGeo.setAttribute('color',new THREE.Float32BufferAttribute(bc,3));bodyGeo.computeVertexNormals();
 const body=mesh(bodyGeo,mat('#ffffff',.99,{vertexColors:true}),dog,0,.56,0);
 const chest=oval(dog,material.darkFur,0,.58,.31,.224,.265,.235);
 const head=new THREE.Group();head.name='dog-head';dog.add(head);
 const headGeo=new THREE.SphereGeometry(1,32,24),hp=headGeo.attributes.position,hc=[];
 for(let i=0;i<hp.count;i++){
  const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i),front=Math.max(0,z);
  hp.setXYZ(i,x*.157*(1-front*.24),y*.181-front*.052,z*.223+front*front*.071);
  const c=new THREE.Color('#544c38').lerp(new THREE.Color('#272d26'),clamp((y+.35)*.70));hc.push(c.r,c.g,c.b);
 }
 headGeo.setAttribute('color',new THREE.Float32BufferAttribute(hc,3));headGeo.computeVertexNormals();
 mesh(headGeo,mat('#ffffff',.99,{vertexColors:true}),head);
 oval(head,material.nose,0,-.060,.284,.074,.045,.035);
 const jaw=oval(head,material.muzzle,0,-.118,.145,.105,.043,.153);
 const eyes=new THREE.Group();head.add(eyes);
 for(const side of[-1,1]){
  oval(eyes,material.eye,side*.109,.034,.161,.024,.016,.013);
  oval(eyes,material.pupil,side*.114,.034,.171,.010,.013,.006);
 }
 const ears=[];
 for(const side of[-1,1]){
  const ear=new THREE.Group();ear.position.set(side*.127,.104,-.014);head.add(ear);
  const eg=new THREE.SphereGeometry(1,16,16),ep=eg.attributes.position;
  for(let i=0;i<ep.count;i++){const y=ep.getY(i);ep.setXYZ(i,ep.getX(i)*.057*(1-.64*Math.max(0,y)),y*.120+.056,ep.getZ(i)*.025-.008*y);}eg.computeVertexNormals();
  mesh(eg,material.darkFur,ear);ears.push(ear);
 }
 const collar=mesh(new THREE.TorusGeometry(.185,.019,6,24),material.collar,head,0,-.105,-.095);collar.rotation.x=Math.PI/2;
 mesh(new THREE.SphereGeometry(.024,12,8),material.metal,head,.043,-.168,-.014);
 const legs=[];
 for(const front of[true,false])for(const side of[-1,1]){
  const upper=segment(dog,front?.061:.073,.265,material.fur),lower=segment(dog,.047,.265,material.fur),paw=new THREE.Group();dog.add(paw);
  oval(paw,material.darkFur,0,-.016,.027,.071,.044,.103);legs.push({front,side,upper,lower,paw});
 }
 const tailRoot=new THREE.Group();dog.add(tailRoot);
 const tailCurve=new THREE.CatmullRomCurve3([v(0,0,0),v(.04,.10,-.19),v(.09,.20,-.32),v(.12,.23,-.47)]);
 const tg=new THREE.TubeGeometry(tailCurve,20,.030,7,false),tp=tg.attributes.position,tu=tg.attributes.uv;
 for(let i=0;i<tp.count;i++){const t=tu.getX(i),c=tailCurve.getPointAt(t),p=v().fromBufferAttribute(tp,i).sub(c).multiplyScalar(1-.75*t).add(c);tp.setXYZ(i,p.x,p.y,p.z);}tg.computeVertexNormals();mesh(tg,material.darkFur,tailRoot);
 let dogAwake=0,dogGait=0,lastDogX=23,lastDogZ=.3,lastDogTime=0,lastDogPhase='sleep',lastTime=0;
 function updateDog(time,state,player){
  const s=state?.dog??{},phase=s.phase??'sleep',x=Number.isFinite(s.x)?s.x:23,z=Number.isFinite(s.z)?s.z:.3,y=Number.isFinite(s.y)?s.y:0,clock=Number.isFinite(s.time)?s.time:time;
  const distance=Math.hypot(x-lastDogX,z-lastDogZ),changed=phase!==lastDogPhase;
  const dt=changed?Math.min(.1,Math.max(0,time-lastTime)):clamp(clock-lastDogTime,0,.1);
  if(distance>3||time<lastTime){dogAwake=phase==='sleep'?0:1;dogGait=0;}
  const target=phase==='sleep'?0:phase==='listen'?.65:1;dogAwake=lerp(dogAwake,target,1-Math.exp(-5*dt));
  const running=phase==='chase',stride=running?.62:.42,stance=running?.50:.62;
  if(distance<3)dogGait+=distance*stance/stride*Math.PI*2;
  dog.position.set(x,y,z);dog.rotation.y=(s.face===-1?-1:1)*Math.PI/2;
  dog.visible=!player||Math.abs((player.x??x)-x)<39;
  const breath=Math.sin(clock*1.75)*.008*(1-dogAwake),bodyY=lerp(.273,.56,dogAwake);
  body.position.y=bodyY+breath;body.rotation.set(0,0,lerp(-.10,0,dogAwake));body.scale.set(1,1+breath,.97+.03*dogAwake);
  chest.position.set(0,bodyY+.017,.31);chest.scale.y=.265*(1+breath);
  head.position.set(0,lerp(.285,.883,dogAwake)+breath,.48);
  const bark=phase==='bark'||running&&Math.sin(clock*8)>.72;
  head.rotation.set(lerp(.18,-.045,dogAwake)+(phase==='listen'?.075*Math.sin(clock*2.1):0),phase==='listen'?.18*Math.sin(clock*1.4):0,0);
  jaw.position.y=-.118-(bark?.024+.025*(.5+.5*Math.sin(clock*18)):0);eyes.visible=dogAwake>.38;
  ears.forEach((ear,i)=>ear.rotation.set(lerp(.87,-.12,dogAwake)+(phase==='listen'?.12*Math.sin(clock*3+i):0),0,(i?1:-1)*.20));
  tailRoot.position.set(0,bodyY+.01,-.48);tailRoot.rotation.set(lerp(-.55,.16,dogAwake),phase==='sleep'?.55:.10*Math.sin(clock*(running?11:4)),0);
  for(let i=0;i<legs.length;i++){
   const leg=legs[i],hip=v(leg.side*(leg.front?.174:.157),bodyY+(leg.front?.005:-.055),leg.front?.315:-.345);
   const offset=(i===0||i===3)?0:Math.PI,cycle=((dogGait+offset)/(Math.PI*2)%1+1)%1;
   const moving=running||distance>.0001;let stepZ=0,lift=0;
   if(moving){if(cycle<stance)stepZ=stride*.5-stride*cycle/stance;else{const p=(cycle-stance)/(1-stance),u=p*p*(3-2*p);stepZ=-stride*.5+stride*u;lift=Math.sin(p*Math.PI)*(running?.135:.095);}}
   const standing=v(leg.side*(leg.front?.175:.16),.060+lift,(leg.front?.35:-.34)+stepZ),folded=v(leg.side*.245,.060,leg.front?.41:-.12),paw=folded.lerp(standing,dogAwake);
   const knee=ik(hip,paw,.265,.265,v(leg.side*.23,.24,leg.front?-.05:.06));
   setSegment(leg.upper,hip,knee,.265);setSegment(leg.lower,knee,paw,.265);leg.paw.position.copy(paw);leg.paw.rotation.set(0,0,0);
  }
  dog.updateWorldMatrix(true,true);metadata.dog={visible:dog.visible,phase,alert:s.alert??0,bounds:boundsOf(dog),probes:{head:head.getWorldPosition(v()).toArray(),nose:head.localToWorld(v(0,-.06,.30)).toArray(),root:dog.position.toArray(),paws:legs.map(l=>l.paw.getWorldPosition(v()).toArray())}};
  lastDogX=x;lastDogZ=z;lastDogTime=clock;lastDogPhase=phase;
 }

 function makeWorker(kind){
  const a=workerAssets(THREE),root=new THREE.Group(),rig=new THREE.Group();root.name=`alley-${kind}`;root.add(rig);group.add(root);
  const coat=mat(kind==='mechanic'?'#465b61':kind==='garage-resident'?'#5e5a47':'#39444a',.98,{vertexColors:true}),shirt=mat('#86806b',.97,{vertexColors:true}),pants=mat('#303a3e',.98,{vertexColors:true});
  const bones=[],boneMap={},bindDirections={};
  for(const[name,s]of Object.entries(a.segments)){const bone=new THREE.Bone();bone.name=`${kind}-${name}`;bone.position.fromArray(s[0]);rig.add(bone);bones.push(bone);boneMap[name]=bone;bindDirections[name]=v(...s[1]).sub(v(...s[0])).normalize();}
  rig.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
  for(const[kind,geo]of[['coat',a.coat],['trousers',a.trousers]]){const m=new THREE.SkinnedMesh(geo,kind==='coat'?[coat,shirt]:pants);m.name=`${root.name}-${kind}`;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;rig.add(m);m.bind(skeleton);}
  const headGroup=a.head.clone(true),materials=new Map();headGroup.name=`${kind}-head`;rig.add(headGroup);
  headGroup.traverse(o=>{if(!o.isMesh)return;const clone=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});
  const locks=headGroup.getObjectByName('father-tousled-hair-locks');if(locks)locks.visible=false;
  const eyes=headGroup.getObjectByName('father-open-eyes');if(eyes)eyes.visible=true;
  const capMat=mat(kind==='mechanic'?'#6f553b':kind==='garage-resident'?'#66553d':'#4a4b41',.99);
  const cap=mesh(new THREE.SphereGeometry(.175,28,18,0,Math.PI*2,0,Math.PI*.58),capMat,headGroup,0,.404,-.005);cap.scale.y=.56;
  mesh(new THREE.CylinderGeometry(.172,.174,.047,28,1,true),capMat,headGroup,0,.406,-.005);
  oval(headGroup,capMat,0,.395,.127,.178,.014,.108);
  const hands={};
  for(const side of ['left','right']){const hand=a.hands[side].clone(true);hand.name=`${kind}-${side}-hand`;hand.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});rig.add(hand);hands[side]=hand;}
  const boots={};
  for(const side of ['left','right']){const boot=new THREE.Group();boot.name=`${kind}-${side}-boot`;rig.add(boot);oval(boot,mat('#272f2c'),0,-.006,.045,.095,.055,.175);oval(boot,mat('#202724'),0,-.044,.045,.097,.011,.177);oval(boot,mat('#313b36'),0,.065,-.049,.073,.091,.081);boots[side]=boot;}
  const tool=new THREE.Group();tool.name=`${kind}-tool`;hands.left.add(tool);
  let lamp=null,lens=null;
  if(kind!=='mechanic'){
   const housing=mat('#333f3f',.72,{metalness:.4});mesh(new THREE.CylinderGeometry(.055,.049,.20,18),housing,tool,.026,-.022,.060);
   const bezel=mesh(new THREE.CylinderGeometry(.061,.055,.090,20),housing,tool,.026,.065,.098);bezel.rotation.x=Math.PI/2;
   lens=mesh(new THREE.CircleGeometry(.049,20),mat('#d7c890',.5,{emissive:'#b6a474',emissiveIntensity:1.8}),tool,.026,.065,.146);
   lamp=new THREE.SpotLight('#e1cb94',3.0,7,.55,.65,1.3);lamp.position.set(.026,.065,.155);tool.add(lamp);const target=new THREE.Object3D();target.position.set(.026,-.30,5);tool.add(target);lamp.target=target;
  }else{
   const wrenchMat=mat('#87928d',.48,{metalness:.7});mesh(new THREE.CylinderGeometry(.013,.013,.25,8),wrenchMat,tool,.023,-.065,.057);const ring=mesh(new THREE.TorusGeometry(.037,.010,5,12),wrenchMat,tool,.023,.073,.057);ring.rotation.x=Math.PI/2;
  }
  function poseBone(name,start,end){boneMap[name].position.copy(start);boneMap[name].quaternion.setFromUnitVectors(bindDirections[name],v().subVectors(end,start).normalize());}
  let gait=0,lastX=null,lastZ=null;
  const normalUpper=v(-.213,-.295,.015).length(),normalLower=v(-.115,-.322,.020).length();
  function update(time,state,repair=false){
   const x=state.x??0,y=state.y??0,z=state.z??0,clock=Number.isFinite(state.time)?state.time:time,phase=state.phase??'repair',distance=lastX===null?0:Math.hypot(x-lastX,z-lastZ);
   if(distance<3)gait+=distance*Math.PI*2/.78;else gait=0;lastX=x;lastZ=z;
   const moving=distance>.0001&&['approach','chase','patrol','inspect','distracted'].includes(phase),work=repair?.5+.5*Math.sin(clock*2.4):0,lean=repair?.43+.025*work:.105;
   root.position.set(x,y,z);root.rotation.y=(state.face===-1?-1:1)*Math.PI/2;
   const bob=moving?Math.sin(gait*2)*.012:0,breath=Math.sin(clock*1.15)*.0035;
   const pelvis=v(0,repair?.845:.97+bob,0),q=new THREE.Quaternion().setFromAxisAngle(v(1,0,0),lean),shoulder=pelvis.clone().add(v(0,.585,0).applyQuaternion(q));
   poseBone('pelvis',pelvis,pelvis.clone().add(v(0,.1,0)));poseBone('torso',pelvis,pelvis.clone().add(v(0,.625,0).applyQuaternion(q)));
   for(const[side,sign,offset]of[['left',-1,0],['right',1,Math.PI]]){
    const swing=moving?Math.sin(gait+offset):0,stride=moving?-Math.cos(gait+offset)*.235:0,hip=pelvis.clone().add(v(sign*.128,0,0));
    const foot=v(sign*.143,.13+Math.max(0,swing)*.10,.025+stride),knee=ik(hip,foot,.4407,.4202,v(sign*.16,.48,.40));
    poseBone(side+'Thigh',hip,knee);poseBone(side+'Shin',knee,foot);boots[side].position.copy(foot).add(v(0,-.075,.025));boots[side].rotation.x=-.12*Math.max(0,swing);
    const armStart=shoulder.clone().add(v(sign*.282,-.025,0).applyQuaternion(q));
    const target=repair?v(sign*.19,1.035+.028*Math.sin(clock*4.1+(sign<0?0:1.1)),.79+.018*Math.sin(clock*3.3)):
     side==='left'?v(-.30,1.19+breath,.27):v(.30,.93+breath,.025-swing*.09);
    const pole=repair?v(sign*.48,1.07,.15):side==='left'?v(-.38,1.12,-.10):v(.38,1.19,.14),elbow=ik(armStart,target,normalUpper,normalLower,pole);
    poseBone(side+'Upper',armStart,elbow);poseBone(side+'Lower',elbow,target);hands[side].position.copy(target);hands[side].rotation.set(repair?-.25*Math.sin(clock*4.1):0,0,sign*.045);
   }
   headGroup.position.copy(pelvis).add(v(0,.70+breath,.026).applyQuaternion(q));
   headGroup.rotation.set(repair?.42:.14+(phase==='listen'?.20:0),phase==='inspect'?.23*Math.sin(clock*.75):0,0);
   if(lamp){const on=['listen','approach','inspect','patrol','chase','caught','distracted'].includes(phase);lamp.visible=on;lens.material.emissiveIntensity=on?1.8:.15;}
   // SkinnedMesh updates its inverse bind matrix here as well as the bones.
   root.updateMatrixWorld(true);
   const probes=Object.fromEntries([['pelvis',boneMap.pelvis],['leftHand',hands.left],['rightHand',hands.right]].map(([name,o])=>[name,o.getWorldPosition(v()).toArray()]));
   probes.head=headGroup.localToWorld(v(0,.235,0)).toArray();
   probes.leftFoot=boots.left.localToWorld(v(0,-.055,0)).toArray();probes.rightFoot=boots.right.localToWorld(v(0,-.055,0)).toArray();
   const b=new THREE.Box3();Object.values(probes).forEach(p=>b.expandByPoint(v(...p)));b.expandByScalar(.23);
   const leftBoot=new THREE.Box3().setFromObject(boots.left),rightBoot=new THREE.Box3().setFromObject(boots.right),headBox=new THREE.Box3().setFromObject(headGroup);
   b.union(headBox);b.min.y=Math.min(leftBoot.min.y,rightBoot.min.y);
   return {visible:root.visible,phase,bounds:{min:b.min.toArray(),max:b.max.toArray()},probes,role:kind,appearance:kind==='mechanic'?'blue-mechanics-jacket-and-brown-cap':kind==='garage-resident'?'olive-work-jacket-and-tan-cap':'navy-work-jacket-and-grey-cap',hasGlass:false,tool:kind==='mechanic'?'wrench':'work-torch',gait};
  }
  return {root,update,get preciseBounds(){return boundsOf(root);}};
 }
 const workers=new Map();let activeOwner=null,mechanic=null;
 function resident(time,s,playerX){
  const role=s.role??((s.x??171)>140?'yard-owner':'garage-resident');
  if(!workers.has(role)&&Math.abs(playerX-(s.x??171))<34)workers.set(role,makeWorker(role));
  const actor=workers.get(role);if(!actor)return null;
  // The resident takes an enclosed service stair. A lit upstairs window and
  // footsteps signal the approach; the actual person emerges at its door.
  const enclosed=role==='garage-resident'&&['repair','listen','approach'].includes(s.phase);
  actor.root.visible=!enclosed&&Math.abs(playerX-(s.x??171))<39;
  const entry=role==='garage-resident'&&s.phase==='inspect'?clamp((s.time??0)/.55,0,1):1;
  const visual=entry<1?{...s,z:lerp(3.35,s.z??4.2,entry*entry*(3-2*entry))}:s;
  const result=actor.update(time,visual);result.alert=s.alert??0;
  return {actor,result};
 }
 function update(time=0,state=null,player=null){
  const now=Number.isFinite(time)?time:0;updateDog(now,state,player);
  for(const actor of workers.values())actor.root.visible=false;
  activeOwner=null;metadata.owner={visible:false,phase:null,bounds:null,probes:{}};
  metadata.garageResident=null;
  const sx=Number.isFinite(player?.x)?player.x:0,s=state?.owner??{phase:'repair',x:171,y:0,z:1.2,face:1,time:0,alert:0};
  if(state?.garageResident){const prior=resident(now,state.garageResident,sx);if(prior)metadata.garageResident=prior.result;}
  const current=resident(now,s,sx);if(current){activeOwner=current.actor;metadata.owner=current.result;}
  if(!mechanic&&Math.abs(sx-73.45)<34)mechanic=makeWorker('mechanic');
  if(mechanic){mechanic.root.visible=Math.abs(sx-73.45)<31;metadata.mechanic=mechanic.update(now,{phase:'repair',x:73.45,y:0,z:-1.8,face:1,time:now},true);}
  lastTime=now;
 }
 update(0,null,{x:0});
 group.userData.actors=metadata;
 return {group,metadata,update,get preciseOwnerBounds(){return activeOwner?.preciseBounds??null;},get preciseMechanicBounds(){return mechanic?.preciseBounds??null;}};
}
