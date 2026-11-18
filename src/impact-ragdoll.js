// A short-lived articulated body. Simulation time follows the catch clock,
// rather than render dt, so the same impact survives dropped frames and pause.
export function createImpactRagdoll(THREE,{nodes,links,cluster=[],floorY=0,colliders=[],direction=1}) {
  const h=1/240,gravity=10.8,iterations=16;
  const particles=nodes.map(n=>({name:n.name,p:n.position.clone(),old:n.position.clone(),previous:n.position.clone(),render:n.position.clone(),v:new THREE.Vector3(),radius:n.radius??.06,invMass:1/(n.mass??1),body:!!n.body,contact:false,normal:new THREE.Vector3(),incoming:new THREE.Vector3()}));
  const byName=Object.fromEntries(particles.map((p,i)=>[p.name,i]));
  const constraints=links.map(l=>({...l,a:byName[l.a],b:byName[l.b],length:l.length??particles[byName[l.a]].p.distanceTo(particles[byName[l.b]].p)}));
  // The jacket, pelvis and shoulder girdle remain a rigid cluster. Every limb
  // below it is an independent two-link chain; the neck retains some give.
  for(let a=0;a<cluster.length;a++)for(let b=a+1;b<cluster.length;b++){
    const i=byName[cluster[a]],j=byName[cluster[b]];
    constraints.push({a:i,b:j,length:particles[i].p.distanceTo(particles[j].p),stiffness:1});
  }
  const correction=new THREE.Vector3(),closest=new THREE.Vector3(),normal=new THREE.Vector3();
  const trunkAxis=new THREE.Vector3(),trunkClosest=new THREE.Vector3(),selfDelta=new THREE.Vector3(),sideAxis=new THREE.Vector3(),forwardAxis=new THREE.Vector3(),limbAxis=new THREE.Vector3(),bendAxis=new THREE.Vector3();
  const selfPairs=[];
  for(const side of ['left','right']) {
    for(const part of ['Wrist','Elbow','Knee','Ankle']) {
      const a=byName[side+part],b=byName.head,min=part==='Ankle'?.38:part==='Knee'?.35:.33;
      selfPairs.push({a,b,min,start:Math.min(min,particles[a].p.distanceTo(particles[b].p))});
    }
    for(const part of ['Wrist','Elbow']){
      const a=byName[side+part],b=byName.backpack,min=part==='Wrist'?.33:.31;
      selfPairs.push({a,b,min,start:Math.min(min,particles[a].p.distanceTo(particles[b].p))});
    }
  }
  for(const part of ['Knee','Ankle'])selfPairs.push({a:byName['left'+part],b:byName['right'+part],min:part==='Knee'?.12:.16,start:.12});
  const bounds=colliders.filter(b=>b?.min&&b?.max);
  let steps=0,bodyHit=null,contactCount=0,maxSpeed=0;
  for(const p of particles){
    let clearance=Math.max(.012,p.p.y-floorY);
    for(const box of bounds){closest.set(Math.max(box.min.x,Math.min(box.max.x,p.p.x)),Math.max(box.min.y,Math.min(box.max.y,p.p.y)),Math.max(box.min.z,Math.min(box.max.z,p.p.z)));clearance=Math.min(clearance,p.p.distanceTo(closest));}
    p.startRadius=Math.min(p.radius,Math.max(.012,clearance));
  }
  for(const p of particles){
    // The impulse arrives at the head first. Heels trail, the two hands and
    // knees receive different velocities, and the heavy trunk follows later.
    const name=p.name,side=name.startsWith('left')?-1:1;
    let forward=1.35,up=.22,lateral=0;
    if(name==='head'){forward=3.65;up=.38;lateral=.12;}
    else if(name==='neck'){forward=2.65;up=.30;}
    else if(name==='belly'){forward=1.65;up=.24;}
    else if(name.includes('Shoulder')){forward=2.45;up=.32;lateral=side*.18;}
    else if(name.includes('Elbow')){forward=2.1+side*.35;up=.72+side*.18;lateral=side*.45;}
    else if(name.includes('Wrist')){forward=1.15-side*.6;up=.95+side*.25;lateral=side*.65;}
    else if(name.includes('Knee')){forward=.50+side*.32;up=.32;lateral=side*.10;}
    else if(name.includes('Ankle')){forward=-.28+side*.13;up=.12;lateral=side*.09;}
    p.v.set(lateral,up,forward*direction);
  }
  function distance(c){
    const a=particles[c.a],b=particles[c.b];correction.copy(b.p).sub(a.p);const d=correction.length();
    if(d<1e-8)return;
    const target=c.min!==undefined?Math.max(c.min,Math.min(c.max??Infinity,d)):c.length;
    const weight=(d-target)/d*(c.stiffness??1)/(a.invMass+b.invMass);
    a.p.addScaledVector(correction,weight*a.invMass);b.p.addScaledVector(correction,-weight*b.invMass);
  }
  function contact(p){
    const ramp=Math.min(1,(steps+1)*h/.18),radius=p.startRadius+(p.radius-p.startRadius)*ramp*ramp*(3-2*ramp);
    if(p.p.y<floorY+radius){p.p.y=floorY+radius;p.contact=true;p.normal.set(0,1,0);}
    for(const box of bounds){
      closest.set(Math.max(box.min.x,Math.min(box.max.x,p.p.x)),Math.max(box.min.y,Math.min(box.max.y,p.p.y)),Math.max(box.min.z,Math.min(box.max.z,p.p.z)));
      normal.copy(p.p).sub(closest);const d=normal.length();
      if(d>=radius)continue;
      if(d>1e-7){normal.multiplyScalar(1/d);p.p.addScaledVector(normal,radius-d);}
      else {
        let depth=Infinity,axis='x',sign=-1;
        for(const k of ['x','y','z'])for(const s of[-1,1]){const edge=s<0?box.min[k]:box.max[k],gap=Math.abs(p.p[k]-edge);if(gap<depth){depth=gap;axis=k;sign=s;}}
        normal.set(0,0,0);normal[axis]=sign;p.p[axis]=(sign<0?box.min[axis]-radius:box.max[axis]+radius);
      }
      p.contact=true;p.normal.copy(normal);
    }
  }
  function selfContacts(){
    const ramp=Math.min(1,(steps+1)*h/.18),weight=ramp*ramp*(3-2*ramp);
    for(const c of selfPairs){
      const a=particles[c.a],b=particles[c.b],min=c.start+(c.min-c.start)*weight;
      selfDelta.copy(a.p).sub(b.p);const d=selfDelta.length();if(d<min&&d>1e-7){const amount=(min-d)/(d*(a.invMass+b.invMass));a.p.addScaledVector(selfDelta,amount*a.invMass);b.p.addScaledVector(selfDelta,-amount*b.invMass);}
    }
    const pelvis=particles[byName.pelvis],neck=particles[byName.neck];trunkAxis.copy(neck.p).sub(pelvis.p);const lengthSq=trunkAxis.lengthSq();
    for(const side of ['left','right'])for(const part of ['Wrist','Elbow']){
      const p=particles[byName[side+part]],u=Math.max(0,Math.min(1,correction.copy(p.p).sub(pelvis.p).dot(trunkAxis)/lengthSq));
      trunkClosest.copy(pelvis.p).addScaledVector(trunkAxis,u);selfDelta.copy(p.p).sub(trunkClosest);const d=selfDelta.length();
      const radius=(part==='Wrist'?.29:.25)*(1-.34*Math.max(0,(u-.72)/.28))*weight;
      if(d<radius&&d>1e-7)p.p.addScaledVector(selfDelta,(radius-d)/d*.8);
    }
  }
  function kneeLimits(){
    trunkAxis.copy(particles[byName.neck].p).sub(particles[byName.pelvis].p).normalize();
    sideAxis.copy(particles[byName.rightShoulder].p).sub(particles[byName.leftShoulder].p).normalize();
    forwardAxis.crossVectors(sideAxis,trunkAxis).normalize();
    for(const side of ['left','right']){
      const hip=particles[byName[side+'Hip']],knee=particles[byName[side+'Knee']],ankle=particles[byName[side+'Ankle']];
      limbAxis.copy(ankle.p).sub(hip.p).normalize();bendAxis.copy(forwardAxis).addScaledVector(limbAxis,-forwardAxis.dot(limbAxis));
      if(bendAxis.lengthSq()<.01)continue;bendAxis.normalize();
      trunkClosest.copy(hip.p).addScaledVector(limbAxis,correction.copy(knee.p).sub(hip.p).dot(limbAxis));
      const bend=correction.copy(knee.p).sub(trunkClosest).dot(bendAxis);
      // A hinge can fold or straighten, but cannot suddenly flip through its
      // straight configuration and make the knee bend behind the trousers.
      if(bend<.012)knee.p.addScaledVector(bendAxis,(.012-bend)*.65);
    }
  }
  function step(){
    const settle=Math.max(0,Math.min(1,(steps*h-1.15)/.9)),airDrag=Math.exp(-(.60+settle*3.8)*h);
    for(const p of particles){p.previous.copy(p.p);p.old.copy(p.p);p.incoming.copy(p.v);p.v.y-=gravity*h;p.v.multiplyScalar(airDrag);p.p.addScaledVector(p.v,h);p.contact=false;}
    for(let k=0;k<iterations;k++){
      // Alternate the projection order to avoid systematically stretching the
      // same ankle or wrist at the end of the solver pass.
      if(k%2)for(let i=constraints.length-1;i>=0;i--)distance(constraints[i]);
      else for(const c of constraints)distance(c);
      kneeLimits();
      selfContacts();
      for(const p of particles)contact(p);
    }
    contactCount=0;maxSpeed=0;
    for(const p of particles){
      p.v.copy(p.p).sub(p.old).multiplyScalar(1/h);
      if(p.contact){
        contactCount++;
        const incoming=p.incoming.dot(p.normal),speed=-incoming;
        if(p.body&&speed>1.1&&!bodyHit)bodyHit={time:(steps+1)*h,intensity:Math.min(1,speed/4.8),position:p.p.clone().addScaledVector(p.normal,-p.radius)};
        const vn=p.v.dot(p.normal);
        if(vn<0)p.v.addScaledVector(p.normal,-vn);
        if(incoming<-.85)p.v.addScaledVector(p.normal,Math.min(1.05,-incoming*.17));
        // A small first bounce, followed by strong wet-floor friction. The
        // damping acts per second and cannot change with the display rate.
        const normalVelocity=p.v.dot(p.normal);p.v.addScaledVector(p.normal,-normalVelocity).multiplyScalar(Math.exp(-17*h)).addScaledVector(p.normal,normalVelocity);
        if(p.v.lengthSq()<.0025)p.v.set(0,0,0);
      }
      maxSpeed=Math.max(maxSpeed,p.v.length());
    }
    steps++;
  }
  function advanceTo(seconds){
    const target=Math.max(0,Math.min(5,seconds)),count=Math.floor(target/h+1e-8);
    while(steps<count)step();
    // Interpolating consecutive solved states keeps the contacts constrained
    // and avoids the little 240 Hz stair-step on very fast displays.
    const alpha=Math.max(0,Math.min(1,(target-steps*h)/h));
    for(const p of particles)p.render.copy(steps?p.previous:p.p).lerp(p.p,steps?alpha:0);
    return particles;
  }
  return {advanceTo,particles,byName,get bodyHit(){return bodyHit;},get metrics(){return {time:steps*h,contacts:contactCount,maxSpeed,bodyImpact:bodyHit?.intensity??0};}};
}
