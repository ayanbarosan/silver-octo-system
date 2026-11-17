import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createFatherSurface,createFatherHead} from './father-mesh.js';

// A reusable original skeletal actor. The group stays rooted at the kitchen
// table; the articulated rig moves through the apartment independently of it.
export function createApartmentFather(THREE){
 const group=new THREE.Group();group.name='Father-at-table';
 const rig=new THREE.Group();rig.name='father-articulated-rig';group.add(rig);
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
 const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),lerp=(a,b,t)=>a.clone().lerp(b,t);
 const material=(color,roughness=.94,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 const cloth=material('#ffffff',.93,{vertexColors:true}),skin=material('#b2947f',.85),dark=material('#343a35',.91),wood=material('#74634d',.96),metal=material('#677069',.63,{metalness:.35});
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),im=c.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,n=Math.sin(x*127.1+y*311.7)*43758.54,g=n-Math.floor(n),b=126+(g-.5)*13+(x%3===0?-4:0)+(y%4===0?3:0);for(let k=0;k<3;k++)im.data[i+k]=b;im.data[i+3]=255;}
  c.putImageData(im,0,0);const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);cloth.bumpMap=map;cloth.bumpScale=.0028;
 }
 const segments={
  pelvis:[[0,.995,0],[0,1.10,0]],torso:[[0,.995,0],[0,1.620,0]],
  leftUpper:[[-.282,1.565,0],[-.495,1.270,.015]],leftLower:[[-.495,1.270,.015],[-.610,.948,.035]],
  rightUpper:[[.282,1.565,0],[.495,1.270,.015]],rightLower:[[.495,1.270,.015],[.610,.948,.035]],
  leftThigh:[[-.128,.995,0],[-.143,.555,.020]],leftShin:[[-.143,.555,.020],[-.143,.135,.025]],
  rightThigh:[[.128,.995,0],[.143,.555,.020]],rightShin:[[.143,.555,.020],[.143,.135,.025]],
 };
 const bones=[],boneIds={},boneMap={};
 for(const [name,segment]of Object.entries(segments)){const bone=new THREE.Bone();bone.name=`father-${name}`;bone.position.fromArray(segment[0]);rig.add(bone);boneIds[name]=bones.length;bones.push(bone);boneMap[name]=bone;}
 rig.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
 const surfaces=[];
 for(const kind of ['trousers','coat']){const geometry=createFatherSurface(THREE,{kind,segments,boneIds}),mesh=new THREE.SkinnedMesh(geometry,cloth);mesh.name=`father-continuous-${kind}`;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;rig.add(mesh);mesh.bind(skeleton);surfaces.push(mesh);}
 const head=createFatherHead(THREE);rig.add(head.group);
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.065,.078,.15,32),skin);neck.name='father-neck';head.group.add(neck);neck.position.y=.02;
 // The cardigan's actual collar folds follow the chest bone.
 const collarMat=material('#7d7e70');
 function collar(side){const shape=new THREE.Shape();shape.moveTo(side*.070,0);shape.lineTo(side*.133,-.025);shape.lineTo(side*.090,-.145);shape.lineTo(side*.026,-.060);const geo=new THREE.ShapeGeometry(shape,8);geo.translate(0,.68,.133);const mesh=new THREE.Mesh(geo,collarMat);mesh.material.side=THREE.DoubleSide;boneMap.torso.add(mesh);}
 collar(-1);collar(1);
 const buttons=new THREE.InstancedMesh(new THREE.SphereGeometry(.008,10,8),metal,4),dummy=new THREE.Object3D();
 for(let i=0;i<4;i++){dummy.position.set(.036,.19+i*.086,.168);dummy.scale.set(1,1,.5);dummy.updateMatrix();buttons.setMatrixAt(i,dummy.matrix);}boneMap.torso.add(buttons);
 function handGeometry(){const g=new THREE.SphereGeometry(1,36,28),p=g.attributes.position,colors=[];const base=new THREE.Color('#b2947e'),crease=new THREE.Color('#8c7563');
  for(let i=0;i<p.count;i++){let x=p.getX(i)*.052,y=p.getY(i)*.082,z=p.getZ(i)*.037;const front=Math.max(0,z/.037);z+=front*.0045*Math.cos((y+.085)*138);x-=.012*Math.exp(-(((y-.028)/.030)**2))*Math.max(0,-x/.052);p.setXYZ(i,x,y-.045,z);const c=base.clone().lerp(crease,front*.10*(.5+.5*Math.cos(y*138)));colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
 const handMat=material('#ffffff',.87,{vertexColors:true}),hands={};
 for(const side of ['left','right']){const h=new THREE.Group();h.name=`father-${side}-hand`;const mesh=new THREE.Mesh(handGeometry(),handMat);mesh.castShadow=true;h.add(mesh);rig.add(h);hands[side]=h;}
 function shoeGeometry(){const g=new THREE.SphereGeometry(1,36,24),p=g.attributes.position,colors=[],base=new THREE.Color('#4c4b40'),sole=new THREE.Color('#292f2c');for(let i=0;i<p.count;i++){let x=p.getX(i)*.092,y=p.getY(i)*.075,z=p.getZ(i)*.178+.045;y=Math.max(-.055,y);x*=1-.12*Math.max(0,z/.22);p.setXYZ(i,x,y,z);const c=base.clone().lerp(sole,smooth((-.023-y)/.025));colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
 const shoes={};for(const side of ['left','right']){const shoe=new THREE.Mesh(shoeGeometry(),material('#ffffff',.89,{vertexColors:true}));shoe.name=`father-${side}-shoe`;shoe.castShadow=true;rig.add(shoe);shoes[side]=shoe;}
 const glass=new THREE.Group();glass.name='father-drink-glass';hands.left.add(glass);glass.position.set(.026,-.032,.060);
 const glassMat=new THREE.MeshPhysicalMaterial({color:'#c1c3b3',roughness:.13,metalness:.03,transparent:true,opacity:.27,depthWrite:false,clearcoat:1,clearcoatRoughness:.08});
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.062,.054,.17,36,1,true),glassMat);cup.position.y=.025;glass.add(cup);
 const rimMat=material('#bfc3b5',.23,{metalness:.12,transparent:true,opacity:.62,depthWrite:false});
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.062,.0034,6,36),rimMat);rim.rotation.x=Math.PI/2;rim.position.y=.11;glass.add(rim);
 const liquid=new THREE.Mesh(new THREE.CylinderGeometry(.056,.051,.053,32),material('#9a6f39',.22,{transparent:true,opacity:.75,depthWrite:false}));liquid.position.y=-.026;glass.add(liquid);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.054,.054,.008,32),rimMat);base.position.y=-.058;glass.add(base);
 // Chair geometry stays in the kitchen after the father gets up.
 const chairParts=[];
 function chairBox(w,h,d,x,y,z){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);chairParts.push(g);}
 function chairRod(a,b,r){const direction=v(...b).sub(v(...a)),geo=new THREE.CylinderGeometry(r,r,direction.length(),10);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),direction.normalize()));geo.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);chairParts.push(geo);}
 chairBox(.63,.065,.63,.60,.67,-1.05);for(const x of [.35,.85])for(const z of [-1.29,-.81])chairRod([x,.65,z],[x+(x<.6?-.025:.025),.025,z+(z<-1?-.035:.035)],.027);
 for(const x of [.35,.85])chairRod([x,.61,-1.29],[x,1.33,-1.37],.028);
 for(const y of [1.05,1.25])chairBox(.57,.095,.045,.60,y,-1.35);
 const chairGeometry=mergeGeometries(chairParts);chairGeometry.translate(0,0,.45);const chair=new THREE.Mesh(chairGeometry,wood);chair.name='father-kitchen-chair';chair.castShadow=true;chair.receiveShadow=true;group.add(chair);for(const g of chairParts)g.dispose();
 const bindDirections=Object.fromEntries(Object.entries(segments).map(([k,s])=>[k,v(...s[1]).sub(v(...s[0])).normalize()]));
 function poseBone(name,a,b){const bone=boneMap[name];bone.position.copy(a);bone.quaternion.setFromUnitVectors(bindDirections[name],b.clone().sub(a).normalize());}
 function ik(a,target,l1,l2,pole){const d=target.clone().sub(a),distance=Math.min(l1+l2-.001,Math.max(.025,d.length())),axis=d.normalize(),along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=pole.clone().sub(a);bend.addScaledVector(axis,-bend.dot(axis));if(bend.lengthSq()<.0001)bend.set(0,0,1).addScaledVector(axis,-axis.z);bend.normalize();return a.clone().addScaledVector(axis,along).addScaledVector(bend,height);}
 const lengths={upper:v(...segments.leftUpper[1]).distanceTo(v(...segments.leftUpper[0])),lower:v(...segments.leftLower[1]).distanceTo(v(...segments.leftLower[0])),thigh:v(...segments.leftThigh[1]).distanceTo(v(...segments.leftThigh[0])),shin:v(...segments.leftShin[1]).distanceTo(v(...segments.leftShin[0]))};
 let lastTime=0,lastX=6.6,lastZ=-.80,gait=0,lastPhase='sleep';
 const metadata={tableSpace:true,model:'continuous-skinned-surfaces',standingHeight:2.18,hair:'brown-and-grey',chair:{x:.60,seatY:.67,z:-.60},tableSurfaceY:1.12,headRest:{x:.20,y:1.18,z:.12},glass:{height:.17,radius:.062},pose:'sleep',drawSurfaces:surfaces.length,triangles:surfaces.reduce((s,m)=>s+m.geometry.index.count/3,0)};
 function update(time=0,state=null){
  const t=Number.isFinite(time)?time:0,phase=state?.fatherPhase??(state?.phase&&state.phase!=='walk'?state.phase:'sleep')??'sleep',phaseTime=Math.max(0,state?.fatherPhaseTime??state?.phaseTime??0),dt=Math.min(.1,Math.max(0,t-lastTime));
  const x=Number.isFinite(state?.fatherX)?state.fatherX:6.6,y=Number.isFinite(state?.fatherY)?state.fatherY:0,z=Number.isFinite(state?.fatherZ)?state.fatherZ:-.80,face=state?.fatherFace===-1?-1:1;
  if(phase==='sleep'||phase!==lastPhase&&phase==='rising')gait=0;
  else if(!['watch','catch','throw','batter','shove','window','retrieve'].includes(phase))gait+=Math.min(.3,Math.hypot(x-lastX,z-lastZ))*Math.PI*2/.75;
  lastTime=t;lastX=x;lastZ=z;lastPhase=phase;
  const rise=phase==='sleep'?0:phase==='rising'?smooth(phaseTime/1.05):1,awake=phase!=='sleep',walking=(phase==='chase'||phase==='follow'||phase==='breach'||phase==='rising'&&phaseTime>1.0),weight=walking?clamp((state?.fatherSpeed??1.9)/2.4):0;
  let heading=face*Math.PI/2;
  if(phase==='sleep')heading=0;
  else if(phase==='rising')heading=phaseTime<1.7?smooth((phaseTime-.85)/.35)*Math.PI/2:(1-smooth((phaseTime-1.7)/.22))*Math.PI/2+smooth((phaseTime-2.2)/.30)*Math.PI/2;
  rig.position.set(x-6,y,z+.2);rig.rotation.y=heading;
  const breath=phase==='watch'?0:Math.sin(t*.93)*.006,bob=walking?Math.sin(gait*2)*.012*weight:0;
  const pelvis=lerp(v(0,.82,0),v(0,.965+bob,0),rise),shoulder=lerp(v(-.27,1.30,.40),v(0,1.59+bob+breath,walking?.060:.015),rise),torsoQ=new THREE.Quaternion().setFromUnitVectors(v(0,1,0),shoulder.clone().sub(pelvis).normalize());
  const pickup=phase==='retrieve'?smooth(phaseTime/.35)*(1-smooth((phaseTime-.55)/.20)):0;
  if(pickup>0){pelvis.y-=.47*pickup;const lean=.92*pickup;shoulder.copy(pelvis).add(v(0,.625*Math.cos(lean),.625*Math.sin(lean)));torsoQ.setFromUnitVectors(v(0,1,0),shoulder.clone().sub(pelvis).normalize());}
  if(phase==='window'){const p=clamp(state?.fatherWindowProgress??phaseTime/1.35),brace=Math.sin(p*Math.PI);shoulder.add(v(0,-.10*brace,.22*brace));torsoQ.setFromUnitVectors(v(0,1,0),shoulder.clone().sub(pelvis).normalize());}
  const torsoTop=pelvis.clone().add(v(0,.625,0).applyQuaternion(torsoQ));poseBone('pelvis',pelvis,pelvis.clone().add(v(0,.1,0)));poseBone('torso',pelvis,torsoTop);
  for(const [side,sign,offset]of[['left',-1,0],['right',1,Math.PI]]){
   const angle=gait+offset,swing=walking?Math.sin(angle):0,stride=walking?Math.cos(angle)*.235*weight:0;
   const hip=pelvis.clone().add(v(sign*.128,0,0));
   const foot=lerp(v(sign*.24-.035,.13,.32),v(sign*.143,.13+Math.max(0,swing)*.095*weight,stride+.025),rise);
   if(phase==='window'){const p=clamp(state?.fatherWindowProgress??phaseTime/1.35),lift=Math.sin(Math.PI*clamp(side==='left'?p*1.5:(p-.30)*1.5));foot.y+=Math.max(0,lift)*.39;foot.z+=Math.sin(p*Math.PI)*.20;}
   const knee=ik(hip,foot,lengths.thigh,lengths.shin,v(sign*.15,.49,.42));
   poseBone(`${side}Thigh`,hip,knee);poseBone(`${side}Shin`,knee,foot);shoes[side].position.copy(foot).add(v(0,-.075,.025));shoes[side].rotation.set(walking?-.16*Math.max(0,swing):0,sign*.045,0);
   const armShoulder=shoulder.clone().add(v(sign*.282,-.025,0).applyQuaternion(torsoQ));
   let target;
   if(side==='left')target=lerp(v(-.90,1.245,.80),v(-.300,1.23+bob,.245),rise);
   else target=lerp(v(-.42,1.21,.72),v(.32,1.015+bob,.020-swing*.10*weight),rise);
   let pole=side==='left'?v(-.85,1.18,.53):v(.30,1.18,.70);
   pole.lerp(v(sign*.56,1.27,.10),rise);
   if(phase==='watch'){target=v(sign*.32,1.00,.020);pole=v(sign*.55,1.30,.12);}
   if(phase==='retrieve'){
    target.lerp(side==='left'?v(-.05,.13,.35):v(.30,.65,.35),pickup);
    pole.lerp(v(sign*.43,.61,.50),pickup);
   }
   if((phase==='throw'||phase==='catch')&&side==='left'){
    const p=clamp(phase==='throw'?(state?.throwProgress??phaseTime/.95):(state?.attackProgress??phaseTime/1.4)),wind=smooth(p/.32),strike=smooth((p-.30)/.26),recover=smooth((p-.62)/.38);
    const caughtHeight=Math.max(0,state?.caught?.startY??0)*(1-smooth(state?.caught?.fallProgress??0));
    target.lerp(v(phase==='catch'?-.10:-.27,1.99,-.13),wind);target.lerp(phase==='catch'?v(-.10,1.35+caughtHeight,.60):v(-.23,1.56,.72),strike);target.lerp(v(-.31,1.09,.24),recover);pole=v(-.65,1.73,.08);
   }
   if(phase==='shove'){const p=clamp(state?.shoveProgress??phaseTime/.8);target=v(sign*.24,1.10,.40+.28*Math.sin(p*Math.PI));pole=v(sign*.49,1.26,.20);}
   if(phase==='window'){const p=clamp(state?.fatherWindowProgress??phaseTime/1.35),brace=Math.sin(Math.PI*p);target=v(sign*.25,1.47-.18*brace,.48+.16*brace);pole=v(sign*.47,1.35,.25);}
   if((phase==='batter'||phase==='breach')&&side==='right'){const p=.5+.5*Math.sin(phaseTime*7);target=v(.19,1.42,.32+p*.22);pole=v(.55,1.37,.10);}
   const elbow=ik(armShoulder,target,lengths.upper,lengths.lower,pole);poseBone(`${side}Upper`,armShoulder,elbow);poseBone(`${side}Lower`,elbow,target);
   hands[side].position.copy(target);hands[side].rotation.set(phase==='throw'&&side==='left'?-.7*smooth((state?.throwProgress??phaseTime/.95)-.15):0,0,side==='left'?.08:-.06);
  }
  head.group.position.copy(lerp(v(-.45,1.235,.58),v(0,1.675+bob+breath,.010+(walking?.055:0)),rise));
  if(pickup>0)head.group.position.add(v(0,-.71*pickup,.32*pickup));
  if(phase==='window'){const p=clamp(state?.fatherWindowProgress??phaseTime/1.35);head.group.position.add(v(0,-.12*Math.sin(p*Math.PI),.19*Math.sin(p*Math.PI)));}
  head.group.rotation.set(mix(1.02,phase==='watch'?.85:phase==='retrieve'?.035+.82*pickup:phase==='window'?.24:walking?.08:.035,rise),mix(-.35,0,rise),mix(-.14,0,rise));head.eyeGroup.visible=awake&&rise>.45;
  glass.visible=(!state?.glassThrown||!!state?.glassRetrieved)&&!(phase==='throw'&&(state?.throwProgress??phaseTime/.95)>.53);
  group.updateWorldMatrix(true,true);metadata.pose=phase;metadata.glassHeld=glass.visible;metadata.height=phase==='sleep'?1.6:2.18;metadata.animation={gait,heading,rise,walking};metadata.contacts={leftHand:hands.left.position.toArray(),rightHand:hands.right.position.toArray(),head:head.group.position.toArray()};
  metadata.probes=Object.fromEntries([['root',rig],['head',head.group],['leftHand',hands.left],['rightHand',hands.right],['leftFoot',shoes.left],['rightFoot',shoes.right],['chest',boneMap.torso],['glass',glass]].map(([name,obj])=>[name,obj.getWorldPosition(v()).toArray()]));
  const bounds=new THREE.Box3();for(const point of Object.values(metadata.probes))bounds.expandByPoint(v(...point));bounds.expandByScalar(.19);metadata.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
 }
 update(0);
 group.userData.father=metadata;
 return {group,metadata,update};
}
