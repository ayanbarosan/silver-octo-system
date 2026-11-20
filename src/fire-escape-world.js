import {escapeHeight} from './apartment.js';

// A real metal fire escape and a rain-soaked courtyard. The two stair flights
// use the same dimensions as the apartment controller, with separate depths at
// their crossing so the child never passes through an earlier flight.
export function createFireEscapeWorld(THREE,scene){
  const group=new THREE.Group();group.name='apartment-fire-escape';group.visible=false;scene.add(group);
  const groundY=-6.4,rand=n=>{const f=Math.sin(n*127.71+331.19)*43758.5453;return f-Math.floor(f);};
  const material=(color,roughness=.9,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  function surfaceTexture(kind,size=256){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size),base=kind==='plaster'?[156,161,150]:kind==='sand'?[159,148,113]:[133,146,143];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,grain=rand(x*13.71+y*79.13),cloud=Math.sin(x*.026+Math.sin(y*.019)*2)*Math.cos(y*.021)*9;
      const shade=(grain-.5)*(kind==='sand'?44:25)+cloud;
      for(let k=0;k<3;k++)image.data[i+k]=base[k]+shade;image.data[i+3]=255;
    }ctx.putImageData(image,0,0);
    for(let n=0;n<24;n++){
      const x=rand(n+71)*size,y=rand(n+391)*size,r=4+rand(n+199)*36,g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,kind==='plaster'?'rgba(35,47,41,.19)':'rgba(23,38,34,.14)');g.addColorStop(1,'rgba(23,38,34,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    if(kind==='plaster')for(let n=0;n<9;n++){
      const x=rand(n+917)*size,y=rand(n+1217)*size;ctx.strokeStyle='rgba(31,40,37,.29)';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x,y);for(let j=1;j<6;j++)ctx.lineTo(x+j*3+(rand(j+n*13)-.5)*7,y+j*5+(rand(j+n*29)-.5)*9);ctx.stroke();
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;return map;
  }
  const wallMap=surfaceTexture('plaster'),groundMap=surfaceTexture('paving');
  const wallBump=wallMap.clone();wallBump.colorSpace=THREE.NoColorSpace;
  const groundBump=groundMap.clone();groundBump.colorSpace=THREE.NoColorSpace;
  const plaster=material('#a0a698',.98,{map:wallMap,bumpMap:wallBump,bumpScale:.025});
  const farPlaster=material('#70878d',1,{map:wallMap}),fartherPlaster=material('#5e7681',1,{map:wallMap});
  const concrete=material('#64726d',.96,{map:groundMap,bumpMap:groundBump,bumpScale:.012});
  const paving=material('#7b8980',.78,{map:groundMap,bumpMap:groundBump,bumpScale:.009});
  const metal=material('#354c50',.56,{metalness:.63}),zinc=material('#9aa9a5',.36,{metalness:.77});
  const iron=material('#273535',.72,{metalness:.62}),ironEdge=material('#53605a',.57,{metalness:.66});
  const rust=material('#795339',.98),dark=material('#16272c',.99);
  const coldGlass=material('#263e49',.29,{metalness:.16}),warmGlass=material('#b8a477',.67,{emissive:'#d6ab67',emissiveIntensity:.48});
  const curtain=material('#aaa993',1),lampGlass=material('#f1d0a0',.45,{emissive:'#ffd59b',emissiveIntensity:2.5});
  const wet=material('#385962',.13,{metalness:.38,transparent:true,opacity:.38,depthWrite:false});
  const batches=new Map(),dummy=new THREE.Object3D();
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),plane:new THREE.PlaneGeometry(1,1)};
  const floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  function instance(type,mat,position,scale,quaternion=null,shadow=false,parent=group){
    const key=`${type}/${mat.uuid}/${shadow}/${parent.uuid}`;if(!batches.has(key))batches.set(key,{type,mat,shadow,parent,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(quaternion)dummy.quaternion.copy(quaternion);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
  }
  function box(w,h,d,x,y,z,m=metal,shadow=false,parent=group){instance('box',m,[x,y,z],[w,h,d],null,shadow,parent);}
  function rod(a,b,r=.026,m=metal,shadow=false,parent=group){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));instance('cylinder',m,a.map((v,i)=>(v+b[i])/2),[r,d.length(),r],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),shadow,parent);}
  function mesh(geometry,mat,parent=group,shadow=false){const object=new THREE.Mesh(geometry,mat);object.castShadow=shadow;object.receiveShadow=true;parent.add(object);return object;}
  function beam(a,b,w=.12,d=.10,m=metal,parent=group){const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));instance('box',m,a.map((v,i)=>(v+b[i])/2),[w,delta.length(),d],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()),false,parent);}
  const decks=[],anchors=[],railRuns=[];
  function deck(minX,maxX,y,minZ,maxZ){
    for(let z=minZ+.025;z<maxZ;z+=.085)box(maxX-minX,.030,.037,(minX+maxX)/2,y-.015,z,ironEdge);
    for(const x of [minX+.04,maxX-.04])box(.072,.105,maxZ-minZ,x,y-.08,(minZ+maxZ)/2,iron);
    for(const z of [minZ+.025,maxZ-.025])box(maxX-minX,.105,.072,(minX+maxX)/2,y-.08,z,iron);
    decks.push({min:[minX,y-.133,minZ],max:[maxX,y+.002,maxZ]});
  }
  function fireRail(a,b,z){
    const count=Math.max(1,Math.ceil(Math.abs(b[0]-a[0])/.16));
    for(let n=0;n<=count;n++){
      const p=n/count,x=a[0]+(b[0]-a[0])*p,y=a[1]+(b[1]-a[1])*p;
      box(.017,.87,.021,x,y+.495,z,iron);
    }
    const posts=Math.max(1,Math.ceil(Math.abs(b[0]-a[0])/1.45));
    for(let n=0;n<=posts;n++){
      const p=n/posts,x=a[0]+(b[0]-a[0])*p,y=a[1]+(b[1]-a[1])*p;
      box(.033,.965,.038,x,y+.4825,z,iron);box(.064,.016,.074,x,y+.972,z,ironEdge);
      box(.095,.018,.10,x,y+.009,z,iron);
    }
    beam([a[0],a[1]+.965,z],[b[0],b[1]+.965,z],.043,.061,iron);
    beam([a[0],a[1]+.061,z],[b[0],b[1]+.061,z],.026,.030,iron);
    railRuns.push({from:[a[0],a[1],z],to:[b[0],b[1],z],height:.98,pickets:count+1});
  }
  function endRail(x,y,minZ,maxZ){
    const count=Math.ceil((maxZ-minZ)/.16);
    for(let n=0;n<=count;n++)box(.021,.87,.017,x,y+.495,minZ+(maxZ-minZ)*n/count,iron);
    box(.061,.043,maxZ-minZ,x,y+.965,(minZ+maxZ)/2,iron);
    box(.030,.026,maxZ-minZ,x,y+.061,(minZ+maxZ)/2,iron);
    for(const z of [minZ,maxZ]){box(.038,.965,.033,x,y+.4825,z,iron);box(.074,.016,.064,x,y+.972,z,ironEdge);}
    railRuns.push({from:[x,y,minZ],to:[x,y,maxZ],height:.98,pickets:count+1});
  }
  function cantilever(x,y,outerZ){
    // Knee braces carry the balcony back to masonry; nothing rests on yard poles.
    box(.21,1.04,.075,x,y-.52,.345,iron);
    for(const yy of [y-.10,y-.91])for(const dx of [-.067,.067])box(.038,.038,.025,x+dx,yy,.398,zinc);
    beam([x,y-.12,.36],[x,y-.12,outerZ],.105,.075,iron);
    beam([x,y-.94,.37],[x,y-.16,outerZ-.13],.067,.060,iron);
    anchors.push({wall:[x,y-.52,.345],outer:[x,y-.16,outerZ],bounds:{min:[x-.11,y-1.04,.3075],max:[x+.11,y-.067,outerZ+.04]}});
  }
  // The lower exterior of the same block. Its top is the bedroom's floor;
  // the upper facade is shown only after the interior cut-away leaves view.
  const upperFacade=new THREE.Group();upperFacade.name='apartment-exterior-upper';group.add(upperFacade);
  box(5.4,6.4,4.6,23.05,-3.2,.28,plaster);box(5.55,.16,4.75,23.05,-.08,.28,concrete);
  box(5.4,4.2,.22,23.05,2.1,2.67,plaster,false,upperFacade);
  // Match the real side-wall opening and outward casement used inside the
  // bedroom. Once seen from the yard this remains an actual open aperture.
  box(.27,1,4.60,25.95,.50,.28,plaster,false,upperFacade);
  box(.27,1.10,4.60,25.95,3.65,.28,plaster,false,upperFacade);
  box(.27,2.10,2.67,25.95,2.05,-.685,plaster,false,upperFacade);
  box(.27,2.10,.28,25.95,2.05,2.44,plaster,false,upperFacade);
  const windowFrame=material('#939581',.84,{map:wallMap});
  for(const z of [.65,2.30])box(.15,2.20,.085,25.82,2.05,z,windowFrame,false,upperFacade);
  for(const y of [1.0,3.10])box(.15,.085,1.82,25.82,y,1.475,windowFrame,false,upperFacade);
  box(.50,.11,1.94,25.76,.96,1.475,concrete,false,upperFacade);
  // The interior cutaway is replaced once the child is below the first
  // flight. Preserve a shallow, boxed bedroom recess behind the open aperture,
  // so the closed exterior never reveals sky through an empty room.
  const windowRecess=new THREE.Group();windowRecess.name='bedroom-window-interior-recess';upperFacade.add(windowRecess);
  box(.055,1.98,1.73,25.20,2.05,1.475,dark,false,windowRecess);
  for(const y of [1.045,3.055])box(.66,.05,1.77,25.53,y,1.475,plaster,false,windowRecess);
  for(const z of [.62,2.33])box(.66,2.06,.045,25.53,2.05,z,plaster,false,windowRecess);
  const openWindow=new THREE.Group();openWindow.name='bedroom-window-open-exterior';openWindow.position.set(25.82,1.04,.69);openWindow.rotation.y=Math.PI*.52;upperFacade.add(openWindow);
  for(const z of [0,1.57])box(.060,1.98,.055,0,.99,z,windowFrame,false,openWindow);
  for(const y of [0,1.98])box(.060,.055,1.62,0,y,.785,windowFrame,false,openWindow);
  box(.055,1.94,.035,0,.99,.785,windowFrame,false,openWindow);
  const clearGlass=new THREE.MeshPhysicalMaterial({color:'#819da9',roughness:.12,transparent:true,opacity:.15,depthWrite:false});
  box(.018,1.88,1.46,0,.99,.785,clearGlass,false,openWindow);
  box(5.6,.22,4.9,23.05,4.22,.28,concrete,false,upperFacade);
  const nearWindows=[];
  function facadeWindow(x,y,z,w=.80,h=1.27,parent=group,warm=false){
    box(w+.14,h+.15,.07,x,y,z,dark,false,parent);box(w,h,.022,x,y,z+.052,warm?warmGlass:coldGlass,false,parent);
    for(const dx of [-w/2-.02,w/2+.02])box(.044,h+.15,.08,x+dx,y,z+.082,metal,false,parent);
    for(const dy of [-h/2-.025,h/2+.025])box(w+.13,.04,.08,x,y+dy,z+.082,metal,false,parent);
    box(.033,h,.065,x,y,z+.095,zinc,false,parent);box(w,.028,.07,x,y-.10,z+.10,metal,false,parent);box(w+.26,.075,.25,x,y-h/2-.09,z+.12,concrete,false,parent);
    if(warm)for(const dx of [-w*.33,w*.33])box(w*.19,h-.02,.008,x+dx,y,z+.073,curtain,false,parent);
    nearWindows.push({x,y,z,w,h});
  }
  // The stair balconies belong to a real masonry wing, not a scaffold set
  // beside an empty gap. Brick courses, stone lintels and recessed windows give
  // the wall the scale of the tenement fire escapes used in American cities.
  const brickCanvas=document.createElement('canvas');brickCanvas.width=brickCanvas.height=512;
  const bc=brickCanvas.getContext('2d');bc.fillStyle='#73756a';bc.fillRect(0,0,512,512);
  for(let row=0;row<16;row++)for(let col=-1;col<9;col++){
    const x=col*64+(row%2?32:0),y=row*32,n=row*37+col*11+331,shade=rand(n);
    bc.fillStyle=`rgb(${126+shade*36},${66+shade*27},${45+shade*20})`;bc.fillRect(x+1.7,y+1.8,60.6,28.4);
    bc.strokeStyle='rgba(207,166,125,.17)';bc.lineWidth=.8;bc.strokeRect(x+2.8,y+2.8,58.4,26.2);
    for(let j=0;j<12;j++){bc.fillStyle=j%3?'rgba(45,39,31,.14)':'rgba(215,165,117,.12)';bc.fillRect(x+4+rand(n+j*17)*53,y+4+rand(n+j*43)*23,.8+rand(n+j*13)*4,.6+rand(n+j*19)*1.7);}
  }
  for(let n=0;n<26;n++){
    const x=rand(n+71)*512,y=rand(n+491)*512,w=3+rand(n+113)*24,h=40+rand(n+519)*190;
    const g=bc.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'rgba(32,44,40,.18)');g.addColorStop(1,'rgba(32,44,40,0)');bc.fillStyle=g;bc.fillRect(x,y,w,h);
  }
  const brickMap=new THREE.CanvasTexture(brickCanvas);brickMap.colorSpace=THREE.SRGBColorSpace;brickMap.wrapS=brickMap.wrapT=THREE.RepeatWrapping;brickMap.repeat.set(3,4);brickMap.anisotropy=4;
  const brickRelief=brickMap.clone();brickRelief.colorSpace=THREE.NoColorSpace;
  const brick=material('#c9a58e',.96,{map:brickMap,bumpMap:brickRelief,bumpScale:.014});
  const masonryTrim=material('#9b9a85',.97,{map:wallMap});
  const facadeBounds={min:[25.76,-6.4,-.02],max:[35.18,4.32,.30]};
  box(9.42,10.72,.32,30.47,-1.04,.14,brick);
  box(9.58,.12,.43,30.47,4.30,.10,masonryTrim);
  box(9.50,.17,.45,30.47,groundY+.095,.12,masonryTrim);
  for(const x of [27.10,29.45,31.80,34.05])for(const [floor,y]of[[0,1.88],[1,-1.32],[2,-4.52]]){
    const lit=rand(x*19+floor*71)>.83;
    facadeWindow(x,y,.316,1.02,1.63,group,lit);
    box(1.28,.14,.23,x,y+.93,.355,masonryTrim);
    box(1.36,.095,.30,x,y-.96,.37,masonryTrim);
    for(const dx of [-.40,.40])box(.13,.16,.14,x+dx,y-.84,.38,masonryTrim);
  }
  // The continuous wall directly supports the balcony anchor plates.
  for(const x of [26.02,34.95]){
    rod([x,groundY,.38],[x,4.1,.38],.029,iron);
    for(const y of [-5.8,-3.0,-.3,2.5])box(.105,.045,.11,x,y,.38,ironEdge);
  }
  for(const x of [21.5,23.8])for(const y of [-1.65,-4.45])facadeWindow(x,y,2.59,.9,1.45,group,rand(x*11+y)>.75);
  for(const x of [21.5,23.8])facadeWindow(x,2.0,2.80,.9,1.45,upperFacade,rand(x*13)>.6);
  // Drainpipe and rain-scarred wall seams give the attachment a real scale.
  for(const x of [20.49,25.52]){rod([x,-6.38,2.72],[x,-.15,2.72],.045,metal);for(const y of [-5.6,-3.1,-.7])box(.16,.035,.14,x,y,2.71,zinc);}
  for(let i=0;i<18;i++)box(.027,.32+rand(i+31)*.66,.008,20.6+rand(i+91)*4.75,-.55-rand(i+119)*5.3,2.704,rust);
  // American courtyard fire escapes sit against the wall on iron brackets.
  // Long balcony fronts and dense flat-bar pickets replace the old free-standing
  // tower. Each floor retains a generous opening above the actual stair lane.
  deck(25.82,28,0,.73,2.07);
  deck(25.82,27.82,0,2.07,4.05);
  deck(27.82,34.70,0,3.79,4.05);
  deck(28,34.70,0,.47,.64);
  fireRail([25.94,0],[27.98,0],.70);
  fireRail([25.94,0],[34.66,0],4.08);
  endRail(34.66,0,.47,4.08);
  deck(33,34.70,-3.2,.73,3.66);
  deck(25.82,33,-3.2,.47,.64);
  deck(25.82,34.70,-3.2,3.79,4.05);
  fireRail([25.94,-3.2],[34.66,-3.2],4.08);
  fireRail([33,-3.2],[34.66,-3.2],.70);
  endRail(34.66,-3.2,.47,4.08);
  // Brackets are outside the stair run, so their diagonals never intersect a
  // descending head or knee. Their plates and bolt heads remain visible.
  for(const y of [0,-3.2])for(const x of [26.20,27.55,33.65,34.45])cantilever(x,y,4.04);
  const flightMetadata=[];
  for(let flight=0;flight<2;flight++){
    const dir=flight===0?1:-1,start=flight===0?28:33,lane=flight===0?1.4:3.0,startY=-flight*3.2,treads=[];
    for(let i=0;i<20;i++){
      const x=start+dir*(i+.5)*.25,y=startY-(i+1)*.16;
      // Real open steel grating, with narrow enough gaps for a child's soles.
      for(let n=0;n<5;n++)box(.035,.029,1.13,x-.1075+n*.05375,y-.0145,lane,ironEdge);
      for(const z of [lane-.565,lane+.565])box(.255,.060,.035,x,y-.042,z,iron);
      box(.034,.042,1.17,x+dir*.111,y-.019,lane,iron);
      if(i%7===3)box(.018,.005,.34,x,y+.002,lane-.15,rust);
      treads.push({minX:x-.130,maxX:x+.130,minY:y-.063,maxY:y+.002,minZ:lane-.585,maxZ:lane+.585});
    }
    for(const z of [lane-.63,lane+.63]){
      beam([start,startY-.12,z],[start+dir*5,startY-3.2-.12,z],.085,.055,iron);
      fireRail([start,startY],[start+dir*5,startY-3.2],z);
    }
    flightMetadata.push({index:flight,startX:start,endX:start+dir*5,startY,endY:startY-3.2,lane,direction:dir,left:28,right:33,rise:3.2,steps:20,treads});
  }
  // The stairs reach a service passage beside the building. The shared park
  // belongs to its front-right courtyard, beyond the return wall and side gate.
  // Its own paving starts at x=35.8; the two surfaces meet instead of overlapping.
  box(80,1.2,80,40,groundY-.75,-5,concrete);
  box(1.7,.12,2.85,27.15,groundY-.06,3.925,paving);
  box(5.4,.12,1.6,30.7,groundY-.06,4.5,paving);
  const serviceSupports=[
    {id:'escape-bottom-landing',bounds:{min:[26.3,groundY-.12,2.5],max:[28,groundY,5.35]}},
    {id:'side-service-paving',bounds:{min:[28,groundY-.12,3.7],max:[33.4,groundY,5.3]}}
  ];
  const cornerStart=33.4,cornerEnd=35.8,cornerPath=[],cornerVertices=[],cornerUV=[],cornerIndices=[];
  const pathZ=x=>{const t=Math.max(0,Math.min(1,(x-cornerStart)/(cornerEnd-cornerStart)));return 4.5+1.7*t*t*(3-2*t);};
  for(let n=0;n<=48;n++){
    const x=cornerStart+(cornerEnd-cornerStart)*n/48,z=pathZ(x);cornerPath.push([x,groundY,z]);
    cornerVertices.push(x,groundY,z-.8,x,groundY,z+.8);cornerUV.push((x-cornerStart)/1.1,0,(x-cornerStart)/1.1,1);
    if(n<48){const i=n*2;cornerIndices.push(i,i+1,i+2,i+1,i+3,i+2);}
  }
  const cornerGeo=new THREE.BufferGeometry();cornerGeo.setAttribute('position',new THREE.Float32BufferAttribute(cornerVertices,3));cornerGeo.setAttribute('uv',new THREE.Float32BufferAttribute(cornerUV,2));cornerGeo.setIndex(cornerIndices);cornerGeo.computeVertexNormals();
  const cornerFloor=mesh(cornerGeo,paving);cornerFloor.name='service-passage-around-building-corner';
  rod([28,groundY+.018,5.38],[33.4,groundY+.018,5.38],.045,concrete);
  for(let n=0;n<cornerPath.length-1;n++){
    const a=cornerPath[n],b=cornerPath[n+1];rod([a[0],groundY+.018,a[2]+.88],[b[0],groundY+.018,b[2]+.88],.045,concrete);
  }
  for(let x=28.3;x<33.4;x+=1.12)box(.014,.002,1.58,x,groundY+.001,4.5,concrete);
  // A few shallow wet patches keep the bare lane distinct from play equipment.
  const puddleCanvas=document.createElement('canvas');puddleCanvas.width=puddleCanvas.height=128;const pc=puddleCanvas.getContext('2d');
  const pg=pc.createRadialGradient(64,64,0,64,64,63);pg.addColorStop(0,'rgba(255,255,255,.9)');pg.addColorStop(.65,'rgba(255,255,255,.8)');pg.addColorStop(1,'rgba(255,255,255,0)');pc.fillStyle=pg;pc.fillRect(0,0,128,128);
  wet.alphaMap=new THREE.CanvasTexture(puddleCanvas);
  for(let i=0;i<7;i++)instance('plane',wet,[28.6+rand(i+19)*4.2,groundY+.004,4.2+rand(i+91)*.58],[.45+rand(i+131)*.75,.18+rand(i+191)*.26,1],floorQ);
  // This visible return makes the depth change legible: the boy walks around
  // its front end, then enters the same park seen beside the street entrance.
  const returnWallBounds={min:[35.07,groundY,.32],max:[35.29,3.2,5.15]};
  box(.22,9.6,4.83,35.18,-1.60,2.735,brick);
  box(.34,.12,4.97,35.18,3.23,2.735,masonryTrim);
  box(.31,.24,4.90,35.18,groundY+.12,2.735,masonryTrim);
  for(const [y,z,w,h,seed]of[[groundY+1.12,3.9,1.6,1.45,71],[groundY+5.1,2.15,2.0,1.9,89]]){
    const shape=new THREE.Shape();for(let n=0;n<=10;n++){const a=n/10*Math.PI*2,r=.78+rand(seed+n)*.22,xx=Math.cos(a)*w*.5*r,yy=Math.sin(a)*h*.5*r;if(n)shape.lineTo(xx,yy);else shape.moveTo(xx,yy);}shape.closePath();
    const patch=mesh(new THREE.ShapeGeometry(shape),plaster);patch.rotation.y=Math.PI/2;patch.position.set(35.302,y,z);
  }
  for(const y of [groundY+1.88,groundY+5.08]){
    box(.038,1.54,1.16,35.304,y,2.72,dark);box(.026,1.38,1.01,35.332,y,2.72,coldGlass);
    for(const z of [2.18,3.26])box(.067,1.55,.045,35.352,y,z,metal);
    for(const yy of [y-.73,y+.73])box(.067,.045,1.18,35.352,yy,2.72,metal);
    box(.072,1.43,.028,35.361,y,2.72,zinc);box(.18,.075,1.30,35.36,y-.81,2.72,masonryTrim);
  }
  rod([35.34,groundY+.12,4.83],[35.34,2.97,4.83],.035,iron);
  for(const y of [groundY+.5,groundY+3.1,.5])box(.13,.045,.12,35.34,y,4.83,ironEdge);
  // The side access stays open. Its leaf rests alongside the fence rather
  // than across the walking lane, so there is no new interaction or obstacle.
  const gatePosts=[];
  for(const z of [5.22,7.18]){
    box(.13,1.96,.13,35.8,groundY+.98,z,iron);box(.23,.09,.23,35.8,groundY+.045,z,masonryTrim);box(.17,.05,.17,35.8,groundY+2.005,z,ironEdge);
    gatePosts.push({id:z<6?'side-gate-inner-post':'side-gate-outer-post',bounds:{min:[35.685,groundY,z-.115],max:[35.915,groundY+2.03,z+.115]}});
  }
  beam([35.8,groundY+1.98,5.22],[35.8,groundY+1.98,7.18],.055,.055,iron);
  for(const y of [groundY+.13,groundY+1.77])beam([35.8,y,5.22],[37.53,y,5.22],.036,.036,iron);
  for(let x=35.84;x<37.53;x+=.135)box(.015,1.62,.020,x,groundY+.95,5.22,iron);
  for(const x of [35.8,37.53])box(.034,1.71,.038,x,groundY+.95,5.22,iron);
  const sideGate={x:35.8,y:groundY,z:6.2,state:'open',clearHalfWidth:.865,clearHeight:1.95,opening:{min:[35.69,groundY,5.335],max:[35.91,groundY+1.95,7.065]},leaf:{min:[35.78,groundY+.095,5.201],max:[37.55,groundY+1.805,5.239]}};
  const lamps=[];
  for(const [x,z,y]of[[29.3,.62,-3.45],[35.38,4.3,groundY+2.45]]){
    box(.20,.30,.12,x,y,z,iron);box(.12,.19,.025,x,y,z+.075,lampGlass);
    const light=new THREE.PointLight('#d2af7b',7.5,7,2);light.position.set(x,y,z+.32);group.add(light);lamps.push(light);
  }
  // Distant apartment blocks remain three-dimensional as the camera follows
  // the child down from the fire escape and into the yard.
  function apartmentBlock(x,w,top,z,seed,m){
    const bottom=groundY-1,height=top-bottom;box(w,height,4.5,x,(top+bottom)/2,z-2.3,m);
    box(w+.16,.18,4.7,x,top+.06,z-2.3,concrete);
    const cols=Math.max(2,Math.floor(w/2));
    for(let row=0;top-1.7-row*2.5>groundY+.5;row++)for(let col=0;col<cols;col++){
      const xx=x-w/2+1.1+col*(w-2.2)/(cols-1),yy=top-1.7-row*2.5,lit=rand(seed+row*137+col*41)>.92;
      facadeWindow(xx,yy,z+.015,.75,1.17,group,lit);
      if(col===1&&row%3===1){box(1.38,.10,.65,xx,yy-.74,z+.29,concrete);for(let n=0;n<6;n++)rod([xx-.61+n*.245,yy-.67,z+.60],[xx-.61+n*.245,yy-.12,z+.60],.013);rod([xx-.66,yy-.12,z+.60],[xx+.66,yy-.12,z+.60],.024);}
    }
    rod([x+w*.29,top,z-1],[x+w*.29,top+1.7,z-1],.02);for(let n=0;n<3;n++)rod([x+w*.29-.46,top+.60+n*.28,z-1],[x+w*.29+.46,top+.60+n*.28,z-1],.011);
  }
  apartmentBlock(35,12,10.5,-10,101,farPlaster);apartmentBlock(48,11,13.0,-17,211,fartherPlaster);apartmentBlock(23,10,12.5,-24,337,fartherPlaster);apartmentBlock(61,13,16,-29,413,fartherPlaster);
  // Play equipment is provided by the shared front-right park asset.
  // No duplicate playground is built beneath the fire escape.
  const equipment=[];
  for(const batch of batches.values()){
    const object=new THREE.InstancedMesh(geometries[batch.type],batch.mat,batch.matrices.length);batch.matrices.forEach((matrix,i)=>object.setMatrixAt(i,matrix));object.instanceMatrix.needsUpdate=true;object.castShadow=batch.shadow||batch.mat===iron||batch.mat===ironEdge;object.receiveShadow=true;batch.parent.add(object);
  }
  // One draw for rain at three depths. It never affects interior rendering.
  const rainCount=1000,rainData=new Float32Array(rainCount*6),rainSpeed=new Float32Array(rainCount);
  for(let i=0;i<rainCount;i++){const o=i*6;rainData[o]=22+rand(i+13)*36;rainData[o+1]=-7+rand(i+191)*19;rainData[o+2]=-14+rand(i+319)*21;rainSpeed[i]=8+rand(i+551)*8;rainData[o+3]=rainData[o]-.025;rainData[o+4]=rainData[o+1]-.24;rainData[o+5]=rainData[o+2];}
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainData,3).setUsage(THREE.DynamicDrawUsage));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#b0c9d4',transparent:true,opacity:.18,depthWrite:false,fog:true}));rain.frustumCulled=false;group.add(rain);
  const metadata={
    style:'american-wall-mounted',facade:facadeBounds,decks,anchors,railRuns,freestandingPosts:0,
    exterior:{closureY:-1.7,cutaway:true,closed:false,windowRecess:{min:[25.1725,1.02,.5975],max:[25.86,3.08,2.3525]},metalShadows:true},
    solids:[{id:'fire-escape-brick-wing',bounds:facadeBounds},{id:'home-building-return-wall',bounds:returnWallBounds},...gatePosts,{id:'open-side-gate-leaf',bounds:sideGate.leaf},...decks.map((bounds,index)=>({id:`balcony-deck-${index}`,bounds})),...anchors.map((anchor,index)=>({id:`wall-bracket-${index}`,bounds:anchor.bounds}))],
    bounds:{min:[20.35,groundY-.3,-33.6],max:[67.6,16.3,7.5]},
    sharedPark:{id:'home-front-right-park',providedBy:'playground-world',translation:[-50,groundY,6.2]},
    servicePassage:{from:[27.2,groundY,4.5],to:[33.4,groundY,4.5],clearHalfWidth:.8,supports:serviceSupports},
    corner:{wall:returnWallBounds,path:cornerPath,fromZ:4.5,toZ:6.2,halfWidth:.8},parkEntry:sideGate,
    layout:{left:28,right:33,rise:3.2,steps:20,totalFlights:2,lanes:[1.4,3.0],groundY,groundZ:4.5,turnOutside:.8},
    topPlatform:{min:[25.82,-.15,.73],max:[28,.002,2.07],y:0},
    middleLanding:{min:[33,-3.35,.73],max:[34.70,-3.198,3.66],y:-3.2},
    flights:flightMetadata,ground:{minX:26.3,maxX:62,y:groundY,z:4.5,minZ:2.5,maxZ:7.05,parkZ:6.2,cornerStartX:33.4,parkEntryX:35.8},
    watch:{x:27.1,y:0,z:1.4},equipment,windows:nearWindows.length,lights:lamps.length,drawBatches:batches.size,rainDrops:rainCount
  };
  group.userData.fireEscape=metadata;let lastTime=null;
  return {group,metadata,update(time,playerX=28,state=null,playerY=undefined){
    if(!group.visible)return;
    const y=Number.isFinite(playerY)?playerY:state?.area==='fireescape'?escapeHeight(state.escapeFlight??0,playerX):0;
    const closed=state?.area==='playground'||state?.area==='fireescape'&&y<metadata.exterior.closureY;
    upperFacade.visible=closed;metadata.exterior.closed=closed;metadata.exterior.cutaway=!closed;
    const dt=lastTime===null?0:Math.min(.05,Math.max(0,time-lastTime));lastTime=time;
    for(let i=0;i<rainCount;i++){const o=i*6;rainData[o]-=dt*.9;rainData[o+1]-=rainSpeed[i]*dt;if(rainData[o+1]<groundY-.5||Math.abs(rainData[o]-playerX)>30){rainData[o]=playerX-22+rand(i+time*.13)*44;rainData[o+1]=7+rand(i+917)*5;}rainData[o+3]=rainData[o]-.025;rainData[o+4]=rainData[o+1]-(.16+rand(i+71)*.28);rainData[o+5]=rainData[o+2];}rainGeo.attributes.position.needsUpdate=true;
    lamps.forEach((light,i)=>{light.intensity=7.5*(.994+.004*Math.sin(time*.9+i));});
  }};
}
