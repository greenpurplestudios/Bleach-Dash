
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const bossUI=document.getElementById('bossUI'),bossFill=document.getElementById('bossFill'),scoreEl=document.getElementById('score'),overlay=document.getElementById('overlay'),startBtn=document.getElementById('start'),endlessBtn=document.getElementById('endless'),settingsBtn=document.getElementById('settings'),languageBtn=document.getElementById('language'),menuLogo=document.getElementById('menuLogo'),menuSubtitle=document.getElementById('menuSubtitle'),menuHint=document.getElementById('menuHint'),bestScoreMenu=document.getElementById('bestScoreMenu'),hudTitle=document.getElementById('hudTitle'),jumpHint=document.getElementById('jumpHint'),attackHint=document.getElementById('attackHint');
let W=1100,H=520,dpr=1,playing=false,last=0,score=0,speed=390,ground=430,gameTime=0,worldScale=1;
let language=localStorage.getItem('bleachDashLanguage')||'en';
let bestScore=Number(localStorage.getItem('bleachDashBest')||0);
let player,obstacles=[],dyingObstacles=[],projectiles=[],particles=[],spawnTimer=0,jumpTime=0,deathStart=0;let bossMode=false,boss=null,bossProjectiles=[],bossVictory=false,bossDeathStart=0,endlessMode=false;let bossCheatCount=0,bossCheatLast=0;
// Original Web Audio SFX: no external copyrighted audio files required.
let audioCtx=null,audioMaster=null,sfxReady=false;
function initAudio(){
  if(!audioCtx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    audioCtx=new AC();
    audioMaster=audioCtx.createGain();
    audioMaster.gain.value=.34;
    audioMaster.connect(audioCtx.destination);
  }
  if(audioCtx.state==='suspended')audioCtx.resume();
  sfxReady=true;
}
function envGain(g,t0,dur,peak=.18){
  g.gain.cancelScheduledValues(t0);
  g.gain.setValueAtTime(.0001,t0);
  g.gain.exponentialRampToValueAtTime(Math.max(.0001,peak),t0+.008);
  g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
}
function tone(freqStart,freqEnd,dur,type='sine',peak=.16,delay=0){
  if(!sfxReady)return;
  const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.setValueAtTime(freqStart,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,freqEnd),t+dur);
  envGain(g,t,dur,peak);o.connect(g);g.connect(audioMaster);o.start(t);o.stop(t+dur+.02);
}
function noise(dur=.12,peak=.12,filterFreq=2200,delay=0){
  if(!sfxReady)return;
  const t=audioCtx.currentTime+delay,buffer=audioCtx.createBuffer(1,Math.max(1,Math.floor(audioCtx.sampleRate*dur)),audioCtx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  const src=audioCtx.createBufferSource(),f=audioCtx.createBiquadFilter(),g=audioCtx.createGain();
  f.type='bandpass';f.frequency.value=filterFreq;f.Q.value=.7;envGain(g,t,dur,peak);src.buffer=buffer;src.connect(f);f.connect(g);g.connect(audioMaster);src.start(t);src.stop(t+dur+.02);
}
function sfxMenu(){tone(520,760,.07,'square',.09);}
function sfxJump(){tone(220,430,.13,'triangle',.12);noise(.055,.045,1800,.015);}
function sfxGetsugaCharge(){tone(150,520,.20,'sawtooth',.10);tone(310,760,.18,'sine',.07,.03);}
function sfxGetsugaLaunch(){noise(.16,.16,1500);tone(180,70,.18,'sine',.12);tone(520,980,.12,'triangle',.08,.01);}
function sfxImpact(){noise(.13,.18,900);tone(110,55,.16,'sine',.15);}
function sfxHurdleBreak(){noise(.18,.14,650);noise(.08,.08,1800,.025);}
function sfxGameOver(){tone(260,120,.32,'sawtooth',.13);tone(150,70,.45,'triangle',.09,.10);}
const bossIchigoIdleFrames=[],bossIchigoDuckFrames=[],bossIchigoAttackFrames=[],bossGrandIdleFrames=[],bossGrandDamageFrames=[],bossGrandAttackFrames=[],bossGrandDeathFrames=[];
const runFrames=[],jumpFrames=[],deathFrames=[],attackFrames=[],hurdleIdleFrames=[],hurdleDeathFrames=[],hollowIdleFrames=[],hollowDeathFrames=[],mediumHollowIdleFrames=[],largeHollowIdleFrames=[],flyingHollowIdleFrames=[],flyingHollowDeathFrames=[],highFlyingHollowIdleFrames=[];
const ichigoAtlas=new Image(); ichigoAtlas.src='assets/ichigo_master_sheet.png';
const atlasFrames={run:[],jump:[],attack:[],death:[]};const slideSheet=new Image();slideSheet.src='assets/slide_sheet.png';
const backgrounds={day:new Image(),evening:new Image(),night:new Image()};
for(const k of Object.keys(backgrounds)) backgrounds[k].src=`assets/bg_${k}.jpg`;
function loadFrames(list,prefix,count){for(let i=1;i<=count;i++){const img=new Image();img.src=`assets/${prefix}_${i}.png`;list.push(img)}}
loadFrames(runFrames,'run',20);loadFrames(jumpFrames,'jump',10);loadFrames(deathFrames,'death',10);loadFrames(attackFrames,'actions/attack',6);
for(let i=0;i<20;i++)atlasFrames.run.push({x:(i%10)*220,y:Math.floor(i/10)*220,w:220,h:220});
for(let i=0;i<10;i++)atlasFrames.jump.push({x:i*220,y:440,w:220,h:220});
for(let i=0;i<6;i++)atlasFrames.attack.push({x:i*220,y:660,w:220,h:220});
for(let i=0;i<10;i++)atlasFrames.death.push({x:i*220,y:880,w:220,h:220});
for(let i=1;i<=4;i++){const img=new Image();img.src=`assets/hurdle/${i}.png`;hurdleIdleFrames.push(img)}
for(let i=5;i<=7;i++){const img=new Image();img.src=`assets/hurdle/${i}.png`;hurdleDeathFrames.push(img)}
for(const n of ['idle_1.png','idle_2.png','idle_3.png']){const img=new Image();img.src=`assets/hollow/${n}`;hollowIdleFrames.push(img)}
for(const n of ['death_1.png','death_2.png','death_3.png','death_4.png']){const img=new Image();img.src=`assets/hollow/${n}`;hollowDeathFrames.push(img)}
for(const n of ['idle_1.png','idle_2.png','idle_3.png']){const img=new Image();img.src=`assets/hollow_medium/${n}`;mediumHollowIdleFrames.push(img)}
for(let i=1;i<=8;i++){const img=new Image();img.src=`assets/hollow_large/idle_${i}.png`;largeHollowIdleFrames.push(img)}
for(let i=1;i<=6;i++){const img=new Image();img.src=`assets/flying_hollow/idle_${i}.png`;flyingHollowIdleFrames.push(img)}
for(let i=1;i<=6;i++){const img=new Image();img.src=`assets/flying_hollow/death_${i}.png`;flyingHollowDeathFrames.push(img)}
for(let i=1;i<=8;i++){const img=new Image();img.src=`assets/high_flying_hollow/idle_${i}.png`;highFlyingHollowIdleFrames.push(img)}
const bossSheets={ichigoIdle:new Image(),ichigoDuck:new Image(),ichigoAttack:new Image(),grandIdle:new Image(),grandDamage:new Image(),grandAttack:new Image(),grandDeath:new Image()};bossSheets.ichigoIdle.src='assets/boss/a_clean_transparent_background_sprite_sheet_anim.png';bossSheets.ichigoDuck.src='assets/boss/a_clean_transparent_background_sprite_sheet_image.png';bossSheets.ichigoAttack.src='assets/boss/a_clean_transparent_background_sprite_sheet_style.png';bossSheets.grandIdle.src='assets/boss/grand_idle_sheet.png';bossSheets.grandDamage.src='assets/boss/grand_damage_sheet.png';bossSheets.grandAttack.src='assets/boss/grand_attack_sheet.png';bossSheets.grandDeath.src='assets/boss/grand_death_sheet.png';for(let i=0;i<8;i++)bossIchigoIdleFrames.push({x:(i%4)*384,y:Math.floor(i/4)*512,w:384,h:512});for(let i=0;i<10;i++)bossIchigoDuckFrames.push({x:(i%5)*354.8,y:Math.floor(i/5)*443.5,w:354.8,h:443.5});/* The attack artwork is a 3-frame Ichigo swing followed by 3 projectile-only frames. Only the first 3 are player animation. */for(let i=0;i<3;i++)bossIchigoAttackFrames.push({x:i*512,y:0,w:512,h:512});for(let i=0;i<8;i++)bossGrandIdleFrames.push({x:(i%4)*384,y:Math.floor(i/4)*512,w:384,h:512});for(let i=0;i<12;i++)bossGrandDamageFrames.push({x:(i%4)*384,y:Math.floor(i/4)*341.333,w:384,h:341.333});for(let i=0;i<12;i++)bossGrandAttackFrames.push({x:(i%4)*384,y:Math.floor(i/4)*341.333,w:384,h:341.333});for(let i=0;i<18;i++)bossGrandDeathFrames.push({x:(i%6)*256,y:Math.floor(i/6)*341.333,w:256,h:341.333});const bossGetsugaFrames=[];for(let i=1;i<=6;i++){const im=new Image();im.src=`assets/actions/getsuga_${i}.png`;bossGetsugaFrames.push(im);}

const I18N={en:{start:'START',endless:'ENDLESS MODE',settings:'SETTINGS',subtitle:'Run through the changing skies. Jump and fire Getsuga Tensho.',hint:'Tap = jump · hold = duck · double tap = Getsuga',best:'BEST',arabic:'العربية',english:'English',hud:'BLEACH DASH',jump:'SPACE / TAP · JUMP',attack:'X / DOUBLE TAP · GETSUGA',runOver:'RUN OVER',score:'Score',tryAgain:'Try again and beat it.'},ar:{start:'ابدأ',endless:'الوضع اللانهائي',settings:'الإعدادات',subtitle:'اركض عبر السماء المتغيرة. اقفز وأطلق غيتسوغا تنشو.',hint:'ضغط = قفز · مطوّل = انحناء · ضغطتان = غيتسوغا',best:'أفضل نتيجة',arabic:'العربية',english:'English',hud:'بليتش داش',jump:'SPACE / TAP · قفز',attack:'X / ضغطتان · غيتسوغا',runOver:'انتهت الجولة',score:'النتيجة',tryAgain:'حاول مرة أخرى وحطّم رقمك.'}};
function applyLanguage(){const t=I18N[language]; document.documentElement.lang=language; document.body.dir=language==='ar'?'rtl':'ltr'; startBtn.textContent=t.start; endlessBtn.textContent=t.endless; settingsBtn.textContent=t.settings; menuSubtitle.textContent=t.subtitle; menuHint.textContent=t.hint; bestScoreMenu.textContent=`${t.best}: ${String(bestScore).padStart(5,'0')}`; languageBtn.textContent=language==='en'?t.arabic:t.english; hudTitle.textContent=t.hud; jumpHint.textContent=t.jump; attackHint.textContent=t.attack; menuLogo.src=language==='en'?'assets/menu_title_en.jpg':'assets/menu_title_ar.jpg';}
languageBtn.addEventListener('click',()=>{language=language==='en'?'ar':'en';localStorage.setItem('bleachDashLanguage',language);applyLanguage()});
applyLanguage();
const enemySets={
  small:{idle:hollowIdleFrames,death:hollowDeathFrames},
  big:{idle:mediumHollowIdleFrames,death:[]},
  hurdle:{idle:hurdleIdleFrames,death:hurdleDeathFrames}
};
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;worldScale=Math.max(.85,Math.min(1.6,Math.min(W/1100,H/520)));ground=H-90*worldScale;if(player&&!playing){player.w=72*worldScale;player.h=96*worldScale;player.x=75*worldScale;player.y=ground-player.h}}addEventListener('resize',resize);resize();
function reset(){player={x:75*worldScale,y:ground-96*worldScale,w:72*worldScale,h:96*worldScale,vy:0,onGround:true,attack:false,attackTime:0,attackFired:false,slide:false,slideTime:0};obstacles=[];dyingObstacles=[];projectiles=[];bossProjectiles=[];particles=[];score=0;speed=Math.max(360,W*.355);spawnTimer=.75;gameTime=0;deathStart=0;bossMode=false;boss=null;bossVictory=false;bossDeathStart=0;bossCheatCount=0;bossCheatLast=0;bossUI.classList.remove('active');bossFill.style.width='100%'}
async function start(isEndless=false){initAudio();sfxMenu();endlessMode=!!isEndless;reset();
  playing=true;applyLanguage();overlay.classList.add('hidden');last=performance.now();requestAnimationFrame(loop)}

