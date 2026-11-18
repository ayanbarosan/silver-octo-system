import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DEVELOPER_SEQUENCE,createDeveloperAccess,developerPasswordHash,sha256} from '../src/developer-access.js';

const reference=text=>createHash('sha256').update(text,'utf8').digest('hex');
const testPassword='test-pass';
const access=()=>createDeveloperAccess({passwordHash:developerPasswordHash(testPassword),now:()=>0});
function reveal(gate,start=0,interval=120){return DEVELOPER_SEQUENCE.map((key,index)=>gate.feed(key,{time:start+index*interval}));}

test('offline SHA-256 matches standard vectors, UTF-8 and block boundaries',()=>{
  assert.equal(sha256(''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  for(const text of['The quick brown fox jumps over the lazy dog','a'.repeat(55),'b'.repeat(56),'c'.repeat(63),'d'.repeat(64),'e'.repeat(65),'f'.repeat(1000),'Română — săgeți ↑→↓← 🏠','invalid surrogate \ud800 and \udfff'])assert.equal(sha256(text),reference(text));
  assert.equal(developerPasswordHash(testPassword),reference('runaway-dev-v1:'+testPassword));
  assert.throws(()=>sha256(null),TypeError);assert.throws(()=>developerPasswordHash(123),TypeError);
});

test('the complete arrow sequence reveals the setting once but does not unlock it',()=>{
  const gate=access();assert(!gate.revealed);assert(!gate.unlocked);assert.equal(gate.verify(testPassword),false);
  const results=reveal(gate);assert.deepEqual(results,[...Array(15).fill(false),true]);
  assert(gate.revealed);assert(!gate.unlocked);assert.equal(gate.feed('ArrowUp'),false);
  assert.equal(gate.verify('wrong-password'),false);assert(!gate.unlocked);
  assert.equal(gate.verify(testPassword),true);assert(gate.unlocked);
});

test('wrong keys reset progress and a repeated prefix can begin a fresh valid sequence',()=>{
  const gate=access();
  DEVELOPER_SEQUENCE.slice(0,9).forEach((key,index)=>gate.feed(key,{time:index*100}));
  gate.feed('x',{time:1000});
  DEVELOPER_SEQUENCE.slice(9).forEach((key,index)=>assert.equal(gate.feed(key,{time:1100+index*100}),false));
  assert(!gate.revealed);
  gate.clearSequence();
  DEVELOPER_SEQUENCE.slice(0,3).forEach((key,index)=>gate.feed(key,{time:2000+index*100}));
  // The extra Up is itself the start of the next attempt.
  const results=DEVELOPER_SEQUENCE.map((key,index)=>gate.feed(key,{time:2300+index*100}));
  assert.equal(results.at(-1),true);assert(gate.revealed);
});

test('key repeats cannot advance the sequence or prolong an expired partial attempt',()=>{
  const gate=access();
  gate.feed('ArrowUp',{time:0});
  for(let i=1;i<=10;i++)assert.equal(gate.feed('ArrowRight',{repeat:true,time:i*500}),false);
  for(let i=1;i<DEVELOPER_SEQUENCE.length;i++)gate.feed(DEVELOPER_SEQUENCE[i],{time:7000+i*100});
  assert(!gate.revealed,'Auto-repeat must not extend the six-second window.');
  gate.clearSequence();
  for(let i=0;i<DEVELOPER_SEQUENCE.length;i++){
    assert.equal(gate.feed('ArrowDown',{repeat:true,time:i*100}),false);
    assert.equal(gate.feed(DEVELOPER_SEQUENCE[i],{time:i*100}),i===DEVELOPER_SEQUENCE.length-1);
  }
});

test('timeouts, clock rewind and invalid timestamps discard a partial code safely',()=>{
  for(const interruption of[6101,-1,NaN,Infinity]){
    const gate=access();gate.feed(DEVELOPER_SEQUENCE[0],{time:0});
    gate.feed(DEVELOPER_SEQUENCE[1],{time:interruption});
    DEVELOPER_SEQUENCE.slice(2).forEach((key,index)=>gate.feed(key,{time:7000+index*100}));
    assert(!gate.revealed);gate.clearSequence();assert.equal(reveal(gate,10000).at(-1),true);
  }
  const boundary=access();assert.equal(reveal(boundary,0,6000).at(-1),true,'The code allows six seconds between deliberate presses.');
});

test('lock preserves the revealed row while reset and a fresh page remove all access',()=>{
  const gate=access();reveal(gate);assert(gate.verify(testPassword));
  gate.lock();assert(gate.revealed);assert(!gate.unlocked);assert(gate.verify(testPassword));
  assert.equal(gate.verify(null),false);assert(!gate.unlocked);assert(gate.verify(testPassword));
  gate.reset();assert(!gate.revealed);assert(!gate.unlocked);assert(!gate.verify(testPassword));
  assert(!access().revealed);assert(!access().unlocked);
  reveal(gate);assert.equal(gate.verify(null),false);assert.equal(gate.verify('x'.repeat(1025)),false);assert(!gate.unlocked);
  assert.throws(()=>createDeveloperAccess({passwordHash:'plaintext'}),TypeError);
});
