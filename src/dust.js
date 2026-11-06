/** A few loose cloth fibres, brushed from the jacket, in a single pooled draw. */
export function createDustEffects(THREE, scene) {
  const COUNT = 20, INITIAL_SEED = 0x4d6f7468;
  let seed = INITIAL_SEED, cursor = 0, active = 0, emitted = 0;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const particles = Array.from({length: COUNT}, () => ({active: false}));
  const positions = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const opacities = new Float32Array(COUNT);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {uColor: {value: new THREE.Color('#a7aa9b')}},
    ]),
    fog: true, transparent: true, depthWrite: false,
    vertexShader: `
      attribute float aSize;
      attribute float aOpacity;
      varying float vOpacity;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vOpacity = aOpacity;
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aSize * 700.0 / max(0.1, -mvPosition.z), 0.7, 3.0);
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vOpacity;
      #include <fog_pars_fragment>
      void main() {
        float radius = length((gl_PointCoord - 0.5) * 2.0);
        float alpha = (1.0 - smoothstep(0.12, 1.0, radius)) * vOpacity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(uColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const specks = new THREE.Points(geometry, material);
  specks.name = 'JacketDust'; specks.frustumCulled = false; specks.renderOrder = 3;
  scene.add(specks);

  function markBuffers() {
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aOpacity.needsUpdate = true;
  }
  function writeParticle(index) {
    const p = particles[index], offset = index * 3;
    if (!p.active) {
      positions[offset] = 0; positions[offset + 1] = -1000; positions[offset + 2] = 0;
      sizes[index] = 0; opacities[index] = 0; return;
    }
    const drift = (1 - Math.exp(-1.8 * p.age)) / 1.8;
    positions[offset] = p.x + p.vx * drift;
    positions[offset + 1] = p.y + p.vy * p.age - .055 * p.age * p.age;
    positions[offset + 2] = p.z + p.vz * drift;
    sizes[index] = p.size;
    opacities[index] = p.opacity * Math.min(1, p.age / .035) * (1 - p.age / p.life) ** 1.3;
  }
  function puff({x, y, z = 0, strength = 1} = {}) {
    if (![x, y, z, strength].every(Number.isFinite) || strength <= 0) return;
    const amount = Math.min(1.5, strength), count = Math.max(3, Math.min(10, Math.round(amount * 8)));
    for (let i = 0; i < count; i++) {
      const index = cursor; cursor = (cursor + 1) % COUNT;
      const p = particles[index]; if (!p.active) active++;
      p.active = true; p.age = 0; p.life = .42 + random() * .24;
      p.x = x + (random() - .5) * .12; p.y = y + (random() - .5) * .08; p.z = z + (random() - .5) * .10;
      p.vx = (random() - .5) * .19 * amount; p.vy = .22 + random() * .23;
      p.vz = (random() - .5) * .14;
      p.size = .025 + random() * .015; p.opacity = (.16 + random() * .10) * Math.min(1, amount);
      writeParticle(index); emitted++;
    }
    specks.visible = active > 0; markBuffers();
  }
  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || active === 0) return;
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i]; if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {p.active = false; active--;}
      writeParticle(i);
    }
    specks.visible = active > 0; markBuffers();
  }
  function reset() {
    seed = INITIAL_SEED; cursor = active = emitted = 0;
    for (let i = 0; i < COUNT; i++) {particles[i].active = false; writeParticle(i);}
    specks.visible = false; markBuffers();
  }
  reset();
  return {puff, update, reset, get activeCount() {return active;}, get emittedCount() {return emitted;}};
}