const SLIDE_DURATION=.56;
const SLIDE_FRAME_W=124;
const SLIDE_FRAME_H=124;
const SLIDE_FRAME_COUNT=7;

function startSlide(){
  if(!playing || !player || player.slide || player.attack || !player.onGround)return;
  player.slide=true;
  player.slideTime=0;
  player.vy=0;
  player.y=ground-player.h;
  initAudio();
}

function stopSlide(){
  if(!player || !player.slide)return;
  player.slide=false;
  player.slideTime=0;
  player.vy=0;
  player.onGround=true;
  player.y=ground-player.h;
}

function updateSlide(dt){
  if(!player || !player.slide)return false;
  player.slideTime+=dt;
  player.vy=0;
  player.onGround=true;
  player.y=ground-player.h;
  if(player.slideTime>=SLIDE_DURATION)stopSlide();
  return true;
}

function jump(){if(!playing||player.attack||player.slide)return;if(player.onGround){initAudio();sfxJump();player.vy=-760;player.onGround=false;jumpTime=0;burst(player.x+35,ground,7)}}
function beginAttack(){if(!playing||player.slide)return;if(!player.attack){initAudio();sfxGetsugaCharge();player.attack=true;player.attackTime=-0.10;player.attackFired=false}}
function burst(x,y,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*180,life:.5+Math.random()*.35})}
function spawn(){
  const r=Math.random();let type;
  if(r<.18)type='hurdle';else if(r<.43)type='small';else if(r<.68)type='big';else if(r<.85)type='large';else if(r<.95)type='flying';else type='highFlying';
  const defs={small:[64,64],big:[84,104],large:[156,145],hurdle:[104,72],flying:[88,66],highFlying:[176,120]};
  let [w,h]=defs[type];
  w*=worldScale;h*=worldScale;
  const y=type==='flying' ? ground-122*worldScale : type==='highFlying' ? ground-235*worldScale : ground-h;
  obstacles.push({type,x:W+35*worldScale,w,h,y,animTime:Math.random()*0.5,dead:false});
  spawnTimer=Math.max(.58,.86+Math.random()*.75-(speed-390)/1100);
}
function enterBoss(){if(bossMode)return;bossMode=true;obstacles=[];dyingObstacles=[];projectiles=[];bossProjectiles=[];boss={x:Math.max(W-420*worldScale,Math.min(W-320*worldScale,W*.64)),y:ground-360*worldScale,w:360*worldScale,h:360*worldScale,hp:20,maxHp:20,state:'idle',stateTime:0,cooldown:1.45,attackVariant:'ground',attackFired:false,dead:false};bossUI.classList.add('active');bossFill.style.width='100%'}function bossHitbox(){return{x:boss.x+boss.w*.22,y:boss.y+boss.h*.08,w:boss.w*.62,h:boss.h*.82}}function damageBoss(){if(!bossMode||!boss||boss.dead||boss.state!=='idle')return;boss.hp--;bossFill.style.width=(boss.hp/boss.maxHp*100)+'%';boss.state='damage';boss.stateTime=0;if(boss.hp<=0){boss.dead=true;boss.state='death';boss.stateTime=0;bossDeathStart=performance.now();bossProjectiles=[]}}function fireBossAttack(){boss.state='attack';boss.stateTime=0;boss.attackFired=false;boss.attackVariant=Math.random()<.5?'ground':'head'}function updateBoss(dt){if(!bossMode||!boss)return;boss.stateTime+=dt;if(boss.dead){if(boss.stateTime>1.95){bossMode=false;bossVictory=true;bossUI.classList.remove('active');playing=false;overlay.classList.remove('hidden');menuSubtitle.textContent=language==='ar'?'هزمت Grand Fisher!':'Grand Fisher defeated!';startBtn.textContent=I18N[language].start}return}if(boss.state==='damage'){if(boss.stateTime>.28){boss.state='idle';boss.stateTime=0;boss.cooldown=.7+Math.random()*.35}}else if(boss.state==='attack'){if(!boss.attackFired&&boss.stateTime>.28){const y=boss.attackVariant==='ground'?ground-28*worldScale:ground-128*worldScale;bossProjectiles.push({x:boss.x+10*worldScale,y,w:78*worldScale,h:36*worldScale,vx:-Math.max(470*worldScale,speed*.9),life:2.3,variant:boss.attackVariant});boss.attackFired=true}if(boss.stateTime>.72){boss.state='idle';boss.stateTime=0;boss.cooldown=1.1+Math.random()*.55}}else{boss.cooldown-=dt;if(boss.cooldown<=0)fireBossAttack()}for(const q of bossProjectiles){q.x+=q.vx*dt;q.life-=dt;q.frameTime=(q.frameTime||0)+dt;if(q.variant==='getsuga'){/* player-fired Getsuga: rightward */}if(rectsOverlap(playerHitbox(),q)){gameOver();return}}bossProjectiles=bossProjectiles.filter(q=>q.life>0&&q.x+q.w>-100)}
function update(dt){
  updateSlide(dt);
  gameTime+=dt;if(!bossMode){score+=dt*10;speed+=dt*2.4;}scoreEl.textContent=String(Math.floor(score)).padStart(5,'0');if(!endlessMode&&!bossMode&&score>=1000)enterBoss();
  if(player.attack){
    player.attackTime+=dt;
    // The character animation is only the sword attack. At the release frame,
    // launch a separate Getsuga projectile so the wave travels independently.
    if(!player.attackFired&&player.attackTime>=.18){spawnGetsuga();sfxGetsugaLaunch();player.attackFired=true}
    if(player.attackTime>=.60){player.attack=false;player.attackTime=0;player.attackFired=false}
  }
  updateProjectiles(dt);
  if(!player.slide){player.vy+=1900*dt;player.y+=player.vy*dt;}
  if(!player.onGround)jumpTime+=dt;
  if(player.y+player.h>=ground){player.y=ground-player.h;player.vy=0;player.onGround=true;jumpTime=0}
  if(!bossMode){spawnTimer-=dt;if(spawnTimer<=0)spawn();}
  for(const o of obstacles){o.x-=speed*dt;o.animTime+=dt}
  for(const d of dyingObstacles){d.x-=speed*dt;d.age+=dt}
  handleCollisions();if(bossMode)updateBoss(dt);
  obstacles=obstacles.filter(o=>o.x+o.w>-100&&!o.dead);
  dyingObstacles=dyingObstacles.filter(d=>d.age<d.duration&&d.x+d.w>-220);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.life-=dt}
  particles=particles.filter(p=>p.life>0);
}
function spawnGetsuga(){
  const x=player.x+58*worldScale, y=player.y+25*worldScale;
  if(bossMode){
    bossProjectiles.push({x,y,w:78*worldScale,h:36*worldScale,vx:Math.max(620*worldScale,speed*1.45),life:1.35,frameTime:0,variant:'getsuga'});
    return;
  }
  projectiles.push({x,y,w:44*worldScale,h:58*worldScale,vx:Math.max(720*worldScale,speed*1.8),life:1.25,hit:false});
}
function updateProjectiles(dt){
  for(const p of projectiles){
    p.x+=p.vx*dt; p.life-=dt;
    if(bossMode&&boss&&!boss.dead&&rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},bossHitbox())){damageBoss();p.hit=true;continue;}
    for(const o of obstacles){
      if(o.dead)continue;
      if((o.type==='small'||o.type==='hurdle'||o.type==='flying') &&
         rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},obstacleHitbox(o))){
        startEnemyDeath(o); o.dead=true; p.hit=true; if(o.type==='hurdle')sfxHurdleBreak();else sfxImpact(); burst(o.x+o.w/2,ground-o.h/2,10); break;
      }
    }
  }
  projectiles=projectiles.filter(p=>!p.hit&&p.life>0&&p.x<W+180);
}
function drawGetsuga(p){
  const cx=Math.round(p.x+p.w*.15), cy=Math.round(p.y+p.h*.5), s=worldScale;
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle='#55bfff';
  ctx.beginPath();
  ctx.moveTo(cx-12*s,cy-24*s);ctx.lineTo(cx+4*s,cy-28*s);ctx.lineTo(cx+20*s,cy-18*s);ctx.lineTo(cx+30*s,cy-4*s);
  ctx.lineTo(cx+36*s,cy+10*s);ctx.lineTo(cx+28*s,cy+22*s);ctx.lineTo(cx+14*s,cy+30*s);ctx.lineTo(cx-4*s,cy+28*s);
  ctx.lineTo(cx+8*s,cy+16*s);ctx.lineTo(cx+18*s,cy+4*s);ctx.lineTo(cx+20*s,cy-8*s);ctx.lineTo(cx+12*s,cy-18*s);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d9f4ff';
  ctx.beginPath();
  ctx.moveTo(cx-4*s,cy-18*s);ctx.lineTo(cx+8*s,cy-20*s);ctx.lineTo(cx+18*s,cy-10*s);ctx.lineTo(cx+22*s,cy);
  ctx.lineTo(cx+14*s,cy+12*s);ctx.lineTo(cx+4*s,cy+18*s);ctx.lineTo(cx+12*s,cy+4*s);ctx.lineTo(cx+12*s,cy-7*s);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.65;ctx.fillStyle='#0b75ff';
  ctx.fillRect(cx-10*s,cy-28*s,8*s,5*s);ctx.fillRect(cx+20*s,cy-16*s,9*s,5*s);ctx.fillRect(cx+27*s,cy+18*s,8*s,5*s);ctx.fillRect(cx-2*s,cy+25*s,10*s,5*s);
  ctx.restore();
}
function updateProjectiles(dt){
  for(const p of projectiles){
    p.x+=p.vx*dt; p.life-=dt;
    if(bossMode&&boss&&!boss.dead&&rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},bossHitbox())){damageBoss();p.hit=true;continue;}
    for(const o of obstacles){
      if(o.dead)continue;
      if((o.type==='small'||o.type==='hurdle'||o.type==='flying') &&
         rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},obstacleHitbox(o))){
        startEnemyDeath(o); o.dead=true; p.hit=true; if(o.type==='hurdle')sfxHurdleBreak();else sfxImpact(); burst(o.x+o.w/2,ground-o.h/2,10); break;
      }
    }
  }
  projectiles=projectiles.filter(p=>!p.hit&&p.life>0&&p.x<W+180);
}
function startEnemyDeath(o){
  const duration=o.type==='hurdle' ? .42 : (o.type==='flying' ? .42 : .28);
  dyingObstacles.push({type:o.type,x:o.x,y:o.y??ground-o.h,w:o.w,h:o.h,age:0,duration});
}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function playerHitbox(){
  if(player.slide){
    // Matches the visible low body of the slide sprite while remaining forgiving.
    return{
      x:player.x+10*worldScale,
      y:ground-43*worldScale,
      w:Math.max(1,player.w-20*worldScale),
      h:35*worldScale
    };
  }
  if(!player.onGround)return{x:player.x+17,y:player.y+13,w:player.w-34,h:player.h-26};
  return{x:player.x+16,y:player.y+10,w:player.w-32,h:player.h-14};
}
function obstacleHitbox(o){
  const base=ground;
  switch(o.type){
    case 'small':return{x:o.x+8,y:base-o.h+8,w:o.w-16,h:o.h-8};
    case 'big':return{x:o.x+o.w*0.28,y:base-o.h+o.h*0.30,w:o.w*0.44,h:o.h*0.48};
    case 'large':return{x:o.x+o.w*0.08,y:base-o.h+o.h*0.06,w:o.w*0.44,h:Math.max(1,o.h-55*worldScale)};
    case 'flying':return{x:o.x+8*worldScale,y:o.y+7*worldScale,w:o.w-16*worldScale,h:o.h-10*worldScale};
    case 'highFlying':return{x:o.x+12*worldScale,y:o.y+14*worldScale,w:o.w-24*worldScale,h:o.h-34*worldScale};
    case 'hurdle':return{x:o.x+7,y:base-o.h+9,w:o.w-14,h:o.h-9};
  }
}
function handleCollisions(){
  const p=playerHitbox();
  for(const o of obstacles){
    if(o.dead)continue;
    const hit=rectsOverlap(p,obstacleHitbox(o));
    if(!hit)continue;
    gameOver();return;
  }
}
function loop(t){if(!playing)return;const dt=Math.min(.032,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}
function gameOver(){if(!playing)return;playing=false;bossMode=false;bossUI.classList.remove('active');initAudio();sfxGameOver();if(Math.floor(score)>bestScore){bestScore=Math.floor(score);localStorage.setItem('bleachDashBest',String(bestScore));applyLanguage()}deathStart=performance.now();requestAnimationFrame(deathLoop)}
function deathLoop(t){draw(true);if(t-deathStart<900)requestAnimationFrame(deathLoop);else{overlay.classList.remove('hidden');applyLanguage();menuSubtitle.textContent=`${I18N[language].score}: ${Math.floor(score)} — ${I18N[language].tryAgain}`;startBtn.textContent=I18N[language].start;}}
function drawCover(img,alpha=1){if(!img.complete||!img.naturalWidth)return;const targetH=ground+8,scale=Math.max(W/img.naturalWidth,targetH/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale,pan=Math.sin(gameTime*.035)*Math.max(0,dw-W)*.16;ctx.globalAlpha=alpha;ctx.drawImage(img,(W-dw)/2+pan,(targetH-dh)/2,dw,dh);ctx.globalAlpha=1}
function drawBackground(){ctx.fillStyle='#07080b';ctx.fillRect(0,0,W,H);const phase=gameTime%72;let a,b,t;if(phase<28){a=backgrounds.day;b=backgrounds.evening;t=Math.max(0,(phase-20)/8)}else if(phase<56){a=backgrounds.evening;b=backgrounds.night;t=Math.max(0,(phase-48)/8)}else{a=backgrounds.night;b=backgrounds.day;t=Math.max(0,(phase-64)/8)}drawCover(a);if(t>0)drawCover(b,t)}
function draw(deathMode=false){
  ctx.clearRect(0,0,W,H);drawBackground();
  ctx.fillStyle='#e8e3d7';ctx.fillRect(0,ground,W,3);ctx.fillStyle='#20232b';ctx.fillRect(0,ground+3,W,H-ground-3);
  ctx.strokeStyle='#444752';ctx.lineWidth=2;for(let x=-(score*12%80);x<W;x+=80){ctx.beginPath();ctx.moveTo(x,ground+27);ctx.lineTo(x+35,ground+27);ctx.stroke()}
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle='#f06a18';ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
  for(const o of obstacles)drawObstacle(o);for(const d of dyingObstacles)drawEnemyDeath(d);for(const p of projectiles)drawGetsuga(p);for(const p of bossProjectiles)drawBossProjectile(p);if(bossMode&&boss)drawBoss();if(deathMode)drawPlayer(true);else drawPlayer();
}
function fitImage(img,x,y,w,h,flip=false,anchorBottom=true){
  if(!img||!img.complete||!img.naturalWidth)return;
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
  const dx=x+(w-dw)/2,dy=anchorBottom?y+(h-dh):y+(h-dh)/2;
  ctx.save();
  if(flip){ctx.translate(dx+dw,0);ctx.scale(-1,1);ctx.drawImage(img,0,dy,dw,dh)}
  else ctx.drawImage(img,dx,dy,dw,dh);
  ctx.restore();
}
function currentFrame(list,time,ms){if(!list.length)return null;return list[Math.floor(time*1000/ms)%list.length]}
function drawObstacle(o){
  if(o.type==='hurdle'){
    const img=currentFrame(hurdleIdleFrames,o.animTime,105);
    fitImage(img,o.x,o.y,o.w,o.h,false,true);
    return;
  }
  if(o.type==='small'){
    const img=currentFrame(hollowIdleFrames,o.animTime,115);
    fitImage(img,o.x,o.y,o.w,o.h,false,true);
    return;
  }
  if(o.type==='big'){
    const img=currentFrame(mediumHollowIdleFrames,o.animTime,135);
    fitImage(img,o.x,o.y,o.w,o.h,false,true);
    return;
  }
  if(o.type==='large'){
    const img=currentFrame(largeHollowIdleFrames,o.animTime,105);
    fitImage(img,o.x,o.y,o.w,o.h,false,true);
    return;
  }
  if(o.type==='flying'){
    const img=currentFrame(flyingHollowIdleFrames,o.animTime,90);
    fitImage(img,o.x,o.y,o.w,o.h,false,true);
    return;
  }
  if(o.type==='highFlying'){
    const img=currentFrame(highFlyingHollowIdleFrames,o.animTime,105);
    fitImage(img,o.x,o.y,o.w,o.h,false,true);
    return;
  }
  drawPlaceholder(o.x,o.y,o.w,o.h,o.type);
}
function drawPlaceholder(x,y,w,h,type='small',alpha=1,scale=1){
  const dw=w*scale,dh=h*scale;
  const dx=x+(w-dw)/2,dy=y+h-dh;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.fillStyle='#0b0c10';
  ctx.beginPath();
  ctx.moveTo(dx+dw/2,dy);
  ctx.lineTo(dx+dw,dy+Math.min(18,dh*.28));
  ctx.lineTo(dx+dw-6*scale,dy+dh);
  ctx.lineTo(dx+6*scale,dy+dh);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e6e0d4';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#e6e0d4';ctx.beginPath();ctx.arc(dx+dw*.35,dy+Math.min(19,dh*.29),4*scale,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f06a18';ctx.beginPath();ctx.arc(dx+dw*.67,dy+Math.min(19,dh*.29),4*scale,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f06a18';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(dx+5*scale,dy+Math.min(32,dh*.5));ctx.lineTo(dx+dw-5*scale,dy+Math.min(32,dh*.5));ctx.stroke();
  ctx.restore();
}
function drawEnemyDeath(d){
  const t=Math.min(1,d.age/d.duration);
  if(d.type==='hurdle'){
    const img=currentFrame(hurdleDeathFrames,d.age,80);
    fitImage(img,d.x,d.y,d.w,d.h,false,true);
    return;
  }
  if(d.type==='small'){
    const img=currentFrame(hollowDeathFrames,d.age,70);
    fitImage(img,d.x,d.y,d.w,d.h,false,true);
    return;
  }
  if(d.type==='flying'){
    const img=currentFrame(flyingHollowDeathFrames,d.age,70);
    fitImage(img,d.x,d.y,d.w,d.h,false,true);
    return;
  }
  drawPlaceholder(d.x,d.y,d.w,d.h,d.type,1-t,1-.18*t);
}
function drawIchigoAtlas(anim,index,x,y,w=124*worldScale,h=124*worldScale){
  const f=atlasFrames[anim]?.[Math.max(0,Math.min(atlasFrames[anim].length-1,index))];
  if(!f || !ichigoAtlas.complete || !ichigoAtlas.naturalWidth)return;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(ichigoAtlas,f.x,f.y,f.w,f.h,x,y,w,h);
}
function drawBossProjectile(p){if(p.variant==='getsuga'){const idx=Math.min(5,Math.floor((p.frameTime||0)*1000/55));const img=bossGetsugaFrames[idx];if(!img||!img.complete||!img.naturalWidth)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.imageSmoothingEnabled=false;ctx.drawImage(img,p.x,p.y,p.w,p.h);ctx.restore();return;}ctx.save();ctx.globalCompositeOperation='lighter';const s=worldScale,cx=p.x+p.w*.5,cy=p.y+p.h*.5;ctx.fillStyle=p.variant==='ground'?'#ff6a3d':'#ff304f';ctx.shadowColor='#ff203f';ctx.shadowBlur=12*s;ctx.beginPath();ctx.ellipse(cx,cy,p.w*.48,p.h*.48,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd6c9';ctx.beginPath();ctx.ellipse(cx+p.w*.15,cy,p.w*.18,p.h*.28,0,0,Math.PI*2);ctx.fill();ctx.restore()}function drawSheetFrame(img,f,x,y,w,h){if(!img.complete||!img.naturalWidth)return;ctx.imageSmoothingEnabled=false;const sc=Math.min(w/f.w,h/f.h),dw=f.w*sc,dh=f.h*sc,dx=x+(w-dw)/2,dy=y+(h-dh);ctx.drawImage(img,f.x,f.y,f.w,f.h,dx,dy,dw,dh)}function drawBoss(){const frames=boss.state==='idle'?bossGrandIdleFrames:boss.state==='damage'?bossGrandDamageFrames:boss.state==='attack'?bossGrandAttackFrames:bossGrandDeathFrames,img=boss.state==='idle'?bossSheets.grandIdle:boss.state==='damage'?bossSheets.grandDamage:boss.state==='attack'?bossSheets.grandAttack:bossSheets.grandDeath,ms=boss.state==='idle'?110:boss.state==='damage'?55:boss.state==='attack'?70:105,idx=Math.min(frames.length-1,Math.floor(boss.stateTime*1000/ms));drawSheetFrame(img,frames[idx],boss.x,boss.y,boss.w,boss.h)}const BOSS_ICHIGO_REF_SCALE=.276;function drawBossIchigoFrame(img,f,cellX,cellY,refScale,baseX,baseY){if(!img.complete||!img.naturalWidth)return;const iw=Math.round(f.w),ih=Math.round(f.h);const tmp=document.createElement('canvas');tmp.width=iw;tmp.height=ih;const t=tmp.getContext('2d');t.imageSmoothingEnabled=false;t.drawImage(img,f.x,f.y,f.w,f.h,0,0,iw,ih);const data=t.getImageData(0,0,iw,ih).data;let minX=iw,minY=ih,maxX=-1,maxY=-1;for(let y=0;y<ih;y++){for(let x=0;x<iw;x++){if(data[(y*iw+x)*4+3]>10){if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y;}}}if(maxX<0)return;const cw=(maxX-minX+1)*refScale,ch=(maxY-minY+1)*refScale;const cx=baseX-cw*.5,cy=baseY-ch;ctx.imageSmoothingEnabled=false;ctx.drawImage(tmp,minX,minY,maxX-minX+1,maxY-minY+1,cx,cy,cw,ch)}function drawBossIchigo(){const baseX=player.x+36*worldScale,baseY=player.y+player.h;if(player.slide){const idx=Math.min(bossIchigoDuckFrames.length-1,Math.floor((player.slideTime/SLIDE_DURATION)*bossIchigoDuckFrames.length));drawBossIchigoFrame(bossSheets.ichigoDuck,bossIchigoDuckFrames[idx],0,0,BOSS_ICHIGO_REF_SCALE,baseX,baseY);return}if(player.attack){const idx=Math.min(bossIchigoAttackFrames.length-1,Math.floor(Math.max(0,player.attackTime)/.60*bossIchigoAttackFrames.length));drawBossIchigoFrame(bossSheets.ichigoAttack,bossIchigoAttackFrames[idx],0,0,BOSS_ICHIGO_REF_SCALE,baseX,baseY);return}if(!player.onGround){const idx=Math.min(9,Math.floor(Math.max(0,Math.min(.999,jumpTime/((2*760)/1900)))*10));drawIchigoAtlas('jump',idx,player.x-26*worldScale,player.y+player.h-124*worldScale,124*worldScale,124*worldScale);return}const idx=Math.floor(performance.now()/130)%bossIchigoIdleFrames.length;drawBossIchigoFrame(bossSheets.ichigoIdle,bossIchigoIdleFrames[idx],0,0,BOSS_ICHIGO_REF_SCALE,baseX,baseY)}function drawPlayer(deathMode=false){
  if(bossMode&&!deathMode){drawBossIchigo();return;}
  const sw=124*worldScale,sh=124*worldScale;
  const bottom=player.y+player.h;
  const sx=player.x-26*worldScale, sy=bottom-sh;
  if(deathMode){
    drawIchigoAtlas('death',Math.min(9,Math.floor((performance.now()-deathStart)/90)),sx,sy,sw,sh);
  }else if(player.slide){
    if(slideSheet.complete&&slideSheet.naturalWidth){
      const frame=Math.min(
        SLIDE_FRAME_COUNT-1,
        Math.floor((player.slideTime/SLIDE_DURATION)*SLIDE_FRAME_COUNT)
      );
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(
        slideSheet,
        frame*SLIDE_FRAME_W,0,SLIDE_FRAME_W,SLIDE_FRAME_H,
        sx,sy,sw,sh
      );
    }
  }else if(player.attack){
    // Briefly preserve the run cycle, then play six complete, self-contained
    // Getsuga frames. Each frame is a separate transparent PNG: no sprite-sheet
    // neighbors, labels, or external projectile can leak into the animation.
    if(player.attackTime<0){
      drawIchigoAtlas('run',Math.floor(performance.now()/65)%20,sx,sy,sw,sh);
    }else{
      const img=attackFrames[Math.min(5,Math.floor((player.attackTime/.60)*6))];
      if(img&&img.complete&&img.naturalWidth){
        const aw=124*worldScale,ah=124*worldScale;
        const ax=player.x-26*worldScale, ay=player.y+player.h-ah;
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(img,ax,ay,aw,ah);
      }
    }
  }else if(player.onGround){
    drawIchigoAtlas('run',Math.floor(performance.now()/65)%20,sx,sy,sw,sh);
  }else{
    const jumpDuration=(2*760)/1900;
    const progress=Math.max(0,Math.min(.999,jumpTime/jumpDuration));
    drawIchigoAtlas('jump',Math.min(9,Math.floor(progress*10)),sx,sy,sw,sh);
  }
}

let touchDownAt=0,touchTimer=null,lastTapAt=0,touchDidAction=false;function pointerDown(e){if(!playing)return;e.preventDefault();const now=performance.now();touchDownAt=now;touchDidAction=false;if(now-lastTapAt<300){beginAttack();touchDidAction=true;clearTimeout(touchTimer);return}touchTimer=setTimeout(()=>{if(playing&&performance.now()-touchDownAt>=160){startSlide();touchDidAction=true}},160)}function pointerUp(e){if(!playing)return;e.preventDefault();clearTimeout(touchTimer);if(player&&player.slide){stopSlide();touchDidAction=true;return}const now=performance.now();if(!touchDidAction&&now-touchDownAt<160){jump();lastTapAt=now}else if(touchDidAction){lastTapAt=now}}
canvas.addEventListener('pointerdown',pointerDown,{passive:false});canvas.addEventListener('pointerup',pointerUp,{passive:false});canvas.addEventListener('pointercancel',pointerUp,{passive:false});
addEventListener('keydown',e=>{
  if(e.repeat)return;
  // Boss test cheat: press M three times quickly during a run to enter Grand Fisher immediately.
  if(e.code==='KeyM'){
    e.preventDefault();
    if(!playing)return;
    const now=performance.now();
    bossCheatCount=(now-bossCheatLast<=900)?bossCheatCount+1:1;
    bossCheatLast=now;
    if(bossCheatCount>=3){
      bossCheatCount=0;
      bossCheatLast=0;
      score=Math.max(score,1000);
      if(!bossMode)enterBoss();
    }
    return;
  }
  if(e.code==='ArrowDown'){
    e.preventDefault();
    startSlide();
  }else if(['Space','ArrowUp'].includes(e.code)){
    e.preventDefault();
    jump();
  }else if(['KeyX','KeyZ'].includes(e.code)){
    e.preventDefault();
    beginAttack();
  }
},{passive:false});
// Touch/click attack button is not present in this build; X/Z remain the keyboard attack input.
startBtn.onclick=()=>start(false);endlessBtn.onclick=()=>start(true);requestAnimationFrame(()=>draw());
