// Local Web Audio only. No sound or AudioContext exists before a user selection.
export function setupSound(status) {
  const toggle=document.querySelector('#sound-control'),panel=document.querySelector('#sound-panel');
  const choices=[...panel.querySelectorAll('[data-sound]')];
  let context,output,voice=[],version=0,volume=.2;
  function render(mode){document.querySelector('#sound-state').textContent={silent:'無音',wind:'夜風',rain:'雨'}[mode];choices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sound===mode)));}
  function clear(){if(output&&context.state!=='closed'){output.gain.cancelScheduledValues(context.currentTime);output.gain.value=0;}voice.forEach(n=>{try{n.stop?.();}catch{}n.disconnect();});voice=[];render('silent');}
  async function choose(mode){
    const ticket=++version;clear();
    if(mode==='silent'){await context?.suspend();return;}
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('unavailable');
      if(!context||context.state==='closed'){context=new Audio();output=context.createGain();output.gain.value=0;output.connect(context.destination);}
      await context.resume();if(ticket!==version||document.hidden)return;if(context.state!=='running')throw new Error('unavailable');
      const buffer=context.createBuffer(1,context.sampleRate*5,context.sampleRate),data=buffer.getChannelData(0);let brown=0;
      for(let i=0;i<data.length;i++){const white=Math.random()*2-1;brown=(brown+.02*white)/1.02;data[i]=mode==='wind'?brown*3.5:white*.36;}
      const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
      const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=mode==='wind'?850:4200;
      const high=context.createBiquadFilter();high.type='highpass';high.frequency.value=mode==='wind'?80:650;
      source.connect(low).connect(high).connect(output);voice=[source,low,high];source.start();
      output.gain.setValueAtTime(0,context.currentTime);output.gain.linearRampToValueAtTime(volume*.32,context.currentTime+1.4);
      render(mode);status.textContent=`${mode==='wind'?'夜風':'雨'}を模した合成音です。`;
    }catch{if(ticket===version){clear();status.textContent='音を再生できませんでした。無音でお楽しみください。';}}
  }
  function close(focus=false){panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();}
  toggle.disabled=false;
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('[aria-pressed="true"]').focus();});
  choices.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.sound)));
  document.querySelector('#volume').addEventListener('input',e=>{volume=Number(e.target.value)/100;if(context?.state==='running')output.gain.setTargetAtTime(volume*.32,context.currentTime,.15);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close(true);});
  for(const name of ['pointerdown','focusin'])document.addEventListener(name,e=>{if(!panel.hidden&&!e.target.closest('.sound-settings'))close();});
  const stop=()=>{++version;clear();context?.suspend().catch(()=>{});};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',()=>{stop();context?.close().catch(()=>{});});
  window.addEventListener('pageshow',()=>render('silent'));
  return stop;
}
