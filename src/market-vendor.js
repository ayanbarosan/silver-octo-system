import {createFatherSurface,createFatherHead} from './father-mesh.js';
import {createFatherHands} from './father-details.js';

const assetCache=new WeakMap();

function vendorAssets(THREE){
 if(assetCache.has(THREE))return assetCache.get(THREE);
 const segments={
  pelvis:[[0,.995,0],[0,1.10,0]],torso:[[0,.995,0],[0,1.620,0]],
  leftUpper:[[-.282,1.565,0],[-.495,1.270,.015]],leftLower:[[-.495,1.270,.015],[-.610,.948,.035]],
  rightUpper:[[.282,1.565,0],[.495,1.270,.015]],rightLower:[[.495,1.270,.015],[.610,.948,.035]],
  leftThigh:[[-.128,.995,0],[-.143,.555,.020]],leftShin:[[-.143,.555,.020],[-.143,.135,.025]],
  rightThigh:[[.128,.995,0],[.143,.555,.020]],rightShin:[[.143,.555,.020],[.143,.135,.025]]
 };
 const boneIds=Object.fromEntries(Object.keys(segments).map((name,i)=>[name,i]));
 // A connected cotton apron follows the torso and pelvis rather than being
 // assembled from rigid rectangles which separate while the seller runs.
 const positions=[],uvs=[],indices=[],skinIndex=[],skinWeight=[],rows=36,columns=24;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const v=j/rows,u=i/columns,y=.745+v*.755;
  const bib=THREE.MathUtils.smoothstep(y,1.15,1.43),width=THREE.MathUtils.lerp(.244,.148,bib),x=(u-.5)*width*2;
  const z=.185+.031*(1-(x/width)**2)+.006*Math.sin(u*Math.PI*8)*(1-bib);
  positions.push(x,y,z);uvs.push(u,v);
  const torso=THREE.MathUtils.smoothstep(y,.92,1.22);
  skinIndex.push(boneIds.pelvis,boneIds.torso,0,0);skinWeight.push(1-torso,torso,0,0);
  if(j<rows&&i<columns){const a=j*(columns+1)+i,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const apron=new THREE.BufferGeometry();apron.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));apron.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 apron.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));apron.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));apron.setIndex(indices);apron.computeVertexNormals();
 const size=256,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=(Math.sin(x*17.13+y*19.73)*43758.53)%1,thread=((x+y)%3-1)*3;
  const stain=24*Math.exp(-(((x-95)/46)**2)-(((y-65)/37)**2))+14*Math.exp(-(((x-185)/26)**2)-(((y-112)/53)**2));
  const p=(y*size+x)*4,shade=thread+n*4-stain;pixels[p]=190+shade;pixels[p+1]=180+shade;pixels[p+2]=151+shade;pixels[p+3]=255;
 }
 const apronMap=new THREE.DataTexture(pixels,size,size);apronMap.colorSpace=THREE.SRGBColorSpace;apronMap.needsUpdate=true;
 const assets={segments,boneIds,coat:createFatherSurface(THREE,{kind:'coat',segments,boneIds}),trousers:createFatherSurface(THREE,{kind:'trousers',segments,boneIds}),head:createFatherHead(THREE).group,hands:createFatherHands(THREE),apron,apronMap};
 assetCache.set(THREE,assets);return assets;
}

