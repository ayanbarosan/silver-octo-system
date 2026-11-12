// Table-space seated character. The table surface is Y=1.12; the caller places
// this group at its centre. Hands, glass and resting cheek keep fixed contacts.
export function createApartmentFather(THREE){
  const group=new THREE.Group();group.name='Father-at-table';
  const head=new THREE.Group();head.name='father-head';head.position.set(.20,1.345,-.04);head.rotation.set(.92,-.43,-.24);group.add(head);
  const chest=new THREE.Group();chest.name='father-breathing-chest';chest.position.set(.52,1.055,-.69);group.add(chest);
  const material=(color,roughness=.92,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  const M={
    coat:material('#353c39'),wornCoat:material('#444a43'),seam:material('#626454'),
    shirt:material('#8c8871'),pants:material('#3d4140'),crease:material('#565b53'),
    skin:material('#b28c74',.85),skinShade:material('#866753',.95),lips:material('#795d50'),
    hair:material('#4a4238',1),hairLight:material('#675e4e',1),gray:material('#9a9a8a',1),
    grayShade:material('#737a70',1),scruff:material('#665b4d',1),eye:material('#423a33'),
    shoe:material('#39382f'),sole:material('#1f2523'),wood:material('#65533b'),
    chippedWood:material('#8e7952'),woodDark:material('#3d3d32'),button:material('#6e7263',.65),
  };
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const context=canvas.getContext('2d'),pixels=context.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4,n=Math.sin(x*127.31+y*53.27)*43758.5453,grain=n-Math.floor(n);
      const shade=209+(grain-.5)*31+(x%3===0?-7:0)+(y%4===0?4:0);
      pixels.data[i]=shade;pixels.data[i+1]=shade;pixels.data[i+2]=shade;pixels.data[i+3]=255;
    }
    context.putImageData(pixels,0,0);
    const weave=new THREE.CanvasTexture(canvas);weave.colorSpace=THREE.SRGBColorSpace;weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(3,3);weave.anisotropy=4;
    const relief=weave.clone();relief.colorSpace=THREE.NoColorSpace;
    for(const name of ['coat','wornCoat','shirt','pants']){M[name].map=weave;M[name].bumpMap=relief;M[name].bumpScale=.005;}
  }
  const geometry={sphere:new THREE.SphereGeometry(1,16,12),cylinder:new THREE.CylinderGeometry(1,1,1,10),box:new THREE.BoxGeometry(1,1,1)};
  const batches=new Map(),dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  function instance(type,mat,parent,position,scale,rotation=null){
    const key=`${parent.uuid}/${type}/${mat.uuid}`;
    if(!batches.has(key))batches.set(key,{type,mat,parent,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();
    if(rotation?.isQuaternion)dummy.quaternion.copy(rotation);else if(rotation)dummy.rotation.set(...rotation);
    dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
  }
  const oval=(m,x,y,z,sx,sy,sz,parent=group,rotation=null)=>instance('sphere',m,parent,[x,y,z],[sx,sy,sz],rotation);
  const box=(m,x,y,z,w,h,d,parent=group,rotation=null)=>instance('box',m,parent,[x,y,z],[w,h,d],rotation);
  function limb(m,a,b,r=.08,depth=1,parent=group){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),q=new THREE.Quaternion().setFromUnitVectors(up,delta.clone().normalize());
    instance('sphere',m,parent,start.add(end).multiplyScalar(.5).toArray(),[r,delta.length()/2+r*.38,r*depth],q);
  }
  function rod(m,a,b,r=.008,parent=group){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),q=new THREE.Quaternion().setFromUnitVectors(up,delta.clone().normalize());
    instance('cylinder',m,parent,start.add(end).multiplyScalar(.5).toArray(),[r,delta.length(),r],q);
  }
  function curve(m,points,r=.005,parent=group){for(let i=1;i<points.length;i++)rod(m,points[i-1],points[i],r,parent);}
  const random=n=>{const x=Math.sin(n*127.31+733.17)*43758.5453;return x-Math.floor(x);};

  // His old chair belongs to the pose, so the seat and back always support it.
  box(M.wood,.65,.655,-1.05,.68,.07,.68);
  box(M.woodDark,.65,.613,-1.05,.61,.035,.61);
  for(const dx of [-.265,.265])for(const dz of [-.245,.245]){
    const x=.65+dx,z=-1.05+dz;
    rod(M.wood,[x,.64,z],[x+Math.sign(dx)*.035,.025,z+Math.sign(dz)*.055],.033);
    if(dz<0)rod(M.wood,[x,.57,z],[x,1.36,z-.085],.033);
  }
  for(const dx of [-.20,0,.20])box(M.wood,.65+dx,1.07,-1.365,.075,.45,.035,group,[-.10,0,0]);
  box(M.wood,.65,1.325,-1.395,.63,.10,.07,group,[-.10,0,0]);
  rod(M.woodDark,[.385,.24,-.80],[.915,.24,-.80],.018);
  rod(M.woodDark,[.385,.25,-1.29],[.915,.25,-1.29],.018);
  for(let i=0;i<9;i++){
    const x=.39+random(i+91)*.52,y=.94+random(i+71)*.38;
    box(M.chippedWood,x,y,-1.34,.014+random(i+19)*.032,.004,.004);
  }

  // Weight is carried by the seat; the long torso folds forward over the table.
  oval(M.pants,.64,.745,-1.025,.29,.145,.23);
  limb(M.coat,[.64,.77,-1.02],[.40,1.31,-.36],.315,.79);
  oval(M.wornCoat,0,0,0,.295,.27,.24,chest,[.66,-.14,.16]);
  limb(M.shirt,[.52,.91,-.67],[.32,1.26,-.28],.163,.43);
  limb(M.coat,[.05,1.275,-.35],[.71,1.285,-.43],.13,1.12);
  oval(M.wornCoat,.70,1.26,-.43,.18,.16,.19);
  oval(M.coat,.045,1.26,-.34,.15,.15,.17);
  // A turned-down collar, stretched ribbing and uneven seams break up the coat.
  limb(M.shirt,[.25,1.30,-.21],[.35,1.21,-.28],.045,.6);
  limb(M.wornCoat,[.38,1.28,-.27],[.59,1.08,-.49],.045,.65);
  curve(M.seam,[[.88,.81,-.96],[.85,.96,-.84],[.75,1.11,-.68],[.68,1.25,-.47]],.004);
  curve(M.woodDark,[[.72,.81,-.79],[.65,.94,-.62],[.53,1.12,-.39]],.0035);
  for(let i=0;i<4;i++)oval(M.button,.51-i*.035,.94+i*.065,-.49+i*.065,.012,.014,.008);
  for(let i=0;i<5;i++)curve(M.wornCoat,[[.41+i*.07,.79,-.87],[.40+i*.07,.83,-.84]],.004);

  // Bent knees and planted, slightly splayed shoes remain visible below the table.
  limb(M.pants,[.45,.73,-1.01],[.38,.49,-.48],.145,.92);
  limb(M.pants,[.83,.73,-1.00],[.92,.48,-.47],.145,.92);
  oval(M.pants,.38,.49,-.47,.127,.11,.14);oval(M.pants,.92,.48,-.46,.127,.11,.14);
  limb(M.pants,[.38,.49,-.47],[.34,.14,-.40],.117,.89);
  limb(M.pants,[.92,.48,-.46],[.98,.14,-.35],.117,.89);
  for(const [x,z,turn]of[[.32,-.31,-.16],[1.00,-.27,.23]]){
    oval(M.sole,x,.035,z,.125,.035,.225,group,[0,turn,0]);
    oval(M.shoe,x,.095,z-.015,.12,.09,.21,group,[0,turn,0]);
    curve(M.crease,[[x-.065,.145,z-.04],[x,.16,z-.015],[x+.055,.142,z+.01]],.0035);
  }
  curve(M.crease,[[.29,.44,-.375],[.38,.41,-.367],[.46,.43,-.39]],.0045);
  curve(M.crease,[[.83,.43,-.37],[.92,.40,-.35],[1.00,.42,-.38]],.0045);

  // Both elbows rest on the surface. One folded sleeve supports the cheek.
  limb(M.coat,[.70,1.29,-.39],[.67,1.205,.20],.115,.90);
  oval(M.wornCoat,.67,1.205,.20,.11,.088,.11);
  limb(M.wornCoat,[.67,1.202,.20],[.18,1.194,.12],.080,1.02);
  limb(M.coat,[.04,1.27,-.33],[-.43,1.205,-.10],.105,1.02);
  oval(M.wornCoat,-.43,1.205,-.10,.095,.082,.10);
  limb(M.wornCoat,[-.43,1.204,-.10],[-.445,1.195,.11],.075,.98);
  limb(M.coat,[.28,1.193,.135],[.18,1.193,.12],.078,.96);
  limb(M.coat,[-.443,1.194,.06],[-.445,1.195,.13],.073,1.05);
  oval(M.skin,.135,1.188,.13,.093,.047,.068);
  for(let i=0;i<4;i++)limb(M.skin,[.10-i*.018,1.18,.16],[.08-i*.017,1.171,.215],.014,.85);
  oval(M.skin,-.435,1.204,.145,.054,.063,.046);
  oval(M.skin,-.407,1.238,.107,.032,.020,.025);

  // A small clear tumbler, amber liquid and curved fingers around the near side.
  const glassCenter=[-.35,1.218,.12],glassTop=1.308;
  const glassMaterial=new THREE.MeshPhysicalMaterial({color:'#c4c6b2',roughness:.12,metalness:.03,transparent:true,opacity:.26,depthWrite:false,clearcoat:1,clearcoatRoughness:.08});
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(.067,.058,.18,24,1,true),glassMaterial);
  glass.name='father-drink-glass';glass.position.set(...glassCenter);group.add(glass);
  const rimMaterial=new THREE.MeshStandardMaterial({color:'#d2d4c1',roughness:.22,metalness:.15,transparent:true,opacity:.62,depthWrite:false});
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.067,.004,5,24),rimMaterial);rim.rotation.x=Math.PI/2;rim.position.set(glassCenter[0],glassTop,glassCenter[2]);group.add(rim);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.058,.058,.010,24),rimMaterial);base.position.set(glassCenter[0],1.134,glassCenter[2]);group.add(base);
  const drinkMaterial=new THREE.MeshStandardMaterial({color:'#98703b',roughness:.16,transparent:true,opacity:.76,depthWrite:false});
  const drink=new THREE.Mesh(new THREE.CylinderGeometry(.060,.055,.063,24),drinkMaterial);drink.position.set(glassCenter[0],1.166,glassCenter[2]);group.add(drink);
  for(let finger=0;finger<4;finger++){
    const y=1.246-finger*.021;
    curve(M.skin,[[-.426,y,.15],[-.405,y-.005,.180],[-.370,y-.006,.185],[-.350,y-.010,.177]],.0115);
    oval(M.skinShade,-.371,y-.004,.194,.012,.003,.0025);
  }
  curve(M.skin,[[-.432,1.245,.121],[-.420,1.259,.079],[-.392,1.250,.069]],.017);

  // The face tilts down onto the folded forearm, with closed eyes and stubble.
  oval(M.skin,.0,0,0,.187,.218,.178,head);
  oval(M.skin,.0,-.086,.045,.154,.143,.141,head);
  oval(M.skinShade,.0,-.135,.065,.116,.068,.105,head);
  oval(M.scruff,.0,-.105,.110,.132,.082,.069,head);
  oval(M.skin,.0,-.017,.176,.035,.051,.042,head);
  oval(M.skinShade,.0,-.048,.190,.026,.015,.029,head);
  for(const side of [-1,1]){
    oval(M.skin,side*.185,-.028,-.002,.033,.067,.043,head);
    oval(M.skinShade,side*.196,-.024,.014,.009,.036,.022,head);
    curve(M.eye,[[side*.096,.012,.151],[side*.063,.003,.170],[side*.035,.007,.174]],.0038,head);
    curve(M.hair,[[side*.105,.052,.140],[side*.071,.062,.160],[side*.037,.051,.169]],.0055,head);
    curve(M.skinShade,[[side*.105,-.012,.156],[side*.071,-.019,.168]],.0025,head);
  }
  curve(M.lips,[[-.034,-.090,.171],[0,-.097,.179],[.030,-.090,.173]],.003,head);
  curve(M.skinShade,[[-.076,.092,.145],[-.011,.104,.169],[.052,.092,.156]],.0025,head);
  for(let i=0;i<22;i++){
    const x=(random(i+217)-.5)*.23,y=-.065-random(i+129)*.082,z=.153-random(i+513)*.035;
    rod(i%3===0?M.grayShade:M.hairLight,[x,y,z],[x+.004,y-.011,z+.004],.0018,head);
  }
  // Brown locks dominate; desaturated grey appears at the temples and in strands.
  oval(M.hair,0,.065,-.039,.191,.160,.162,head);
  for(let i=0;i<21;i++){
    const a=i/21*Math.PI*2,r=.12+random(i+721)*.055,x=Math.cos(a)*r,y=.085+random(i+603)*.067,z=-.035+Math.sin(a)*r*.79;
    const lock= i%4===0?M.hairLight:M.hair;
    oval(lock,x,y,z,.029+random(i+811)*.021,.025+random(i+411)*.021,.048+random(i+211)*.028,head,[.2*Math.sin(a),a,.1]);
  }
  for(let i=0;i<38;i++){
    const a=random(i+1901)*Math.PI*2,theta=.18+random(i+1723)*1.05,points=[];
    for(let j=0;j<5;j++){const t=theta+j*.085,phi=a+j*.045;points.push([Math.cos(phi)*Math.sin(t)*.193,.068+Math.cos(t)*.163,-.039+Math.sin(phi)*Math.sin(t)*.165]);}
    curve(i%5===0?M.grayShade:i%2===0?M.hairLight:M.hair,points,.0018,head);
  }
  for(const side of [-1,1]){
    oval(M.hair,side*.163,.020,-.041,.041,.115,.102,head);
    oval(M.grayShade,side*.176,.016,-.013,.024,.079,.067,head);
    for(let i=0;i<8;i++){
      const x=side*(.166+random(i+side*31+99)*.018),y=.065-i*.013,z=.037-random(i+473)*.075;
      curve(i%3===0?M.gray:M.grayShade,[[x,y,z],[x+side*.005,y-.028,z-.006],[x+side*.002,y-.050,z-.014]],.0022,head);
    }
  }
  for(let i=0;i<11;i++){
    const x=(random(i+1211)-.5)*.26,z=-.03+(random(i+1511)-.5)*.19,y=.200-random(i+911)*.018;
    curve(i%3===0?M.gray:M.grayShade,[[x-.024,y-.009,z-.022],[x,y+.003,z],[x+.024,y-.012,z+.027]],.0018,head);
  }

  for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(geometry[batch.type],batch.mat,batch.matrices.length);
    batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=`father-${batch.type}`;batch.parent.add(mesh);
  }
  group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group);
  const metadata={tableSpace:true,tableSurfaceY:1.12,seated:true,hair:'brown-and-grey',
    chair:{x:.65,seatY:.69,z:-1.05},headRest:{x:.20,y:1.18,z:.12},
    glass:{x:glassCenter[0],y:glassCenter[1],z:glassCenter[2],height:.18,radius:.067},
    armSupportY:1.12,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
  group.userData.father=metadata;
  return {group,metadata,update(time=0){const t=Number.isFinite(time)?time:0,breath=Math.sin(t*.92);chest.scale.set(1,1+breath*.005,1+breath*.008);}};
}
