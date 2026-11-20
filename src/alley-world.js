import {ALLEY} from './alley.js';
import {createAlleyActors} from './alley-actors.js';

// A continuous side-on route through a row of concrete and sheet-metal
// garages. The workshop is a real foreground branch around the locked gate.
export function createAlleyWorld(THREE,scene){
  const group=new THREE.Group();group.name='garage-alley-world';group.visible=false;scene.add(group);
  const rand=n=>{const x=Math.sin(n*127.13+19.73)*43758.5453;return x-Math.floor(x);};
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const material=(color,roughness=.94,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  function surface(kind,size=256){
    // These maps modulate an already-coloured material. Keeping their base
    // light avoids multiplying the gloomy paint into an unreadable black.
    const pixels=new Uint8Array(size*size*4),base=kind==='mud'?[157,151,132]:kind==='rust'?[205,195,175]:[211,214,201];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const n=rand(x*13.1+y*71.3),cloud=Math.sin(x*.033+Math.sin(y*.021)*2)*Math.cos(y*.018),grain=(n-.5)*(kind==='mud'?63:35),streak=kind==='rust'?Math.max(0,Math.sin(x*.27+Math.sin(x*.018)*2))*Math.sin(y*.008)*22:0;
      const i=(y*size+x)*4;for(let c=0;c<3;c++)pixels[i+c]=clamp(base[c]+cloud*10+grain-streak*(c===2?1.2:.7),0,255);pixels[i+3]=255;
    }
    const map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.anisotropy=4;map.needsUpdate=true;return map;
  }
  const concreteMap=surface('concrete'),mudMap=surface('mud'),rustMap=surface('rust');
  concreteMap.repeat.set(2,2);mudMap.repeat.set(45,8);rustMap.repeat.set(3,3);
  const bump=map=>{const b=map.clone();b.colorSpace=THREE.NoColorSpace;return b;};
  const concrete=material('#72766a',.98,{map:concreteMap,bumpMap:bump(concreteMap),bumpScale:.024});
  const dirtyConcrete=material('#535e57',.99,{map:concreteMap,bumpMap:bump(concreteMap),bumpScale:.017});
  const mud=material('#605e50',.94,{map:mudMap,bumpMap:bump(mudMap),bumpScale:.023});
  const wetMud=material('#4b5149',.49,{map:mudMap,metalness:.08});
  const steel=material('#414b49',.69,{metalness:.5,map:rustMap,bumpMap:bump(rustMap),bumpScale:.007});
  const rust=material('#79573c',.98,{map:rustMap}),iron=material('#273632',.80,{metalness:.48});
  const zinc=material('#84928c',.42,{metalness:.7}),black=material('#172321',.99),wood=material('#76644c',.98,{map:rustMap});
  const tire=material('#1f2726',.97),brick=material('#755b47',.99),mortar=material('#6a6c5c',1);
  const grass=material('#4a523a',1),leaves=material('#74694a',1,{side:THREE.DoubleSide});
  const doorPaint=[material('#737562',.93,{map:rustMap}),material('#6d6350',.92,{map:rustMap}),material('#6f7775',.91,{map:rustMap}),material('#715953',.95,{map:rustMap}),material('#909183',.98,{map:rustMap})];
  const paleGlass=material('#29434a',.41,{metalness:.2}),warmGlass=material('#baa174',.54,{emissive:'#e4bb77',emissiveIntensity:.68});
  const lampGlass=material('#e1bd83',.42,{emissive:'#ffcb88',emissiveIntensity:2.2}),yellow=material('#b49b47',.71,{metalness:.42});
  const wet=material('#344b4d',.12,{metalness:.34,transparent:true,opacity:.49,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const puddlePixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5),a=clamp((1-r)*6);puddlePixels[i]=puddlePixels[i+1]=puddlePixels[i+2]=255;puddlePixels[i+3]=Math.round(a*255);}
  const puddleMap=new THREE.DataTexture(puddlePixels,64,64);puddleMap.needsUpdate=true;wet.map=puddleMap;
  const batches=new Map(),dummy=new THREE.Object3D(),props=[],surfaces=[],garages=[],lights=[],windows=[];
  let currentParent=group;
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),plane:new THREE.PlaneGeometry(1,1)};
  const floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  function instance(type,mat,pos,scale,q=null,shadow=false,parent=currentParent){
    // Long ground slabs span several cells and must survive culling at entry.
    const zone=parent===group?(scale[0]>26?'continuous':Math.floor(pos[0]/26)):'dynamic',key=`${type}/${mat.uuid}/${shadow}/${parent.uuid}/${zone}`;
    if(!batches.has(key))batches.set(key,{type,mat,shadow,parent,zone,matrices:[]});dummy.position.set(...pos);dummy.scale.set(...scale);dummy.quaternion.identity();if(q)dummy.quaternion.copy(q);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
  }
  function box(w,h,d,x,y,z,mat=concrete,shadow=false,parent=currentParent){instance('box',mat,[x,y,z],[w,h,d],null,shadow,parent);}
  function rod(a,b,r=.026,mat=iron,parent=currentParent){const direction=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));instance('cylinder',mat,a.map((v,i)=>(v+b[i])/2),[r,direction.length(),r],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()),false,parent);}
  function mesh(geometry,mat,parent=currentParent,shadow=false){const m=new THREE.Mesh(geometry,mat);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
  function solid(id,area,min,max,extra={}){const p={id,area,bounds:{min,max},...extra};props.push(p);return p;}
  function plane(w,h,x,y,z,mat,q=null,parent=group){instance('plane',mat,[x,y,z],[w,h,1],q,false,parent);}
  function practical(x,y,z,intensity=7,color='#dcba86',parent=currentParent){const light=new THREE.PointLight(color,intensity,10,2);light.position.set(x,y,z);parent.add(light);lights.push({light,base:intensity,x});return light;}
  const cloudFill=new THREE.HemisphereLight('#a6bac0','#49493e',.65);group.add(cloudFill);
  // The lane is visibly muddy but its walking surface is continuous and flat.
  box(226,.34,48,98,-.23,-2,mud);box(122,.10,2.35,57,-.05,1.4,wetMud);
  box(90,.10,2.35,150,-.05,4.2,wetMud);box(3.5,.10,4.0,108.5,-.05,2.8,wetMud);
  surfaces.push({id:'alley-ground',minX:0,maxX:116,y:0,minZ:.20,maxZ:2.60},{id:'workshop-yard-ground',minX:107,maxX:194,y:0,minZ:3.0,maxZ:5.40},{id:'garage-approach-ground',minX:106.75,maxX:110.25,y:0,minZ:1.4,maxZ:5.4});
  for(let n=0;n<150;n++){
    const x=rand(n+31)*198,z=-6.2+rand(n+117)*13.2,nearMain=z>.25&&z<2.55&&x<117,nearSide=z>3.02&&z<5.38&&x>107;
    plane(.5+rand(n+217)*2.8,.21+rand(n+319)*1.1,x,nearMain||nearSide?.003:-.051,z,wet,floorQ);
  }
  for(let i=0;i<330;i++){
    const x=2+rand(i+401)*192,z=-5.4+rand(i+991)*11.6;
    if(Math.abs(z-1.4)<.62&&x<117||Math.abs(z-4.2)<.62&&x>107)continue;
    const debris=i%3===0?rust:i%3===1?dirtyConcrete:wood;box(.025+rand(i+1509)*.09,.018,.025+rand(i+1911)*.075,x,-.025,z,debris);
  }
  for(let x=1;x<195;x+=8.5){box(.55,.018,.30,x,.008,x<117?2.64:5.44,iron);for(let n=0;n<8;n++)box(.027,.007,.27,x-.23+n*.064,.021,x<117?2.64:5.44,black);}
  // Garage fronts face the camera; the roof ridges, handles and locks are all
  // geometry. Doors remain distinct silhouettes rather than painted facades.
  function garage(x,w,seed,{frontZ=-.8,height=3.05,open=false,number=true}={}){
    const depth=4.8,paint=doorPaint[seed%doorPaint.length],back=frontZ-depth;
    box(.23,height,depth,x-w/2,height/2,(frontZ+back)/2,seed%3===0?brick:concrete,true);box(.23,height,depth,x+w/2,height/2,(frontZ+back)/2,concrete,true);
    box(w,.24,depth,x,height-.10,(frontZ+back)/2,dirtyConcrete);box(w,height,.20,x,height/2,back,dirtyConcrete);
    box(w+.20,.13,depth+.20,x,height+.04,(frontZ+back)/2,rust,true);
    const pitch=Math.atan2(.53,w/2),roofHalf=Math.hypot(w/2,.53);
    for(const side of[-1,1])instance('box',rust,[x+side*w/4,height+.365,(frontZ+back)/2],[roofHalf+.17,.075,depth+.25],new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-side*pitch),true);
    for(let xx=x-w/2;xx<x+w/2;xx+=.22)box(.045,.025,depth+.25,xx,height+.15+.53*(1-Math.abs((xx-x)/(w/2))),(frontZ+back)/2,steel);
    // Small gables make the skyline of the reference read from a side view.
    const gable=new THREE.Shape();gable.moveTo(-w/2,0);gable.lineTo(0,.53);gable.lineTo(w/2,0);gable.closePath();const g=mesh(new THREE.ShapeGeometry(gable),paint);g.position.set(x,height+.1,frontZ+.035);
    for(const side of[-1,1]){const a=[x+side*w/2,height+.1,frontZ+.07],b=[x,height+.64,frontZ+.07];rod(a,b,.038,rust);}
    const doorTop=open?height:height-.18,doorBottom=open?1.95:.06;
    box(w-.37,doorTop-doorBottom,.075,x,(doorTop+doorBottom)/2,frontZ+.015,paint,true);
    if(!open){
      for(const dx of[-.025,.025])box(.018,height-.34,.022,x+dx,(height-.18)/2,frontZ+.065,black);
      for(const y of[.28,height-.43])for(const side of[-1,1]){box(.29,.06,.032,x+side*(w/2-.29),y,frontZ+.086,iron);rod([x+side*(w/2-.17),y-.08,frontZ+.085],[x+side*(w/2-.17),y+.08,frontZ+.085],.023,rust);}
      for(const side of[-1,1]){rod([x+side*.13,1.17,frontZ+.085],[x+side*.13,1.32,frontZ+.085],.018,iron);}
      box(.12,.15,.055,x,1.10,frontZ+.102,rust);
      for(let k=0;k<7;k++)box(.016,.006,depth*.7,x-w*.33+k*w*.1,height+.14,back+depth*.5,black);
    }
    garages.push({id:`garage-${seed}`,x,width:w,height,frontZ,open,bounds:{min:[x-w/2-.12,0,back-.12],max:[x+w/2+.12,height+.64,frontZ+.12]}});
    // Faded rectangle marks and peeling patches stay part of the material.
    for(let k=0;k<5;k++){const xx=x-w*.4+rand(seed+k*31)*w*.8,yy=.3+rand(seed+k*43)*2.2;box(.06+rand(seed+k*71)*.3,.02+rand(seed+k*97)*.09,.008,xx,yy,frontZ+.058,seed%2?rust:dirtyConcrete);}
  }
  for(const[x,w,seed]of[[3.5,6.2,11],[10.2,6.6,13],[17.1,6.8,15],[24.1,6.7,18],[31.4,7.0,21],[38.8,7.2,23],[47.0,7.4,26],[61.8,7.5,31],[88.4,7.5,37],[96.5,7.8,41],[104.7,7.6,44]])garage(x,w,seed);
  garage(75.4,7.1,33,{open:true});
  // A kennel, worn bowl and slack chain explain the territorial dog's place.
  box(1.10,.66,.82,22.0,.33,-.65,wood);box(.46,.48,.04,22.0,.24,-.215,black);
  box(1.23,.08,.98,22.0,.73,-.65,rust);rod([21.38,.69,-.18],[22.0,.96,-.18],.035,wood);rod([22.0,.96,-.18],[22.62,.69,-.18],.035,wood);
  const bowl=mesh(new THREE.CylinderGeometry(.19,.14,.075,20,1,true),zinc);bowl.position.set(24.3,.04,.1);
  solid('dog-kennel','alley',[21.4,0,-1.15],[22.6,.96,-.15]);
  // Finished iron mesh barrier. Its top is a real vault target reached from
  // the child's movable timber crates rather than an invisible trigger.
  function fence(x,z0,z1,h,id,area){
    for(const z of[z0,z1]){box(.09,h+.12,.09,x,(h+.12)/2,z,iron,true);box(.16,.04,.16,x,h+.14,z,zinc);}
    for(const y of[.13,h-.08])rod([x,y,z0],[x,y,z1],.025,iron);
    for(let z=z0+.14;z<z1;z+=.20)rod([x,.15,z],[x,h-.1,z],.012,steel);
    for(let y=.25;y<h-.18;y+=.32){rod([x-.015,y,z0+.06],[x-.015,Math.min(h-.12,y+.50),z1-.06],.006,steel);}
    box(.16,.18,.07,x+.07,1.06,(z0+z1)/2,rust);
    return solid(id,area,[x-.095,0,z0-.09],[x+.095,h+.17,z1+.09],{climbable:id===ALLEY.fence.id,topY:h});
  }
  const climbFence=fence(55,.25,2.60,2.35,'alley-fence','alley');
  const lockedGate=fence(116,.02,2.72,2.70,'locked-alley-gate','alley');
  for(const x of[.12,194.0]){rod([x,0,-.25],[x,2.4,-.25],.045,iron);rod([x,0,2.75],[x,2.4,2.75],.045,iron);}
  // Low camera-side foundations imply the opposite garage row without a
  // roof beam crossing the playable silhouette in the side-on camera.
  for(const[x,seed]of[[8,51],[35,57],[64,61],[93,67]]){
    box(10,.16,1.25,x,.02,7.8,dirtyConcrete);
  }
  // Old cars have shaped cabins and separate glass, wheels, grills and an
  // open bonnet, not a silhouette image pasted onto the background.
  function oldCar(x,z,seed,{hood=false,van=false}={}){
    const paint=doorPaint[seed%doorPaint.length],w=van?5.0:4.4;
    box(w,.51,1.68,x,.63,z,paint,true);box(w-.12,.13,1.74,x,.40,z,steel);
    box(van?3.55:2.45,.57,1.40,x+(van?.22:.12),1.17,z,paint,true);
    box(van?3.30:2.20,.40,.024,x+(van?.22:.12),1.20,z+.716,paleGlass);
    for(const dx of[-.67,.66])box(.033,.42,.035,x+dx+.08,1.20,z+.739,steel);
    box(.58,.30,1.42,x-w/2+.40,1.18,z,paleGlass);
    for(const dx of[-w*.32,w*.32])for(const zz of[z-.82,z+.82]){
      const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);instance('cylinder',tire,[x+dx,.31,zz],[.31,.14,.31],q,true);instance('cylinder',zinc,[x+dx,.31,zz+(zz>z?.08:-.08)],[.17,.015,.17],q);
    }
    box(.075,.14,1.63,x-w/2-.04,.48,z,zinc);box(.075,.14,1.63,x+w/2+.04,.48,z,steel);
    for(const zz of[z-.56,z+.56])box(.018,.16,.28,x-w/2-.082,.72,zz,warmGlass);
    if(hood){
      const pivot=new THREE.Group();pivot.position.set(x-.9,1.01,z);pivot.rotation.z=-.72;group.add(pivot);box(1.23,.055,1.62,-.615,0,0,paint,true,pivot);
      box(1.1,.36,1.32,x-1.45,.91,z,black);for(let k=0;k<5;k++)box(.10,.13,.60,x-1.8+k*.16,1.13,z,iron);
    }
    return solid(`old-${van?'van':'car'}-${seed}`,x>140?'yard':'alley',[x-w/2-.10,0,z-.96],[x+w/2+.10,1.52,z+.96]);
  }
  oldCar(76.3,-2.38,2,{hood:true});oldCar(83.5,-2.38,4);oldCar(99.4,-3.0,1);
  // Backdrop apartment windows give the lane depth and a source for the TV.
  function block(x,w,height,z,seed){
    box(w,height,4.1,x,height/2,z-2.1,seed%2?dirtyConcrete:concrete);
    for(let yy=2.1;yy<height-.8;yy+=2.75)for(let xx=x-w/2+1.15;xx<x+w/2-.6;xx+=2.05){
      const lit=rand(seed+xx*11+yy*7)>.88;box(.86,1.18,.035,xx,yy,z,black);box(.72,1.04,.021,xx,yy,z+.025,lit?warmGlass:paleGlass);
      for(const dx of[-.41,.41])box(.033,1.2,.07,xx+dx,yy,z+.06,steel);box(.89,.075,.20,xx,yy-.64,z+.055,dirtyConcrete);box(.026,1.13,.065,xx,yy,z+.06,steel);
    }
    box(w+.24,.16,4.4,x,height+.04,z-2.0,dirtyConcrete);
    rod([x-w*.25,.2,z+.12],[x-w*.25,height-.2,z+.12],.035,steel);
  }
  for(const[x,w,h,z,seed]of[[15,18,13,-14,71],[42,21,16,-19,73],[80,20,15,-14,79],[112,20,12,-11,83],[154,19,14,-13,89],[182,21,18,-21,97]])block(x,w,h,z,seed);
  for(let x=5;x<193;x+=11){rod([x,5.8,-5],[x+11,5.45,-5.1],.014,black);}
  // A small upstairs room reacts to the first loud scrape of the jack.
  box(8.2,3.1,3.8,113.7,4.65,-.80,concrete);box(1.37,1.53,.09,113.2,4.73,1.15,black);
  const heardWindow=mesh(new THREE.PlaneGeometry(1.18,1.34),material('#1c3036',.54,{emissive:'#e2b875',emissiveIntensity:0}));heardWindow.position.set(113.2,4.73,1.205);
  for(const dx of[-.65,.65])box(.055,1.57,.12,113.2+dx,4.73,1.23,steel);box(1.38,.06,.12,113.2,5.51,1.23,steel);box(1.46,.10,.25,113.2,3.91,1.25,dirtyConcrete);box(.039,1.47,.09,113.2,4.73,1.28,steel);
  const heardLight=practical(113.2,4.65,1.58,0,'#e6ba77');
  const tvMaterial=material('#66868c',.58,{emissive:'#91b6c2',emissiveIntensity:.48});box(1.24,1.49,.055,90.3,5.80,-10.87,black);box(1.10,1.34,.024,90.3,5.80,-10.82,tvMaterial);windows.push({id:'television-window',x:90.3,y:5.8,z:-10.82});
  // Real workshop shell. The near wall and roof are removed from the cutaway
  // view only after the boy steps inside; the back wall/props keep depth.
  const workshopExterior=new THREE.Group();workshopExterior.name='workshop-camera-side-shell';group.add(workshopExterior);
  const workshopBack=new THREE.Group();workshopBack.name='workshop-interior-back-wall';group.add(workshopBack);
  const workshopContents=new THREE.Group();workshopContents.name='workshop-interior-clutter';group.add(workshopContents);
  box(27.8,3.25,.16,124.0,1.625,2.92,dirtyConcrete,true,workshopBack);
  // The resident reaches the workshop through this enclosed service stair,
  // rather than descending visibly through the exterior garage walls.
  for(const dx of[-.57,.57])box(.095,2.22,.10,113.6+dx,1.11,3.045,iron,false,workshopBack);
  box(1.23,.10,.10,113.6,2.27,3.045,iron,false,workshopBack);
  const serviceDoor=new THREE.Group();serviceDoor.name='resident-service-door';serviceDoor.position.set(113.05,0,3.055);workshopBack.add(serviceDoor);
  box(1.10,2.16,.055,.55,1.08,0,doorPaint[1],false,serviceDoor);
  box(.38,.55,.025,.55,1.55,.04,black,false,serviceDoor);
  rod([.94,.98,.045],[.94,.98,.17],.018,zinc,serviceDoor);
  box(27.8,3.25,.15,124.0,1.625,5.56,concrete,true,workshopExterior);
  box(28.2,.14,3.1,124.0,3.25,4.24,rust,true,workshopExterior);
  for(let x=110.0;x<138.2;x+=.23)box(.045,.026,3.18,x,3.34,4.24,steel,false,workshopExterior);
  box(.18,3.20,.26,110,1.60,2.96,concrete,true);box(.18,3.20,.26,110,1.60,5.44,concrete,true);box(.23,.22,2.65,110,3.17,4.2,dirtyConcrete);
  solid('workshop-back-wall','garage',[110.10,0,2.84],[137.90,3.25,3.00],{wall:true});
  solid('workshop-near-wall','garage',[110.10,0,5.485],[137.90,3.25,5.635],{wall:true,cutaway:true});
  solid('workshop-roof','garage',[109.90,3.18,2.69],[138.10,3.35,5.79],{ceiling:true,cutaway:true});
  const shutter=new THREE.Group();shutter.name='jammed-workshop-shutter';group.add(shutter);
  for(let i=0;i<23;i++){box(.095,.127,2.29,0,(i+.5)*3.02/23,0,doorPaint[2],true,shutter);box(.016,.012,2.27,-.059,(i+1)*3.02/23,0,steel,false,shutter);}
  box(.16,.075,2.33,-.015,.0375,0,iron,true,shutter);
  const shutterBounds=solid('jammed-workshop-shutter','garage-approach',[109.91,.22,3.02],[110.10,3.16,5.38],{dynamic:true,ceiling:true});
  const jackGroup=new THREE.Group();jackGroup.name='yellow-mechanical-jack';group.add(jackGroup);
  const jackParts=[];
  function jackBox(w,h,d,x,y,z,m=yellow){const object=mesh(new THREE.BoxGeometry(w,h,d),m,jackGroup,true);object.position.set(x,y,z);jackParts.push(object);return object;}
  const jackBase=jackBox(.36,.035,.30,0,-.10,0,steel),jackTop=jackBox(.25,.04,.25,0,.10,0,yellow),jackArms=[];
  for(const z of[-.112,.112])for(const sign of[-1,1]){const arm=mesh(new THREE.BoxGeometry(.025,1,.036),yellow,jackGroup,true);jackArms.push({mesh:arm,z,sign});}
  const jackScrew=mesh(new THREE.CylinderGeometry(.013,.013,.34,12),zinc,jackGroup);jackScrew.rotation.z=Math.PI/2;
  const carryBars=[];for(const z of[-.15,.15]){const bar=mesh(new THREE.CylinderGeometry(.012,.012,.29,10),iron,jackGroup);bar.rotation.z=Math.PI/2;bar.position.set(-.045,.06,z);carryBars.push(bar);}
  const crankRod=mesh(new THREE.CylinderGeometry(.012,.012,1,10),zinc),crankGrip=mesh(new THREE.CylinderGeometry(.022,.022,.27,12),wood);crankGrip.rotation.x=Math.PI/2;
  const jackMetadata={id:'mechanical-jack',centre:[82,.12,1.4],height:.22,bounds:{min:[81.82,.01,1.24],max:[82.18,.23,1.56]},grips:[[82,.18,1.25],[82,.18,1.55]],handle:[109.56,.78,4.2]};
  // Shelves and abandoned furniture sit entirely outside the interior lane.
  currentParent=workshopContents;
  for(const[x,w]of[[115.1,4.2],[121.5,3.9],[133.2,3.7]]){
    for(const xx of[x-w/2,x+w/2])rod([xx,0,3.17],[xx,2.65,3.17],.025,iron);
    for(const y of[.38,1.05,1.72,2.38]){box(w,.045,.43,x,y,3.15,wood);for(let i=0;i<5;i++)box(.13+rand(i+x)*.2,.12+rand(i+x+23)*.3,.21,x-w*.39+i*w*.18,y+.17,3.17,i%3?steel:rust);}
    solid(`tool-shelf-${x}`,'garage',[x-w/2-.05,0,2.94],[x+w/2+.05,2.68,3.40]);
  }
  for(let i=0;i<9;i++){
    const x=114.1+(i%3)*.51,y=.28+Math.floor(i/3)*.47,z=5.12;
    const tireMesh=mesh(new THREE.TorusGeometry(.25,.08,10,24),tire);tireMesh.position.set(x,y,z);if(i%2)tireMesh.rotation.y=.12;
  }
  solid('stacked-workshop-tires','garage',[113.73,0,4.92],[115.48,1.58,5.36]);
  box(2.5,.13,.58,130.4,1.00,3.19,wood,true);for(const x of[129.35,131.45])for(const z of[2.98,3.4])box(.07,.94,.07,x,.47,z,steel);
  solid('workbench','garage',[129.13,0,2.89],[131.67,1.08,3.48]);
  for(let i=0;i<12;i++){const x=128.3+rand(i+313)*5.3,y=1.25+rand(i+513)*1.25;rod([x,y,3.024],[x+.14,y+.05,3.024],.016,zinc);box(.06,.07,.022,x+.16,y+.05,3.024,iron);}
  box(1.14,.96,.52,122.3,.48,5.10,wood,true);for(const y of[.22,.56,.82]){box(.98,.025,.025,122.3,y,5.38,iron);box(.16,.022,.055,122.3,y+.09,5.42,zinc);}
  solid('discarded-dresser','garage',[121.69,0,4.81],[122.91,.98,5.45]);
  for(const x of[112.8,119.7,126.6,133.5]){
    practical(x,2.80,4.0,16);
    rod([x,3.15,4],[x,2.91,4],.013,iron);
    box(.68,.055,.31,x,2.88,4,iron);box(.57,.024,.24,x,2.84,4,lampGlass);
  }
  currentParent=group;
  // The rear opening is cut into the side wall, with a real hinged frame.
  box(.18,1.55,2.65,137.8,.775,4.2,concrete,true);box(.18,.36,2.65,137.8,3.0,4.2,concrete,true);
  for(const z of[3.10,5.30])box(.18,1.35,.45,137.8,2.21,z,concrete,true);
  const windowPivot=new THREE.Group();windowPivot.name='workshop-rear-window';windowPivot.position.set(137.90,1.57,3.42);group.add(windowPivot);
  for(const z of[0,1.56])box(.065,1.17,.06,0,.585,z,wood,false,windowPivot);for(const y of[0,1.17])box(.065,.06,1.62,0,y,.78,wood,false,windowPivot);
  box(.025,1.06,1.44,0,.585,.78,material('#809b9c',.18,{transparent:true,opacity:.16,depthWrite:false}),false,windowPivot);
  // A real latch sits at the same height/location as the child's reach target.
  box(.035,.135,.065,-.10,.30,.78,iron,false,windowPivot);
  rod([-.10,.30,.78],[-.10,.30,.92],.018,zinc,windowPivot);
  box(.45,.095,1.85,137.86,1.55,4.2,dirtyConcrete,true);
  const rearWindow={x:137.8,sillY:1.55,topY:2.80,lane:4.2,hinge:[137.90,1.57,3.42],localHandle:[-.10,.30,.78],handle:[137.8,1.87,4.2],angle:0,aperture:{min:[137.68,1.60,3.48],max:[138.03,2.72,4.96]},openProgress:0};
  solid('workshop-rear-sill','garage',[137.635,0,2.875],[138.085,1.60,5.525],{wall:true,climbable:true,topY:1.55});
  // Movable crates use the same sizes as gameplay and are never scenery-only.
  const crateDefaults=ALLEY.crates.map(c=>({...c})),crateObjects=new Map();
  function crateGeometry(config){
    const parent=new THREE.Group();parent.name=config.id;group.add(parent);const h=config.y,w=config.w,d=.76;
    box(w,h,d,0,h/2,0,wood,true,parent);
    for(const side of[-1,1])for(const yy of[.09,h-.09])box(w+.025,.085,.04,0,yy,side*(d/2+.018),rust,false,parent);
    for(const x of[-w/2+.09,w/2-.09])box(.09,h,.045,x,h/2,d/2+.04,dirtyConcrete,false,parent);
    for(let i=1;i<5;i++)box(.013,h-.04,.008,-w/2+i*w/5,h/2,d/2+.024,iron,false,parent);
    const diagonal=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan2(h-.20,w-.20));instance('box',dirtyConcrete,[0,h/2,d/2+.062],[Math.hypot(w-.20,h-.20),.068,.038],diagonal,false,parent);
    const prop=solid(config.id,config.id==='garage-crate'?'garage':'alley',[config.x-w/2,0,config.z-d/2],[config.x+w/2,h,config.z+d/2],{dynamic:true,climbable:true,topY:h});
    parent.position.set(config.x,0,config.z);crateObjects.set(config.id,{parent,prop,w,h,d});
  }
  crateDefaults.forEach(crateGeometry);
  // The final court has readable low cover, while the proprietor's route is
  // behind it. Their overlap in the side view is intentional concealment.
  const cover=[];
  for(const [i,id]of['low-yard-wall','stacked-yard-timber','far-yard-wall'].entries()){
    const [a,b]=ALLEY.yard.covers[i],x=(a+b)/2,w=b-a,h=i===1?1.03:1.08;
    box(w,h,.52,x,h/2,2.72,id.includes('timber')?wood:concrete,true);box(w+.08,.07,.61,x,h+.035,2.72,id.includes('timber')?rust:dirtyConcrete);
    cover.push(solid(id,'yard',[x-w/2-.04,0,2.40],[x+w/2+.04,h+.07,3.04],{cover:true,coverTopY:h+.07}));
  }
  oldCar(170.8,.25,3,{van:true});
  for(const[x,w,seed]of[[147,10,51],[160.3,11.3,53],[175,12.7,57],[189.2,11.5,61]])garage(x,w,seed,{frontZ:-1.6,height:3.2});
  for(let i=0;i<90;i++){
    const x=140+rand(i+331)*53,z=-.5+rand(i+777)*2.2;for(let n=0;n<3;n++)rod([x,.005,z],[x+(rand(i*3+n)-.5)*.11,.055+rand(i+n*13)*.12,z+(rand(i*7+n)-.5)*.09],.004,grass);
  }
  box(.19,3.3,3.1,192.4,1.65,1.0,concrete,true);box(4.2,3.3,.18,194,1.65,2.5,concrete,true);box(4.2,.18,3.2,194,3.30,3.95,dirtyConcrete,true);
  for(const z of[3.10,5.30])rod([192.3,0,z],[192.3,2.65,z],.040,iron);rod([192.3,2.65,3.10],[192.3,2.65,5.30],.035,iron);
  for(let x=7;x<190;x+=16.5){
    const z=x<116?-.48:2.65;rod([x,0,z],[x,4.4,z],.054,iron);rod([x,4.35,z],[x+.52,4.54,z+.21],.03,iron);box(.58,.11,.32,x+.63,4.50,z+.25,iron);box(.46,.025,.25,x+.63,4.43,z+.25,lampGlass);practical(x+.63,4.30,z+.29,8.5);
  }
  // Batched geometry is grouped into short cells; distant roofs and hardware
  // do not consume draw calls while the camera is inside the workshop.
  const cellMeshes=[];
  for(const batch of batches.values()){
    const object=new THREE.InstancedMesh(geometries[batch.type],batch.mat,batch.matrices.length);batch.matrices.forEach((m,i)=>object.setMatrixAt(i,m));object.instanceMatrix.needsUpdate=true;object.castShadow=batch.shadow;object.receiveShadow=true;batch.parent.add(object);
    if(typeof batch.zone==='number')cellMeshes.push({object,center:batch.zone*26+13});
  }
  const rainCount=650,rainPositions=new Float32Array(rainCount*6),speeds=new Float32Array(rainCount);
  for(let i=0;i<rainCount;i++){const o=i*6;rainPositions[o]=rand(i+311)*44-20;rainPositions[o+1]=rand(i+733)*9;rainPositions[o+2]=-10+rand(i+997)*17;speeds[i]=8+rand(i+1163)*7;rainPositions[o+3]=rainPositions[o]-.03;rainPositions[o+4]=rainPositions[o+1]-.25;rainPositions[o+5]=rainPositions[o+2];}
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#a4bec5',transparent:true,opacity:.18,fog:true,depthWrite:false}));rain.frustumCulled=false;group.add(rain);
  const jackPoint=new THREE.Vector3(),crankEnd=new THREE.Vector3(),crankStart=new THREE.Vector3(),delta=new THREE.Vector3();
  const metadata={id:'garage-alley',length:194,route:{minX:0,maxX:194,y:0,alleyZ:1.4,garageZ:4.2,yardZ:4.2,clearHalfWidth:.60},surfaces,props,garages,
    dogDen:{x:23,y:0,z:.3},mechanic:{x:73.45,y:0,z:-1.8,hood:[74.2,1.04,-1.8]},fence:climbFence,lockedGate,
    workshop:{minX:110,maxX:137.8,lane:4.2,cutaway:true,door:shutterBounds,window:rearWindow},jack:jackMetadata,crates:crateDefaults,cover,ownerRoute:{minX:160,maxX:178,z:1.2},
    heardWindow:{x:113.2,y:4.73,z:1.205,lit:false},television:windows[0],exit:{x:192.3,y:0,z:4.2},bounds:{min:[-15,-.4,-26],max:[211,18.2,22]},drawBatches:batches.size,lights:lights.length,rainDrops:rainCount};
  const actors=createAlleyActors(THREE,group);metadata.actors=actors.metadata;
  group.userData.alley=metadata;
  let previousTime=null;
  function update(time=0,playerX=2,state=null,player=null){
    if(!group.visible)return;const dt=previousTime===null?0:Math.min(.06,Math.max(0,time-previousTime));previousTime=time;
    const area=state?.area??'alley',inside=area==='garage',gap=clamp(state?.doorGap??.22,.05,2.8);
    actors.update(time,state,player??{x:playerX});
    workshopExterior.visible=!(playerX>106&&playerX<141)&&!inside;
    workshopBack.visible=workshopContents.visible=inside||!!state?.windowClimb;
    const resident=state?.owner?.role==='garage-resident'?state.owner:state?.garageResident;
    serviceDoor.rotation.y=resident?.phase==='inspect'?-Math.sin(clamp((resident.time??0)/2)*Math.PI)*1.05:0;
    shutter.position.set(110,gap,4.2);shutter.scale.y=(3.10-gap)/3.02;shutterBounds.bounds.min[1]=gap;shutterBounds.bounds.max[1]=3.12;
    rearWindow.openProgress=clamp(state?.windowProgress??state?.windowClimb?.progress??0);windowPivot.rotation.y=rearWindow.angle=rearWindow.openProgress*Math.PI*.56;
    rearWindow.handle=windowPivot.localToWorld(new THREE.Vector3(...rearWindow.localHandle)).toArray();
    for(const config of state?.crates??crateDefaults){
      const object=crateObjects.get(config.id);if(!object)continue;const x=Number.isFinite(config.x)?config.x:object.parent.position.x,z=Number.isFinite(config.z)?config.z:object.parent.position.z;object.parent.position.set(x,0,z);object.prop.bounds.min[0]=x-object.w/2;object.prop.bounds.max[0]=x+object.w/2;object.prop.bounds.min[2]=z-object.d/2;object.prop.bounds.max[2]=z+object.d/2;
    }
    const visual=state?.jackVisual??{x:82,y:.12,z:1.4,raised:.22,carried:false},status=state?.jackStatus??state?.jack??'ground',installed=status==='installed'||status==='raised'||visual.installed;
    const height=installed?gap:.22;
    jackGroup.position.set(Number.isFinite(visual.x)?visual.x:82,Number.isFinite(visual.y)?visual.y:height/2,Number.isFinite(visual.z)?visual.z:1.4);
    jackBase.position.y=-height/2+.018;jackTop.position.y=height/2-.018;jackScrew.position.y=-height/2+.10;
    const width=.17*Math.sqrt(Math.max(.15,1-(height/1.35)**2));
    for(const arm of jackArms){const a=new THREE.Vector3(arm.sign*width,-height/2+.035,arm.z),b=new THREE.Vector3(-arm.sign*width,height/2-.035,arm.z);delta.copy(b).sub(a);arm.mesh.position.copy(a).add(b).multiplyScalar(.5);arm.mesh.scale.y=delta.length();arm.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
    carryBars.forEach(bar=>bar.visible=!installed);
    jackPoint.copy(jackGroup.position);jackMetadata.centre=jackPoint.toArray();jackMetadata.height=height;jackMetadata.bounds.min=[jackPoint.x-.19,jackPoint.y-height/2,jackPoint.z-.16];jackMetadata.bounds.max=[jackPoint.x+.18,jackPoint.y+height/2,jackPoint.z+.16];jackMetadata.grips=[[jackPoint.x,jackPoint.y+.06,jackPoint.z-.15],[jackPoint.x,jackPoint.y+.06,jackPoint.z+.15]];
    jackMetadata.gripRails=[-.15,.15].map(z=>({min:[jackPoint.x-.19,jackPoint.y+.06,jackPoint.z+z],max:[jackPoint.x+.10,jackPoint.y+.06,jackPoint.z+z]}));
    crankRod.visible=crankGrip.visible=!!installed;
    if(installed){
      const handle=state?.alleyAction?.handle??{x:109.56,y:.78,z:4.2};crankEnd.set(handle.x,handle.y,handle.z);crankStart.set(109.86,.14,4.2);delta.copy(crankEnd).sub(crankStart);crankRod.position.copy(crankStart).add(crankEnd).multiplyScalar(.5);crankRod.scale.y=delta.length();crankRod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());crankGrip.position.copy(crankEnd);jackMetadata.handle=crankEnd.toArray();
    }
    const heard=!!(state?.windowLight||state?.windowLit||state?.heard||state?.owner?.awake||state?.owner?.phase&&state.owner.phase!=='idle'&&state.owner.phase!=='repair');
    metadata.heardWindow.lit=heard;heardWindow.material.emissiveIntensity=heard?1.25:0;heardWindow.material.color.set(heard?'#b79c6e':'#1c3036');heardLight.intensity=heard?5:0;
    tvMaterial.emissiveIntensity=.41+.13*Math.sin(time*7.1)+.05*Math.sin(time*19.3);
    for(const cell of cellMeshes)cell.object.visible=Math.abs(cell.center-playerX)<46;
    for(const entry of lights){entry.light.visible=Math.abs(entry.x-playerX)<25;entry.light.intensity=entry.light===heardLight?(heard?5:0):entry.base*(.985+.012*Math.sin(time*.83+entry.x));}
    rain.visible=!inside;
    for(let i=0;i<rainCount;i++){const o=i*6;rainPositions[o]-=dt*.9;rainPositions[o+1]-=speeds[i]*dt;if(rainPositions[o+1]<.02||Math.abs(rainPositions[o]-playerX)>25){rainPositions[o]=playerX-22+rand(i+time*.17)*44;rainPositions[o+1]=6+rand(i+119)*4;}rainPositions[o+3]=rainPositions[o]-.03;rainPositions[o+4]=rainPositions[o+1]-.22;rainPositions[o+5]=rainPositions[o+2];}rainGeo.attributes.position.needsUpdate=true;
  }
  update(0,2);
  return {group,metadata,actors,update};
}
