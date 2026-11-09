/* 3D ատամ — Three.js (plain JS module).
   Usage (the importmap must come BEFORE the module script):
   <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
   <div data-tooth3d></div>  +  <script type="module" src="js/tooth3d.js"></script>
   Transparent background, auto-rotates, drag to rotate, pauses when off-screen. */
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------- tooth shape (signed distance field) ---------- */
const len=(x,y,z)=>Math.hypot(x,y,z);
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*0.25};
const smax=(a,b,k)=>-smin(-a,-b,k);
function ellipsoid(x,y,z,rx,ry,rz){const k0=len(x/rx,y/ry,z/rz),k1=len(x/(rx*rx),y/(ry*ry),z/(rz*rz));return k0*(k0-1)/k1}
function cone(px,py,pz,ax,ay,az,bx,by,bz,r1,r2){
  const bax=bx-ax,bay=by-ay,baz=bz-az,pax=px-ax,pay=py-ay,paz=pz-az;
  const t=Math.min(1,Math.max(0,(pax*bax+pay*bay+paz*baz)/(bax*bax+bay*bay+baz*baz)));
  return len(pax-bax*t,pay-bay*t,paz-baz*t)-(r1+(r2-r1)*t)}
function roundBox(px,py,pz,bx,by,bz,r){const qx=Math.abs(px)-bx,qy=Math.abs(py)-by,qz=Math.abs(pz)-bz;return len(Math.max(qx,0),Math.max(qy,0),Math.max(qz,0))+Math.min(Math.max(qx,qy,qz),0)-r}
function root(x,y,z,a,m,b,ra,rm,rb){return Math.min(cone(x,y,z,...a,...m,ra,rm),cone(x,y,z,...m,...b,rm,rb))}
// smooth curved root: quadratic Bezier, sampled into short tapered segments (no visible kinks)
function curvedRoot(x,y,z,p0,p1,p2,r0,r1,N=11){
  let d=1e9,prev=p0,pr=r0;
  for(let i=1;i<=N;i++){const t=i/N,u=1-t;
    const q=[u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1],u*u*p0[2]+2*u*t*p1[2]+t*t*p2[2]];
    const r=r1+(r0-r1)*Math.pow(u,1.15);
    d=smin(d,cone(x,y,z,...prev,...q,pr,r),0.06); prev=q; pr=r;}
  return d}
function tooth(x,y,z){
  // crown: wide rounded body, bulging sides, narrowing to the neck
  let d=ellipsoid(x,y-0.38,z,0.56,0.4,0.45);
  d=smin(d,ellipsoid(x,y-0.52,z,0.52,0.22,0.41),0.12);
  for(const [cx,cz] of [[-0.25,-0.16],[0.25,-0.16],[-0.25,0.17],[0.25,0.17]])
    d=smin(d,len(x-cx,y-0.68,z-cz)-0.2,0.16);                // cusps
  d=smax(d,-(len(x*0.85,y-0.92,z*0.18)-0.2),0.1);               // central fissure
  // neck waist
  d=smin(d,ellipsoid(x,y+0.04,z,0.4,0.26,0.34),0.3);
  // root trunk: the roots grow out of one soft base, then split
  d=smin(d,ellipsoid(x,y+0.08,z,0.38,0.24,0.31),0.2);
  // four identical roots: gently curved outward and back in, tapering to soft tips
  for(const sx of [-1,1]) for(const sz of [-1,1])
    d=smin(d,curvedRoot(x,y,z,[0.19*sx,-0.08,0.14*sz],[0.37*sx,-0.5,0.27*sz],[0.21*sx,-1.0,0.16*sz],0.2,0.055),0.13);
  return d;
}


function mountTooth(host){
  const canvas=document.createElement('canvas');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;opacity:0;transition:opacity .8s';
  host.appendChild(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.85;
  const scene=new THREE.Scene();
  scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer),0.03).texture;
  const camera=new THREE.PerspectiveCamera(28,1,0.1,50); camera.position.set(0,0.1,6.4);
  const key=new THREE.DirectionalLight(0xffffff,1.6); key.position.set(-3,4,5); scene.add(key);
  const rim=new THREE.DirectionalLight(0xffffff,3.0); rim.position.set(4,1.5,-4); scene.add(rim);
  const fill=new THREE.DirectionalLight(0xe8eeff,0.25); fill.position.set(0,-3,3); scene.add(fill);

  const RES=innerWidth<700?72:96;
  const enamel=new THREE.MeshPhysicalMaterial({color:0xeceae6,roughness:0.18,metalness:0,clearcoat:1,clearcoatRoughness:0.02,
    sheen:0.25,sheenColor:new THREE.Color(0xffffff),envMapIntensity:0.75});
  const mc=new MarchingCubes(RES,enamel,false,false,140000);
  mc.isolation=0; const f=mc.field,h=mc.halfsize,S=0.95;
  for(let k=0;k<RES;k++)for(let j=0;j<RES;j++)for(let i=0;i<RES;i++)
    f[i+j*RES+k*RES*RES]=-tooth((i-h)/h/S,(j-h)/h/S,(k-h)/h/S);
  mc.update();
  const group=new THREE.Group(); group.add(mc); scene.add(group);
  group.scale.setScalar(Number(host.dataset.scale)||1.0);

  const fit=()=>{const r=host.getBoundingClientRect(); if(!r.width||!r.height) return;
    renderer.setSize(r.width,r.height,false); camera.aspect=r.width/r.height;
    camera.position.z=camera.aspect<0.75?8.2:6.4; camera.updateProjectionMatrix();};
  new ResizeObserver(fit).observe(host); fit();

  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let target=0.5,rot=0.5,drag=null,last=performance.now(),visible=true;
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,r:target};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(drag)target=drag.r+(e.clientX-drag.x)*0.012});
  const end=()=>drag=null; canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',end);
  new IntersectionObserver(es=>{visible=es[0].isIntersecting}).observe(host);
  function frame(t){
    requestAnimationFrame(frame);
    const dt=Math.min(0.05,(t-last)/1000); last=t;
    if(!visible) return;
    if(!drag&&!still) target+=dt*0.45;
    rot+=(target-rot)*Math.min(1,dt*6);
    group.rotation.set(0.12,rot,Math.sin(t/2600)*0.04);
    group.position.y=still?0:Math.sin(t/1500)*0.06;
    renderer.render(scene,camera);
  }
  requestAnimationFrame(t=>{last=t;frame(t);canvas.style.opacity='1';host.classList.add('is3d');});
}

document.querySelectorAll('[data-tooth3d]').forEach(el=>{
  try{ mountTooth(el); }catch(err){ console.warn('3D tooth disabled:',err); }
});
