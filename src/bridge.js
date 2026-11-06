import { LEVEL } from './level.js';

// The board only loses its collision surface after both feet clear the far end.
// A brief creak can be interrupted by stepping back, so it never drops a child
// who has stopped on it or changed direction during the crossing.
export function createBridge(layout = LEVEL.bridge, middle = LEVEL.roofs.middle) {
  const state = { phase: 'intact', breakTime: 0, load: 0, armed: false, safeTime: 0 };
  const supported = () => state.phase !== 'breaking' && state.phase !== 'broken';
  function reset() {
    Object.assign(state, { phase: 'intact', breakTime: 0, load: 0, armed: false, safeTime: 0 });
  }
  function update(dt, player) {
    dt = Math.max(0, dt);
    if (state.phase === 'broken') return;
    if (state.phase === 'breaking') {
      state.breakTime += dt;
      if (state.breakTime >= 2.4) state.phase = 'broken';
      return;
    }
    const grounded = player.grounded && Math.abs(player.y - layout.y) < .09;
    const onBoard = grounded && player.x >= layout.x && player.x <= layout.x + layout.w;
    const nearApproach = grounded && player.x >= middle.x + middle.w - 1.2 && player.x < layout.safeX;
    if (nearApproach || onBoard) state.armed = true;
    state.load += ((onBoard ? 1 : 0) - state.load) * (1 - Math.exp(-dt * 9));
    const safelyAcross = grounded && player.x >= layout.safeX;
    if (state.armed && safelyAcross) {
      state.safeTime += dt;
      state.phase = 'creaking';
      if (state.safeTime >= .22) {
        state.phase = 'breaking';
        state.breakTime = 0;
        state.load = 0;
        return 'break';
      }
    } else {
      state.safeTime = 0;
      const firstStep = onBoard && state.phase === 'intact';
      state.phase = onBoard ? 'loaded' : 'intact';
      if (firstStep) return 'creak';
    }
  }
  function restore(broken=false){reset();if(broken)Object.assign(state,{phase:'broken',breakTime:2.4,armed:true});}
  return { state, get supported() { return supported(); }, update, reset, restore };
}
