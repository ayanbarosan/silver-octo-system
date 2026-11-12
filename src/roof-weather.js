/** Rooftop rain has near and distant depths; the later street keeps its original rain. */
export function createRoofWeather(THREE,parent){
 const group=new THREE.Group();group.name='roof-rain';parent.add(group);
 const count=1800,data=new Float32Array(count*6),colors=new Float32Array(count*6);
 const random=n=>{const f=Math.sin(n*127.71+53.13)*43758.5453;return f-Math.floor(f);};
 const speeds=new Float32Array(count),lengths=new Float32Array(count);
 for(let i=0;i<count;i++){
  const o=i*6,z=-15+random(i+213)*26;
  data[o]=-26+random(i+51)*56;data[o+1]=-8+random(i+121)*30;data[o+2]=z;
  speeds[i]=10+random(i+771)*12;lengths[i]=(.16+random(i+93)*.40)*(z>4?1.4:1);
  data[o+3]=data[o]-.035;data[o+4]=data[o+1]-lengths[i];data[o+5]=z;
  const c=.32+random(i+513)*.60;for(let k=0;k<2;k++){colors[o+k*3]=c*.77;colors[o+k*3+1]=c*.89;colors[o+k*3+2]=c;}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const material=new THREE.LineBasicMaterial({color:'#b7d0df',vertexColors:true,transparent:true,opacity:.27,depthWrite:false,fog:true});
 const rain=new THREE.LineSegments(geometry,material);rain.frustumCulled=false;group.add(rain);let last=0;
 return {group,metadata:{drops:count,depthLayers:3},update(time,playerX=0){
  const dt=Math.min(.05,Math.max(0,time-last));last=time;
  for(let i=0;i<count;i++){
   const o=i*6;data[o]-=dt*(.65+random(i+17)*.9);data[o+1]-=speeds[i]*dt;
   if(data[o+1]<-8||Math.abs(data[o]-playerX)>32){data[o]=playerX-28+random(i+time*.13)*56;data[o+1]=18+random(i+119)*8;}
   data[o+3]=data[o]-.027-lengths[i]*.08;data[o+4]=data[o+1]-lengths[i];data[o+5]=data[o+2];
  }geometry.attributes.position.needsUpdate=true;
 }};
}
