import {STAIRWELL} from './stairwell.js';

// A sealed, side-on cutaway. Everything behind the child belongs to the stair
// hall, so swapping this group with the rooftop cannot reveal the outside city.
export function createStairwellWorld(THREE,scene) {
  const group=new THREE.Group();group.name='stairwell-interior';group.visible=false;scene.add(group);
  const C=STAIRWELL,left=C.left,right=C.right,span=right-left;
  const lanes=C.lanes??[-.65,.95],stairWidth=C.stairWidth??1;
  const landingBack=-1.25,landingFront=1.65,groundBack=-1.75,groundFront=2.75;
  const landingMetadata=[],devices=[],doors=[];
  const roomLeft=.9,roomRight=15.1,roof=C.rise*C.flights+2.85,back=-1.72;
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
  const plaster=mat('#99988b',.98,{map:upperMap,bumpMap:relief,bumpScale:.018});
  const paint=mat('#859486',.93,{map:lowerMap,bumpMap:relief,bumpScale:.012});
  const concrete=mat('#666d66',.97,{map:upperMap,bumpMap:relief,bumpScale:.021});
  const tread=mat('#939486',.91,{map:upperMap,bumpMap:relief,bumpScale:.012});
  const shadowConcrete=mat('#333c38',.96),metal=mat('#293936',.7,{metalness:.48}),zinc=mat('#727d70',.66,{metalness:.45});
  const black=mat('#171f1d'),wood=mat('#45483b',.95,{map:lowerMap});
  const hallwaySteel=mat('#85907c',.84,{metalness:.18,bumpMap:relief,bumpScale:.008});
  const hallwayPanel=mat('#6f7d68',.87,{metalness:.14,bumpMap:relief,bumpScale:.008});
  const warmGlass=mat('#f1d29b',.5,{emissive:'#ffcd79',emissiveIntensity:2.4}),coldGlass=mat('#839b9b',.5,{emissive:'#536d70',emissiveIntensity:.22});
  const batches=new Map(),dummy=new THREE.Object3D(),unitBox=new THREE.BoxGeometry(1,1,1),unitCylinder=new THREE.CylinderGeometry(1,1,1,10);
  function instance(type,material,position,scale,quaternion=null,shadow=true){
    const key=`${type}/${material.uuid}/${shadow}`;
    if(!batches.has(key))batches.set(key,{type,material,shadow,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(quaternion)dummy.quaternion.copy(quaternion);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
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
  function door(x,y,kind='hallway',floor=Math.round(y/C.rise)){
    const entry=kind==='entry';
    const hallway=kind==='hallway';
    box(1.22,2.4,.16,x,y+1.19,back+.15,shadowConcrete);box(1.04,2.21,.07,x,y+1.105,back+.27,hallway?hallwaySteel:wood);
    for(const dx of [-.59,.59])box(.07,2.43,.12,x+dx,y+1.20,back+.27,zinc);box(1.25,.075,.12,x,y+2.40,back+.27,zinc);box(1.25,.04,.24,x,y+.025,back+.34,concrete);
    if(hallway){
      // A solid painted leaf and shallow framed panels read as closed even
      // under the colder landing lamp, rather than resembling a black opening.
      for(const [panelY,height]of[[.69,.78],[1.68,.73]]){
        box(.75,height,.012,x,y+panelY,back+.313,hallwayPanel);
        for(const dx of [-.39,.39])box(.018,height+.035,.020,x+dx,y+panelY,back+.324,zinc);
        for(const dy of [-height/2-.008,height/2+.008])box(.80,.018,.020,x,y+panelY+dy,back+.324,zinc);
      }
      box(.88,.17,.018,x,y+.14,back+.318,zinc);
      for(const hingeY of [.46,1.84])box(.055,.10,.035,x-.49,y+hingeY,back+.323,metal);
    }else{
      box(.36,.40,.02,x,y+1.56,back+.318,entry?coldGlass:black);for(const dx of [-.21,.21])box(.025,.47,.025,x+dx,y+1.56,back+.335,metal);box(.44,.025,.025,x,y+1.79,back+.335,metal);box(.44,.025,.025,x,y+1.33,back+.335,metal);
    }
    box(.03,.17,.045,x+.33,y+.99,back+.34,black);box(.16,.023,.04,x+.27,y+1.02,back+.37,zinc);box(.025,.42,.03,x-.45,y+.32,back+.328,black);
    doors.push({floor,kind,interactive:false,x,y,z:back+.27,width:1.04,height:2.21});
  }
  // The two-tone paint is repeated per storey, with narrow chipped trim and
  // electrical conduits that continue down the stairwell rather than float.
  for(let floor=0;floor<=C.flights;floor++){
    const y=floor*C.rise;
    box(roomRight-roomLeft,.97,.024,(roomLeft+roomRight)/2,y+.485,back+.005,paint,false);
    box(roomRight-roomLeft,.025,.034,(roomLeft+roomRight)/2,y+.99,back+.018,shadowConcrete,false);
    box(roomRight-roomLeft,.075,.05,(roomLeft+roomRight)/2,y+.04,back+.035,shadowConcrete,false);
    const onRight=floor%2===0,lampX=onRight?12.0:3.3;
    lamp(lampX,y+2.20,floor,floor!==2);
    if(floor===3){
      electricBox(1.55,y+1.15,floor);
      devices.push({floor,x:1.55,y:y+1.15,z:back+.16});
    }
    // Closed corridor doors are scenery, with no interaction or route change.
    // The top storey is roof access only, so it has no hallway door.
    if(floor>0&&floor<C.flights)door(onRight?13.25:2.65,y,'hallway',floor);
    if(floor>0){
      // A landing exists only where the route actually turns. The old,
      // disconnected balcony on the opposite side has been removed.
      const minX=onRight?right:C.minX-.5,maxX=onRight?C.maxX+.5:left;
      const centerX=(minX+maxX)/2,centerZ=(landingBack+landingFront)/2;
      box(maxX-minX,.22,landingFront-landingBack,centerX,y-.11,centerZ,concrete);
      box(maxX-minX,.035,landingFront-landingBack+.02,centerX,y-.012,centerZ,tread);
      for(const z of [landingBack+.025,landingFront-.025])railRun([minX+.06,y],[maxX-.06,y],z,.82,3);
      const outerX=onRight?maxX-.06:minX+.06;
      for(const z of [landingBack+.025,landingFront-.025])capPost(outerX,y,z,.82);
      rod([outerX,y+.82,landingBack+.025],[outerX,y+.82,landingFront-.025],.03);
      rod([outerX,y+.82*.47,landingBack+.025],[outerX,y+.82*.47,landingFront-.025],.018);
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
  for(let f=0;f<C.flights;f++){
    const high=(C.flights-f)*C.rise,dir=f%2===0?-1:1,start=dir<0?right:left,end=dir<0?left:right,run=span/C.steps,rise=C.rise/C.steps;
    const lane=lanes[f%lanes.length],treads=[];
    for(let i=0;i<C.steps;i++){
      const x=start+dir*(i+.5)*run,y=high-(i+1)*rise;
      box(run+.009,.19,stairWidth,x,y-.095,lane,concrete);
      box(run+.012,.027,stairWidth+.025,x,y-.009,lane,tread);
      // Worn nosing highlights each tread without making a bright ladder.
      box(.025,.024,stairWidth+.035,x+dir*run*.46,y-.006,lane,zinc);
      if(i%6===2)box(run*.31,.006,.18,x-dir*.05,y+.009,lane+.14,shadowConcrete,false);
      treads.push({minX:x-run/2-.006,maxX:x+run/2+.006,minY:y-.19,maxY:y+.0045,minZ:lane-(stairWidth+.035)/2,maxZ:lane+(stairWidth+.035)/2});
    }
    // Solid side stringers and a dark underside give the stairs real thickness.
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan2(-C.rise,end-start));
    const length=Math.hypot(span,C.rise);
    for(const z of [lane-.55,lane+.55])instance('box',shadowConcrete,[(start+end)/2,high-C.rise/2-.17,z],[length,.16,.10],q);
    for(const z of [lane-.58,lane+.58])railRun([start,high],[end,high-C.rise],z,.82,10);
    // Narrow end returns are welded to landing rails at both ends.
    for(const [x,y]of[[start,high],[end,high-C.rise]])for(const z of [lane-.58,lane+.58])rod([x,y+.82,z],[x+(x===left?-.10:.10),y+.82,z],.03,metal);
    flightMetadata.push({index:f,direction:dir,z:lane,width:stairWidth,start:{x:start,y:high,z:lane},end:{x:end,y:high-C.rise,z:lane},steps:C.steps,tread:run,riser:rise,treads,rails:{minZ:lane-.61,maxZ:lane+.61},bounds:{minX:left,maxX:right,minY:high-C.rise-.23,maxY:high+.85,minZ:lane-.61,maxZ:lane+.61}});
  }
  door(13,C.rise*C.flights,'entry',C.flights);door(C.exit.x,0,'exit',0);
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
  const metadata={bounds:{min:[roomLeft-.36,-.4,-2.1],max:[roomRight+.36,roof+.3,3]},flights:flightMetadata,landings:landingMetadata,devices,doors,numbers,ground:{minX:roomLeft,maxX:roomRight,minZ:groundBack,maxZ:groundFront,y:0},lights:lightList.length,drawBatches:batches.size};
  group.userData.stairwell=metadata;
  return {group,metadata,lights:lightList,update(time,state){
    if(!group.visible)return;
    for(let i=0;i<lightList.length;i++){
      const light=lightList[i],base=i===2?4.5:13;
      // Mostly steady tungsten; a single soft pulse never extinguishes a floor.
      light.intensity=base*(.988+.009*Math.sin(time*(i===1?4.8:1.13)+i*2.1));
    }
    dust.position.y=Math.sin(time*.11)*.025;
  }};
}
