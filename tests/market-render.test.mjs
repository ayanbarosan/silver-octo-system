import test from 'node:test';
import assert from 'node:assert/strict';
import {captureMarketPose,interpolateMarketState} from '../src/market-render.js';
import {awningSurfaceY} from '../src/market.js';

const scene=()=>({phase:'awning-impact',area:'awning',phaseTime:.4,crouch:0,awningDeflection:.2,awningImpactX:69,
 vendor:{phase:'watch',x:65.4,y:0,z:1.4,time:2},
 marketAction:{type:'awning-impact',progress:.3,elapsed:.4,surfaceY:-2.9,braceY:-2.88,deflection:.2},caught:null,climb:null,slide:null});

test('the softened landing, brace and cloth share the interpolated render time',()=>{
 const state=scene(),previous=captureMarketPose(state);
 state.phaseTime=.5;state.awningDeflection=.4;state.marketAction={...state.marketAction,progress:.4,elapsed:.5,surfaceY:-3.1,braceY:-3.08,deflection:.4};
 const result=interpolateMarketState(state,previous,.5);
 assert(Math.abs(result.awningDeflection-.3)<1e-9);
 assert(Math.abs(awningSurfaceY(69,result)-result.marketAction.surfaceY)<1e-9,'Supported feet must follow the visible fabric, not the next physics step.');
 assert(Math.abs(result.marketAction.braceY-result.marketAction.surfaceY-.02)<1e-9);
 assert.equal(result.marketAction.elapsed,.45);
});

test('vendor phase changes retain continuous positions without rewinding the new action clock',()=>{
 const state=scene();state.vendor={phase:'exit',x:21,y:0,z:1.2,time:2};const previous=captureMarketPose(state);
 state.vendor={phase:'chase',x:20.9,y:0,z:1.4,time:0};
 const result=interpolateMarketState(state,previous,.5);
 assert.equal(result.vendor.x,20.95);assert(Math.abs(result.vendor.z-1.3)<1e-9);assert.equal(result.vendor.time,0);
 state.phase='awning-drop';state.marketAction={type:'awning-drop',progress:0,elapsed:0};
 assert.equal(interpolateMarketState(state,previous,.5).marketAction.progress,0);
});

test('capturing or rendering a food reach cannot mutate the simulation handle or saved pose',()=>{
 const state=scene();state.phase='take-food';state.marketAction={type:'take-food',progress:.4,elapsed:.4,handle:{x:25,y:1.02,z:1}};
 const previous=captureMarketPose(state),baseline=structuredClone(state);
 const rendered=interpolateMarketState(state,previous,.5);rendered.marketAction.handle.x=99;rendered.vendor.x=99;
 assert.deepEqual(state,baseline);assert.equal(previous.marketAction.handle.x,25);
 assert.equal(interpolateMarketState(null,null,.5),null);
});
