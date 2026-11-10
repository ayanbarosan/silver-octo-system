import test from 'node:test';
import assert from 'node:assert/strict';
import {createTutorials,TUTORIAL_IDS} from '../src/tutorial.js';
import {DEFAULT_SETTINGS} from '../src/session.js';
import {LEVEL} from '../src/level.js';

const player=(x,y=0,grounded=true)=>({x,y,grounded,vx:1.9,vy:0,face:1});
const context=(x=4,y=0,extra={})=>({playing:true,wake:1,player:player(x,y),crateX:13,busy:false,ladderActive:false,...extra});
const encounters={
  push:()=>context(11.4),
  'crate-climb':()=>context(12.2),
  'running-jump':()=>context(20),
  ladder:()=>context(LEVEL.ladder.x,LEVEL.ladder.bottomY),
  door:()=>context(LEVEL.doorX,LEVEL.roofs.final.y)
};
const expire=tutorials=>tutorials.update(tutorials.current.duration+.01,context());

test('each mechanic receives one brief automatic first-encounter message even with optional hints off',()=>{
  assert.equal(DEFAULT_SETTINGS.hints,false);
  const tutorials=createTutorials(),shown=[];
  for(const id of ['push','crate-climb','running-jump','ladder','door']) {
    const here={...encounters[id](),hints:false};
    const before=structuredClone(here);
    assert.equal(tutorials.update(1/60,here),id);shown.push(id);
    const message=tutorials.current;
    assert.equal(message.id,id);assert.equal(typeof message.text,'string');assert(message.text.length>10);
    assert(message.duration>=3&&message.duration<=6,'First encounters must remain brief, readable prompts.');
    assert.deepEqual(here,before,'Presenting a lesson cannot change player position, velocity or gameplay context.');
    assert.equal(tutorials.update(.5,here),null,'One encounter must not reset its own prompt every frame.');
    assert.equal(expire(tutorials),null);assert.equal(tutorials.current,null);
    for(let n=0;n<20;n++)assert.equal(tutorials.update(.1,here),null,'A learned mechanic must not repeatedly display after the prompt expires.');
  }
  assert.deepEqual(shown,['push','crate-climb','running-jump','ladder','door']);
  assert.deepEqual([...tutorials.learned].sort(),[...TUTORIAL_IDS].sort());
});

test('overlapping crate lessons respect priority without interrupting the current prompt or keeping a hidden queue',()=>{
  const tutorials=createTutorials(),overlap=encounters['crate-climb']();
  assert.equal(tutorials.update(.1,overlap),'push');
  assert.deepEqual(tutorials.learned,['push'],'A suppressed lesson is not learned until it is actually presented.');
  assert.equal(tutorials.update(1,encounters.ladder()),null);assert.equal(tutorials.current.id,'push');
  assert.equal(expire(tutorials),null);assert.equal(tutorials.current,null);
  for(let n=0;n<10;n++)assert.equal(tutorials.update(1,context()),null,'Passing another encounter during a visible lesson must not enqueue it for later unrelated locations.');
  assert.deepEqual(tutorials.learned,['push']);
  assert.equal(tutorials.update(.1,overlap),'crate-climb','Returning to an unlearned encounter should show its own control after the first lesson.');
  expire(tutorials);assert.equal(tutorials.update(.1,encounters.ladder()),'ladder');
});

test('lessons require the relevant playable encounter instead of unrelated roofs, air or busy scripted actions',()=>{
  const cases=[
    context(11.4,0,{playing:false}),context(11.4,0,{wake:.8}),context(11.4,0,{busy:true}),
    context(13,.85),context(20,LEVEL.roofs.middle.y),
    context(LEVEL.doorX,0),context(4),context(11.4,0,{player:player(11.4,0,false)}),
    context(11.4,0,{player:player(NaN)}),context(11.4,0,{crateX:Infinity}),
    {playing:true,wake:1}
  ];
  for(const value of cases) {
    const tutorials=createTutorials();assert.equal(tutorials.update(.1,value),null);
    assert.equal(tutorials.current,null);assert.deepEqual(tutorials.learned,[],'An unavailable encounter cannot consume a first-time lesson.');
  }
  const tutorials=createTutorials();tutorials.update(.1,context(11.4,0,{busy:true}));
  assert.equal(tutorials.update(.1,encounters.push()),'push','A lesson suppressed during a cutscene must remain available afterwards.');
});

