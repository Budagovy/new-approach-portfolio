/* Dependency-free web component: the approved city-strip animation, kept as
   delivered apart from asset resolution. The original resolved ./assets/
   against import.meta.url, which stops meaning anything once the module is
   bundled, so the default is the site's own /public/city-strip/ instead
   (still overridable through the asset-base attribute). Typed by the
   sibling city-strip.d.ts; wrapped for React by ../CityStrip.tsx. */
const DEFAULT_ASSET_BASE = '/city-strip/';
export const DEFAULT_EXPERIENCES = [
 {company:'Architecture',role:'IDF'},
 {company:'B.Studios',role:'Founder'},
 {company:'Playtika',role:'UX/UI Designer'},
 {company:'Playtika',role:'Senior Product Designer'},
 {company:'Simply',role:'Senior Product Designer'},
 {company:'Professional Claudeioner ;)',role:''}
];
const template = document.createElement('template');
template.innerHTML = `
<style>
:host{display:block;--strip-bg:#fefbf2;--strip-ink:#22221c;--strip-muted:#969285;--strip-accent:#cc8d23;color:var(--strip-ink);font-family:Arial,Helvetica,sans-serif;direction:ltr}
*{box-sizing:border-box}.strip{background:var(--strip-bg);overflow:hidden}
.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:var(--strip-head-h,48px);padding:0 var(--strip-pad,22px)}
.experience{display:flex;align-items:baseline;gap:var(--strip-gap,16px);min-width:0}.title-copy{min-width:0}.separator{color:var(--strip-role-ink,var(--strip-muted));margin:0 var(--strip-sep,8px);font-size:var(--strip-role,inherit)}.separator[hidden]{display:none}.number{font:var(--strip-number,12px) monospace;color:var(--strip-accent)}
.company{font-size:var(--strip-company,28px);letter-spacing:var(--strip-company-tracking,-1.1px);font-weight:var(--strip-company-weight,500)}.role{color:var(--strip-role-ink,var(--strip-muted));font-size:var(--strip-role,17px)}
button{font:inherit;color:inherit;cursor:pointer}.next{display:var(--strip-next,inline-block);border:0;background:none;font-size:11px;letter-spacing:1.4px;color:var(--strip-muted);padding:12px 0;white-space:nowrap}
button:focus-visible{outline:2px solid var(--strip-accent);outline-offset:3px}
.scene{position:relative;height:var(--strip-scene-h,clamp(110px,9vw,160px));overflow:hidden;isolation:isolate;cursor:pointer}
.landscape{position:absolute;left:0;bottom:6px;display:flex;will-change:transform;pointer-events:none}
.landscape[hidden]{display:none}.landscape img{display:block;flex:none;height:100%;max-width:none}.landscape img:nth-child(even){transform:scaleX(-1)}
.distant{opacity:.12;bottom:7px;z-index:0}.city{z-index:1}
.ground{position:absolute;left:0;right:0;bottom:5px;height:1px;background:#aaa798;opacity:.5;z-index:2}
.walker{position:absolute;left:var(--strip-walker-x,13%);bottom:2px;width:auto;height:var(--strip-walker-h,82%);aspect-ratio:500/685;z-index:3;border:0;padding:0;background:transparent;overflow:visible;transform:translateX(-50%)}
.walker canvas{height:100%;width:100%;display:block}.walker video{display:none}.shadow{position:absolute;width:51%;height:3%;border-radius:50%;background:#77756640;bottom:3%;left:20%}
.figure{position:absolute;inset:0;transform-origin:50% 95%}.greeting{position:absolute;bottom:96%;left:50%;font:var(--strip-small,12px) Arial,sans-serif;white-space:nowrap;padding:5px 9px;background:var(--strip-bg);border:1px solid #c7bda6;border-radius:8px;opacity:0;transform:translate(-30%,5px);transition:opacity .15s,transform .15s;pointer-events:none}
.greeting.show{opacity:1;transform:translate(-30%,0)}
.fade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,var(--strip-bg),transparent 4%,transparent 96%,var(--strip-bg));z-index:4}
.pause{position:absolute;right:10px;bottom:10px;z-index:5;border:1px solid #bcb6a280;border-radius:50%;width:25px;height:25px;background:var(--strip-bg);color:var(--strip-muted);font-size:var(--strip-small,11px);opacity:0;transition:opacity .15s}.scene:hover .pause,.pause:focus-visible{opacity:1}
@media(max-width:600px){.heading{padding:0 12px;gap:8px}.experience{gap:9px}.heading{min-height:68px}.company{font-size:var(--strip-company,18px)}.title-copy{line-height:1.35}.separator{margin:0 4px}.role{font-size:var(--strip-role,12px)}.next{font-size:var(--strip-small,9px);letter-spacing:.5px}.walker{left:var(--strip-walker-x,20%);height:var(--strip-walker-h,72%)}.pause{opacity:.7}.scene{height:var(--strip-scene-h,110px)}}
@media(prefers-reduced-motion:reduce){.greeting{transition:none}}
</style>
<section class="strip" aria-label="Career journey">
 <div class="heading"><div class="experience"><span class="number">01</span><span class="title-copy"><span class="company">Architecture</span><span class="separator">-</span><span class="role">IDF</span></span></div><button class="next" type="button">NEXT PROJECTS</button></div>
 <div class="scene">
  <div class="landscape distant" aria-hidden="true"></div><div class="landscape city" aria-hidden="true"></div><div class="ground"></div>
  <button class="walker" type="button" aria-label="Say hi"><span class="figure"><video muted loop playsinline preload="auto" aria-hidden="true"></video><canvas width="180" height="247" aria-hidden="true"></canvas></span><span class="greeting">Hey there!</span></button>
  <div class="fade"></div><button class="pause" type="button" aria-label="Pause animation" aria-pressed="false">Ⅱ</button>
 </div>
</section>`;

