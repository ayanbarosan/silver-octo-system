// Concealed, session-only developer UI. The access gate owns both unlock steps;
// all game changes are delegated to the host through explicit callbacks.
export function createDeveloperPanel({
  access,
  getContext=()=>({}),
  onEnabled=()=>{},
  onAction=()=>{},
  onOptions=()=>{},
  onOpen=()=>{},
  onClose=()=>{},
}={}){
  if(!access)throw new Error('Developer access gate is required.');
  const settings=document.querySelector('#settings'),list=settings?.querySelector('.settings-list');
  const heading=document.querySelector('#settings-title'),host=document.querySelector('main')??document.body;
  if(!settings||!list||!heading)throw new Error('Settings screen is required.');
  const listeners=[],activeControls=new Set();
  let current=null,previousFocus=null,holdTimer=null,padRevealed=false,destroyed=false;
  const arrowKeys=new Set(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']);
  const el=(tag,attrs={},text='')=>{
    const node=document.createElement(tag);
    for(const[key,value]of Object.entries(attrs)){
      if(key==='hidden')node.hidden=!!value;else node.setAttribute(key,String(value));
    }
    if(text)node.textContent=text;
    return node;
  };
  const listen=(node,event,handler,options)=>{
    node.addEventListener(event,handler,options);listeners.push(()=>node.removeEventListener(event,handler,options));
  };
  const button=(id,text,classes='menu-item')=>el('button',{id,type:'button',class:classes},text);
  const context=()=>getContext()??{};
  const settingsVisible=()=>!settings.hidden&&context().state==='settings'&&!current;
  const releaseControls=()=>{
    for(const key of activeControls)onAction('control',{key,pressed:false});
    activeControls.clear();
  };
  const cancelHold=()=>{if(holdTimer!==null)clearTimeout(holdTimer);holdTimer=null;};

  const row=el('div',{id:'developer-setting-row',class:'setting-row developer-setting-row',hidden:true});
  const rowLabel=el('span',{},'Developer mode'),rowActions=el('div',{class:'developer-row-actions'});
  const unlock=button('developer-unlock','Unlock…','developer-inline-button');
  const enabled=el('input',{id:'developer-enabled',type:'checkbox','aria-label':'Developer mode',hidden:true});
  const settingsTools=button('developer-settings-tools','Tools','developer-inline-button');settingsTools.hidden=true;
  rowActions.append(unlock,enabled,settingsTools);row.append(rowLabel,rowActions);list.append(row);

  const secretPad=el('div',{id:'developer-secret-pad',class:'developer-secret-pad','aria-label':'Arrow input',hidden:true});
  for(const[key,glyph,name]of[['ArrowUp','↑','up'],['ArrowRight','→','right'],['ArrowDown','↓','down'],['ArrowLeft','←','left']]){
    const keyButton=el('button',{type:'button','data-dev-arrow':key,'aria-label':'Enter '+name+' arrow'},glyph);
    listen(keyButton,'click',()=>{
      if(!settingsVisible())return;
      if(access.feed(key)){padRevealed=false;sync();unlock.focus();}
    });
    secretPad.append(keyButton);
  }
  list.after(secretPad);heading.classList.add('developer-settings-title');
  listen(heading,'pointerdown',event=>{
    if(!settingsVisible()||access.revealed)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    cancelHold();
    holdTimer=setTimeout(()=>{
      holdTimer=null;if(!settingsVisible())return;
      padRevealed=true;access.clearSequence?.();sync();secretPad.querySelector('button')?.focus();
    },1500);
  });
  for(const event of ['pointerup','pointercancel','pointerleave'])listen(heading,event,cancelHold);
  listen(heading,'contextmenu',event=>event.preventDefault());

  const auth=el('section',{id:'developer-auth',class:'screen overlay-screen developer-screen',role:'dialog','aria-modal':'true','aria-labelledby':'developer-auth-title',hidden:true});
  const authPanel=el('div',{class:'developer-panel developer-auth-panel'});
  const authTitle=el('h2',{id:'developer-auth-title',class:'screen-title'},'Developer access');
  const form=el('form',{autocomplete:'off'}),passwordLabel=el('label',{for:'developer-password',class:'developer-password-label'},'Password');
  const password=el('input',{id:'developer-password',type:'password',autocomplete:'off',autocapitalize:'none',spellcheck:'false','aria-describedby':'developer-auth-error',required:true});
  const authError=el('p',{id:'developer-auth-error',class:'developer-status',role:'alert',hidden:true},'Incorrect password.');
  const authActions=el('div',{class:'developer-footer'});
  const submit=el('button',{id:'developer-auth-submit',type:'submit',class:'menu-item'},'Unlock');
  const cancel=button('developer-auth-cancel','Cancel');
  authActions.append(submit,cancel);form.append(passwordLabel,password,authError,authActions);authPanel.append(authTitle,form);auth.append(authPanel);host.append(auth);

  const tools=el('section',{id:'developer-tools',class:'screen overlay-screen developer-screen',role:'dialog','aria-modal':'true','aria-labelledby':'developer-tools-title',hidden:true});
  const toolsPanel=el('div',{class:'developer-panel developer-tools-panel'});
  const title=el('h2',{id:'developer-tools-title',class:'screen-title'},'Developer tools');
  const currentLocation=el('p',{class:'developer-current-location'});
  const locationRow=el('label',{for:'developer-location',class:'setting-row'},'Location');
  const location=el('select',{id:'developer-location'});
  const locations=[
    ['roof','Rooftop'],['stairwell','First stairwell'],['street','Street'],['home','Apartment block'],
    ['apartment','Apartment kitchen'],['bedroom','Bedroom checkpoint'],['fireescape','Fire escape'],['playground','Playground'],
    ['alley','Garage alley'],['storage','Storage room'],['workshop','Garage workshop'],['backyard','Backyard'],
  ];
  for(const[id,label]of locations)location.append(el('option',{value:id},label));
  locationRow.append(location);
  const go=button('developer-go','Go to location','menu-item developer-action-button');
  const options=el('div',{class:'developer-options'});
  function toggle(id,label){
    const wrapper=el('label',{for:id,class:'setting-row'}),control=el('input',{type:'checkbox',id});
    wrapper.append(el('span',{},label),control);options.append(wrapper);return control;
  }
  const freeze=toggle('developer-freeze','Freeze pursuit'),noclip=toggle('developer-noclip','Free movement');
  const flightHelp=el('p',{id:'developer-flight-help',class:'developer-help',hidden:true},'A/D move · W/S rise/fall · Q/E depth · Shift faster. Turning this off restores a safe test checkpoint.');
  const actions=el('div',{class:'developer-action-grid'});
  const capture=button('developer-capture','Capture test checkpoint','menu-item developer-action-button');
  const restore=button('developer-restore','Restore checkpoint','menu-item developer-action-button');
  const returnSaved=button('developer-return-saved','Return to saved game','menu-item developer-action-button');
  actions.append(capture,restore,returnSaved);
  const status=el('p',{id:'developer-tools-status',class:'developer-status',role:'status',hidden:true});
  const footer=el('div',{class:'developer-footer'});
  const back=button('developer-back','Back'),lock=button('developer-lock','Lock developer mode');
  footer.append(back,lock);
  toolsPanel.append(title,currentLocation,locationRow,go,options,flightHelp,actions,status,footer);tools.append(toolsPanel);host.append(tools);

  const badge=button('developer-badge','DEV','developer-badge');badge.setAttribute('aria-label','Developer tools');badge.hidden=true;host.append(badge);
  const flightPad=el('div',{id:'developer-flight-pad',class:'developer-flight-pad','aria-label':'Free movement controls',hidden:true});
  for(const[key,text,label]of[['w','↑','Rise'],['s','↓','Descend'],['q','Near','Move toward camera'],['e','Far','Move away from camera']]){
    const control=el('button',{type:'button','data-dev-control':key,'aria-label':label},text);
    listen(control,'pointerdown',event=>{
      if(!access.unlocked||!context().noclip||!context().playing)return;
      event.preventDefault();try{control.setPointerCapture(event.pointerId);}catch{}
      if(!activeControls.has(key)){activeControls.add(key);onAction('control',{key,pressed:true});}
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(control,type,()=>{
      if(activeControls.delete(key))onAction('control',{key,pressed:false});
    });
    flightPad.append(control);
  }
  host.append(flightPad);

  function show(kind){
    if(destroyed)return false;
    if(kind==='tools'&&!access.unlocked)return false;
    if(kind==='auth'&&!access.revealed)return false;
    if(!current)previousFocus=document.activeElement;
    cancelHold();releaseControls();current=kind;status.hidden=true;authError.hidden=true;password.value='';
    auth.hidden=kind!=='auth';tools.hidden=kind!=='tools';
    onOpen(kind,kind==='auth'?auth:tools);sync();
    if(kind==='auth')password.focus();else{const c=context(),value=c.location??c.chapter;if(locations.some(([id])=>id===value))location.value=value;location.focus();}
    return true;
  }
  function openTools(){return show('tools');}
  function close(){
    if(!current)return false;
    const kind=current;current=null;auth.hidden=true;tools.hidden=true;password.value='';authError.hidden=true;releaseControls();
    onClose(kind);sync();
    const focus=previousFocus;previousFocus=null;
    if(focus?.isConnected&&focus.getClientRects().length)focus.focus();
    return true;
  }
  function disable(){
    close();access.lock();releaseControls();onOptions({noclip:false,freezeFather:false});onEnabled(false);sync();
  }
  function perform(action,payload){
    if(!access.unlocked)return;
    close();onAction(action,payload);sync();
  }
  function publishOptions(){
    if(!access.unlocked)return;
    onOptions({noclip:noclip.checked,freezeFather:freeze.checked});sync();
  }
  listen(unlock,'click',()=>show('auth'));listen(settingsTools,'click',openTools);listen(badge,'click',openTools);
  listen(enabled,'change',()=>{if(!enabled.checked)disable();});
  listen(form,'submit',event=>{
    event.preventDefault();const value=password.value;password.value='';
    if(!access.verify(value)){authError.hidden=false;password.focus();return;}
    authError.hidden=true;onEnabled(true);show('tools');
  });
  listen(cancel,'click',close);listen(back,'click',close);listen(lock,'click',disable);
  listen(go,'click',()=>perform('location',{id:location.value}));
  listen(restore,'click',()=>perform('restore-checkpoint'));
  listen(returnSaved,'click',()=>perform('return-saved'));
  listen(capture,'click',()=>{
    if(!access.unlocked)return;
    const response=onAction('capture-checkpoint');status.textContent=typeof response==='string'?response:'Test checkpoint captured.';status.hidden=false;
  });
  listen(freeze,'change',publishOptions);listen(noclip,'change',publishOptions);

  function sync(){
    if(destroyed)return;
    const c=context(),unlocked=!!access.unlocked;
    row.hidden=!access.revealed;unlock.hidden=unlocked;enabled.hidden=!unlocked;enabled.checked=unlocked;settingsTools.hidden=!unlocked;
    if(!settingsVisible()){cancelHold();padRevealed=false;access.clearSequence?.();}
    secretPad.hidden=!padRevealed||!!access.revealed||!settingsVisible();
    freeze.checked=!!c.freezeFather;noclip.checked=!!c.noclip;flightHelp.hidden=!c.noclip;
    currentLocation.textContent=c.chapter?'Current area: '+(locations.find(([id])=>id===c.location||id===c.chapter)?.[1]??c.chapter):'';
    badge.hidden=!unlocked||!c.playing||!!current;
    flightPad.hidden=!unlocked||!c.noclip||!c.playing||!!current;
    document.body.classList.toggle('developer-free-move',unlocked&&!!c.noclip);
    if(flightPad.hidden)releaseControls();
  }
  function handleKey(event){
    if(destroyed)return false;
    if(current){
      if(event.key==='Escape'||event.key==='F2'&&current==='tools'){
        event.preventDefault();if(!event.repeat)close();return true;
      }
      if(event.key==='Tab'){
        const panel=current==='auth'?auth:tools,items=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(item=>item.getClientRects().length);
        const index=items.indexOf(document.activeElement);
        if(items.length&&(index<0||event.shiftKey&&index===0||!event.shiftKey&&index===items.length-1)){event.preventDefault();items[event.shiftKey?items.length-1:0].focus();}
        return true;
      }
      return false;
    }
    if(event.key==='F2'&&access.unlocked){
      event.preventDefault();if(!event.repeat)openTools();return true;
    }
    if(!settingsVisible()||event.altKey||event.ctrlKey||event.metaKey)return false;
    const target=event.target;
    if(target?.isContentEditable||target?.tagName==='SELECT'||target?.tagName==='TEXTAREA'||target?.tagName==='INPUT'&&!['checkbox','button','submit'].includes(target.type))return false;
    if(!arrowKeys.has(event.key)){if(!['Shift','Control','Alt','Meta'].includes(event.key))access.clearSequence?.();return false;}
    event.preventDefault();
    if(access.feed(event.key,{repeat:event.repeat})){padRevealed=false;sync();unlock.focus();}
    return true;
  }
  function destroy(){
    if(destroyed)return;destroyed=true;cancelHold();releaseControls();listeners.splice(0).forEach(remove=>remove());
    for(const node of[row,secretPad,auth,tools,badge,flightPad])node.remove();
    heading.classList.remove('developer-settings-title');document.body.classList.remove('developer-free-move');
  }
  sync();
  return {get current(){return current;},panels:{auth,tools},elements:{row,unlock,enabled,settingsTools,secretPad,password,location,freeze,noclip,badge,flightPad},handleKey,sync,openTools,close,destroy};
}
