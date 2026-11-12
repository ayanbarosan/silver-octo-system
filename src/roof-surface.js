import {LEVEL} from './level.js';

// Cosmetic rainwater is a thin material layer over the existing roof colliders.
// Four water draws share a shader; debris and drain details are instanced.
export function createRoofSurface(THREE,parent,{materials={},roofs=[]}={}){
  const group=new THREE.Group();group.name='roof-water-surfaces';parent.add(group);
  const random=n=>{const f=Math.sin(n*127.13+91.71)*43758.5453;return f-Math.floor(f);};
  const clock={value:0},surfaceMetadata=[];
  const vertexHeader='varying vec3 vRoofWorld; varying vec2 vRoofUV;';
  const fragmentHeader=`
    varying vec3 vRoofWorld;
    varying vec2 vRoofUV;
    uniform float uRoofTime;
    uniform float uRoofSeed;
    uniform vec2 uRoofGlints;
    uniform float uRoofSlip;
    float roofHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float roofNoise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(roofHash(i),roofHash(i+vec2(1.,0.)),f.x),mix(roofHash(i+vec2(0.,1.)),roofHash(i+vec2(1.)),f.x),f.y);
    }
    float roofField(vec2 p){return .57*roofNoise(p)+.28*roofNoise(p*2.13+9.7)+.15*roofNoise(p*5.6-2.2);}
    float roofWater(vec2 p){
      float field=roofField(p*vec2(.57,1.14)+vec2(uRoofSeed,3.71));
      float pool=smoothstep(.50,.63,field);
      vec2 q=p-vec2(${LEVEL.slipPuddle.centerX.toFixed(4)},${LEVEL.slipPuddle.centerZ.toFixed(4)});
      float c=cos(${LEVEL.slipPuddle.angle.toFixed(4)}),s=sin(${LEVEL.slipPuddle.angle.toFixed(4)});
      q=mat2(c,-s,s,c)*q;
      float slip=1.-smoothstep(.78,1.12,length(q/vec2(${LEVEL.slipPuddle.sx.toFixed(4)},${LEVEL.slipPuddle.sz.toFixed(4)}))+.10*roofNoise(p*7.));
      return max(pool,slip*uRoofSlip);
    }
    float roofRing(vec2 p){
      vec2 cell=floor(p*.87),q=fract(p*.87)-vec2(.16+.68*roofHash(cell),.16+.68*roofHash(cell+7.4));
      float age=fract(uRoofTime*.53+roofHash(cell+13.2));
      float d=length(q),r=.018+age*.42;
      return (1.-smoothstep(.004,.018,abs(d-r)))*pow(1.-age,2.)*.26;
    }
    float roofGlint(vec2 p,float center){
      float broken=roofNoise(vec2(p.x*23.,p.y*37.))*roofNoise(vec2(p.x*7.,p.y*9.));
      float wobble=.035*sin(p.y*19.+uRoofTime*.4)+.025*sin(p.y*51.-uRoofTime*.3);
      float band=exp(-pow((p.x-center+wobble)/.125,2.));
      float reach=exp(-pow((p.y-.40)/1.12,2.));
      return band*reach*smoothstep(.14,.57,broken);
    }
  `;
  for(const roof of roofs){
    const width=roof.right-roof.left,center=(roof.left+roof.right)/2;
    const material=new THREE.MeshStandardMaterial({
      color:'#30444b',roughness:.105,metalness:.10,envMap:materials.envMap??materials.wet?.envMap??null,
      envMapIntensity:1.10,transparent:true,opacity:.88,depthWrite:false,
      polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    });
    const seed=roof.seed??Math.round(roof.left*17),slip=roof.left<LEVEL.slipPuddle.centerX&&roof.right>LEVEL.slipPuddle.centerX&&Math.abs(roof.level)<.01;
    material.onBeforeCompile=shader=>{
      shader.uniforms.uRoofTime=clock;
      shader.uniforms.uRoofSeed={value:seed*.173};
      shader.uniforms.uRoofGlints={value:new THREE.Vector2(roof.left+width*.29,roof.left+width*.76)};
      shader.uniforms.uRoofSlip={value:slip?1:0};
      shader.vertexShader=vertexHeader+'\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vRoofWorld=(modelMatrix*vec4(transformed,1.)).xyz; vRoofUV=uv;');
      shader.fragmentShader=fragmentHeader+'\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
        float roofMask=roofWater(vRoofWorld.xz);
        float roofEdge=smoothstep(0.,.025,vRoofUV.x)*smoothstep(0.,.025,1.-vRoofUV.x)*smoothstep(0.,.06,vRoofUV.y)*smoothstep(0.,.06,1.-vRoofUV.y);
        float roofShore=smoothstep(.015,.22,roofMask)*(1.-smoothstep(.25,.74,roofMask));
        diffuseColor.rgb*=mix(.61,1.,smoothstep(.15,.68,roofMask));
        diffuseColor.a*=max(roofMask,roofShore*.48)*roofEdge;
        if(diffuseColor.a<.008)discard;
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+.055*roofNoise(vRoofWorld.xz*11.3)+roofShore*.34,.08,.54);
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 rainP=vRoofWorld.xz;
        float smallWave=sin(rainP.x*62.+rainP.y*27.+uRoofTime*.6)*.012+sin(rainP.y*79.-uRoofTime*.8)*.010;
        normal=normalize(normal+vec3(smallWave,smallWave*.18,-smallWave*.25));
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        vec2 rainPoint=vRoofWorld.xz;
        float warmReflection=roofGlint(rainPoint,uRoofGlints.x)+roofGlint(rainPoint,uRoofGlints.y)*.72;
        float rainRings=roofRing(rainPoint);
        float silver=pow(max(0.,sin(rainPoint.y*78.+rainPoint.x*8.+uRoofTime*.35)),24.)*roofNoise(rainPoint*vec2(2.7,9.))* .018;
        totalEmissiveRadiance+=vec3(.72,.48,.20)*warmReflection*.95+vec3(.32,.48,.56)*(rainRings*.22+silver);
      `);
    };
    material.customProgramCacheKey=()=> 'roof-water-v2';
    const geometry=new THREE.PlaneGeometry(Math.max(.1,width-.22),3.95);geometry.rotateX(-Math.PI/2);
    const water=new THREE.Mesh(geometry,material);water.name=`roof-water-${seed}`;
    water.position.set(center,roof.level+.012,-.22);water.receiveShadow=true;water.castShadow=false;water.renderOrder=1;group.add(water);
    surfaceMetadata.push({left:roof.left,right:roof.right,level:roof.level,y:roof.level+.012,slip,draws:1});
  }

  const batches=new Map(),dummy=new THREE.Object3D();
  const metal=materials.metal??new THREE.MeshStandardMaterial({color:'#44545a',roughness:.64,metalness:.55});
  const dark= new THREE.MeshStandardMaterial({color:'#253337',roughness:.89});
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#7e704b',roughness:.93,side:THREE.DoubleSide});
  const stoneMaterial=materials.rim??new THREE.MeshStandardMaterial({color:'#727b77',roughness:.95});
  const unitBox=new THREE.BoxGeometry(1,1,1);
  const leafShape=new THREE.Shape();leafShape.moveTo(0,.58);leafShape.quadraticCurveTo(.43,.16,.12,-.49);leafShape.lineTo(0,-.64);leafShape.lineTo(-.11,-.40);leafShape.quadraticCurveTo(-.36,.13,0,.58);
  const leafGeometry=new THREE.ShapeGeometry(leafShape,5);leafGeometry.rotateX(-Math.PI/2);
  function instance(type,material,position,scale,rotation){
    const key=`${type}/${material.uuid}`;if(!batches.has(key))batches.set(key,{type,material,matrices:[],colors:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();
    batches.get(key).matrices.push(dummy.matrix.clone());batches.get(key).colors.push(new THREE.Color().setHSL(.11+random(position[0]+position[2])*.035,.18+random(position[0])*.12,.24+random(position[0]+92)*.12));
  }
  let leaves=0,drains=0;
  for(const roof of roofs){
    const width=roof.right-roof.left,seed=roof.seed??7;
    for(let n=0;n<Math.round(width*2.8);n++){
      const x=roof.left+.36+random(seed+n*13)*(width-.72),z=n%2?1.30+random(n+seed+31)*.43:-1.48-random(n+seed+71)*.32;
      instance('leaf',leafMaterial,[x,roof.level+.014,z],[.06+random(n+seed+301)*.09,1,.07+random(n+seed+111)*.10],[0,random(n+seed+221)*6.28,0]);leaves++;
    }
    for(let n=0;n<Math.max(1,Math.floor(width/12));n++){
      const x=roof.left+Math.min(width-.6,1.9+n*8.3),z=1.42;
      instance('box',metal,[x,roof.level+.008,z],[.47,.008,.31],[0,0,0]);
      for(let k=0;k<8;k++)instance('box',dark,[x-.19+k*.054,roof.level+.013,z],[.021,.002,.26],[0,0,0]);
      drains++;
    }
    for(let n=0;n<Math.round(width*.7);n++){
      const x=roof.left+.3+random(n*23+seed)*(width-.6),z=n%2?1.59:-1.76;
      instance('box',stoneMaterial,[x,roof.level+.010,z],[.018+random(n+seed)*.045,.012,.018+random(n+seed+931)*.025],[0,random(n+seed)*6,0]);
    }
  }
  for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(batch.type==='leaf'?leafGeometry:unitBox,batch.material,batch.matrices.length);
    for(let i=0;i<batch.matrices.length;i++){mesh.setMatrixAt(i,batch.matrices[i]);if(batch.type==='leaf')mesh.setColorAt(i,batch.colors[i]);}
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
  }
  const metadata={surfaces:surfaceMetadata,slipPuddle:{...LEVEL.slipPuddle},leaves,drains,drawCalls:roofs.length+batches.size,visualOnly:true};
  group.userData.roofSurface=metadata;
  return {group,metadata,update(time){clock.value=Number.isFinite(time)?time:0;}};
}