export class PortfolioCityStrip extends HTMLElement {
 static get observedAttributes(){return ['speed','asset-base','parallax'];}
 constructor(){
  super();this.attachShadow({mode:'open'}).append(template.content.cloneNode(true));
  this._items=DEFAULT_EXPERIENCES.map(item=>({...item}));this._index=0;this._time=0;this._distance=0;this._last=0;this._frame=0;this._visible=false;this._paused=false;this._greetUntil=0;this._nextAt=1.5;
  this._tick=this._tick.bind(this);this._sync=this._sync.bind(this);
  this._root=this.shadowRoot;this._scene=this._root.querySelector('.scene');this._city=this._root.querySelector('.city');this._far=this._root.querySelector('.distant');
  this._figure=this._root.querySelector('.figure');this._video=this._root.querySelector('video');this._canvas=this._root.querySelector('canvas');this._ctx=this._canvas.getContext('2d',{willReadFrequently:true});this._video.muted=true;this._video.loop=true;this._drawnTime=-1;
  this._video.addEventListener('loadeddata',()=>{this._drawVideo();this._sync();});
  this._root.querySelector('.next').addEventListener('click',()=>this.next());
  this._root.querySelector('.walker').addEventListener('click',()=>this.greet());
  this._scene.addEventListener('click',e=>{if(!e.target.closest('button'))this.greet();});
  this._root.querySelector('.pause').addEventListener('click',()=>{this._paused=!this._paused;this._updatePause();this._sync();});
 }
 connectedCallback(){
  this._motion=matchMedia('(prefers-reduced-motion: reduce)');this._motion.addEventListener('change',this._sync);
  document.addEventListener('visibilitychange',this._sync);
  this._resize=new ResizeObserver(()=>this._layout());this._resize.observe(this._scene);
  this._observer=new IntersectionObserver(([entry])=>{this._visible=entry.isIntersecting;this._sync();});this._observer.observe(this);
  this._layout();this._renderTitle();
 }
 disconnectedCallback(){this._video.pause();cancelAnimationFrame(this._frame);this._frame=0;clearTimeout(this._greetingTimer);this._resize?.disconnect();this._observer?.disconnect();this._motion?.removeEventListener('change',this._sync);document.removeEventListener('visibilitychange',this._sync);}
 attributeChangedCallback(){if(this.isConnected)this._layout();}
 set experiences(value){
  if(!Array.isArray(value)||!value.length)throw new TypeError('experiences must contain at least one item');
  this._items=value.map(item=>({company:String(item.company??''),role:String(item.role??'')}));this._index=0;this._nextAt=this._time+1.5;this._renderTitle();
 }
 get experiences(){return this._items.map(item=>({...item}));}
 get speed(){const n=Number(this.getAttribute('speed')??22);return Number.isFinite(n)?Math.max(0,Math.min(150,n)):22;}
 _layout(){
  const h=this._scene.clientHeight,w=this._scene.clientWidth;if(!h||!w)return;
  const base=this.getAttribute('asset-base')||DEFAULT_ASSET_BASE;const root=new URL(base.endsWith('/')?base:base+'/',document.baseURI);
  const src=new URL('city.svg',root).href,videoSrc=new URL('character-walking.mp4',root).href;
  if(this._video.getAttribute('src')!==videoSrc)this._video.src=videoSrc;
  for(const [layer,scale] of [[this._city,.96],[this._far,.63]]){
   const height=h*scale,tile=height*869/118;layer.style.height=height+'px';layer._tile=tile;
   const count=Math.ceil(w/tile)+3;layer.replaceChildren(...Array.from({length:count},()=>{const img=document.createElement('img');img.src=src;img.alt='';img.draggable=false;img.style.width=tile+'px';return img;}));
  }
  this._far.hidden=!this.hasAttribute('parallax');this._paint();
 }
 _updatePause(){const b=this._root.querySelector('.pause');b.textContent=this._paused?'▶':'Ⅱ';b.setAttribute('aria-label',this._paused?'Resume animation':'Pause animation');b.setAttribute('aria-pressed',String(this._paused));}
 _sync(){
  const run=this.isConnected&&this._visible&&!document.hidden&&!this._paused&&!this._motion?.matches;
  cancelAnimationFrame(this._frame);this._frame=0;this._last=0;
  if(run){this._video.play().catch(()=>{});this._frame=requestAnimationFrame(this._tick);}else{this._video.pause();this._drawVideo();}
 }
 _tick(now){
  const elapsed=this._last?Math.max(0,(now-this._last)/1000):0,dt=Math.min(elapsed,.05);this._last=now;this._time+=elapsed;this._distance+=this.speed*dt;
  this._paint();
  while(this._time>=this._nextAt){const nextAt=this._nextAt+1.5;if(this._items.length>1)this.next();this._nextAt=nextAt;}
  this._frame=requestAnimationFrame(this._tick);
 }
 _paint(){
  for(const [layer,factor] of [[this._city,1],[this._far,.35]])if(layer._tile)layer.style.transform=`translate3d(${-((this._distance*factor)%(2*layer._tile))}px,0,0)`;
  this._drawVideo();
 }
 _drawVideo(){
  const v=this._video,c=this._canvas,ctx=this._ctx;
  if(v.readyState<2||this._drawnTime===v.currentTime)return;
  this._drawnTime=v.currentTime;
  // Crop the supplied 1280x720 movie, leaving room for the complete stride.
  ctx.drawImage(v,360,25,500,685,0,0,c.width,c.height);
  const frame=ctx.getImageData(0,0,c.width,c.height),p=frame.data;
  // Soft luminance key for this movie's near-white backdrop; retain colored artwork.
  for(let i=0;i<p.length;i+=4){
   const lo=Math.min(p[i],p[i+1],p[i+2]),hi=Math.max(p[i],p[i+1],p[i+2]);
   if(lo>218&&hi-lo<30){
    const alpha=Math.max(0,Math.min(1,(244-lo)/26));p[i+3]=Math.round(alpha*255);
    if(alpha>0&&alpha<1)for(let k=0;k<3;k++)p[i+k]=Math.max(0,Math.min(255,(p[i+k]-244*(1-alpha))/alpha));
   }
  }
  ctx.putImageData(frame,0,0);
 }

 greet(){
  this._greetUntil=this._time+1.05;const bubble=this._root.querySelector('.greeting');bubble.classList.add('show');clearTimeout(this._greetingTimer);this._greetingTimer=setTimeout(()=>bubble.classList.remove('show'),1700);
  this.dispatchEvent(new CustomEvent('strip-greet',{bubbles:true,composed:true}));
 }
 next(){
  if(this._items.length>1){this._index=(this._index+1)%this._items.length;this._renderTitle();}else this.greet();
  this._nextAt=this._time+1.5;this.dispatchEvent(new CustomEvent('experience-change',{detail:{index:this._index,...this._items[this._index]},bubbles:true,composed:true}));
 }
 _renderTitle(){const item=this._items[this._index];this._root.querySelector('.number').textContent=String(this._index+1).padStart(2,'0');this._root.querySelector('.company').textContent=item.company;this._root.querySelector('.role').textContent=item.role;this._root.querySelector('.separator').hidden=!item.role;}
}
if(!customElements.get('portfolio-city-strip'))customElements.define('portfolio-city-strip',PortfolioCityStrip);
