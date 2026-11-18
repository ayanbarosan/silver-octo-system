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
  const wallMap=surfaceTexture('plaster'),groundMap=surfaceTexture('paving'),sandMap=surfaceTexture('sand');
  const wallBump=wallMap.clone();wallBump.colorSpace=THREE.NoColorSpace;
  const groundBump=groundMap.clone();groundBump.colorSpace=THREE.NoColorSpace;
  const plaster=material('#a0a698',.98,{map:wallMap,bumpMap:wallBump,bumpScale:.025});
  const farPlaster=material('#70878d',1,{map:wallMap}),fartherPlaster=material('#5e7681',1,{map:wallMap});
  const concrete=material('#64726d',.96,{map:groundMap,bumpMap:groundBump,bumpScale:.012});
  const paving=material('#7b8980',.78,{map:groundMap,bumpMap:groundBump,bumpScale:.009});
  const metal=material('#354c50',.56,{metalness:.63}),zinc=material('#9aa9a5',.36,{metalness:.77});
  const iron=material('#273535',.72,{metalness:.62}),ironEdge=material('#53605a',.57,{metalness:.66});
  const rust=material('#795339',.98),dark=material('#16272c',.99),wood=material('#716750',.98,{map:wallMap});
  const teal=material('#53766d',.88,{metalness:.19}),red=material('#875e4c',.92,{metalness:.13}),ochre=material('#9c8d59',.90,{metalness:.17}),blue=material('#607985',.85,{metalness:.16});
  const sand=material('#b1a37e',1,{map:sandMap}),soil=material('#526151',1,{map:groundMap}),grass=material('#505c43',1);
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
  function capPost(x,y,z,h=.94,parent=group){rod([x,y,z],[x,y+h,z],.027,metal,false,parent);box(.11,.022,.11,x,y+.011,z,zinc,false,parent);box(.068,.012,.068,x,y+h+.006,z,metal,false,parent);}
  function rail(a,b,z,posts=6,parent=group){
    for(let n=0;n<=posts;n++){const p=n/posts;capPost(a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p,z,.94,parent);}
    rod([a[0],a[1]+.94,z],[b[0],b[1]+.94,z],.033,metal,false,parent);rod([a[0],a[1]+.47,z],[b[0],b[1]+.47,z],.019,metal,false,parent);
  }
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
  // A continuous yard supports the turn around the last flight, then the path
  // in front of the equipment. Furniture never occupies the z=4.5 player lane.
  box(80,1.2,80,40,groundY-.60,-5,concrete);box(28,.055,2.6,39.2,groundY-.0275,4.5,paving);
  for(let x=26.0;x<53;x+=1.15){box(.014,.003,2.55,x,groundY+.003,4.5,concrete);box(1.12,.10,.17,x,groundY-.012,5.88,concrete);}
  const puddleCanvas=document.createElement('canvas');puddleCanvas.width=puddleCanvas.height=128;const pc=puddleCanvas.getContext('2d');
  const pg=pc.createRadialGradient(64,64,0,64,64,63);pg.addColorStop(0,'rgba(255,255,255,.9)');pg.addColorStop(.65,'rgba(255,255,255,.8)');pg.addColorStop(1,'rgba(255,255,255,0)');pc.fillStyle=pg;pc.fillRect(0,0,128,128);
  wet.alphaMap=new THREE.CanvasTexture(puddleCanvas);
  for(let i=0;i<25;i++)instance('plane',wet,[28+rand(i+19)*25,groundY+.009,3.8+rand(i+91)*1.45],[.6+rand(i+131)*2.1,.22+rand(i+191)*.7,1],floorQ);
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
  // Rear boundary and sparse trees frame the playable courtyard.
  box(33,.32,.26,40,groundY+.16,-5.7,concrete);
  for(let x=24.5;x<57;x+=2.4)capPost(x,groundY+.32,-5.7,1.72);
  for(const y of [groundY+.48,groundY+1.98])rod([24.5,y,-5.7],[56.9,y,-5.7],.024);
  for(let x=24.65;x<57;x+=.24)rod([x,groundY+.45,-5.7],[x,groundY+1.98,-5.7],.009,metal);
  for(const [x,z,seed]of[[35.4,-4.4,51],[49.1,-4.1,91]]){
    rod([x,groundY,z],[x+.11,groundY+5.3,z-.12],.093,wood);
    for(let i=0;i<12;i++){
      const y=groundY+1.8+i*.25,side=i%2?1:-1,xx=x+side*(.65+rand(seed+i)*1.5),zz=z+(rand(seed+i+77)-.5)*1.1;
      rod([x+.05,y,z],[xx,y+.8,zz],.028,wood);rod([xx,y+.8,zz],[xx+side*.45,y+1.3,zz-.12],.012,wood);
    }
  }
  const equipment=[],swingPivots=[];
  function prop(id,min,max){equipment.push({id,bounds:{min,max}});}
  const swingX=38.0,swingZ=2.60,swingTop=groundY+3.25;
  for(const x of [swingX-2.5,swingX+2.5]){
    for(const z of [swingZ-1.12,swingZ+1.12]){rod([x,groundY,z],[x,swingTop,swingZ],.059,teal);box(.27,.08,.25,x,groundY+.04,z,concrete);}
    rod([x,groundY+.9,swingZ-.8],[x,groundY+.9,swingZ+.8],.026,metal);
  }
  rod([swingX-2.55,swingTop,swingZ],[swingX+2.55,swingTop,swingZ],.065,red);
  for(const [index,x]of[[0,swingX-1.10],[1,swingX+1.10]]){
    const pivot=new THREE.Group();pivot.position.set(x,swingTop-.025,swingZ);group.add(pivot);swingPivots.push(pivot);
    for(const dx of [-.33,.33]){
      rod([dx,0,0],[dx,-2.40,0],.013,zinc,false,pivot);
      for(let n=0;n<7;n++)box(.030,.042,.022,dx,-.18-n*.32,0,metal,false,pivot);
    }
    box(.79,.068,.39,0,-2.42,0,index?ochre:red,true,pivot);for(const dx of [-.365,.365])box(.03,.08,.40,dx,-2.43,0,metal,false,pivot);
  }
  prop('swings',[35.35,groundY,1.40],[40.65,swingTop+.1,3.80]);
  // Low sandpit and a forgotten bucket beneath the rainy blocks.
  box(3.5,.12,2.15,39.5,groundY+.01,-.1,sand);
  for(const dx of [-1.82,1.82])box(.16,.20,2.42,39.5+dx,groundY+.1,-.1,teal);
  for(const dz of [-1.15,1.15])box(3.80,.20,.16,39.5,groundY+.1,-.1,ochre);
  const bucket=mesh(new THREE.CylinderGeometry(.13,.10,.22,12),blue);bucket.position.set(40.0,groundY+.23,.1);bucket.rotation.z=.12;
  rod([39.90,groundY+.32,.1],[40.0,groundY+.45,.1],.01,metal);rod([40.0,groundY+.45,.1],[40.10,groundY+.32,.1],.01,metal);
  prop('sandpit',[37.55,groundY-.05,-1.4],[41.45,groundY+.48,1.25]);
  // Original metal slide, built as a continuous curved sheet with real rails.
  const slideX=44.2,slideZ=-.45;
  for(const x of [slideX-.49,slideX+.49])for(const z of [slideZ-.45,slideZ+.45])rod([x,groundY,z],[x,groundY+2.15,z],.042,teal);
  box(1.15,.10,1.05,slideX,groundY+2.08,slideZ,ochre);
  for(const z of [slideZ-.52,slideZ+.52]){rail([slideX-.53,groundY+2.1],[slideX+.53,groundY+2.1],z,2);}
  for(const z of [slideZ-.38,slideZ+.38])rod([slideX-1.3,groundY+.1,z],[slideX-.55,groundY+2.13,z],.038,teal);
  for(let n=0;n<8;n++){const p=(n+.5)/8;rod([slideX-1.3+.75*p,groundY+.1+2.03*p,slideZ-.38],[slideX-1.3+.75*p,groundY+.1+2.03*p,slideZ+.38],.025,ochre);}
  const path=[[.45,2.12],[.76,2.04],[1.12,1.62],[1.52,1.10],[1.98,.61],[2.40,.30],[2.85,.21]],positions=[],indices=[];
  path.forEach(([dx,dy],i)=>{positions.push(slideX+dx,groundY+dy,slideZ-.40,slideX+dx,groundY+dy,slideZ+.40);if(i<path.length-1)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);});
  const slideGeo=new THREE.BufferGeometry();slideGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));slideGeo.setIndex(indices);slideGeo.computeVertexNormals();mesh(slideGeo,new THREE.MeshStandardMaterial({color:'#8ba5a6',roughness:.36,metalness:.74,side:THREE.DoubleSide}));
  for(const z of [slideZ-.42,slideZ+.42])for(let i=0;i<path.length-1;i++)rod([slideX+path[i][0],groundY+path[i][1]+.11,z],[slideX+path[i+1][0],groundY+path[i+1][1]+.11,z],.032,red);
  prop('slide',[42.84,groundY,-1.05],[47.2,groundY+3.12,.15]);
  // Benches and a small seesaw sit well behind the clear foreground route.
  for(const x of [30.2,49.6]){
    for(const dx of [-.88,.88]){rod([x+dx,groundY,.95],[x+dx,groundY+.5,.95],.04);rod([x+dx,groundY,1.35],[x+dx,groundY+.5,1.35],.04);rod([x+dx,groundY+.4,1.0],[x+dx,groundY+1.14,.83],.031);}
    for(let n=0;n<4;n++)box(2.1,.07,.10,x,groundY+.53,.98+n*.115,wood);
    for(let n=0;n<3;n++)box(2.1,.12,.055,x,groundY+.82+n*.15,.85,wood);
    prop(`bench-${x}`,[x-1.1,groundY,.7],[x+1.1,groundY+1.21,1.5]);
  }
  const seeX=51.5,seeZ=-.3;
  for(const z of [seeZ-.25,seeZ+.25]){rod([seeX-.4,groundY,z],[seeX,groundY+.64,z],.045,teal);rod([seeX+.4,groundY,z],[seeX,groundY+.64,z],.045,teal);}
  instance('box',ochre,[seeX,groundY+.67,seeZ],[3.5,.12,.36],new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-.09));
  for(const side of [-1,1]){const x=seeX+side*1.48,y=groundY+.67-side*.13;box(.50,.08,.55,x,y+.1,seeZ,side<0?red:blue);rod([x-side*.3,y+.1,seeZ-.15],[x-side*.3,y+.5,seeZ-.15],.022);rod([x-side*.3,y+.5,seeZ-.15],[x-side*.3,y+.5,seeZ+.15],.022);rod([x-side*.3,y+.5,seeZ+.15],[x-side*.3,y+.1,seeZ+.15],.022);}
  prop('seesaw',[49.6,groundY,-.7],[53.4,groundY+1.4,.1]);
  for(let i=0;i<75;i++){
    const x=28+rand(i+919)*27,z=-4.9+rand(i+1129)*7.3,h=.05+rand(i+1491)*.15;
    for(let n=0;n<3;n++)rod([x,groundY+.005,z],[x+(rand(i*3+n)-.5)*.15,groundY+h,z+(rand(i*7+n+91)-.5)*.10],.005,grass);
  }
  const lamps=[];
  for(const [x,z]of[[38.0,2.1],[49.2,2.0]]){
    rod([x,groundY,z],[x,groundY+4.3,z],.052);rod([x,groundY+4.26,z],[x+.42,groundY+4.4,z+.12],.029);
    box(.56,.11,.30,x+.53,groundY+4.39,z+.13,metal);box(.44,.024,.22,x+.53,groundY+4.325,z+.13,lampGlass);
    const light=new THREE.PointLight('#e9c391',17,10,2);light.position.set(x+.53,groundY+4.25,z+.15);group.add(light);lamps.push(light);
  }
  for(const batch of batches.values()){
    const object=new THREE.InstancedMesh(geometries[batch.type],batch.mat,batch.matrices.length);batch.matrices.forEach((matrix,i)=>object.setMatrixAt(i,matrix));object.instanceMatrix.needsUpdate=true;object.castShadow=batch.shadow;object.receiveShadow=true;batch.parent.add(object);
  }
  // One draw for rain at three depths. It never affects interior rendering.
  const rainCount=1000,rainData=new Float32Array(rainCount*6),rainSpeed=new Float32Array(rainCount);
  for(let i=0;i<rainCount;i++){const o=i*6;rainData[o]=22+rand(i+13)*36;rainData[o+1]=-7+rand(i+191)*19;rainData[o+2]=-14+rand(i+319)*21;rainSpeed[i]=8+rand(i+551)*8;rainData[o+3]=rainData[o]-.025;rainData[o+4]=rainData[o+1]-.24;rainData[o+5]=rainData[o+2];}
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainData,3).setUsage(THREE.DynamicDrawUsage));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#b0c9d4',transparent:true,opacity:.18,depthWrite:false,fog:true}));rain.frustumCulled=false;group.add(rain);
  const metadata={
    style:'american-wall-mounted',facade:facadeBounds,decks,anchors,railRuns,freestandingPosts:0,
    solids:[{id:'fire-escape-brick-wing',bounds:facadeBounds},...decks.map((bounds,index)=>({id:`balcony-deck-${index}`,bounds})),...anchors.map((anchor,index)=>({id:`wall-bracket-${index}`,bounds:anchor.bounds}))],
    bounds:{min:[20.35,groundY-.3,-33.6],max:[67.6,16.3,7.5]},
    layout:{left:28,right:33,rise:3.2,steps:20,totalFlights:2,lanes:[1.4,3.0],groundY,groundZ:4.5,turnOutside:.8},
    topPlatform:{min:[25.82,-.15,.73],max:[28,.002,2.07],y:0},
    middleLanding:{min:[33,-3.35,.73],max:[34.70,-3.198,3.66],y:-3.2},
    flights:flightMetadata,ground:{minX:25.6,maxX:56,y:groundY,z:4.5,minZ:3.2,maxZ:5.8},
    watch:{x:27.1,y:0,z:1.4},equipment,windows:nearWindows.length,lights:lamps.length,drawBatches:batches.size,rainDrops:rainCount
  };
  group.userData.fireEscape=metadata;let lastTime=null;
  return {group,metadata,update(time,playerX=28,state=null){
    if(!group.visible)return;
    upperFacade.visible=state?.area==='playground';
    const dt=lastTime===null?0:Math.min(.05,Math.max(0,time-lastTime));lastTime=time;
    for(let i=0;i<rainCount;i++){const o=i*6;rainData[o]-=dt*.9;rainData[o+1]-=rainSpeed[i]*dt;if(rainData[o+1]<groundY-.5||Math.abs(rainData[o]-playerX)>30){rainData[o]=playerX-22+rand(i+time*.13)*44;rainData[o+1]=7+rand(i+917)*5;}rainData[o+3]=rainData[o]-.025;rainData[o+4]=rainData[o+1]-(.16+rand(i+71)*.28);rainData[o+5]=rainData[o+2];}rainGeo.attributes.position.needsUpdate=true;
    swingPivots.forEach((pivot,i)=>{pivot.rotation.x=Math.sin(time*.61+i*1.9)*(.032+i*.009);});
    lamps.forEach((light,i)=>{light.intensity=17*(.994+.004*Math.sin(time*.9+i));});
  }};
}
