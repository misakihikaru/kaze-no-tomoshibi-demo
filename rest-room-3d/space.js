import { setupSound } from './sound.js';

const body=document.body,canvas=document.querySelector('#space'),status=document.querySelector('#space-status');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let moving=!preference.matches,renderer,room,animationFrame=0,alive=true;
const stopSound=setupSound(status);
function fallback(){body.dataset.ready='false';document.querySelector('#fallback-message').hidden=false;document.querySelector('.first-whisper').hidden=true;document.querySelector('.view-hint').hidden=true;canvas.hidden=true;for(const id of ['tea-action','light-action','center-view','motion-control'])document.getElementById(id).disabled=true;}
try {
  const [T,{createRoom}]=await Promise.all([import('./vendor/three.module.min.js'),import('./room-scene.js')]);
  renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<600?1.25:1.5));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  room=createRoom(renderer);
  const camera=new T.PerspectiveCamera(52,1,.05,45);
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();
  let yaw=0,pitch=0,drag=null,lastFrame=0,start=performance.now()/1000,pausedAt=0,frameCount=0;
  const time=()=>performance.now()/1000-start;
  function setCamera(){
    const portrait=innerWidth/innerHeight<.85;
    camera.position.set(Math.sin(yaw)*.16,portrait?1.32:1.25,portrait?6.7:4.8);
    const distance=6;
    camera.lookAt(camera.position.x+Math.sin(yaw)*distance,.99+pitch*distance,-2.5);
    camera.updateMatrixWorld();
  }
  function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.85?55:52;camera.updateProjectionMatrix();setCamera();requestFrame();}
  function frame(now){
    animationFrame=0;if(!alive||document.hidden)return;
    if(now-lastFrame<32){requestFrame();return;}lastFrame=now;
    const busy=room.update(time(),moving);
    renderer.render(room.scene,camera);
    canvas.dataset.frames=String(++frameCount);
    if(body.dataset.ready!=='true'){body.dataset.ready='true';setTimeout(()=>body.classList.add('settled'),6500);}
    if(moving||busy)requestFrame();
  }
  function requestFrame(){if(!animationFrame&&!document.hidden&&alive)animationFrame=requestAnimationFrame(frame);}
  function react(kind){if(room.react(kind,time())){status.textContent=kind==='tea'?'湯気が、ゆっくり立ちのぼります。':'灯りが、やわらかく広がります。';requestFrame();}}
  document.querySelector('#tea-action').addEventListener('click',()=>react('tea'));
  document.querySelector('#light-action').addEventListener('click',()=>react('light'));
  const motionControl=document.querySelector('#motion-control');
  function setMotion(value){moving=value;body.dataset.motion=value?'on':'off';motionControl.setAttribute('aria-pressed',String(!value));motionControl.querySelector('span').textContent=value?'動きを止める':'動きを再開';requestFrame();}
  setMotion(moving);
  motionControl.addEventListener('click',()=>setMotion(!moving));
  preference.addEventListener('change',e=>setMotion(!e.matches));
  function look(dx,dy){yaw=T.MathUtils.clamp(yaw+dx,-.38,.38);pitch=T.MathUtils.clamp(pitch+dy,-.11,.11);setCamera();requestFrame();}
  canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,initialX:e.clientX,initialY:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;look(-(e.clientX-drag.x)*.0018,(e.clientY-drag.y)*.0012);drag.x=e.clientX;drag.y=e.clientY;});
  canvas.addEventListener('pointerup',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(Math.hypot(e.clientX-drag.initialX,e.clientY-drag.initialY)<7){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(room.interactables.map(o=>o.object),true);if(hits.length){const hit=room.interactables.find(o=>o.object===hits[0].object);if(hit)react(hit.kind);}}
    drag=null;
  });
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
  canvas.addEventListener('keydown',e=>{const steps={ArrowLeft:[-.055,0],ArrowRight:[.055,0],ArrowUp:[0,.035],ArrowDown:[0,-.035]};if(steps[e.key]){e.preventDefault();look(...steps[e.key]);}if(e.key==='Home'){e.preventDefault();yaw=pitch=0;setCamera();requestFrame();}});
  document.querySelector('#center-view').addEventListener('click',()=>{yaw=pitch=0;setCamera();requestFrame();status.textContent='正面の景色に戻りました。';});
  for(const selector of ['#tea-action','#light-action','#center-view','#motion-control'])document.querySelector(selector).disabled=false;
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(animationFrame);animationFrame=0;pausedAt=performance.now()/1000;}else{if(pausedAt)start+=performance.now()/1000-pausedAt;pausedAt=0;requestFrame();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();alive=false;cancelAnimationFrame(animationFrame);stopSound();fallback();});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(animationFrame);animationFrame=0;stopSound();});
  window.addEventListener('pageshow',()=>requestFrame());
  resize();
} catch(error) {
  alive=false;cancelAnimationFrame(animationFrame);renderer?.dispose();room?.dispose();fallback();
  console.warn('The 3D room is unavailable. A photographic fallback is shown.',error.message);
}