export function createMarketVendor(THREE,parent){
 // The shared surfaces are prepared while the chapter transition is covered.
 const a=vendorAssets(THREE),group=new THREE.Group(),rig=new THREE.Group();group.name='market-kiosk-vendor';group.visible=false;group.add(rig);parent?.add(group);
 rig.scale.x=1.065;
 const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(n,min=0,max=1)=>THREE.MathUtils.clamp(n,min,max),mix=THREE.MathUtils.lerp;
 const material=(color,roughness=.94,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 const coat=material('#384d59',.97,{vertexColors:true}),shirt=material('#a6a18a',.96,{vertexColors:true}),trousers=material('#343b3a',.97,{vertexColors:true});
 const cotton=material('#e4d9bb',.99,{map:a.apronMap,side:THREE.DoubleSide});
 const bones=[],boneMap={},directions={};
 for(const[name,s]of Object.entries(a.segments)){
  const bone=new THREE.Bone();bone.name='vendor-'+name;bone.position.fromArray(s[0]);rig.add(bone);bones.push(bone);boneMap[name]=bone;directions[name]=v(...s[1]).sub(v(...s[0])).normalize();
 }
 rig.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
 for(const[name,geometry,m]of[['coat',a.coat,[coat,shirt]],['trousers',a.trousers,trousers],['apron',a.apron,cotton]]){
  const mesh=new THREE.SkinnedMesh(geometry,m);mesh.name='vendor-continuous-'+name;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;rig.add(mesh);mesh.bind(skeleton);
 }
 const sphere=new THREE.SphereGeometry(1,24,18);
 function mesh(geometry,m,owner,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;owner.add(o);return o;}
 function oval(owner,m,x,y,z,sx,sy,sz){const o=mesh(sphere,m,owner,x,y,z);o.scale.set(sx,sy,sz);return o;}
 const head=a.head.clone(true),headMaterials=new Map();head.name='vendor-weathered-head';rig.add(head);
 head.traverse(o=>{if(!o.isMesh)return;const copy=m=>{if(!headMaterials.has(m))headMaterials.set(m,m.clone());return headMaterials.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});
 const locks=head.getObjectByName('father-tousled-hair-locks');if(locks)locks.visible=false;
 const eyes=head.getObjectByName('father-open-eyes');if(eyes)eyes.visible=true;
  const neck=mesh(new THREE.CylinderGeometry(.065,.090,.20,24),material('#9e8973',.94),head,0,-.070,-.035);neck.name='vendor-neck';
 for(const name of ['father-fitted-wavy-scalp','father-short-grey-stubble']){
  const hair=head.getObjectByName(name);if(hair){hair.material=hair.material.clone();hair.material.color.set('#9b9a87');}
 }
 // A close-fitting shop cap distinguishes the vendor from the family father.
 const capMaterial=material('#404d4c',.99);
 const cap=mesh(new THREE.SphereGeometry(.172,28,18,0,Math.PI*2,0,Math.PI*.56),capMaterial,head,0,.410,-.012);cap.scale.y=.48;
 oval(head,capMaterial,0,.402,.117,.170,.012,.105);
 const hands={},boots={},footState=[];
 const bootLeather=material('#4b4437'),sole=material('#252d29');
 for(const [side,sign]of [['left',-1],['right',1]]){
  // Both empty hands use the open sculpted palm, not the father's glass grip.
  const hand=a.hands.right.clone(true);hand.name='vendor-'+side+'-hand';if(side==='left')hand.scale.x=-1;
  hand.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});rig.add(hand);hands[side]=hand;
  const boot=new THREE.Group();boot.name='vendor-'+side+'-boot';rig.add(boot);
  oval(boot,bootLeather,0,0,.042,.096,.054,.174);oval(boot,sole,0,-.046,.042,.098,.010,.176);oval(boot,bootLeather,0,.066,-.045,.074,.087,.082);
  boots[side]=boot;footState.push({side,sign,offset:side==='left'?0:.5,anchor:v(),planted:false,stance:true,contact:1});
 }
 // The apron strap is part of the upper rig and stays on the chest in turns.
 const strapCurve=new THREE.CatmullRomCurve3([v(-.14,.505,.19),v(-.10,.645,.045),v(0,.674,-.095),v(.10,.645,.045),v(.14,.505,.19)]);
 const strap=mesh(new THREE.TubeGeometry(strapCurve,32,.014,6,false),cotton,boneMap.torso);
 strap.name='vendor-apron-neck-strap';
 const pocket=new THREE.Group();pocket.name='vendor-apron-pocket';boneMap.torso.add(pocket);pocket.position.set(0,.065,.225);
 const pocketGeometry=new THREE.PlaneGeometry(.26,.16,10,6),pp=pocketGeometry.attributes.position;
 for(let i=0;i<pp.count;i++){const x=pp.getX(i),y=pp.getY(i);pp.setZ(i,.006*Math.cos(x*16)+.007*(y+.08)/.16);}pocketGeometry.computeVertexNormals();mesh(pocketGeometry,cotton,pocket);
 const upperLength=v(-.213,-.295,.015).length(),lowerLength=v(-.115,-.322,.020).length();
 function knee(hip,foot,l1,l2,pole){
  const axis=v().subVectors(foot,hip),distance=clamp(axis.length(),.015,l1+l2-.0005);axis.normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const bend=v().subVectors(pole,hip).addScaledVector(axis,-v().subVectors(pole,hip).dot(axis));if(bend.lengthSq()<1e-8)bend.set(0,0,1);bend.normalize();
  return hip.clone().addScaledVector(axis,along).addScaledVector(bend,height);
 }
 function poseBone(name,start,end){boneMap[name].position.copy(start);boneMap[name].quaternion.setFromUnitVectors(directions[name],v().subVectors(end,start).normalize());}
 let gait=0,lastX=null,lastZ=null,lastTime=null,motion=0,lean=0;
 const metadata={visible:false,phase:'idle',appearance:'navy-shop-coat-sand-cotton-apron-grey-cap',hasGlass:false,gait:0,bounds:null,probes:{},feet:[]};
 function update(time=0,state={}){
  time=Number.isFinite(time)?time:0;
  const s=state?.vendor??state??{},x=Number.isFinite(s.x)?s.x:27.4,y=Number.isFinite(s.y)?s.y:0,z=Number.isFinite(s.z)?s.z:-1;
  const phase=s.phase??'idle',clock=Number.isFinite(s.time)?s.time:time,dt=lastTime===null?1/60:clamp(time-lastTime,0,.1),distance=lastX===null?0:Math.hypot(x-lastX,z-lastZ);
  const reset=lastX===null||distance>3||time<(lastTime??time),activeMotion=['exit','chase','brake'].includes(phase)&&distance>.00001;
  if(reset){gait=0;motion=0;for(const f of footState)f.planted=false;}
  const running=phase==='chase',stride=running?1.12:.79,stance=running?.52:.62;
  if(!reset&&distance<3)gait+=distance/stride;
  motion=mix(motion,activeMotion?1:0,1-Math.exp(-dt*14));
  const targetLean=phase==='catch'||phase==='caught'?.24:running?.19:phase==='brake'?.08:phase==='watch'?.11:.055;
  lean=reset?targetLean:mix(lean,targetLean,1-Math.exp(-dt*9));
  const dx=lastX===null?0:x-lastX,dz=lastZ===null?0:z-lastZ;
  const heading=Number.isFinite(s.heading)?s.heading:phase==='exit'&&distance>.0001?Math.atan2(dx,dz):(s.face===-1?-1:1)*Math.PI/2;
  group.position.set(x,y,z);group.rotation.y=heading;group.updateMatrixWorld(true);
  const bob=Math.sin(gait*Math.PI*4)*.011*motion,breath=Math.sin(clock*1.55)*.003;
  const pelvis=v(0,(running?.925:.953)+bob,0),q=new THREE.Quaternion().setFromAxisAngle(v(1,0,0),lean),shoulder=pelvis.clone().add(v(0,.585,0).applyQuaternion(q));
  poseBone('pelvis',pelvis,pelvis.clone().add(v(0,.1,0)));poseBone('torso',pelvis,pelvis.clone().add(v(0,.625,0).applyQuaternion(q)));
  for(const f of footState){
   const cycle=(gait+f.offset)%1,isStance=cycle<stance,front=stride*stance/2;
   const p=isStance?cycle/stance:(cycle-stance)/(1-stance),smooth=p*p*(3-2*p),forward=isStance?front-stride*cycle:mix(-front,front,smooth);
   const lift=isStance?0:Math.sin(p*Math.PI)*(running?.155:.095)*motion;
   let foot=v(f.sign*.143,.13+lift,.025+forward*motion);
   if(isStance&&motion>.7){
    if(!f.planted||!f.stance){f.anchor.copy(rig.localToWorld(foot.clone()));f.anchor.y=y+.13;f.planted=true;}
    foot.copy(rig.worldToLocal(f.anchor.clone()));
   }else f.planted=false;
   f.stance=isStance;f.contact=isStance?1:1-motion;
   const hip=pelvis.clone().add(v(f.sign*.128,0,0)),bend=knee(hip,foot,.4407,.4202,v(f.sign*.17,.49,.43));
   poseBone(f.side+'Thigh',hip,bend);poseBone(f.side+'Shin',bend,foot);
   boots[f.side].position.copy(foot).add(v(0,-.075,.025));boots[f.side].rotation.x=0;
   const sign=f.sign,swing=Math.cos((gait+f.offset)*Math.PI*2)*motion;
   const armStart=shoulder.clone().add(v(sign*.282,-.025,0).applyQuaternion(q));
   const catchReach=phase==='catch'||phase==='caught',idle=phase==='idle'||phase==='serve';
   const target=catchReach?v(sign*.22,1.10,.49):idle?v(sign*.25,1.045+breath,.39):running?v(sign*.29,1.10-swing*.12,.04-swing*.25):phase==='notice'?v(sign*.27,1.17,.19):v(sign*.29,.99+breath,.09-swing*.10);
   const elbow=knee(armStart,target,upperLength,lowerLength,v(sign*.46,1.16,-.10));
   poseBone(f.side+'Upper',armStart,elbow);poseBone(f.side+'Lower',elbow,target);
   hands[f.side].position.copy(target);hands[f.side].rotation.set(running?-sign*swing*.18:0,0,sign*.045);
  }
  head.position.copy(pelvis).add(v(0,.695+breath,.026).applyQuaternion(q));
  const notice=phase==='notice'?.20*Math.sin(Math.min(clock/.7,1)*Math.PI):0;
  head.rotation.set(phase==='watch'?.34:phase==='brake'?.23:.10+notice,phase==='notice'?-.17*Math.sin(clock*2):0,0);
  group.updateMatrixWorld(true);
  const probes={pelvis:boneMap.pelvis.getWorldPosition(v()).toArray(),head:head.localToWorld(v(0,.235,0)).toArray(),leftHand:hands.left.getWorldPosition(v()).toArray(),rightHand:hands.right.getWorldPosition(v()).toArray()};
  const feet=footState.map(f=>({side:f.side,stance:f.stance,contactWeight:f.contact,position:boots[f.side].localToWorld(v(0,-.055,0)).toArray()}));
  probes.leftFoot=feet[0].position;probes.rightFoot=feet[1].position;
  const bounds=new THREE.Box3();Object.values(probes).forEach(p=>bounds.expandByPoint(v(...p)));bounds.expandByScalar(.20);
  bounds.union(new THREE.Box3().setFromObject(head));bounds.min.y=Math.min(...Object.values(boots).map(boot=>new THREE.Box3().setFromObject(boot).min.y));
  Object.assign(metadata,{visible:group.visible,phase,gait,heading,motion,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},probes,feet,watchingDown:phase==='watch',hasGlass:false});
  lastX=x;lastZ=z;lastTime=time;return metadata;
 }
 update(0,{vendor:{phase:'idle',x:27.4,y:0,z:-1,face:1,time:0}});
 group.userData.vendor=metadata;
 return {group,metadata,update,get preciseBounds(){const bounds=new THREE.Box3().setFromObject(group,true);return {min:bounds.min.toArray(),max:bounds.max.toArray()};}};
}
