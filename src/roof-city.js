// Layered, inhabited apartment blocks used only by the rooftop chapter.
// All structural detail is instanced; the walking lane remains in front of z=-10.
export function createRoofCity(THREE,parent,{materials={},random}={}){
  const group=new THREE.Group();group.name='rain-city';parent.add(group);
  const rnd=random??(n=>{const x=Math.sin(n*127.17+813.73)*43758.5453;return x-Math.floor(x);});
  const standard=(color,roughness=.92,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  function plasterTexture(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#969d98';c.fillRect(0,0,512,512);
    const image=c.getImageData(0,0,512,512);for(let i=0;i<image.data.length;i+=4){const a=(rnd(i*.179)-.5)*37;for(let k=0;k<3;k++)image.data[i+k]+=a;}c.putImageData(image,0,0);
    for(let i=0;i<90;i++){const x=rnd(i+77)*512,y=rnd(i+312)*512,r=4+rnd(i+519)*52;c.beginPath();for(let j=0;j<12;j++){const a=j/11*6.283,s=r*(.55+rnd(i*19+j)*.55),xx=x+Math.cos(a)*s,yy=y+Math.sin(a)*s*.68;if(j)c.lineTo(xx,yy);else c.moveTo(xx,yy);}c.closePath();c.fillStyle=i%4===0?'rgba(196,196,177,.23)':'rgba(39,53,52,.22)';c.fill();c.strokeStyle='rgba(196,195,178,.20)';c.lineWidth=1.2;c.stroke();}
    for(let i=0;i<80;i++){const x=rnd(i+817)*512,y=rnd(i+1021)*512,w=1+rnd(i+173)*12,h=40+rnd(i+200)*230;const g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,'rgba(28,42,42,0)');g.addColorStop(.48,'rgba(28,42,42,.20)');g.addColorStop(1,'rgba(28,42,42,0)');c.fillStyle=g;c.fillRect(x,y,w,h);}
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;return map;
  }
  const fallbackMap=materials.wall?.map??plasterTexture();
  const wallBase=materials.wall??standard('#627176',.98,{map:fallbackMap});
  const metal=materials.metal??standard('#293e43',.62,{metalness:.48});
  const zinc=materials.zinc??standard('#80918d',.54,{metalness:.55});
  const rim=materials.rim??standard('#7c8885',.92,{map:fallbackMap});
  const rust=materials.rust??standard('#685142',.98);
  const recess=standard('#101f25',.98),frame=standard('#465956',.94,{metalness:.08});
  const darkFrame=standard('#293d40',.94,{metalness:.06}),oldFrame=standard('#748077',.98,{metalness:.04});
  const panel=standard('#3d5052',.99,{map:fallbackMap});
  const batches=new Map(),dummy=new THREE.Object3D();
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),plane:new THREE.PlaneGeometry(1,1)};
  function instance(type,material,position,scale,quaternion=null,shadow=false){
    const key=`${type}/${material.uuid}/${shadow}`;if(!batches.has(key))batches.set(key,{type,material,shadow,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(quaternion)dummy.quaternion.copy(quaternion);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
  }
  const box=(w,h,d,x,y,z,m=metal,shadow=false)=>instance('box',m,[x,y,z],[w,h,d],null,shadow);
  function rod(a,b,r=.022,m=metal){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));instance('cylinder',m,a.map((v,i)=>(v+b[i])/2),[r,d.length(),r],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));}
  function curve(points,r=.014,m=metal){
    const spline=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));for(let n=0;n<21;n++)rod(spline.getPoint(n/21).toArray(),spline.getPoint((n+1)/21).toArray(),r,m);
  }
  const clamp=v=>Math.max(0,Math.min(1,v));
  function noise(x,y,seed){
    const ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,u=a*a*(3-2*a),v=b*b*(3-2*b);
    const n=(xx,yy)=>rnd(xx*37.17+yy*119.71+seed);
    return (n(ix,iy)*(1-u)+n(ix+1,iy)*u)*(1-v)+(n(ix,iy+1)*(1-u)+n(ix+1,iy+1)*u)*v;
  }
  function weatherTexture(streak=false){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=streak?512:256;
    const c=canvas.getContext('2d'),image=c.createImageData(canvas.width,canvas.height);
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const i=(y*canvas.width+x)*4,nx=x/127.5-1,ny=y/(canvas.height/2)-1;
      const cloud=noise(x/51,y/59,441),medium=noise(x/15,y/21,841),grain=rnd(x*17.13+y*139.73+313);
      const edge=clamp(Math.min(1-Math.abs(nx),1-Math.abs(ny))*7);
      let opacity,shade;
      if(streak){
        const thread=noise(x/11,y/109,1493),envelope=clamp(1-nx*nx*1.2)*Math.sin(Math.PI*y/canvas.height);
        opacity=clamp(envelope*(thread*.46+cloud*.22-.13))*edge;
        shade=22+medium*17;
      }else{
        const boundary=clamp(1-nx*nx*.9-ny*ny*.72+(cloud-.5)*1.7+(medium-.5)*.45);
        opacity=boundary*(.16+medium*.30)*(grain>.19?1:.12)*edge;
        shade=132+medium*36+(grain-.5)*28;
      }
      image.data[i]=shade;image.data[i+1]=shade+(streak?9:7);image.data[i+2]=shade+(streak?12:3);image.data[i+3]=Math.round(opacity*255);
    }
    c.putImageData(image,0,0);
    if(!streak){
      // Fine fissures follow the old render, with a broken rather than inked edge.
      c.strokeStyle='rgba(27,42,42,.22)';c.lineWidth=.6;
      for(let i=0;i<7;i++){const x=39+rnd(i+801)*178,y=24+rnd(i+1103)*185;c.beginPath();c.moveTo(x,y);for(let k=1;k<7;k++)c.lineTo(x+k*3+(rnd(i*19+k)-.5)*9,y+k*5+(rnd(i*7+k+17)-.5)*8);c.stroke();}
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
  }
  const wornPlaster=standard('#c4cec7',1,{map:weatherTexture(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const runoff=standard('#718887',1,{map:weatherTexture(true),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  let weatheredPatches=0,runoffStains=0;
  const plantPaths=[[[.47,.71],[.38,.61]],[[.48,.67],[.57,.56]],[[.45,.61],[.36,.49]],[[.48,.58],[.54,.45]],[[.47,.52],[.43,.39]]];
  function windowTexture(warm,variant){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;const c=canvas.getContext('2d');
    const g=c.createLinearGradient(0,0,128,192);
    if(warm){g.addColorStop(0,'#8d673c');g.addColorStop(.48,'#d3b478');g.addColorStop(1,'#8c734e');}else{g.addColorStop(0,'#152b35');g.addColorStop(.45,'#304954');g.addColorStop(1,'#162a31');}
    c.fillStyle=g;c.fillRect(0,0,128,192);
    // Interior depth, a ceiling lamp and softly folded curtains.
    c.fillStyle=warm?'rgba(30,27,19,.31)':'rgba(6,15,20,.33)';c.fillRect(7,14,113,7);c.fillRect(102,8,15,175);c.fillRect(7,177,114,9);
    if(warm){c.fillStyle='#e3c98b';c.fillRect(54,22,24,5);c.strokeStyle='rgba(219,200,155,.48)';c.lineWidth=2;c.beginPath();c.moveTo(66,0);c.lineTo(66,22);c.stroke();}
    const side=variant%2?0:1;
    for(let i=0;i<7;i++){const x=side?91+i*5:i*5;c.fillStyle=warm?`rgba(218,202,156,${.20+(i%2)*.23})`:`rgba(90,109,110,${.12+(i%2)*.12})`;c.fillRect(x,10,4,173);}
    if(variant!==2){
      c.save();c.translate(variant===1?49:73,32);c.scale(88,170);c.strokeStyle=warm?'#282c21':'#152a2a';c.fillStyle=c.strokeStyle;c.lineWidth=.018;c.beginPath();c.moveTo(.47,.74);c.lineTo(.47,.39);c.stroke();
      for(const [a,b]of plantPaths){c.beginPath();c.moveTo(...a);c.quadraticCurveTo((a[0]+b[0])/2-.04,(a[1]+b[1])/2-.04,...b);c.quadraticCurveTo((a[0]+b[0])/2+.05,(a[1]+b[1])/2+.02,...a);c.fill();}
      c.fillRect(.38,.72,.18,.13);c.restore();
    }
    // Uneven pane reflections and beads on the glass stay visible in lit rooms.
    c.strokeStyle=warm?'rgba(244,232,196,.12)':'rgba(132,163,176,.21)';c.lineWidth=1;
    for(let i=0;i<22;i++){const x=rnd(i+variant*81+751)*128,y=rnd(i+variant*37+992)*192;c.beginPath();c.moveTo(x,y);c.lineTo(x-.7,y+5+rnd(i+899)*20);c.stroke();}
    c.fillStyle=warm?'rgba(241,219,167,.16)':'rgba(176,199,204,.13)';c.fillRect(7,3,1,173);c.fillRect(4,5,117,1);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
  }
  const coldWindows=Array.from({length:3},(_,i)=>standard('#c6d7d9',.43,{map:windowTexture(false,i),metalness:.14,envMap:materials.envMap??null,envMapIntensity:.16}));
  const warmWindows=Array.from({length:3},(_,i)=>{const map=windowTexture(true,i);return standard('#c5b28b',.74,{map,emissive:'#d5b276',emissiveMap:map,emissiveIntensity:i===1?.83:.61});});
  const darkWindow=standard('#172b31',.72),farWindow=standard('#293f49',.82),farWarm=standard('#a79c7c',.94,{emissive:'#bc9d65',emissiveIntensity:.36});
  const fanQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
  const blocks=[];let windows=0,litWindows=0,balconies=0,airConditioners=0;
  function materialFor(color,width,height){
    const m=wallBase.clone();m.color.set(color);m.roughness=.97;m.envMapIntensity=.07;
    for(const key of ['map','bumpMap','roughnessMap'])if(m[key]){m[key]=m[key].clone();m[key].repeat.set(width/4.2,height/4.2);}
    return m;
  }
  function block({x,width,top,z,seed,layer=0,bottom=-25}){
    const depth=layer===0?5.2:layer===1?7:9,height=top-bottom;
    const colors=layer===0?['#53656a','#617074','#566970']:layer===1?['#5c737c','#687f85','#617780']:['#687e89','#718892','#6a828c'];
    const wall=materialFor(colors[seed%colors.length],width,height);
    box(width,height,depth,x,(top+bottom)/2,z-depth/2-.035,wall);
    box(width+.20,.22,depth+.16,x,top+.075,z-depth/2,wall);
    box(width+.12,.07,.15,x,top+.22,z+.005,rim);
    const cols=Math.max(2,Math.floor((width-1.7)/(layer===2?2.3:2.5))),step=(width-2.3)/(cols-1),rows=Math.floor((height-1.7)/2.8);
    for(let row=0;row<rows;row++){
      const yy=top-1.82-row*2.8;
      if(layer<2){box(width,.045,.07,x,yy-1.10,z+.035,panel);if(row%3===0)box(width,.012,.07,x,yy-1.05,z+.04,panel);}
      for(let col=0;col<cols;col++){
        const xx=x-width/2+1.15+col*step,n=seed+row*113+col*29,lit=rnd(n)>.929||seed===206&&row===1&&col===1;
        const w=layer===2?.78:.90,h=layer===2?1.22:1.37;windows++;if(lit)litWindows++;
        box(w+.20,h+.22,.07,xx,yy,z+.035,recess);
        const pane=layer===2?(lit?farWarm:farWindow):lit?warmWindows[Math.floor(rnd(n+31)*3)]:rnd(n+22)<.16?darkWindow:coldWindows[Math.floor(rnd(n+37)*3)];
        instance('plane',pane,[xx,yy,z+.079],[w,h,1]);
        if(layer<2){
          const windowFrame=rnd(n+181)>.88?oldFrame:rnd(n+199)>.48?darkFrame:frame;
          for(const dx of [-w/2-.03,w/2+.03])box(.052,h+.17,.075,xx+dx,yy,z+.098,windowFrame);
          for(const dy of [-h/2-.045,h/2+.045])box(w+.12,.052,.075,xx,yy+dy,z+.098,windowFrame);
          box(.034,h,.052,xx+(col%3===0?.09:0),yy,z+.118,windowFrame);
          box(w,.033,.052,xx,yy-.13,z+.118,windowFrame);
          box(w+.25,.085,.23,xx,yy-h/2-.13,z+.11,rim);
          box(w+.12,.028,.21,xx,yy-h/2-.07,z+.115,rnd(n+219)>.65?zinc:frame);
          if(rnd(n+211)>.83)box(.026,.10+rnd(n+212)*.15,.008,xx-w/2-.03,yy-h*.23,z+.142,rust);
          // Remnants of painted repairs and dark runoff below selected sills.
          if(rnd(n+40)>.67)box(.025+rnd(n+47)*.04,.35+rnd(n+43)*.78,.008,xx-w*.32,yy-h/2-.35,z+.045,panel);
          if(layer===0&&rnd(n+231)>.43){
            instance('plane',runoff,[xx+(rnd(n+233)-.5)*.43,yy-h/2-.88,z+.017],[.72+rnd(n+237)*.70,1.8+rnd(n+239)*1.6,1]);runoffStains++;
          }
        }else box(w+.13,.07,.13,xx,yy-h/2-.11,z+.085,panel);
        if(layer===0&&rnd(n+49)>.925&&col<cols-1){
          const ax=xx+.84,ay=yy-.13;airConditioners++;
          box(.67,.49,.35,ax,ay,z+.23,rim);box(.59,.41,.025,ax,ay,z+.42,zinc);
          instance('cylinder',metal,[ax-.09,ay,z+.445],[.168,.016,.168],fanQ);
          for(let j=0;j<4;j++)box(.28,.018,.018,ax+.16,ay-.11+j*.072,z+.45,metal);
          rod([ax-.22,ay-.27,z+.11],[ax-.22,ay-.41,z+.11],.018,metal);
          rod([ax+.22,ay-.27,z+.11],[ax+.22,ay-.41,z+.11],.018,metal);
          curve([[ax+.32,ay-.10,z+.18],[ax+.45,ay-.26,z+.13],[ax+.46,ay-.88,z+.06]],.012,metal);
        }
        if(layer===0&&row>0&&row%3===1&&col===cols-1&&seed%2===0){
          const by=yy-.89,front=z+.98;balconies++;
          box(1.53,.13,1.02,xx,by,z+.43,rim);box(1.49,.45,.075,xx,by+.27,front,panel);
          for(const dx of [-.72,.72]){rod([xx+dx,by+.05,z+.04],[xx+dx,by+.72,z+.04],.020);rod([xx+dx,by+.06,front],[xx+dx,by+.72,front],.020);rod([xx+dx,by+.72,z+.04],[xx+dx,by+.72,front],.019);}
          rod([xx-.73,by+.72,front],[xx+.73,by+.72,front],.022);
          for(let j=0;j<6;j++)rod([xx-.65+j*.26,by+.50,front],[xx-.65+j*.26,by+.70,front],.010);
          if(row%2)box(.31,.13,.18,xx+.38,by+.20,z+.72,rust);
        }
      }
    }
    if(layer<2){
      // Weathering bridges the window grid: small overlapping coats of eroded
      // render and damp bloom add age without becoming opaque polygon patches.
      const count=layer===0?26:12;
      for(let i=0;i<count;i++){
        const xx=x+(rnd(seed+i*13+3141)-.5)*(width-1.0),yy=bottom+1+rnd(seed+i*29+4431)*(height-2);
        const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),(rnd(seed+i+4911)-.5)*.20);
        instance('plane',wornPlaster,[xx,yy,z+.012],[.65+rnd(seed+i+5931)*2.5,1.2+rnd(seed+i+6331)*3.5,1],q);weatheredPatches++;
      }
      for(const xx of [x-width/2+.38,x+width/2-.41]){
        instance('plane',runoff,[xx,(top+bottom)/2,z+.014],[.55,height-1.1,1]);runoffStains++;
      }
    }
    if(layer<2){
      for(const xx of [x-width/2+.19,x+width/2-.22]){
        rod([xx,bottom+.1,z+.18],[xx,top-.07,z+.18],.038,metal);
        for(let yy=bottom+1;yy<top;yy+=3.7)box(.12,.038,.045,xx,yy,z+.16,zinc);
      }
      for(let xx=x-width/2+3.3;xx<x+width/2-.6;xx+=3.5)box(.019,height-.2,.013,xx,(top+bottom)/2,z+.009,panel);
      // Safety rails, flues and old aerials extend the silhouette of each roof.
      const roofZ=z-1.1;
      rod([x-width/2+.3,top+.94,roofZ],[x+width/2-.3,top+.94,roofZ],.024);
      for(let j=0;j<Math.ceil(width/2.6);j++){const xx=x-width/2+.3+j*2.6;rod([xx,top+.17,roofZ],[xx,top+.95,roofZ],.023);}
      for(let j=0;j<2;j++){
        const xx=x-width*.27+j*width*.51;
        box(.59,.77,.59,xx,top+.49,z-2.35,panel);box(.71,.10,.71,xx,top+.92,z-2.35,rim);
        rod([xx+.37,top+.20,z-2.60],[xx+.37,top+1.82,z-2.60],.026,zinc);
        for(let k=0;k<4;k++)rod([xx-.04,top+1.06+k*.19,z-2.70],[xx+.81,top+1.06+k*.19,z-2.50],.012,metal);
        rod([xx+.37,top+1.48,z-2.93],[xx+.37,top+1.48,z-2.23],.012,metal);
      }
    }
    blocks.push({x,width,top,bottom,z,layer,bounds:{min:[x-width/2,bottom,z-depth-.035],max:[x+width/2,top+1.9,z+1.05]}});
  }
  // The taller flanking blocks frame the child; setbacks open fog-filled alleys.
  const near=[[-12,13.8,22.5,-11.8,142],[12,17.4,7.2,-17.8,206],[32,13.8,23.5,-13.2,338],[49.5,14.2,18.5,-20.2,424],[65.2,13.9,25.0,-14.0,516]];
  near.forEach(([x,width,top,z,seed])=>block({x,width,top,z,seed}));
  const middle=[[-23,15,21,-31,641],[-2,13.4,16.3,-34,713],[20,15.6,22,-39,827],[44,18,19.5,-37,941],[68,15.4,23,-34,1054]];
  middle.forEach(([x,width,top,z,seed])=>block({x,width,top,z,seed,layer:1,bottom:-29}));
  for(let i=0;i<8;i++)block({x:-43+i*19,width:13+rnd(i+1333)*6,top:18+rnd(i+1433)*14,z:-61-rnd(i+1533)*21,seed:1601+i*37,layer:2,bottom:-32});
  // Sagging aerial wire is deliberately beyond all playable roofs and gaps.
  curve([[-17,17.6,-11.1],[-2,12.6,-14.9],[16,12.8,-20.1],[36,20.2,-13.0]],.014,metal);
  curve([[30,21.8,-12.8],[40,16.7,-16.4],[52,17.6,-19.7],[68,23.3,-13.4]],.012,metal);
  for(const batch of batches.values()){
    const object=new THREE.InstancedMesh(geometries[batch.type],batch.material,batch.matrices.length);
    batch.matrices.forEach((m,i)=>object.setMatrixAt(i,m));object.instanceMatrix.needsUpdate=true;object.castShadow=batch.shadow;object.receiveShadow=false;group.add(object);
  }
  const metadata={blocks,windows,litWindows,balconies,airConditioners,weatheredPatches,runoffStains,drawBatches:batches.size,searchlightMount:{x:8,y:8.3,z:-17.55},minZ:-10.75};
  group.userData.roofCity=metadata;
  return {group,metadata,update(){}};
}