test('pause and invalid time freeze the visible message and cannot present unseen mechanics',()=>{
  const tutorials=createTutorials();assert.equal(tutorials.update(.1,encounters.push()),'push');
  tutorials.update(1,encounters.push());const before=tutorials.current;
  for(const value of [0,-1,NaN,Infinity])assert.equal(tutorials.update(value,encounters.door()),null);
  for(let n=0;n<10;n++)assert.equal(tutorials.update(10,{...encounters.door(),playing:false}),null);
  assert.deepEqual(tutorials.current,before);assert.deepEqual(tutorials.learned,['push']);
  const copy=tutorials.current;copy.elapsed=100;copy.text='changed';
  assert.deepEqual(tutorials.current,before,'UI inspection cannot alter the internal message timer.');
  const fresh=createTutorials();assert.equal(fresh.update(10,{...encounters.push(),playing:false}),null);
  assert.deepEqual(fresh.learned,[]);assert.equal(fresh.current,null);
  assert.equal(tutorials.update(before.duration,context()),null);assert.equal(tutorials.current,null);
});

test('Continue restores unique learned lessons while New Game resets both current prompt and learned history',()=>{
  const learned=['push','door','push','unknown',null],tutorials=createTutorials({learned});
  learned.push('ladder');
  assert.deepEqual([...tutorials.learned].sort(),['door','push']);
  const copy=tutorials.learned;copy.push('ladder');assert.equal(tutorials.learned.includes('ladder'),false);
  assert.equal(tutorials.update(.1,encounters.push()),null,'A continued run cannot repeat the push introduction.');
  assert.equal(tutorials.update(.1,encounters['crate-climb']()),'crate-climb');
  const restored=[...tutorials.learned];tutorials.reset(restored);restored.push('ladder');
  assert.equal(tutorials.current,null);assert.equal(tutorials.learned.includes('ladder'),false);
  assert.equal(tutorials.update(.1,encounters['crate-climb']()),null);
  tutorials.reset();assert.equal(tutorials.current,null);assert.deepEqual(tutorials.learned,[]);
  assert.equal(tutorials.update(.1,encounters.push()),'push','Starting a new run should teach the first encounter again.');
});

test('mobile first encounters explain the visible touch controls rather than keyboard-only actions',()=>{
  const expected={push:/hand.*direction/i,'crate-climb':/↑/,'running-jump':/running.*↑/i,ladder:/↑.*↓/,door:/hand/i};
  for(const id of TUTORIAL_IDS) {
    const learned=id==='crate-climb'?['push']:[];
    const mobile=createTutorials({touch:true,learned}),desktop=createTutorials({learned});
    assert.equal(mobile.update(.1,encounters[id]()),id);assert.equal(desktop.update(.1,encounters[id]()),id);
    assert.match(mobile.current.text,expected[id]);assert.notEqual(mobile.current.text,desktop.current.text);
    assert.doesNotMatch(mobile.current.text,/\b(?:SPACE|SHIFT|W|A|S|D|E)\b/,'A touch player must receive usable mobile instructions.');
  }
});

test('encounters follow the moved crate and recognize both ladder access points including an active airborne catch',()=>{
  const moved=createTutorials();assert.equal(moved.update(.1,context(17.5,0,{crateX:16})),'push');
  assert.equal(createTutorials().update(.1,context(17.5)),null,'The crate introduction must follow the movable object, not its old spawn location.');
  for(const here of [
    encounters.ladder(),context(LEVEL.ladder.exitX,LEVEL.ladder.topY),
    context(LEVEL.ladder.x,2,{player:player(LEVEL.ladder.x,2,false),ladderActive:true})
  ])assert.equal(createTutorials().update(.1,here),'ladder');
  const unrelatedJump=context(LEVEL.ladder.x,2,{player:player(LEVEL.ladder.x,2,false)});
  assert.equal(createTutorials().update(.1,unrelatedJump),null,'Passing the ladder in unrelated air should not teach an action that has not been reached.');
});
