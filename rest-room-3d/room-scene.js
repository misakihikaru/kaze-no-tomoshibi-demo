import * as T from './vendor/three.module.min.js';

// All dimensions are in metres. A handmade reconstruction of the supplied room,
// with real geometry rather than deforming the photograph.
export function createRoom(renderer) {
  const scene = new T.Scene();
  scene.background = new T.Color('#141b22');
  scene.fog = new T.FogExp2('#242522', .018);
  const interactables = [];
  let seed = 8721;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function texture(kind) {
    const c=document.createElement('canvas'); c.width=c.height=512;
    const g=c.getContext('2d');
    g.fillStyle=kind==='wood'?'#715139':kind==='mat'?'#b19a70':kind==='cloth'?'#7d7463':'#7a6856'; g.fillRect(0,0,512,512);
    if(kind==='wood') {
      for(let y=0;y<512;y++) { g.strokeStyle=`rgba(${random()>.5?'25,13,5':'199,151,92'},${.04+random()*.16})`;g.lineWidth=.5+random()*2;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(140,y+Math.sin(y*.05)*8,300,y+Math.cos(y*.03)*12,512,y+Math.sin(y*.1)*4);g.stroke(); }
    } else if(kind==='mat'||kind==='cloth') {
      for(let y=0;y<512;y+=3){g.fillStyle=y%2?'#443e2420':'#e6d9b02b';g.fillRect(0,y,512,1);}
      for(let x=0;x<512;x+=5){g.fillStyle='#211b121c';g.fillRect(x,0,1,512);}
    }
    for(let i=0;i<18000;i++){g.fillStyle=`rgba(${random()>.5?'255,244,215':'0,0,0'},${random()*.07})`;g.fillRect(random()*512,random()*512,1,1);}
    const tex=new T.CanvasTexture(c); tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return tex;
  }
  const woodTexture=texture('wood'), matTexture=texture('mat'), plasterTexture=texture('plaster'), clothTexture=texture('cloth');
  const standard=(color,more={})=>new T.MeshStandardMaterial({color,roughness:.9,...more});
  const wood=standard('#c5a77c',{map:woodTexture,roughness:.65});
  const darkWood=standard('#70563d',{map:woodTexture,roughness:.8});
  const beamWood=standard('#886c4e',{map:woodTexture});
  const plaster=standard('#c4b399',{map:plasterTexture});
  const tatami=standard('#c1af83',{map:matTexture});
  const cloth=standard('#938675',{map:clothTexture});
  const edge=standard('#3c4034',{map:clothTexture});
  function mesh(geometry,material,x=0,y=0,z=0,parent=scene){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const box=(w,h,d,material,x,y,z,parent)=>mesh(new T.BoxGeometry(w,h,d),material,x,y,z,parent);
  const cylinder=(r1,r2,h,material,x,y,z,segments=32,parent)=>mesh(new T.CylinderGeometry(r1,r2,h,segments),material,x,y,z,parent);
  function rounded(w,d,h,r,material,x,y,z) {
    const s=new T.Shape(), a=-w/2,b=-d/2;
    s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+d-r);s.quadraticCurveTo(a+w,b+d,a+w-r,b+d);s.lineTo(a+r,b+d);s.quadraticCurveTo(a,b+d,a,b+d-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
    const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.015,bevelThickness:.015});g.rotateX(-Math.PI/2);return mesh(g,material,x,y,z);
  }
  // Low, softly lit ceiling and a room open towards the viewer.
  box(8.6,.12,9,beamWood,0,-.12,0);
  for(let x=0;x<4;x++)for(let z=0;z<3;z++) {
    const tx=-3.15+x*2.1,tz=-2.95+z*2.95;
    box(2.08,.045,2.92,tatami,tx,0,tz);
    for(const side of [-1,1])box(.045,.048,2.92,edge,tx+side*1.01,.002,tz);
  }
  const wall=new T.Shape();wall.moveTo(-4.25,0);wall.lineTo(4.25,0);wall.lineTo(4.25,4.35);wall.lineTo(-4.25,4.35);wall.closePath();
  const hole=new T.Path();hole.absarc(1.05,2.35,1.48,0,Math.PI*2,true);wall.holes.push(hole);
  mesh(new T.ShapeGeometry(wall,72),plaster,0,0,-4.16);
  const rim=mesh(new T.TorusGeometry(1.51,.085,16,96),darkWood,1.05,2.35,-4.09);
  rim.castShadow=false;
  mesh(new T.TorusGeometry(1.60,.018,8,96),beamWood,1.05,2.35,-4.07);
  box(8.5,.16,.22,darkWood,0,.13,-4.02);
  box(.16,4.35,.25,beamWood,-4.12,2.17,-4.04);box(.16,4.35,.25,beamWood,4.12,2.17,-4.04);
  box(.12,4.35,8.6,plaster,-4.25,2.17,.1);
  box(.12,4.35,8.6,darkWood,4.25,2.17,.1);
  box(8.6,.12,8.6,plaster,0,4.4,.1);
  for(let x=-4;x<=4;x+=1.3)box(.12,.20,8.6,darkWood,x,4.26,.1);
  // Shoji frame at the right, deliberately quieter than the central window.
  const paper=standard('#b4a483',{roughness:1});
  box(.045,3.8,5.1,paper,4.16,2.04,-.6);
  for(let z=-3.1;z<2;z+=.28)box(.11,3.85,.032,darkWood,4.11,2.04,z);
  for(let y=.2;y<4.1;y+=.55)box(.12,.035,5.1,darkWood,4.10,y,-.6);
  // Outside the circular opening: a layered, quiet landscape.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=64;skyCanvas.height=256;
  const sky=skyCanvas.getContext('2d'),gradient=sky.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#182735');gradient.addColorStop(.55,'#344e63');gradient.addColorStop(1,'#788386');sky.fillStyle=gradient;sky.fillRect(0,0,64,256);
  const skyTex=new T.CanvasTexture(skyCanvas);skyTex.colorSpace=T.SRGBColorSpace;
  mesh(new T.PlaneGeometry(24,14),new T.MeshBasicMaterial({map:skyTex}),0,3,-12);
  function mountains(z,base,color,phase){const s=new T.Shape();s.moveTo(-15,-3);for(let x=-15;x<=15;x+=.25)s.lineTo(x,base+Math.sin(x*.57+phase)*.65+Math.sin(x*1.1+phase)*.24);s.lineTo(15,-3);s.closePath();mesh(new T.ShapeGeometry(s),new T.MeshBasicMaterial({color}),0,0,z);}
  mountains(-10,1.65,'#334959',.4);mountains(-9,1.0,'#263d4b',2);mountains(-8,.3,'#1b303b',4);
  const moonCanvas=document.createElement('canvas');moonCanvas.width=moonCanvas.height=256;const mg=moonCanvas.getContext('2d');mg.fillStyle='#eee6cd';mg.fillRect(0,0,256,256);
  for(let i=0;i<65;i++){const x=random()*256,y=random()*256,r=3+random()*15,g=mg.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(113,119,104,.12)');g.addColorStop(1,'rgba(113,119,104,0)');mg.fillStyle=g;mg.fillRect(x-r,y-r,r*2,r*2);}
  const moonTexture=new T.CanvasTexture(moonCanvas);moonTexture.colorSpace=T.SRGBColorSpace;
  const moon=mesh(new T.SphereGeometry(.30,32,24),new T.MeshBasicMaterial({map:moonTexture}),1.65,3.25,-8.2);
  function radial(color) {
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,color);r.addColorStop(.2,color);r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new T.CanvasTexture(c);
  }
  const moonHalo=new T.Sprite(new T.SpriteMaterial({map:radial('rgba(210,225,234,.12)'),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));moonHalo.position.copy(moon.position);moonHalo.position.z+=.05;moonHalo.scale.set(1.7,1.7,1);scene.add(moonHalo);
  // An outside branch and small leaves catch the moonlight.
  function branch(a,b,r,material,parent=scene){const v=new T.Vector3().subVectors(b,a);const m=mesh(new T.CylinderGeometry(r*.52,r,v.length(),7),material,0,0,0,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
  const leaves=standard('#334334',{side:T.DoubleSide});
  for(let i=0;i<12;i++){
    const t=i/12,a=new T.Vector3(-.6+t*.35,.6+t*3.5,-4.6),b=new T.Vector3(a.x+.4+random()*.6,a.y+.3+random()*.4,-4.5);
    branch(a,b,.013,beamWood);
    for(let j=0;j<7;j++){const leaf=mesh(new T.SphereGeometry(1,6,4),leaves,b.x-j*.12,b.y+Math.sin(j)*.08,b.z+random()*.2);leaf.scale.set(.12,.035,.045);leaf.rotation.z=random()*2;}
  }
  // Linen is modelled as folds, never by stretching the photograph.
  const curtainGeometry=new T.PlaneGeometry(1.2,3.95,28,16),pos=curtainGeometry.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,Math.sin(x*22)*.055+.08*Math.pow((1.98-y)/3.95,2));pos.setX(i,x+.18*Math.pow((1.98-y)/3.95,2));}
  curtainGeometry.computeVertexNormals();
  const linen=new T.MeshStandardMaterial({color:'#e1d2ba',bumpMap:clothTexture,bumpScale:.015,roughness:1,transparent:true,opacity:.46,side:T.DoubleSide,depthWrite:false});
  mesh(curtainGeometry,linen,3.0,2.23,-3.86);
  // The low table puts the viewer at seated eye height.
  rounded(3.45,1.65,.16,.11,wood,-.55,.39,.15);
  for(const x of [-1.9,.8])for(const z of [-.43,.73])box(.17,.37,.19,darkWood,x,.19,z);
  box(3.2,.12,.12,darkWood,-.55,.30,-.5);
  const shadowMap=radial('rgba(0,0,0,.55)');
  function contactShadow(w,d,x,z){const m=mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}),x,.035,z);m.rotation.x=-Math.PI/2;m.castShadow=false;}
  contactShadow(4.8,3.5,-.55,.15);
  function cushion(x,z,rotation) {
    const geometry=new T.SphereGeometry(1,32,20),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){for(const axis of ['X','Z']){const v=p['get'+axis](i);p['set'+axis](i,Math.sign(v)*Math.pow(Math.abs(v),.55));}}geometry.computeVertexNormals();
    const c=mesh(geometry,cloth,x,.17,z);c.scale.set(.69,.17,.53);c.rotation.y=rotation;contactShadow(1.7,1.4,x,z);
  }
  cushion(1.9,-.5,.1);cushion(-2.0,1.8,-.08);
  const saucer=cylinder(.235,.21,.025,darkWood,-1.02,.592,.56,48);
  const cupPoints=[[.07,0],[.11,.01],[.135,.11],[.14,.19],[.128,.20],[.118,.18],[.10,.04]].map(([x,y])=>new T.Vector2(x,y));
  const ceramic=standard('#9e9a7d',{map:plasterTexture,roughness:.62,side:T.DoubleSide});
  const cup=mesh(new T.LatheGeometry(cupPoints,48),ceramic,-1.02,.61,.56);
  cylinder(.119,.119,.006,new T.MeshStandardMaterial({color:'#423e20',roughness:.18,metalness:.05}),-1.02,.779,.56,48);
  interactables.push({kind:'tea',object:cup,point:new T.Vector3(-1.02,.76,.56)});
  // A small paper lantern with wooden ribs and local, soft light.
  const lantern=new T.Group();lantern.position.set(.54,.585,-.03);scene.add(lantern);
  cylinder(.20,.22,.045,darkWood,0,.025,0,32,lantern);
  cylinder(.035,.05,.10,beamWood,0,.09,0,16,lantern);
  const paperLight=new T.MeshStandardMaterial({color:'#f3d39c',roughness:.9,emissive:'#ffb95b',emissiveIntensity:1.2,side:T.DoubleSide});
  const shade=box(.35,.52,.35,paperLight,0,.39,0,lantern);
  shade.castShadow=false;
  for(const x of [-.185,.185])for(const z of [-.185,.185])box(.023,.56,.023,darkWood,x,.39,z,lantern);
  for(const z of [-.184,.184])for(let x=-.125;x<=.13;x+=.063)box(.012,.52,.014,beamWood,x,.39,z,lantern);
  for(const x of [-.184,.184])for(let z=-.125;z<=.13;z+=.063)box(.014,.52,.012,beamWood,x,.39,z,lantern);
  box(.40,.025,.40,darkWood,0,.665,0,lantern);box(.40,.025,.40,darkWood,0,.12,0,lantern);
  const lamp=new T.PointLight('#ffc078',18,9,2);lamp.position.set(.54,1.04,-.03);lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.normalBias=.025;lamp.shadow.bias=-.0005;lamp.shadow.radius=8;scene.add(lamp);
  lamp.shadow.autoUpdate=false;lamp.shadow.needsUpdate=true;
  const lampHalo=new T.Sprite(new T.SpriteMaterial({map:radial('rgba(255,177,70,.23)'),blending:T.AdditiveBlending,transparent:true,depthWrite:false}));lampHalo.position.set(.54,.97,.01);lampHalo.scale.set(1.35,1.35,1);scene.add(lampHalo);
  interactables.push({kind:'light',object:shade,point:new T.Vector3(.54,.97,-.03)});
  // The left alcove, a simple scroll, vase and a sprig.
  box(1.15,.13,.8,darkWood,-3.55,.40,-2.9);box(1.15,2.5,.04,darkWood,-3.55,1.6,-3.6);
  box(.61,1.28,.017,standard('#a99774',{map:clothTexture}),-3.55,2.05,-3.565);
  cylinder(.035,.035,.7,beamWood,-3.55,2.72,-3.54,12);
  const vase=mesh(new T.SphereGeometry(.20,24,20),standard('#514b39',{roughness:.5}),-3.55,.66,-2.9);vase.scale.set(.8,1.15,.8);cylinder(.07,.08,.09,darkWood,-3.55,.91,-2.9);
  for(let i=0;i<5;i++){const end=new T.Vector3(-3.55+(random()-.5)*.65,1.4+random()*.55,-2.9+(random()-.5)*.3);branch(new T.Vector3(-3.55,.9,-2.9),end,.008,beamWood);for(let j=0;j<4;j++){const l=mesh(new T.SphereGeometry(1,6,4),leaves,end.x+(random()-.5)*.2,end.y-j*.1,end.z);l.scale.set(.07,.025,.035);}}
  const alcoveLight=new T.PointLight('#eabf7b',5,4,2);alcoveLight.position.set(-3.4,.8,-3.2);scene.add(alcoveLight);
  scene.add(new T.HemisphereLight('#b7c6c5','#7a5633',.8));
  scene.add(new T.AmbientLight('#d8cbb2',.3));
  const moonLight=new T.DirectionalLight('#b6c9de',1.15);moonLight.position.set(2.5,4,-7);scene.add(moonLight);
  const fill=new T.DirectionalLight('#e5c79b',.42);fill.position.set(-2,3,4);scene.add(fill);
  // Only the air moves. The camera, curtains and furniture stay still by default.
  const steamMaterial=new T.SpriteMaterial({map:radial('rgba(227,220,196,.13)'),transparent:true,depthWrite:false});
  const steam=[];
  for(let i=0;i<5;i++){const s=new T.Sprite(steamMaterial.clone());s.visible=false;scene.add(s);steam.push(s);}
  const embers=[];
  for(const p of [[-2.4,1.6,-1.5],[2.25,.8,1.2],[.2,2.9,-2.9]]){const s=new T.Sprite(new T.SpriteMaterial({map:radial('rgba(255,198,99,.8)'),blending:T.AdditiveBlending,transparent:true,depthWrite:false}));s.position.set(...p);s.scale.setScalar(.045);scene.add(s);embers.push({object:s,base:s.position.clone()});}
  let teaStarted=-100,lightStarted=-100;
  function react(kind,time) {
    if(kind==='tea'&&time-teaStarted>4.8){teaStarted=time;return true;}
    if(kind==='light'&&time-lightStarted>4.8){lightStarted=time;return true;}
    return false;
  }
  function update(time,moving) {
    const pulse=time-lightStarted;
    const value=pulse>=0&&pulse<4.8?Math.sin(pulse/4.8*Math.PI)**2:0;
    lamp.intensity=18+value*9;paperLight.emissiveIntensity=1.2+value*.7;lampHalo.material.opacity=.7+value*.3;
    const teaAge=time-teaStarted;
    steam.forEach((s,i)=>{const age=teaAge-i*.35;s.visible=age>=0&&age<3.1;if(s.visible){const progress=age/3.1;s.position.set(-1.02+(moving?Math.sin(progress*5+i)*.035:0),.81+(moving?progress*.48:.1),.56);s.scale.set(.08+progress*.14,.10+progress*.20,1);s.material.opacity=Math.sin(progress*Math.PI)*.65;}});
    embers.forEach(({object,base},i)=>{object.position.copy(base);if(moving){object.position.x+=Math.sin(time*.12+i*2)*.13;object.position.y+=Math.sin(time*.09+i)*.09;}object.material.opacity=.55;});
    return teaAge<5||pulse<4.8;
  }
  return {scene,interactables,react,update,dispose(){scene.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m){m.map?.dispose();m.dispose();}});});}};
}
