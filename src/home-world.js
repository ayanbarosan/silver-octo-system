import {HOME} from './home.js';

// A separate enclosed block: three ascending flights lead from the rear entry
// to worn apartment landings. The child's home is on the second floor.
export function createHomeWorld(THREE,scene) {
  const group=new THREE.Group();group.name='home-interior';group.visible=false;scene.add(group);
  const C=HOME,left=C.left,right=C.right,span=right-left;
  const lanes=C.lanes??[-.65,.95],stairWidth=C.stairWidth??1;
  const landingBack=-1.25,landingFront=1.65,groundBack=-1.75,groundFront=2.75;
  const landingMetadata=[],devices=[],doors=[];
  const roomLeft=.9,roomRight=15.1,roof=C.rise*C.floors+2.85,back=-1.72;
  const random=n=>{const f=Math.sin(n*117.37+63.81)*43758.5453;return f-Math.floor(f);};
  const mat=(color,roughness=.9,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  function wallTexture(lower=false) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const ctx=canvas.getContext('2d');ctx.fillStyle=lower?'#52625b':'#979282';ctx.fillRect(0,0,512,512);
    const pixels=ctx.getImageData(0,0,512,512);
    for(let i=0;i<pixels.data.length;i+=4){const v=(random(i*.7)-.5)*19;pixels.data[i]+=v;pixels.data[i+1]+=v;pixels.data[i+2]+=v;}
    ctx.putImageData(pixels,0,0);
    for(let i=0;i<48;i++){
      const x=random(i+17)*512,y=random(i+130)*512,r=8+random(i+219)*64;
      const stain=ctx.createRadialGradient(x,y,0,x,y,r);stain.addColorStop(0,lower?'rgba(19,31,28,.14)':'rgba(38,35,27,.13)');stain.addColorStop(1,'rgba(20,27,24,0)');ctx.fillStyle=stain;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    // Small flaking islands have a narrow light edge and a darker exposed core.
    for(let i=0;i<26;i++){
      const x=random(i+392)*512,y=random(i+704)*512,r=3+random(i+629)*23;
      ctx.beginPath();for(let j=0;j<11;j++){const a=j/10*Math.PI*2,s=r*(.4+random(i*43+j)*.7);const xx=x+Math.cos(a)*s,yy=y+Math.sin(a)*s*.55;if(j===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();ctx.fillStyle=lower?'#88887a':'#7c796b';ctx.fill();ctx.strokeStyle=lower?'rgba(173,177,153,.38)':'rgba(202,198,177,.4)';ctx.lineWidth=.8;ctx.stroke();
    }
    ctx.lineWidth=.6;ctx.strokeStyle='rgba(34,37,31,.23)';
    for(let i=0;i<8;i++){const x=random(i+900)*512,y=random(i+932)*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=1;j<5;j++)ctx.lineTo(x+j*3+random(i*11+j)*4,y+j*7+random(i*9+j)*5);ctx.stroke();}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2.8,1);texture.anisotropy=4;return texture;
  }
  const upperMap=wallTexture(),lowerMap=wallTexture(true),relief=upperMap.clone();relief.colorSpace=THREE.NoColorSpace;
  const plaster=mat('#8e8c7c',.98,{map:upperMap,bumpMap:relief,bumpScale:.026});
  const paint=mat('#77857a',.93,{map:lowerMap,bumpMap:relief,bumpScale:.012});
  const concrete=mat('#666d66',.97,{map:upperMap,bumpMap:relief,bumpScale:.021});
  const tread=mat('#939486',.91,{map:upperMap,bumpMap:relief,bumpScale:.012});
  const shadowConcrete=mat('#333c38',.96),metal=mat('#293936',.7,{metalness:.48}),zinc=mat('#727d70',.66,{metalness:.45});
  const black=mat('#171f1d'),wood=mat('#45483b',.95,{map:lowerMap});
  const brick=mat('#6a4b3a',1,{map:upperMap,bumpMap:relief,bumpScale:.025});
  const mortar=mat('#56594c',1),oldPaper=mat('#a9a58b',1),tape=mat('#7c8f52',1);
  const hallwaySteel=mat('#85907c',.84,{metalness:.18,bumpMap:relief,bumpScale:.008});
  const hallwayPanel=mat('#6f7d68',.87,{metalness:.14,bumpMap:relief,bumpScale:.008});
  const warmGlass=mat('#f1d29b',.5,{emissive:'#ffcd79',emissiveIntensity:2.4}),coldGlass=mat('#839b9b',.5,{emissive:'#536d70',emissiveIntensity:.22});
  let placement=null;
  const batches=new Map(),dummy=new THREE.Object3D(),unitBox=new THREE.BoxGeometry(1,1,1),unitCylinder=new THREE.CylinderGeometry(1,1,1,10);
  function instance(type,material,position,scale,quaternion=null,shadow=true){
    const key=`${type}/${material.uuid}/${shadow}`;
    if(!batches.has(key))batches.set(key,{type,material,shadow,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(quaternion)dummy.quaternion.copy(quaternion);dummy.updateMatrix();const matrix=dummy.matrix.clone();if(placement)matrix.premultiply(placement);batches.get(key).matrices.push(matrix);
  }
  function box(w,h,d,x,y,z,material=concrete,shadow=true){instance('box',material,[x,y,z],[w,h,d],null,shadow);}
  function rod(a,b,r=.025,material=metal){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
    instance('cylinder',material,start.add(end).multiplyScalar(.5).toArray(),[r,direction.length(),r],q);
  }
  function capPost(x,y,z,h=.84){
    rod([x,y,z],[x,y+h,z],.026);box(.09,.016,.09,x,y+.008,z,zinc);box(.061,.015,.061,x,y+h+.008,z,metal);
    for(const dx of [-.028,.028])box(.013,.012,.015,x+dx,y+.019,z+.028,black);
  }
  function railRun(a,b,z,height=.84,posts=5){
    for(let i=0;i<=posts;i++){const t=i/posts,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;capPost(x,y,z,height);}
    rod([a[0],a[1]+height,z],[b[0],b[1]+height,z],.03);
    rod([a[0],a[1]+height*.47,z],[b[0],b[1]+height*.47,z],.018);
  }
  // The outer wall and piers enclose the frame. No façade windows or sky holes.
  box(roomRight-roomLeft,roof+.5,.36,(roomLeft+roomRight)/2,(roof-.5)/2,back-.2,plaster);
  box(.38,roof+.55,4.9,roomLeft-.16,(roof-.45)/2,.55,shadowConcrete);
  box(.38,roof+.55,4.9,roomRight+.16,(roof-.45)/2,.55,shadowConcrete);
  box(roomRight-roomLeft+.7,.28,4.9,(roomLeft+roomRight)/2,roof+.1,.55,shadowConcrete);
  box(roomRight-roomLeft+.7,.38,4.9,(roomLeft+roomRight)/2,-.22,.55,shadowConcrete);
  const lightList=[],glows=[],numbers=[];
  function lamp(x,y,index,warm=true){
    box(.2,.26,.08,x,y,back+.08,metal);rod([x,y+.05,back+.12],[x,y+.05,back+.38],.022,metal);
    // Caged ovoid body, with a protective roof and lower ring.
    instance('cylinder',warm?warmGlass:coldGlass,[x,y-.02,back+.40],[.082,.22,.082]);
    instance('cylinder',metal,[x,y+.115,back+.40],[.12,.03,.12]);
    instance('cylinder',metal,[x,y-.155,back+.40],[.105,.025,.105]);
    for(const dx of [-.083,.083])rod([x+dx,y-.15,back+.435],[x+dx,y+.1,back+.435],.011,metal);
    rod([x-.09,y-.02,back+.474],[x+.09,y-.02,back+.474],.009,metal);
    const light=new THREE.PointLight(warm?'#ffd393':'#a6c6c7',warm?13:4.5,7.7,2);light.position.set(x,y-.05,back+.75);light.castShadow=false;group.add(light);lightList.push(light);
    // A soft glow on the wall reads even on low graphics settings.
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,warm?'rgba(255,205,123,.15)':'rgba(144,182,186,.09)');g.addColorStop(.4,warm?'rgba(255,205,123,.045)':'rgba(144,182,186,.03)');g.addColorStop(1,'rgba(255,205,123,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    const texture=new THREE.CanvasTexture(canvas),mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.8),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));mesh.position.set(x,y-.2,back+.02);group.add(mesh);glows.push(mesh);
    return index;
  }
  function electricBox(x,y,seed){
    box(.49,.64,.20,x,y,back+.16,metal);box(.44,.58,.022,x,y,back+.275,zinc);box(.014,.46,.015,x+.16,y,back+.293,black);box(.035,.06,.028,x+.12,y-.07,back+.305,metal);
    box(.11,.035,.012,x-.08,y+.11,back+.296,black);for(let i=0;i<3;i++)box(.075,.012,.015,x-.08,y+.04-i*.035,back+.297,metal);
    rod([x,y+.34,back+.19],[x,y+.9+random(seed)*.3,back+.19],.018,metal);
  }
  function sideDoor(onRight,y,floor){
    // A doorway is set into the outside wall, perpendicular to the back wall.
    // Its threshold joins the landing, rather than opening over the stair void.
    const x=onRight?roomRight-.045:roomLeft+.045,z=.15;
    const rotation=onRight?-Math.PI/2:Math.PI/2;
    placement=new THREE.Matrix4().makeRotationY(rotation);placement.setPosition(x,y,z);
    box(1.22,2.4,.12,0,1.19,-.025,black);
    box(1.04,2.21,.07,0,1.105,.035,hallwaySteel);
    for(const dx of [-.59,.59])box(.07,2.43,.12,dx,1.20,.05,zinc);
    box(1.25,.075,.12,0,2.40,.05,zinc);box(1.25,.04,.26,0,.025,.07,concrete);
    for(const [panelY,height]of[[.69,.78],[1.68,.73]]){
      box(.75,height,.012,0,panelY,.078,hallwayPanel);
      for(const dx of [-.39,.39])box(.018,height+.035,.020,dx,panelY,.089,zinc);
      for(const dy of [-height/2-.008,height/2+.008])box(.80,.018,.020,0,panelY+dy,.089,zinc);
    }
    box(.88,.17,.018,0,.14,.083,zinc);
    for(const hingeY of [.46,1.84])box(.055,.10,.035,-.49,hingeY,.088,metal);
    box(.03,.17,.045,.33,.99,.105,black);box(.16,.023,.04,.27,1.02,.135,zinc);
    placement=null;
    doors.push({floor,kind:'hallway',interactive:false,wall:onRight?'right':'left',
      normal:[onRight?-1:1,0,0],x,y,z,width:1.04,height:2.21,rotationY:rotation,
      bounds:{min:[onRight?x-.20:x-.09,y,z-.625],max:[onRight?x+.09:x+.20,y+2.44,z+.625]}});
  }
  function woodenDoor(x,y,kind,wall='back'){
    const side=wall==='left',worldY=y,worldX=side?roomLeft+.045:x,worldZ=side?.15:back+.27;
    if(side){
      placement=new THREE.Matrix4().makeRotationY(Math.PI/2);placement.setPosition(worldX,worldY,worldZ);
      x=0;y=0;
    }
    const z=side?0:worldZ,apartment=kind==='apartment';
    const doorWood=apartment?mat('#765a3e',.93,{map:lowerMap,bumpMap:relief,bumpScale:.015}):wood;
    box(1.22,2.4,.16,x,y+1.19,side?-.12:back+.15,shadowConcrete);
    box(1.04,2.21,.07,x,y+1.105,z,doorWood);
    for(const dx of [-.59,.59])box(.07,2.43,.12,x+dx,y+1.20,z,apartment?doorWood:zinc);
    box(1.25,.075,.12,x,y+2.40,z,apartment?doorWood:zinc);box(1.25,.04,.24,x,y+.025,z+.07,concrete);
    for(const panelY of [.60,1.50]){
      box(.77,.67,.018,x,y+panelY,z+.047,doorWood);
      for(const dx of [-.4,.4])box(.024,.72,.026,x+dx,y+panelY,z+.064,apartment?zinc:metal);
      for(const dy of [-.35,.35])box(.82,.025,.025,x,y+panelY+dy,z+.064,apartment?zinc:metal);
    }
    box(.03,.17,.045,x+.33,y+.99,z+.07,black);box(.16,.023,.04,x+.27,y+1.02,z+.10,zinc);
    instance('cylinder',zinc,[x,y+1.62,z+.061],[.025,.013,.025],new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
    if(apartment){
      box(.29,.10,.022,x,y+1.83,z+.055,metal);
      // A small taped drawing is the only personal mark on this landing.
      box(.18,.24,.006,x-.31,y+1.54,z+.065,oldPaper,false);
      box(.065,.024,.008,x-.31,y+1.661,z+.071,tape,false);
      for(const [a,b]of[[[-.375,1.53],[-.31,1.59]],[[-.31,1.59],[-.245,1.53]],[[-.36,1.53],[-.36,1.45]],[[-.26,1.53],[-.26,1.45]],[[-.36,1.45],[-.26,1.45]]])
        rod([x+a[0],y+a[1],z+.073],[x+b[0],y+b[1],z+.073],.0025,wood);
      // Warm light leaks from the inhabited flat, with no sign or floor number.
      const leak=mat('#d4a970',.8,{emissive:'#e7b678',emissiveIntensity:.55});
      box(.91,.018,.018,x,y+.016,z+.066,leak,false);
      const light=new THREE.PointLight('#e5b578',3.6,3.7,2);light.position.set(x,y+.35,z+.34);
      if(placement)light.position.applyMatrix4(placement);
      group.add(light);
    }
    placement=null;
    const bounds=side?{min:[worldX-.09,worldY,worldZ-.625],max:[worldX+.20,worldY+2.44,worldZ+.625]}:
      {min:[worldX-.625,worldY,worldZ-.16],max:[worldX+.625,worldY+2.44,worldZ+.13]};
    const door={floor:apartment?C.apartmentFloor:0,kind,interactive:false,wall,normal:side?[1,0,0]:[0,0,1],
      x:worldX,y:worldY,z:worldZ,width:1.04,height:2.21,rotationY:side?Math.PI/2:0,bounds};
    doors.push(door);return door;
  }
  // The two-tone paint is repeated per storey, with narrow chipped trim and
  // electrical conduits that continue down the stairwell rather than float.
  for(let floor=0;floor<=C.floors;floor++){
    const y=floor*C.rise;
    box(roomRight-roomLeft,.97,.024,(roomLeft+roomRight)/2,y+.485,back+.005,paint,false);
    box(roomRight-roomLeft,.025,.034,(roomLeft+roomRight)/2,y+.99,back+.018,shadowConcrete,false);
    box(roomRight-roomLeft,.075,.05,(roomLeft+roomRight)/2,y+.04,back+.035,shadowConcrete,false);
    const onRight=floor%2===1,lampX=floor===C.apartmentFloor?3.3:onRight?12.0:3.3;
    lamp(lampX,y+2.20,floor,floor!==1);
    if(floor===1){
      electricBox(14.25,y+1.15,floor);
      devices.push({floor,x:14.25,y:y+1.15,z:back+.16});
    }
    // Unused corridors are closed side-wall doors on supported landings.
    if(floor>0&&floor!==C.apartmentFloor)sideDoor(onRight,y,floor);
    if(floor>0){
      // A landing exists only where the route actually turns. The old,
      // disconnected balcony on the opposite side has been removed.
      const minX=onRight?right:roomLeft,maxX=onRight?roomRight:left;
      const centerX=(minX+maxX)/2,centerZ=(landingBack+landingFront)/2;
      box(maxX-minX,.22,landingFront-landingBack,centerX,y-.11,centerZ,concrete);
      box(maxX-minX,.035,landingFront-landingBack+.02,centerX,y-.012,centerZ,tread);
      for(const z of [landingBack+.025,landingFront-.025])railRun([minX+.06,y],[maxX-.06,y],z,.82,3);
      // The side wall bounds this edge. A cross-rail here would block its door.
      landingMetadata.push({floor,side:onRight?'right':'left',y,minX,maxX,minZ:landingBack,maxZ:landingFront});
    }
    // Slightly recessed vertical wall ribs and service labels break repetition.
    box(.12,C.rise-.09,.10,roomLeft+.47,y+1.52,back+.07,shadowConcrete);
    box(.12,C.rise-.09,.10,roomRight-.47,y+1.52,back+.07,shadowConcrete);
    for(let j=0;j<3;j++)box(.17+random(floor*5+j)*.18,.012,.008,6.2+j*.25,y+.73+random(floor*7+j)*.09,back+.025,plaster,false);
  }
  const groundDepth=groundFront-groundBack,groundCenter=(groundFront+groundBack)/2;
  box(roomRight-roomLeft,.15,groundDepth,(roomLeft+roomRight)/2,-.075,groundCenter,concrete);
  box(roomRight-roomLeft,.025,groundDepth+.02,(roomLeft+roomRight)/2,-.005,groundCenter,tread);
  const flightMetadata=[];
  for(let f=0;f<C.floors;f++){
    const low=f*C.rise,dir=f%2===0?1:-1,start=dir<0?right:left,end=dir<0?left:right,run=span/C.steps,rise=C.rise/C.steps;
    const lane=lanes[f%lanes.length],treads=[];
    for(let i=0;i<C.steps;i++){
      const x=start+dir*(i+.5)*run,y=low+(i+1)*rise;
      box(run+.009,.19,stairWidth,x,y-.095,lane,concrete);
      box(run+.012,.027,stairWidth+.025,x,y-.009,lane,tread);
      // Worn nosing highlights each tread without making a bright ladder.
      box(.025,.024,stairWidth+.035,x+dir*run*.46,y-.006,lane,zinc);
      if(i%6===2)box(run*.31,.006,.18,x-dir*.05,y+.009,lane+.14,shadowConcrete,false);
      treads.push({minX:x-run/2-.006,maxX:x+run/2+.006,minY:y-.19,maxY:y+.0045,minZ:lane-(stairWidth+.035)/2,maxZ:lane+(stairWidth+.035)/2});
    }
    // Solid side stringers and a dark underside give the stairs real thickness.
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan(C.rise/(end-start)));
    const length=Math.hypot(span,C.rise);
    for(const z of [lane-.55,lane+.55])instance('box',shadowConcrete,[(start+end)/2,low+C.rise/2-.17,z],[length,.16,.10],q);
    for(const z of [lane-.58,lane+.58])railRun([start,low],[end,low+C.rise],z,.82,10);
    // Narrow end returns are welded to landing rails at both ends.
    for(const [x,y]of[[start,low],[end,low+C.rise]])for(const z of [lane-.58,lane+.58])rod([x,y+.82,z],[x+(x===left?-.10:.10),y+.82,z],.03,metal);
    flightMetadata.push({index:f,direction:dir,z:lane,width:stairWidth,start:{x:start,y:low,z:lane},end:{x:end,y:low+C.rise,z:lane},steps:C.steps,tread:run,riser:rise,treads,rails:{minZ:lane-.61,maxZ:lane+.61},bounds:{minX:left,maxX:right,minY:low-.23,maxY:low+C.rise+.85,minZ:lane-.61,maxZ:lane+.61}});
  }
  const entryDoor=woodenDoor(C.groundDoorX,0,'entry');
  const apartmentDoor=woodenDoor(C.apartmentX,C.apartmentFloor*C.rise,'apartment','left');
  // Broken plaster exposes old masonry without opening the sealed room.
  const brickPatches=[];
  for(const [px,py,w,h,seed]of[[8.4,1.75,1.65,1.10,29],[6.35,7.9,2.05,1.28,109],[11.3,10.9,1.4,.75,213]]){
    const shape=new THREE.Shape();
    for(let i=0;i<13;i++){
      const a=i/12*Math.PI*2,r=.78+random(seed+i)*.22,xx=Math.cos(a)*w*.5*r,yy=Math.sin(a)*h*.5*r;
      if(i)shape.lineTo(xx,yy);else shape.moveTo(xx,yy);
    }
    shape.closePath();const patch=new THREE.Mesh(new THREE.ShapeGeometry(shape),mortar);patch.position.set(px,py,back+.034);group.add(patch);
    for(let row=0;row<Math.ceil(h/.17);row++)for(let col=0;col<Math.ceil(w/.33);col++){
      const xx=(col-(Math.ceil(w/.33)-1)/2)*.33+(row%2?.10:0),yy=(row-(Math.ceil(h/.17)-1)/2)*.17;
      if((xx/(w*.47))**2+(yy/(h*.43))**2<.88)box(.303,.143,.023,px+xx,py+yy,back+.047,brick,false);
    }
    brickPatches.push({x:px,y:py,width:w,height:h,z:back+.047});
  }
  // Continuous utility pipes, clamps, a drain and quiet corridor clutter.
  for(const x of [1.3,14.72]){
    rod([x,.12,back+.12],[x,roof-.18,back+.12],.038,metal);
    for(let y=.5;y<roof-.3;y+=1.4){box(.15,.045,.08,x,y,back+.10,zinc);box(.025,.07,.045,x-.055,y,back+.15,black);}
  }
  rod([1.3,roof-.32,back+.12],[14.72,roof-.32,back+.12],.025,metal);
  box(.40,.018,.28,9.7,.012,.45,metal);for(let i=0;i<7;i++)box(.014,.005,.25,9.53+i*.055,.024,.45,black);
  // A folded pallet stays against the back wall, clear of the front corridor.
  for(let i=0;i<5;i++)box(.13,.80,.06,6.3+i*.16,.45,back+.16,wood);for(const y of [.17,.67])box(.85,.09,.08,6.62,y,back+.12,wood);
  const dustCount=45,dustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){dustPositions[i*3]=roomLeft+random(i+2)*(roomRight-roomLeft);dustPositions[i*3+1]=random(i+151)*roof;dustPositions[i*3+2]=-1.2+random(i+317)*1.5;}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:'#bdb79b',size:.018,transparent:true,opacity:.17,depthWrite:false}));group.add(dust);
  for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(batch.type==='box'?unitBox:unitCylinder,batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=batch.shadow;mesh.receiveShadow=true;group.add(mesh);
  }
  const floors=Array.from({length:C.floors+1},(_,index)=>({index,y:index*C.rise,side:index%2?'right':'left',apartment:index===C.apartmentFloor}));
  const metadata={floors,apartmentFloor:C.apartmentFloor,apartmentDoor,entryDoor,brickPatches,bounds:{min:[roomLeft-.36,-.4,-2.1],max:[roomRight+.36,roof+.3,3]},flights:flightMetadata,landings:landingMetadata,devices,doors,numbers,ground:{minX:roomLeft,maxX:roomRight,minZ:groundBack,maxZ:groundFront,y:0},lights:lightList.length,drawBatches:batches.size};
  group.userData.home=metadata;
  return {group,metadata,lights:lightList,update(time,state){
    if(!group.visible)return;
    for(let i=0;i<lightList.length;i++){
      const light=lightList[i],base=i===1?4.5:13;
      // Mostly steady tungsten; a single soft pulse never extinguishes a floor.
      light.intensity=base*(.988+.009*Math.sin(time*(i===1?4.8:1.13)+i*2.1));
    }
    dust.position.y=Math.sin(time*.11)*.025;
  }};
}
