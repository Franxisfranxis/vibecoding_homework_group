import * as THREE from 'three';

const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({canvas:$('game'), antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.setClearColor(0xc8ebf3);
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xc8ebf3,32,65);
const camera = new THREE.PerspectiveCamera(45,1,.1,100);
scene.add(new THREE.HemisphereLight(0xffffff,0x779867,2));
const sun = new THREE.DirectionalLight(0xfff5cf,2.3); sun.position.set(-10,20,8); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-22; sun.shadow.camera.right=22; sun.shadow.camera.top=22; sun.shadow.camera.bottom=-22; scene.add(sun);
const mat = (color,extra={}) => new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const yellow=mat(0xf4ce38), cream=mat(0xffe8b7), dark=mat(0x594e32), white=mat(0xffffff), black=mat(0x202b25), green=mat(0x69a94b), pink=mat(0xf39fb6);
function ball(parent,material,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
function box(parent,material,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(48,48),mat(0x91ce78));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
// Deterministic scenery keeps the same world for every run.
let seed=27;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
for(let i=0;i<75;i++){let x=(random()-.5)*43,z=(random()-.5)*43;if(Math.abs(x)<7&&Math.abs(z)<12)continue;let g=new THREE.Group();g.position.set(x,0,z);scene.add(g);if(i%3===0){box(g,mat(0x96704f),0,.65,0,.35,1.3,.35);ball(g,green,0,1.7,0,1.1,1.25,1.1);}else {let f=ball(g,i%2?pink:cream,0,.16,0,.18,.12,.18);f.castShadow=false;}}
for(let i=0;i<7;i++){const hill=ball(scene,mat(i%2?0x88c982:0xa4d58e),(i-3)*8,-.2,-23,6,2.5,4);hill.receiveShadow=true;}
const gate=new THREE.Group();gate.position.set(0,0,-15);scene.add(gate);box(gate,cream,-2,1.7,0,.6,3.4,.7);box(gate,cream,2,1.7,0,.6,3.4,.7);box(gate,yellow,0,3.45,0,4.6,.6,.7);
const player=new THREE.Group();scene.add(player);
ball(player,yellow,0,1,0,.85,1,.65);ball(player,cream,0,.95,.56,.58,.65,.15);ball(player,yellow,0,1.95,0,.56,.53,.48);
for(const x of [-.22,.22]){ball(player,white,x,2.07,.42,.13,.14,.07);ball(player,black,x,2.07,.48,.065,.075,.04);ball(player,yellow,x*2,.2,0,.35,.2,.43);}
ball(player,dark,0,1.84,.49,.18,.035,.04);ball(player,yellow,-.8,1.15,.08,.38,.22,.23);ball(player,yellow,.8,1.15,.08,.38,.22,.23);
// 整体缩小让奶娃更灵活；子弹生成高度与受击半径同步按此比例缩放
const PLAYER_SCALE = .75;
const PLAYER_SPEED = 5;
player.scale.setScalar(PLAYER_SCALE);

// ── 怪物类型 ────────────────────────────────────────────────────────────
// grunt      普通捣蛋怪：3 点血，粉色，靠近撞击
// shooter    射手怪：10 点血，橙红 + 金色角 + 炮口，每 1 秒射一颗子弹
// laser      激光怪：12 点血，亮紫 + 青色角 + 发光核心，蓄力 1.2 秒后发射激光（命中 -2）
// bullethell 弹幕怪：18 点血，蓝色刺球 + 洋红核心，蓄力 0.55 秒后扇形撒出 10 颗弹幕
// nova       光圈怪：14 点血，黄色 + 头顶双光环，在奶娃脚下投下光圈，蓄力 1 秒后爆发（-2）
// healer     回血怪：8 点血，薄荷绿 + 头顶白色十字，站在四角完全不移动，给 8.5 范围内的怪缓慢回血
const KINDS = {
  grunt:      { hp:3,  body:0xd898d7, foot:0xc87ebf, horn:0,        scale:1,    muzzle:false, core:false, spike:false, halo:false, heal:false, aggro:6,  coreColor:0 },
  shooter:    { hp:10, body:0xff8a4c, foot:0xd0582a, horn:0xffd166, scale:1.18, muzzle:true,  core:false, spike:false, halo:false, heal:false, aggro:10, coreColor:0 },
  laser:      { hp:12, body:0xa855f7, foot:0x7b3fc4, horn:0x22d3ee, scale:1.3,  muzzle:false, core:true,  spike:false, halo:false, heal:false, aggro:12, coreColor:0x67e8f9 },
  bullethell: { hp:18, body:0x3b82f6, foot:0x2563eb, horn:0,        scale:1.45, muzzle:false, core:true,  spike:true,  halo:false, heal:false, aggro:14, coreColor:0xff3ea5 },
  nova:       { hp:14, body:0xeab308, foot:0x92400e, horn:0,        scale:1.25, muzzle:false, core:false, spike:false, halo:true,  heal:false, aggro:13, coreColor:0 },
  healer:     { hp:8,  body:0x2dd4a7, foot:0x0b6b5c, horn:0,        scale:1.28, muzzle:false, core:false, spike:false, halo:false, heal:true,  aggro:0,  coreColor:0 },
};
// 回血怪的奶量：半径 8.5 内每秒回复 0.6 点（刻意做得慢，让玩家有优先击杀的理由）
const HEAL = { radius:8.5, rate:.6 };
// 行动状态机：待机（不动）→ 玩家进入警戒范围才追 → 追满 3 秒放弃 → 慢速退回回血怪的光圈里停下
const AGGRO = { chaseTime:3, retreatSpeed:.9, rest:2.5 };
// 铺满整个场地（±18），边角也放怪；精英怪身边都配了基础怪
const monsterPositions = [
  // 前哨：玩家正前方左右各一
  [-7.0,  7.0,'grunt'], [ 7.0,  6.0,'grunt'],
  // 两侧边角
  [-16.0, 3.0,'grunt'], [ 16.0, 2.0,'grunt'],
  // 中段：双射手 + 各自的护卫
  [-3.0, -1.0,'shooter'], [ 4.0, -2.0,'shooter'],
  [-11.0,-4.0,'grunt'],   [ 11.0,-3.0,'grunt'],
  // 左右下角：激光怪镇守
  [-17.0,-9.0,'laser'],   [ 17.0,-8.0,'laser'],
  // 中场：光圈怪，独占一片空地
  [ 0.0, -7.5,'nova'],
  // 另外 5 只光圈怪：铺开在左上 / 右上 / 右中 / 左中 / 左下，避免和别的怪叠住
  [-11.0, 11.0,'nova'], [ 11.0, 11.0,'nova'],
  [ 15.0, -4.0,'nova'], [-14.0, -1.0,'nova'],
  [-4.0, -11.0,'nova'],
  // 后场：双射手 + 门后的弹幕怪
  [-8.0,-13.0,'shooter'], [ 8.0,-13.0,'shooter'],
  [ 0.0,-17.5,'bullethell'],
  // 四个角落：回血怪，完全不动，负责给附近怪物缓慢回血
  [-17.5,-17.5,'healer'], [ 17.5,-17.5,'healer'],
  [-17.5, 17.5,'healer'], [ 17.5, 17.5,'healer'],
];
const monsters = [];

function makeMonster(x,z,kindName){
  const cfg = KINDS[kindName];
  const g = new THREE.Group();
  g.position.set(x,0,z);
  g.scale.setScalar(cfg.scale);

  const bodyMat = mat(cfg.body,{emissive:0xffffff,emissiveIntensity:0});
  const body = ball(g,bodyMat,0,.6,0,.65,.6,.6);
  ball(g,white,-.2,.76,.52,.12,.14,.08);ball(g,white,.2,.76,.52,.12,.14,.08);
  ball(g,black,-.2,.76,.6,.05,.07,.03);ball(g,black,.2,.76,.6,.05,.07,.03);
  ball(g,mat(0xb565a4),0,.48,.58,.14,.06,.04);
  const footMat = mat(cfg.foot);
  ball(g,footMat,-.4,.12,0,.23,.15,.3);ball(g,footMat,.4,.12,0,.23,.15,.3);

  // 远程怪的识别特征：一对尖角（射手金色 / 激光怪青色）
  if(cfg.horn){
    const hornMat = mat(cfg.horn);
    for(const sx of [-.3,.3]){
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.11,.34,8),hornMat);
      cone.position.set(sx,1.16,0); cone.rotation.z = sx>0?-.4:.4; cone.castShadow=true; g.add(cone);
    }
  }
  // 弹幕怪：身体一圈放射状尖刺
  if(cfg.spike){
    const spikeMat = mat(0xf0abfc);
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      const dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
      const sp=new THREE.Mesh(new THREE.ConeGeometry(.1,.44,6),spikeMat);
      sp.position.copy(dir).multiplyScalar(.68); sp.position.y=.6;
      sp.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
      sp.castShadow=true; g.add(sp);
    }
  }
  // 射手怪：胸前炮口
  if(cfg.muzzle){
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.34,10),mat(0x3b4250));
    muzzle.rotation.x = Math.PI/2; muzzle.position.set(0,.55,.7); muzzle.castShadow=true; g.add(muzzle);
  }
  // 法系怪（激光 / 弹幕）：胸口发光核心 + 环，蓄力时会膨胀闪烁
  let coreMesh = null;
  if(cfg.core){
    coreMesh = new THREE.Mesh(new THREE.SphereGeometry(.17,14,12),new THREE.MeshBasicMaterial({color:cfg.coreColor}));
    coreMesh.position.set(0,.72,.62); g.add(coreMesh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.26,.05,8,20),mat(cfg.coreColor));
    ring.position.set(0,.72,.58); g.add(ring);
  }
  // 光圈怪：头顶两道金色光环，外层倾斜并缓慢转动
  let haloMesh = null;
  if(cfg.halo){
    const haloMat = new THREE.MeshBasicMaterial({color:0xfde047});
    const h1 = new THREE.Mesh(new THREE.TorusGeometry(.42,.055,8,30),haloMat);
    h1.rotation.x = Math.PI/2; h1.position.y = 1.42; g.add(h1);
    haloMesh = new THREE.Mesh(new THREE.TorusGeometry(.34,.045,8,30),haloMat);
    haloMesh.rotation.x = Math.PI/2-.42; haloMesh.position.y = 1.28; g.add(haloMesh);
  }
  // 回血怪：头顶白色十字 + 地面上的治疗范围光环（光环挂在场景上，不随怪上下浮动）
  let aura = null, healLines = null;
  if(cfg.heal){
    // 十字下面垫一层深色描边，避免在草地上"糊"掉
    box(g,mat(0x0b3b33),0,1.62,0,.46,.17,.07);
    box(g,mat(0x0b3b33),0,1.62,0,.17,.46,.07);
    const crossMat = new THREE.MeshBasicMaterial({color:0xffffff});
    box(g,crossMat,0,1.62,.03,.4,.12,.08);
    box(g,crossMat,0,1.62,.03,.12,.4,.08);
    aura = new THREE.Mesh(
      new THREE.RingGeometry(HEAL.radius-.42,HEAL.radius,48),
      new THREE.MeshBasicMaterial({color:0x3ef2b0,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide})
    );
    aura.rotation.x = -Math.PI/2;
    aura.position.set(x,.04,z);
    scene.add(aura);
    // 正在奶谁，就从自己身上拉一条绿色光束过去（最多同时 4 条）
    healLines = [];
    for(let i=0;i<4;i++){
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
      const line = new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x3ef2b0,transparent:true,opacity:.75}));
      line.visible = false; line.frustumCulled = false; scene.add(line);
      healLines.push(line);
    }
  }

  // 头顶血条：始终朝向相机
  const barGroup = new THREE.Group(); barGroup.position.y = 1.5; g.add(barGroup);
  barGroup.add(new THREE.Mesh(
    new THREE.PlaneGeometry(1.04,.16),
    new THREE.MeshBasicMaterial({color:0x1b1f24,transparent:true,opacity:.7,depthWrite:false})
  ));
  const fgGeom = new THREE.PlaneGeometry(1,.12); fgGeom.translate(.5,0,0);
  const fgMat = new THREE.MeshBasicMaterial({color:0x6ee06e});
  const fg = new THREE.Mesh(fgGeom,fgMat); fg.position.set(-.5,0,.004); barGroup.add(fg);

  scene.add(g);
  return {g,body,bodyMat,barGroup,fg,fgMat,core:coreMesh,halo:haloMesh,aura,healLines,kind:kindName,hp:cfg.hp,maxHp:cfg.hp,alive:true,phase:random()*6,fireTimer:.5+random()*.5,hitFlash:0,aggro:cfg.aggro,
    aiState:'idle',chaseTimer:0,restTimer:0,
    laserState:'idle',laserCD:1.2+random()*.8,laserTimer:0,laserHit:false,laserMesh:null,laserMat:null,laserFrom:null,laserDir:null,
    hellState:'idle',hellCD:1.5+random()*1.0,hellTimer:0,
    novaState:'idle',novaCD:1.8+random()*1.0,novaTimer:0,novaHit:false,novaMesh:null,novaFill:null,novaRing:null,novaPos:null};
}
monsterPositions.forEach(([x,z,k])=>monsters.push(makeMonster(x,z,k)));

// ── BOSS：门口的大魔王 ──────────────────────────────────────────────────
// 规则：开局休眠（无敌、完全不动、不攻击），场上 23 只杂兵清空后才苏醒；
//       苏醒后随机循环四种技能：三段弹幕 / 多道激光封走位 / 密集光圈 / 巨大追踪弹
const BOSS = {
  hp:50, scale:2.05, z:-12.6, idle:1.5,
  barrage:{ charge:.5, gap:.55, spread:Math.PI*.5, speed:5.4 },
  laser:  { lanes:6, spacing:5.6, charge:1.15, fire:.45, halfWidth:.8 },
  nova:   { count:8, charge:1.2, radius:1.9, damage:2, spread:9.5 },
  homing: { speed:4.6, homingTime:3, hp:3, damage:3, radius:.62 },
};

function makeBoss(){
  const g = new THREE.Group();
  g.position.set(0,0,BOSS.z);
  g.scale.setScalar(BOSS.scale);

  const bodyMat = mat(0x4b5563,{emissive:0xffffff,emissiveIntensity:0});
  ball(g,bodyMat,0,.72,0,.86,.8,.78);
  ball(g,mat(0x374151),0,.5,.5,.5,.42,.28);
  // 血红的眼睛
  const eyeMat = new THREE.MeshBasicMaterial({color:0xff3b3b});
  for(const sx of [-.27,.27]) ball(g,eyeMat,sx,.92,.66,.12,.11,.06);
  // 怒眉
  for(const sx of [-.27,.27]){const b=box(g,mat(0x202b25),sx,1.04,.6,.3,.07,.07);b.rotation.z=sx>0?.32:-.32;}
  // 大角
  for(const sx of [-.46,.46]){
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.17,.62,9),mat(0x3b2a1a));
    cone.position.set(sx,1.4,0); cone.rotation.z=sx>0?-.42:.42; cone.castShadow=true; g.add(cone);
  }
  // 头顶三根尖刺
  for(const [cx,ch] of [[-.2,.3],[0,.44],[.2,.3]]){
    const sp=new THREE.Mesh(new THREE.ConeGeometry(.09,ch,7),mat(0x111827));
    sp.position.set(cx,1.62,0); sp.castShadow=true; g.add(sp);
  }
  // 胸口发光核心
  const core=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),new THREE.MeshBasicMaterial({color:0xff3b3b}));
  core.position.set(0,.62,.72); g.add(core);
  const coreRing=new THREE.Mesh(new THREE.TorusGeometry(.3,.05,8,22),mat(0x7f1d1d));
  coreRing.position.set(0,.62,.68); g.add(coreRing);
  // 双手与脚
  for(const sx of [-.88,.88]) ball(g,bodyMat,sx,.58,0,.26,.3,.26);
  for(const sx of [-.44,.44]) ball(g,mat(0x1f2937),sx,.12,.08,.3,.16,.36);

  // 休眠护盾：半透明淡蓝球壳，被子弹打到会泛起一圈波纹
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.3,24,18),
    new THREE.MeshBasicMaterial({color:0x9ad8ff,transparent:true,opacity:.18,depthWrite:false}));
  shield.position.y=.85; g.add(shield);

  // 血条
  const barGroup=new THREE.Group(); barGroup.position.y=1.92; g.add(barGroup);
  barGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(.66,.12),
    new THREE.MeshBasicMaterial({color:0x1b1f24,transparent:true,opacity:.75,depthWrite:false})));
  const fgGeom=new THREE.PlaneGeometry(.62,.08); fgGeom.translate(.31,0,0);
  const fgMat=new THREE.MeshBasicMaterial({color:0x6ee06e});
  const fg=new THREE.Mesh(fgGeom,fgMat); fg.position.set(-.31,0,.004); barGroup.add(fg);

  scene.add(g);
  return {g,bodyMat,shield,barGroup,fg,fgMat,core,
    hp:BOSS.hp,maxHp:BOSS.hp,alive:false,active:false,dead:false,
    state:'dormant',timer:0,skill:null,step:0,lastSkill:null,waveCounts:[],
    hitFlash:0,roar:0,shieldPulse:0,phaseTwo:false,shieldHp:35,jumpCount:0,jumpFrom:null,jumpTarget:null,jumpMarker:null};
}
const boss = makeBoss();

function refreshBossBar(){
  const r=Math.max(0,boss.hp/boss.maxHp);
  boss.fg.scale.x=r;
  boss.fgMat.color.setHex(r>.6?0x6ee06e:r>.3?0xf5c542:0xf2544a);
}
function activateBoss(){
  if(boss.active||boss.dead)return;
  boss.active=true;boss.alive=true;boss.state='idle';boss.timer=1.9;
  laserUnlocked=true;laserCharges=3;laserCooldown=0;
  boss.bodyMat.color.setHex(0xb91c1c);
  boss.shield.visible=false;
  boss.roar=.9;
  tone(70,1.0);
  updateHud();
}
function hitBoss(dmg){
  if(!bossTargetable())return 0;
  if(boss.phaseTwo&&boss.shieldHp>0){
    boss.shieldHp=Math.max(0,boss.shieldHp-dmg);
    if(boss.shieldHp<1e-6){boss.shieldHp=0;boss.shield.visible=false;tone(880,.2);}
    dmg*=.25; // 破盾这一击仍按命中前护盾结算，之后的攻击恢复原伤害。
  }
  boss.hp-=dmg;boss.hitFlash=.14;
  tone(300,.05);
  if(boss.hp<=1e-6){boss.hp=0;killBoss();}
  else if(!boss.phaseTwo&&boss.hp<=boss.maxHp/2)startBossPhaseTwo();
  refreshBossBar();updateHud();
  return dmg;
}
function killBoss(){
  boss.dead=true;boss.active=false;boss.alive=false;boss.g.visible=false;
  clearJumpMarker();
  clearBossBeams();clearBossNovas();clearHomings();
  for(let i=enemyBullets.length-1;i>=0;i--){
    if(enemyBullets[i].surround){scene.remove(enemyBullets[i].mesh);enemyBullets.splice(i,1);}
  }
  boss.hp=0;refreshBossBar();updateHud();
  tone(980,.7);
  setTimeout(()=>{if(mode==='play')menu('草原恢复和平！','你击碎了门口的魔王，奶娃守护了阳光草原！');},800);
}

// ── BOSS 技能一：三段弹幕（每段数量都不同）──────────────────────────────
function fireBossBarrage(count){
  const from=new THREE.Vector3(boss.g.position.x,1.15,boss.g.position.z);
  const base=Math.atan2(player.position.x-from.x,player.position.z-from.z);
  for(let i=0;i<count;i++){
    const a=count===1?base:base+(i/(count-1)-.5)*BOSS.barrage.spread;
    spawnBullet(from,new THREE.Vector3(Math.sin(a),0,Math.cos(a)),BOSS.barrage.speed,barrageBulletMat,enemyBullets,5,1);
  }
  tone(150,.3);
}

// ── BOSS 技能二：多道平行激光，把场地切成几条走廊（封走位）──────────────
const bossBeams=[];
function spawnBossBeam(from,dir,halfWidth,charge,fire){
  const w=halfWidth*1.7;
  const bm=new THREE.MeshBasicMaterial({color:0xff2b2b,transparent:true,opacity:.26,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),bm);
  mesh.scale.set(w,w,48);
  mesh.position.copy(from).addScaledVector(dir,24);
  mesh.lookAt(mesh.position.clone().addScaledVector(dir,1));
  scene.add(mesh);
  bossBeams.push({mesh,mat:bm,from:from.clone(),dir:dir.clone(),halfWidth,state:'charge',timer:charge,fire,hit:false});
}
function spawnBossLaserWall(){
  const horizontal=Math.random()<.5;
  const offset=(Math.random()-.5)*3;
  const n=BOSS.laser.lanes, span=(n-1)*BOSS.laser.spacing;
  for(let i=0;i<n;i++){
    const base=-span/2+i*BOSS.laser.spacing+offset;
    if(horizontal) spawnBossBeam(new THREE.Vector3(-24,.95,base),new THREE.Vector3(1,0,0),BOSS.laser.halfWidth,BOSS.laser.charge,BOSS.laser.fire);
    else           spawnBossBeam(new THREE.Vector3(base,.95,-24),new THREE.Vector3(0,0,1),BOSS.laser.halfWidth,BOSS.laser.charge,BOSS.laser.fire);
  }
  tone(300,.16);
}
function playerOnBeamAt(b){
  const px=player.position.x-b.from.x,pz=player.position.z-b.from.z;
  const t=px*b.dir.x+pz*b.dir.z;
  if(t<0||t>48)return false;
  return Math.abs(px*b.dir.z-pz*b.dir.x)<b.halfWidth;
}
function updateBossBeams(dt){
  for(let i=bossBeams.length-1;i>=0;i--){
    const b=bossBeams[i];
    b.timer-=dt;
    if(b.state==='charge'){
      b.mat.opacity=.14+.36*Math.abs(Math.sin(elapsed*22));
      if(b.timer<=0){
        b.state='fire';b.timer=b.fire;
        b.mat.color.setHex(0xff5a5a);b.mat.opacity=.9;
        b.mesh.scale.x*=1.5;b.mesh.scale.y*=1.5;
        tone(105,.38);
      }
    }else{
      if(!b.hit&&playerOnBeamAt(b)){b.hit=true;hurtPlayer(2);}
      if(b.timer<=0){
        scene.remove(b.mesh);b.mesh.geometry.dispose();b.mat.dispose();
        bossBeams.splice(i,1);
      }
    }
  }
}
function clearBossBeams(){
  for(const b of bossBeams){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mat.dispose();}
  bossBeams.length=0;
}

// ── BOSS 技能三：一堆光圈随机撒在玩家周围 ───────────────────────────────
const bossNovas=[];
function createBossNova(pos){
  const group=new THREE.Group();group.position.copy(pos);group.rotation.x=-Math.PI/2;
  const fillMat=new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.12,depthWrite:false});
  const ringMat=new THREE.MeshBasicMaterial({color:0xffc93c,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide});
  group.add(new THREE.Mesh(new THREE.CircleGeometry(BOSS.nova.radius,36),fillMat));
  group.add(new THREE.Mesh(new THREE.RingGeometry(BOSS.nova.radius,BOSS.nova.radius+.26,36),ringMat));
  scene.add(group);
  bossNovas.push({group,fill:fillMat,ring:ringMat,pos:pos.clone(),timer:BOSS.nova.charge,state:'charge',hit:false});
}
function spawnBossNovas(){
  const placed=[];
  for(let i=0;i<BOSS.nova.count;i++){
    let p=null;
    for(let tries=0;tries<14;tries++){
      const a=Math.random()*Math.PI*2, r=1.5+Math.random()*BOSS.nova.spread;
      const cand=new THREE.Vector3(
        THREE.MathUtils.clamp(player.position.x+Math.sin(a)*r,-20,20),.04,
        THREE.MathUtils.clamp(player.position.z+Math.cos(a)*r,-20,20));
      if(placed.every(q=>q.distanceTo(cand)>BOSS.nova.radius*1.35)){p=cand;break;}
    }
    if(!p)continue;
    placed.push(p);createBossNova(p);
  }
  tone(380,.18);
}
function updateBossNovas(dt){
  for(let i=bossNovas.length-1;i>=0;i--){
    const n=bossNovas[i];
    n.timer-=dt;
    if(n.state==='charge'){
      n.fill.opacity=.1+.32*(1-Math.max(0,n.timer)/BOSS.nova.charge);
      n.ring.opacity=.45+.4*Math.abs(Math.sin(elapsed*18));
      if(n.timer<=0){
        n.state='burst';n.timer=.22;
        n.fill.color.setHex(0xff3b3b);n.fill.opacity=.5;
        n.ring.color.setHex(0xff5a5a);n.ring.opacity=1;
        tone(120,.16);
      }
    }else{
      if(!n.hit){
        const dx=player.position.x-n.pos.x,dz=player.position.z-n.pos.z;
        if(dx*dx+dz*dz<BOSS.nova.radius*BOSS.nova.radius){n.hit=true;hurtPlayer(BOSS.nova.damage);}
      }
      if(n.timer<=0){
        scene.remove(n.group);
        n.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
        n.fill.dispose();n.ring.dispose();
        bossNovas.splice(i,1);
      }
    }
  }
}
function clearBossNovas(){
  for(const n of bossNovas){
    scene.remove(n.group);
    n.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    n.fill.dispose();n.ring.dispose();
  }
  bossNovas.length=0;
}

// ── BOSS 技能四：巨大追踪弹（追 3 秒后熄火，可被打掉，3 点血）───────────
const homings=[];
function spawnHomingShot(){
  const from=new THREE.Vector3(boss.g.position.x,1.0,boss.g.position.z);
  const hmat=new THREE.MeshBasicMaterial({color:0xff3b3b});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(BOSS.homing.radius,18,14),hmat);
  mesh.position.copy(from);scene.add(mesh);
  const dir=new THREE.Vector3(player.position.x-from.x,0,player.position.z-from.z);
  if(dir.lengthSq()<1e-4)dir.set(0,0,1);
  dir.normalize();
  homings.push({mesh,mat:hmat,vel:dir.multiplyScalar(BOSS.homing.speed),
    homing:BOSS.homing.homingTime,hp:BOSS.homing.hp,vulnerable:false,life:13,flash:0});
  tone(190,.5);
}
function destroyHoming(i){
  const h=homings[i];
  scene.remove(h.mesh);h.mesh.geometry.dispose();h.mat.dispose();
  homings.splice(i,1);
  tone(620,.22);
}
function updateHomings(dt){
  for(let i=homings.length-1;i>=0;i--){
    const h=homings[i];
    h.life-=dt;
    if(h.homing>0){
      h.homing-=dt;
      const dx=player.position.x-h.mesh.position.x,dz=player.position.z-h.mesh.position.z;
      const l=Math.hypot(dx,dz)||1;
      const want=new THREE.Vector3(dx/l,0,dz/l).multiplyScalar(BOSS.homing.speed);
      h.vel.lerp(want,Math.min(1,2.4*dt));       // 缓慢转向 = 可以靠绕圈甩掉
      if(h.homing<=0){                            // 3 秒后熄火，变成可击落的目标
        h.vulnerable=true;h.mat.color.setHex(0xff8a00);h.vel.multiplyScalar(.3);
      }
    }
    const move=h.vel.clone().multiplyScalar(dt);
    const steps=Math.max(1,Math.ceil(move.length()/.3));
    const step=move.divideScalar(steps);
    let gone=h.life<=0;
    for(let s=0;s<steps&&!gone;s++){
      h.mesh.position.add(step);
      if(Math.abs(h.mesh.position.x)>23||Math.abs(h.mesh.position.z)>23){gone=true;break;}
      const dx=h.mesh.position.x-player.position.x,dz=h.mesh.position.z-player.position.z;
      if(dx*dx+dz*dz<(.45+BOSS.homing.radius)*(.45+BOSS.homing.radius)){hurtPlayer(BOSS.homing.damage);gone=true;}
    }
    if(!gone){
      if(h.flash>0){h.flash=Math.max(0,h.flash-dt);}
      h.mesh.scale.setScalar(1+.1*Math.sin(elapsed*10)+h.flash);
    }
    if(gone)destroyHoming(i);
  }
}
function clearHomings(){
  for(const h of homings){scene.remove(h.mesh);h.mesh.geometry.dispose();h.mat.dispose();}
  homings.length=0;
}

// ── BOSS 技能调度：每执行完一个技能随机抽下一个（不重复上一招）───────────
function bossStartCast(demoSkill=null){
  const pool=['barrage','laser','nova','homing'].filter(s=>s!==boss.lastSkill);
  boss.skill=mode==='demo'&&demoSkill?demoSkill:pool[Math.floor(Math.random()*pool.length)];
  boss.lastSkill=boss.skill;
  boss.step=0;boss.state='cast';
  if(boss.skill==='barrage'){
    // 三段，每段数量都不同
    boss.waveCounts=[7+Math.floor(Math.random()*3),10+Math.floor(Math.random()*3),13+Math.floor(Math.random()*4)];
    boss.timer=BOSS.barrage.charge;
    tone(240,.12);
  }else if(boss.skill==='laser'){
    spawnBossLaserWall();
    boss.timer=BOSS.laser.charge+BOSS.laser.fire+.15;
    boss.step=1;
  }else if(boss.skill==='nova'){
    spawnBossNovas();
    boss.timer=BOSS.nova.charge+.4;
    boss.step=1;
  }else{
    spawnHomingShot();
    boss.timer=.7;
    boss.step=1;
  }
}
function updateBossCast(dt){
  boss.timer-=dt;
  if(boss.timer>0)return;
  if(boss.skill==='barrage'){
    if(boss.step<3){
      fireBossBarrage(boss.waveCounts[boss.step]);
      boss.step++;
      boss.timer=boss.step<3?BOSS.barrage.gap:.55;
    }else{
      boss.state='idle';boss.timer=BOSS.idle;
    }
  }else{
    boss.state='idle';boss.timer=BOSS.idle;
  }
}
function updateBoss(dt){
  if(boss.dead||!boss.g.visible)return;
  if(boss.hitFlash>0){boss.hitFlash=Math.max(0,boss.hitFlash-dt);boss.bodyMat.emissiveIntensity=boss.hitFlash/.14*.6;}
  if(boss.roar>0){boss.roar=Math.max(0,boss.roar-dt);boss.bodyMat.emissiveIntensity=Math.abs(Math.sin(elapsed*22))*.8*(boss.roar/.9);}
  if(boss.shieldPulse>0){boss.shieldPulse=Math.max(0,boss.shieldPulse-dt);boss.shield.scale.setScalar(1+.22*(boss.shieldPulse/.26));}
  boss.barGroup.quaternion.copy(camera.quaternion);
  if(boss.state==='dormant')return;
  if(boss.phaseTwo){updateBossPhaseTwo(dt);return;}
  boss.g.position.y=Math.abs(Math.sin(elapsed*2.2))*.1;
  // 面朝玩家
  const a=Math.atan2(player.position.x-boss.g.position.x,player.position.z-boss.g.position.z);
  let d=a-boss.g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));
  boss.g.rotation.y+=d*Math.min(1,3.5*dt);
  if(boss.state==='idle'){
    boss.timer-=dt;
    if(boss.timer<=0)bossStartCast();
  }else{
    updateBossCast(dt);
  }
}

// ── 二阶段：空中 1.5 秒 → 落地休整 3.5 秒（有限护盾）；首次放球，之后落地分裂并加速 ──
function bossTargetable(){return boss.active&&!boss.dead&&boss.state!=='jump';}
const skillEffects=[];
function disposeEffect(mesh){
  scene.remove(mesh);
  mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
}
function clearJumpMarker(){
  if(boss.jumpMarker){disposeEffect(boss.jumpMarker);boss.jumpMarker=null;}
}
function clearSkillEffects(){
  clearJumpMarker();
  for(const e of skillEffects)disposeEffect(e.mesh);
  skillEffects.length=0;
}
function effect(mesh,life){scene.add(mesh);skillEffects.push({mesh,life,max:life});}
function updateSkillEffects(dt){
  for(let i=skillEffects.length-1;i>=0;i--){
    const e=skillEffects[i];e.life-=dt;
    if(e.life<=0){disposeEffect(e.mesh);skillEffects.splice(i,1);continue;}
    e.mesh.traverse(o=>{if(o.material)o.material.opacity=e.life/e.max;});
  }
}
function glowRing(pos,radius,color){
  const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.12,radius,48),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(pos.x,.06,pos.z);return mesh;
}
function startBossPhaseTwo(){
  boss.phaseTwo=true;boss.skill=null;
  clearBossBeams();clearBossNovas();clearHomings();
  startBossJump();
}
function startBossJump(){
  boss.jumpCount++;
  boss.state='jump';boss.shield.visible=false;
  boss.jumpFrom=boss.g.position.clone();boss.jumpFrom.y=0;
  boss.jumpTarget=new THREE.Vector3(player.position.x,0,player.position.z);
  boss.timer=1.5;
  clearJumpMarker();
  const marker=new THREE.Group();marker.position.copy(boss.jumpTarget);marker.position.y=.045;marker.rotation.x=-Math.PI/2;
  marker.add(new THREE.Mesh(new THREE.CircleGeometry(NOVA.radius*1.5,48),new THREE.MeshBasicMaterial({color:0x9977ff,transparent:true,opacity:.2,depthWrite:false})));
  marker.add(new THREE.Mesh(new THREE.RingGeometry(NOVA.radius*1.5-.12,NOVA.radius*1.5,48),new THREE.MeshBasicMaterial({color:0xe5c7ff,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide})));
  scene.add(marker);boss.jumpMarker=marker;tone(220,.18);updateHud();
}
function lightningStrike(pos){
  const points=[];
  for(let i=0;i<=12;i++)points.push(new THREE.Vector3(pos.x+(i===12?0:(Math.random()-.5)*.9),12-i,pos.z+(i===12?0:(Math.random()-.5)*.6)));
  const bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xe8faff,transparent:true,opacity:1,depthTest:false}));
  effect(bolt,.4);
  const flash=new THREE.Mesh(new THREE.CylinderGeometry(.16,.4,12,10),new THREE.MeshBasicMaterial({color:0xbdeaff,transparent:true,opacity:.8,depthWrite:false}));
  flash.position.set(pos.x,6,pos.z);effect(flash,.18);
  effect(glowRing(pos,NOVA.radius*1.5,0xcceeff),.45);
  thunderSound();
}
function thunderSound(){
  if(muted)return;
  try{
    audio ||= new AudioContext();if(audio.state==='suspended')audio.resume();
    const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.55),audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1800;gain.gain.value=.35;
    source.connect(filter).connect(gain).connect(audio.destination);source.start();
  }catch{}
  tone(65,.5);
}
function bossOrbSpeed(){
  return PLAYER_SPEED*Math.min(1.5,.8+Math.max(0,boss.jumpCount-1)*.1);
}
function spawnBossOrb(from,dir){
  spawnBullet(from,dir,bossOrbSpeed(),orbBulletMat,enemyBullets,Infinity,1);
  const b=enemyBullets[enemyBullets.length-1];
  b.radius=.35;b.surround=true;b.mesh.scale.setScalar(2.5);
}
function fireBossOrb(){
  // 仅首次落地生成：在玩家周围四方向合围，初速为玩家的 80%。
  const target=new THREE.Vector3(player.position.x,.8,player.position.z);
  const base=Math.atan2(boss.g.position.x-target.x,boss.g.position.z-target.z);
  for(let i=0;i<4;i++){
    const angle=base+i*Math.PI/2;
    const from=target.clone().add(new THREE.Vector3(Math.sin(angle)*7.5,0,Math.cos(angle)*7.5));
    // 地图内生成，避免玩家在边缘时光球出现在反弹边界外。
    from.x=THREE.MathUtils.clamp(from.x,-21,21);
    from.z=THREE.MathUtils.clamp(from.z,-21,21);
    const dir=target.clone().sub(from);
    if(dir.lengthSq()<1e-6)dir.set(-Math.sin(angle),0,-Math.cos(angle));
    spawnBossOrb(from,dir.normalize());
  }
  tone(390,.2);
}
function splitBossOrbs(){
  // 先为全体提速，独立于数量上限；本次只处理落地前已经存在的球。
  const orbs=enemyBullets.filter(b=>b.surround);
  const speed=bossOrbSpeed();
  for(const b of orbs)b.vel.setLength(speed);
  let count=orbs.length;
  for(const b of orbs){
    if(count+3>256)break; // 父球变成一路，再新增三路，净增加 3 颗。
    const dir=b.vel.clone().normalize(),from=b.mesh.position.clone();
    for(let i=1;i<4;i++){
      const a=i*Math.PI/2;
      spawnBossOrb(from,new THREE.Vector3(dir.x*Math.cos(a)-dir.z*Math.sin(a),0,dir.x*Math.sin(a)+dir.z*Math.cos(a)));
    }
    count+=3;
  }
  tone(390,.2);
}
function updateBossPhaseTwo(dt){
  boss.timer=Math.max(0,boss.timer-dt);
  if(boss.state==='jump'){
    const duration=1.5,p=1-boss.timer/duration;
    boss.g.position.lerpVectors(boss.jumpFrom,boss.jumpTarget,p);
    boss.g.position.y=Math.sin(Math.PI*p)*7;
    if(boss.jumpMarker)boss.jumpMarker.children[0].material.opacity=.16+.3*p;
    if(boss.timer<=1e-8){
      boss.g.position.copy(boss.jumpTarget);clearJumpMarker();lightningStrike(boss.jumpTarget);
      // 仅在落地瞬间结算一次圆形伤害，沿用原有受伤无敌帧。
      const distance=Math.hypot(player.position.x-boss.jumpTarget.x,player.position.z-boss.jumpTarget.z);
      boss.state='shield';boss.timer=3.5;boss.shield.visible=boss.shieldHp>0;
      boss.shield.material.color.setHex(0x9d99ff);boss.shield.material.opacity=.35;
      if(boss.jumpCount===1)fireBossOrb();else splitBossOrbs();
      updateHud();
      if(distance<=NOVA.radius*1.5)hurtPlayer(3);
    }
  }else if(boss.state==='shield'){
    boss.g.position.y=0;
    if(boss.timer<=1e-8)startBossJump();
  }
}

function refreshBar(m){
  const r = Math.max(0,m.hp/m.maxHp);
  m.fg.scale.x = r;
  m.fgMat.color.setHex(r>.6?0x6ee06e:r>.3?0xf5c542:0xf2544a);
}

// ── 玩家子弹的距离衰减 ──────────────────────────────────────────────────
// 出膛 3.5 单位内是满伤害 1.0，飞行到 20 单位时降到 0.4，再远保持 0.4 不再变。
// 中间线性插值，所以伤害是浮点数，怪物血量也按浮点扣。
const FALLOFF = { near:3.5, far:20, min:.4 };
function falloffAt(dist){
  if(dist<=FALLOFF.near) return 1;
  const t=Math.min(1,(dist-FALLOFF.near)/(FALLOFF.far-FALLOFF.near));
  return 1-(1-FALLOFF.min)*t;
}
const HOT_COLOR  = new THREE.Color(0x35d6ff); // 满伤：青蓝
const COLD_COLOR = new THREE.Color(0x1b5f80); // 衰减到底：暗蓝

// ── 伤害飘字（把浮点伤害显示出来，否则玩家感觉不到衰减）─────────────────
const dmgPool=[];let dmgCursor=0;
function makeDmgSprite(){
  const cv=document.createElement('canvas');cv.width=128;cv.height=64;
  const tex=new THREE.CanvasTexture(cv);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false}));
  sp.scale.set(1.5,.75,1);sp.visible=false;scene.add(sp);
  return {sp,cv,ctx:cv.getContext('2d'),tex,life:0,max:1};
}
for(let i=0;i<14;i++)dmgPool.push(makeDmgSprite());
function popDamage(x,y,z,value,k){
  const d=dmgPool[dmgCursor=(dmgCursor+1)%dmgPool.length],ctx=d.ctx;
  ctx.clearRect(0,0,128,64);
  ctx.font='bold 38px system-ui,-apple-system,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=7;ctx.strokeStyle='rgba(0,0,0,.6)';
  ctx.strokeText(value,64,34);
  ctx.fillStyle=k>.85?'#a8f4ff':k>.68?'#ffd93d':k>.52?'#ffa14a':'#ff6b4a'; // 满伤青白 → 中距离黄 → 远距离橙红
  ctx.fillText(value,64,34);
  d.tex.needsUpdate=true;
  d.sp.position.set(x,y,z);d.sp.material.opacity=1;
  d.sp.scale.set(1.5,.75,1);d.sp.visible=true;
  d.life=.8;d.max=.8;
}
function updateDmgLabels(dt){
  for(const d of dmgPool){
    if(d.life<=0)continue;
    d.life-=dt;
    if(d.life<=0){d.sp.visible=false;continue;}
    const p=1-d.life/d.max;
    d.sp.position.y+=dt*1.2;
    d.sp.material.opacity=1-p*p;
    const s=1+p*.55;
    d.sp.scale.set(1.5*s,.75*s,1);
  }
}
function clearDmgLabels(){for(const d of dmgPool){d.life=0;d.sp.visible=false;}}

// ── 子弹池 ──────────────────────────────────────────────────────────────
const bulletGeo = new THREE.SphereGeometry(.14,10,8);
const playerBulletMat = new THREE.MeshBasicMaterial({color:0x35d6ff}); // 玩家：青蓝
const orbBulletMat = new THREE.MeshBasicMaterial({color:0xd8c4ff});
const enemyBulletMat  = new THREE.MeshBasicMaterial({color:0xff4d4d}); // 射手：红
const barrageBulletMat= new THREE.MeshBasicMaterial({color:0xff2d95}); // 弹幕：洋红
const bullets = [], enemyBullets = [];

function spawnBullet(from,dir,speed,material,list,life,dmg,decay=false){
  // 需要衰减的子弹（玩家子弹）必须用独立材质，否则所有子弹会一起变色
  const mat = decay ? material.clone() : material;
  const mesh = new THREE.Mesh(bulletGeo,mat);
  mesh.position.copy(from);
  mesh.scale.set(1,1,2.4);            // 沿飞行方向拉长，像道能量条
  mesh.lookAt(from.clone().add(dir));
  scene.add(mesh);
  list.push({mesh,mat,vel:dir.clone().multiplyScalar(speed),life,dmg,decay,
    baseDmg:dmg,origin:from.clone()});
}
function clearBullets(){
  for(const b of bullets){scene.remove(b.mesh);if(b.decay)b.mat.dispose();}
  for(const b of enemyBullets) scene.remove(b.mesh);
  bullets.length = 0; enemyBullets.length = 0;
}

// ── 激光 ────────────────────────────────────────────────────────────────
// 蓄力 1.2s：一条闪烁的红色半透明光带标出弹道（此时可躲）
// 开火 0.34s：光带变粗变亮，扫到玩家扣 2 滴血
const LASER = { charge:1.2, fire:.34, range:26, cooldown:2.6, halfWidth:.85, trigger:12 };

function startLaser(m){
  const from = new THREE.Vector3(m.g.position.x,.95,m.g.position.z);
  const dir = new THREE.Vector3(player.position.x-from.x,0,player.position.z-from.z);
  if(dir.lengthSq()<1e-4) dir.set(0,0,1);
  dir.normalize();
  const lm = new THREE.MeshBasicMaterial({color:0xff2b2b,transparent:true,opacity:.28,depthWrite:false});
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(.3,.3,1),lm);
  mesh.position.copy(from).addScaledVector(dir,LASER.range/2);
  mesh.lookAt(mesh.position.clone().addScaledVector(dir,1)); // +Z 指向射击方向
  mesh.scale.z = LASER.range;
  scene.add(mesh);
  m.laserState='charge';m.laserTimer=LASER.charge;m.laserHit=false;
  m.laserMesh=mesh;m.laserMat=lm;m.laserFrom=from;m.laserDir=dir;
  tone(300,.12);
}
function fireLaser(m){
  m.laserState='fire';m.laserTimer=LASER.fire;m.laserHit=false;
  m.laserMat.color.setHex(0xff5a5a);m.laserMat.opacity=.92;
  m.laserMesh.scale.x=1.9;m.laserMesh.scale.y=1.9;
  tone(110,.3);
}
function clearLaser(m){
  if(m.laserMesh){
    scene.remove(m.laserMesh);
    m.laserMesh.geometry.dispose();m.laserMat.dispose();
    m.laserMesh=null;m.laserMat=null;
  }
  m.laserState='idle';m.laserHit=false;
}
function endLaser(m){ clearLaser(m); m.laserCD=LASER.cooldown; }
function playerOnBeam(m){
  if(!m.laserFrom||!m.laserDir) return false;
  const px=player.position.x-m.laserFrom.x,pz=player.position.z-m.laserFrom.z;
  const t=px*m.laserDir.x+pz*m.laserDir.z;
  if(t<0||t>LASER.range) return false;
  return Math.abs(px*m.laserDir.z-pz*m.laserDir.x)<LASER.halfWidth;
}

// ── 弹幕 ────────────────────────────────────────────────────────────────
// 蓄力 0.55s（核心膨胀闪烁 = 预警）→ 朝玩家所在方向扇形撒出 10 颗，单颗 1 点伤害
const BARRAGE = { charge:.55, count:10, spread:Math.PI*.42, speed:6.5, cooldown:2.2, trigger:14 };

function fireBarrage(m){
  const from = new THREE.Vector3(m.g.position.x,.9,m.g.position.z);
  const base = Math.atan2(player.position.x-from.x, player.position.z-from.z);
  for(let i=0;i<BARRAGE.count;i++){
    const a = base + (i/(BARRAGE.count-1)-.5)*BARRAGE.spread;
    spawnBullet(from,new THREE.Vector3(Math.sin(a),0,Math.cos(a)),BARRAGE.speed,barrageBulletMat,enemyBullets,4.5,1);
  }
  tone(140,.35);
}

// ── 光圈 ────────────────────────────────────────────────────────────────
// 蓄力 1.0s：玩家脚下出现金色圆盘 + 闪烁边框，标出即将爆发的范围（可跑出去）
// 爆发 0.22s：圆盘变红，范围内的玩家扣 2 滴血
const NOVA = { charge:1.0, burst:.22, radius:2.1, cooldown:3.2, trigger:13, damage:2 };

function startNova(m){
  const at = player.position.clone(); at.y = .04;   // 锁定释放瞬间玩家所在的位置
  const group = new THREE.Group();
  group.position.copy(at);
  group.rotation.x = -Math.PI/2;                    // 圆盘平铺到地面

  const fillMat = new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.12,depthWrite:false});
  const ringMat = new THREE.MeshBasicMaterial({color:0xffc93c,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide});

  group.add(new THREE.Mesh(new THREE.CircleGeometry(NOVA.radius,40),fillMat));
  group.add(new THREE.Mesh(new THREE.RingGeometry(NOVA.radius,NOVA.radius+.3,40),ringMat));
  scene.add(group);

  m.novaState='charge';m.novaTimer=NOVA.charge;m.novaHit=false;
  m.novaMesh=group;m.novaFill=fillMat;m.novaRing=ringMat;m.novaPos=at;
  tone(380,.12);
}
function burstNova(m){
  m.novaState='burst';m.novaTimer=NOVA.burst;m.novaHit=false;
  m.novaFill.color.setHex(0xff3b3b);m.novaFill.opacity=.5;
  m.novaRing.color.setHex(0xff5a5a);m.novaRing.opacity=1;
  tone(110,.32);
}
function clearNova(m){
  if(m.novaMesh){
    scene.remove(m.novaMesh);
    m.novaMesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    m.novaFill.dispose();m.novaRing.dispose();
    m.novaMesh=null;m.novaFill=null;m.novaRing=null;
  }
  m.novaState='idle';m.novaHit=false;m.novaPos=null;
}
function endNova(m){ clearNova(m); m.novaCD=NOVA.cooldown; }

const MAX_HP = 5;
const DASH = { distance:3, duration:.18, cooldown:8, maxCharges:2 };
const ATTACK_BOOST = { duration:6, multiplier:2, spread:Math.PI/15, cooldown:20 };
let dashCharges=1,dashTimer=0,dashRecharge=8,boostCooldown=0,boostTimer=0;
const dashDirection=new THREE.Vector3();
let healCharges=0,laserUnlocked=false,laserCharges=0,laserCooldown=0;
let mode='menu',hp=MAX_HP,kills=0,invuln=0,attackCooldown=0,attackFlash=0,demoTime=0,muted=false,audio=null;const keys=new Set();
function tone(freq=440,duration=.12){if(muted)return;try{audio ||= new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.09,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function updateHud(){$('newSkills').textContent=`Shift 冲刺：${dashCharges}/${DASH.maxCharges} 次 · ${dashCharges<DASH.maxCharges?`${Math.ceil(dashRecharge)} 秒恢复`:'已存满'} · R 强化普攻：${boostTimer>0?`强化中 ${Math.ceil(boostTimer)} 秒 · `:''}${boostCooldown>0?`冷却 ${Math.ceil(boostCooldown)} 秒`:'就绪'}`;$('skills').textContent=`Q 回血：${healCharges} 次 · E 激光：${!laserUnlocked?'Boss 战解锁':laserCharges===0?'次数已用完':`${laserCharges} 次 · ${laserCooldown>0?`冷却 ${Math.ceil(laserCooldown)} 秒`:'就绪'}`}`;$('health').textContent='❤️'.repeat(Math.max(0,hp))+'🤍'.repeat(Math.max(0,MAX_HP-hp));$('progress').textContent=boss.active?`👹 BOSS ${Math.ceil(Math.max(0,boss.hp))} / ${boss.maxHp}${boss.phaseTwo?` · 🛡 ${boss.shieldHp.toFixed(1)} / 35`:''}`:`👾 ${kills} / ${monsters.length}`;}
function reset(){dashCharges=1;dashTimer=0;dashRecharge=DASH.cooldown;boostCooldown=0;boostTimer=0;dashDirection.set(0,0,0);healCharges=0;laserUnlocked=false;laserCharges=0;laserCooldown=0;clearSkillEffects();boss.phaseTwo=false;boss.shieldHp=35;boss.jumpCount=0;boss.jumpFrom=null;boss.jumpTarget=null;boss.g.position.set(0,0,BOSS.z);boss.shield.material.color.setHex(0x9ad8ff);boss.shield.material.opacity=.18;player.position.set(0,0,10);player.rotation.y=Math.PI;hp=MAX_HP;kills=0;invuln=0;attackCooldown=0;attackFlash=0;demoTime=0;keys.clear();clearBullets();clearDmgLabels();clearBossBeams();clearBossNovas();clearHomings();monsters.forEach((m,i)=>{clearLaser(m);clearNova(m);m.alive=true;m.g.visible=true;m.g.position.set(monsterPositions[i][0],0,monsterPositions[i][1]);m.hp=m.maxHp;m.aiState='idle';m.chaseTimer=0;m.restTimer=0;m.hitFlash=0;m.fireTimer=.5+random()*.6;m.laserCD=1.2+random()*.8;m.laserTimer=0;m.hellState='idle';m.hellCD=1.5+random()*1.0;m.hellTimer=0;m.novaCD=1.8+random()*1.0;m.novaTimer=0;if(m.core)m.core.scale.setScalar(1);if(m.aura){m.aura.visible=true;m.aura.position.set(monsterPositions[i][0],.04,monsterPositions[i][1]);m.aura.material.opacity=.2;}if(m.healLines)for(const l of m.healLines)l.visible=false;m.bodyMat.emissiveIntensity=0;refreshBar(m);});boss.hp=boss.maxHp;boss.active=false;boss.alive=false;boss.dead=false;boss.state='dormant';boss.timer=0;boss.skill=null;boss.step=0;boss.lastSkill=null;boss.roar=0;boss.hitFlash=0;boss.shieldPulse=0;boss.g.visible=true;boss.g.rotation.y=0;boss.shield.visible=true;boss.shield.scale.setScalar(1);boss.bodyMat.color.setHex(0x4b5563);boss.bodyMat.emissiveIntensity=0;refreshBossBar();updateHud();}
function begin(isDemo){reset();demoIndex=-1;demoClipTime=0;demoEvents.clear();mode=isDemo?'demo':'play';$('overlay').hidden=true;$('demoLabel').hidden=!isDemo;tone(620,.2);}
function menu(title='奶娃的草原大冒险',message='守护阳光草原！操控奶娃用子弹打败 23 只捣蛋怪，再打碎门口的魔王！'){mode='menu';clearSkillEffects();clearBullets();clearDmgLabels();clearBossBeams();clearBossNovas();clearHomings();monsters.forEach(m=>{clearLaser(m);clearNova(m);});$('title').textContent=title;$('message').textContent=message;$('overlay').hidden=false;$('demoLabel').hidden=true;$('hint').textContent=DEFAULT_HINT;keys.clear();}

// ── 战斗 ────────────────────────────────────────────────────────────────
const PLAYER_CD = .26;
function nearestMonster(){
  let best=null,bd=Infinity;
  for(const m of monsters){
    if(!m.alive)continue;
    const d=m.g.position.distanceToSquared(player.position);
    if(d<bd){bd=d;best=m;}
  }
  // BOSS 苏醒后也进入自动瞄准的候选
  if(bossTargetable()){
    const d=boss.g.position.distanceToSquared(player.position);
    if(d<bd){bd=d;best=boss;}
  }
  return best;
}
// ── 移动攻击：锁定屏幕内的最近目标 ──────────────────────────────────────
// 站定：保持原来的"转向最近怪"，方便远程点射（不变）。
// 移动：只锁定镜头里能看见的最近目标，身体朝它、脚步方向不变 → 侧身跑/倒着跑也能打中。
// 屏幕里一个目标都没有时，就朝移动方向（原来的手感）。
const _projV = new THREE.Vector3();
function onScreen(t){
  // 用身体中心而不是脚底做投影，避免贴边的怪因为脚底出画而丢锁
  _projV.set(t.g.position.x, t.g.position.y+1.1, t.g.position.z).project(camera);
  return _projV.z>-1 && _projV.z<1 && Math.abs(_projV.x)<=1.02 && Math.abs(_projV.y)<=1.02;
}
function onScreenTarget(){
  let best=null,bd=Infinity;
  const consider=t=>{
    if(!onScreen(t))return;
    const d=t.g.position.distanceToSquared(player.position);
    if(d<bd){bd=d;best=t;}
  };
  for(const m of monsters)if(m.alive)consider(m);
  if(bossTargetable())consider(boss);
  return best;
}

// 锁定准星：脚下一对旋转弧 + 头顶倒三角，只标出"我现在在打谁"
const reticle = new THREE.Group(); reticle.visible=false; scene.add(reticle);
const reticleSpin = new THREE.Group(); reticle.add(reticleSpin);
const reticleMat = new THREE.MeshBasicMaterial({color:0x8ff0ff,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide});
const reticleArcGeo = new THREE.RingGeometry(.7,.79,44,1,0,Math.PI*.55);
const reticleArcA = new THREE.Mesh(reticleArcGeo,reticleMat);
reticleArcA.rotation.x=-Math.PI/2; reticleArcA.position.y=.06;
const reticleArcB = new THREE.Mesh(reticleArcGeo,reticleMat);
reticleArcB.rotation.set(-Math.PI/2,0,Math.PI); reticleArcB.position.y=.06;
reticleSpin.add(reticleArcA,reticleArcB);
const reticleTip = new THREE.Mesh(new THREE.ConeGeometry(.2,.46,4),reticleMat);
reticleTip.rotation.x=Math.PI; reticleTip.position.y=2.05; reticle.add(reticleTip);
let lockedAim = null;   // 当前锁定的目标（供调试查看）
function updateReticle(t){
  if(t&&t.alive===false)t=null;
  lockedAim=t;
  reticle.visible=!!t&&mode==='play';
  if(!t)return;
  reticle.position.set(t.g.position.x,0,t.g.position.z);
  reticle.scale.setScalar(t.g.scale.x);          // 准星跟着目标体型放大
  reticleSpin.rotation.y=elapsed*1.15;
  reticleTip.position.y=2.05+.12*Math.sin(elapsed*4);
  reticleMat.opacity=.62+.22*Math.abs(Math.sin(elapsed*3));
}

// 找离某只怪最近的回血怪（退避时的目的地）
function nearestHealer(m){
  let best=null,bd=Infinity;
  for(const o of monsters){
    if(o===m||o.kind!=='healer'||!o.alive)continue;
    const d=o.g.position.distanceToSquared(m.g.position);
    if(d<bd){bd=d;best=o;}
  }
  return best;
}
function attack(){
  if(attackCooldown>0)return;
  attackCooldown=PLAYER_CD;attackFlash=.1;
  const dir=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
  const from=new THREE.Vector3(player.position.x,player.position.y+1*PLAYER_SCALE,player.position.z).addScaledVector(dir,.8*PLAYER_SCALE);
  const boosted=boostTimer>0;
  const offsets=boosted?[-ATTACK_BOOST.spread,0,ATTACK_BOOST.spread]:[0];
  const right=new THREE.Vector3(Math.cos(player.rotation.y),0,-Math.sin(player.rotation.y));
  for(let i=0;i<offsets.length;i++){
    const angle=player.rotation.y+offsets[i];
    const shotDir=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    // 三颗子弹横向并排出膛，左右两颗分别向外偏转 12 度，形成扇形。
    const shotFrom=from.clone().addScaledVector(right,boosted?(i-1)*.22:0);
    spawnBullet(shotFrom,shotDir,20,playerBulletMat,bullets,1.4,boosted?ATTACK_BOOST.multiplier:1,true);
  }
  tone(680,.06);
}
function updateDashRecharge(dt){
  if(dashCharges>=DASH.maxCharges)return;
  dashRecharge=Math.max(0,dashRecharge-dt);
  if(dashRecharge<=1e-8){
    dashCharges++;
    dashRecharge=dashCharges<DASH.maxCharges?DASH.cooldown:0;
  }
  updateHud();
}
function useDash(){
  if(mode!=='play'||dashCharges<=0||dashTimer>0)return;
  let dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  let dz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
  if(Math.hypot(dx,dz)<.01){dx=Math.sin(player.rotation.y);dz=Math.cos(player.rotation.y);}
  dashDirection.set(dx,0,dz).normalize();
  if(dashCharges===DASH.maxCharges)dashRecharge=DASH.cooldown;
  dashCharges--;dashTimer=DASH.duration;
  effect(glowRing(player.position,.7,0x8ceeff),DASH.duration);
  tone(960,.12);updateHud();
}
function useAttackBoost(){
  if(mode!=='play'||boostCooldown>0)return;
  boostTimer=ATTACK_BOOST.duration;
  boostCooldown=ATTACK_BOOST.cooldown;
  effect(glowRing(player.position,1.1,0x8ceeff),.4);
  tone(420,.2);updateHud();
}
function useHeal(){
  if((mode!=='play'&&mode!=='demo')||healCharges<=0||hp>=MAX_HP)return;
  healCharges--;hp=Math.min(MAX_HP,hp+1);
  effect(glowRing(player.position,1.1,0x70ffbc),.5);
  tone(660,.18);tone(990,.3);updateHud();
}
function usePlayerLaser(){
  if((mode!=='play'&&mode!=='demo')||!laserUnlocked||laserCharges<=0||laserCooldown>0||!bossTargetable())return;
  laserCharges--;laserCooldown=15;
  const dx=boss.g.position.x-player.position.x,dz=boss.g.position.z-player.position.z;
  const distance=Math.hypot(dx,dz),dir=new THREE.Vector3(dx,0,dz);
  if(distance<1e-4)dir.set(0,0,1);else dir.divideScalar(distance);
  // 与普攻一致：从枪口出发，命中 Boss 碰撞边缘时按飞行距离衰减。
  const from=new THREE.Vector3(player.position.x,PLAYER_SCALE,player.position.z).addScaledVector(dir,.8*PLAYER_SCALE);
  const travel=Math.max(0,distance-.8*PLAYER_SCALE-1.65),k=falloffAt(travel);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,Math.max(.1,distance)),new THREE.MeshBasicMaterial({color:0x91f5ff,transparent:true,opacity:1,depthWrite:false}));
  beam.position.set((from.x+boss.g.position.x)/2,1,(from.z+boss.g.position.z)/2);
  beam.lookAt(boss.g.position.x,1,boss.g.position.z);effect(beam,.3);
  const dealt=hitBoss(4*k);
  if(dealt>0)popDamage(boss.g.position.x,3,boss.g.position.z,dealt.toFixed(1),k);
  tone(1200,.16);tone(460,.35);updateHud();
}
function enemyShoot(m){
  const from=new THREE.Vector3(m.g.position.x,.75,m.g.position.z);
  const dir=new THREE.Vector3(player.position.x,.75,player.position.z).sub(from).normalize();
  spawnBullet(from,dir,8,enemyBulletMat,enemyBullets,3,1);
  tone(180,.09);
}
function damage(m,dmg){
  m.hp-=dmg;m.hitFlash=.16;
  if(m.hp<=1e-6)killMonster(m);   // 浮点误差兜底
  else{refreshBar(m);tone(320,.05);}
}
function killMonster(m){
  if(!m.alive)return;
  if(m.kind==='healer')healCharges++;
  m.alive=false;m.g.visible=false;if(m.aura)m.aura.visible=false;if(m.healLines)for(const l of m.healLines)l.visible=false;kills++;clearLaser(m);clearNova(m);tone(760,.16);
  // 冲刺充能与原有回血独立结算，满血时也能获得次数。
  dashCharges=Math.min(DASH.maxCharges,dashCharges+1);
  if(dashCharges===DASH.maxCharges)dashRecharge=0;
  // 每清掉 3 只怪回复 1 点血（不超过上限）
  if(kills%3===0&&hp<MAX_HP){hp=Math.min(MAX_HP,hp+1);tone(900,.2);}
  updateHud();
  // 场上杂兵清空 → 门口的魔王苏醒
  if(kills===monsters.length)activateBoss();
}
function hurtPlayer(amount=1){
  if(mode!=='play'||invuln>0||dashTimer>0)return;   // 无敌帧内不再叠加伤害，避免被弹幕/光圈连续秒掉
  hp=Math.max(0,hp-amount);invuln=1.5;tone(160,.3);updateHud();
  if(hp<=0)menu('再试一次吧！','奶娃需要休息一下，重新出发守护草原吧。');
}

function updateBullets(dt){
  // 子弹速度较高，低帧率下单帧位移可能超过判定半径 → 拆成子步逐段检测，避免穿透
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    const move=b.vel.clone().multiplyScalar(dt);
    const steps=Math.max(1,Math.ceil(move.length()/.3));
    const step=move.divideScalar(steps);
    b.life-=dt;
    let gone=b.life<=0;
    let k=1;
    for(let s=0;s<steps&&!gone;s++){
      b.mesh.position.add(step);
      // 每前进一个子步就按已飞距离重算伤害，命中瞬间用的就是这一刻的浮点值
      if(b.decay){
        k=falloffAt(Math.hypot(b.mesh.position.x-b.origin.x,b.mesh.position.z-b.origin.z));
        b.dmg=b.baseDmg*k;
      }
      if(Math.abs(b.mesh.position.x)>24||Math.abs(b.mesh.position.z)>24){gone=true;break;}
      for(const m of monsters){
        if(!m.alive)continue;
        const dx=b.mesh.position.x-m.g.position.x,dz=b.mesh.position.z-m.g.position.z;
        if(dx*dx+dz*dz<.85*.85){
          damage(m,b.dmg);
          if(b.decay)popDamage(m.g.position.x,1.95,m.g.position.z,b.dmg.toFixed(1),k);
          gone=true;break;
        }
      }
      // BOSS：苏醒前有护盾，子弹被弹开；苏醒后才吃伤害
      if(!gone&&!boss.dead){
        const bx=b.mesh.position.x-boss.g.position.x,bz=b.mesh.position.z-boss.g.position.z;
        const bd2=bx*bx+bz*bz;
        if(boss.active){
          if(bossTargetable()&&bd2<1.65*1.65){
            const dealt=hitBoss(b.dmg);
            if(b.decay)popDamage(boss.g.position.x,3.0,boss.g.position.z,dealt.toFixed(1),k);
            gone=true;
          }
        }else if(bd2<2.6*2.6){
          boss.shieldPulse=.26;tone(120,.05);gone=true;
        }
      }
      // 追踪弹熄火后可以被击落（浮点累伤，打满 3 点）
      if(!gone){
        for(let j=homings.length-1;j>=0;j--){
          const h=homings[j];
          if(!h.vulnerable)continue;
          const dx=b.mesh.position.x-h.mesh.position.x,dz=b.mesh.position.z-h.mesh.position.z;
          if(dx*dx+dz*dz<.87*.87){
            h.hp-=b.dmg;h.flash=.18;
            const r=Math.max(0,h.hp/BOSS.homing.hp);
            h.mat.color.setHex(r>.66?0xff8a00:r>.33?0xffc400:0xffe98a);
            if(b.decay)popDamage(h.mesh.position.x,1.5,h.mesh.position.z,b.dmg.toFixed(1),k);
            gone=true;tone(520,.06);
            if(h.hp<=1e-6)destroyHoming(j);
            break;
          }
        }
      }
    }
    // 视觉：飞得越远越暗、能量条越短，和伤害衰减对应
    if(!gone&&b.decay){
      b.mat.color.copy(HOT_COLOR).lerp(COLD_COLOR,1-k);
      const w=.7+.3*k;
      b.mesh.scale.set(w,w,1.8+.6*k);
    }
    if(gone){scene.remove(b.mesh);if(b.decay)b.mat.dispose();bullets.splice(i,1);}
  }
  for(let i=enemyBullets.length-1;i>=0;i--){
    const b=enemyBullets[i];
    const move=b.vel.clone().multiplyScalar(dt);
    const steps=Math.max(1,Math.ceil(move.length()/.3));
    const step=move.divideScalar(steps);
    b.life-=dt;
    let gone=b.life<=0;
    for(let s=0;s<steps&&!gone;s++){
      b.mesh.position.add(step);
      if(b.surround&&(Math.abs(b.mesh.position.x)>21||Math.abs(b.mesh.position.z)>21)){
        // 越界位移原路退回，再反转整条速度向量，沿原直线往返。
        b.mesh.position.sub(step);b.vel.negate();step.negate();b.mesh.position.add(step);
        b.mesh.position.x=THREE.MathUtils.clamp(b.mesh.position.x,-21,21);
        b.mesh.position.z=THREE.MathUtils.clamp(b.mesh.position.z,-21,21);
      }
      if(!b.surround&&(Math.abs(b.mesh.position.x)>24||Math.abs(b.mesh.position.z)>24)){gone=true;break;}
      const dx=b.mesh.position.x-player.position.x,dz=b.mesh.position.z-player.position.z;
      if(dx*dx+dz*dz<(.45+(b.radius||0))**2){hurtPlayer(b.dmg);gone=true;}
    }
    if(gone){scene.remove(b.mesh);enemyBullets.splice(i,1);}
  }
}

function turnTo(target,rate,dt){
  let d=target-player.rotation.y;
  d=Math.atan2(Math.sin(d),Math.cos(d));
  player.rotation.y+=d*Math.min(1,rate*dt);
}

// ── Watch Demo：固定镜头章节；复用真实攻击、护盾、Q/E 与碰撞逻辑 ──────
const DEFAULT_HINT='WASD / 方向键移动 · 按住空格连射（跑动时自动锁定屏幕内最近的怪）· Shift 无敌冲刺 · R 强化普攻 · Esc 返回菜单';
const DEMO_CLIPS=[
  {kind:'grunt',duration:2.5,text:'粉怪：靠近后追击并贴身撞击（1 血），保持距离。'},
  {kind:'shooter',duration:3,text:'橙怪：每秒发射红色子弹（1 血），横向移动躲避。'},
  {kind:'laser',duration:3,text:'紫怪：红线预警 1.2 秒后射出激光（2 血），离开红线。'},
  {kind:'bullethell',duration:3,text:'蓝怪：核心膨胀后发射扇形弹幕，穿过两侧空隙。'},
  {kind:'nova',duration:3,text:'黄怪：锁定脚下金圈，1 秒后爆发（2 血），跑出圆圈。'},
  {kind:'healer',duration:6,text:'绿怪：绿色光束治疗附近怪物；击杀后获得 1 次 Q 治疗。'},
  {kind:'dormant',duration:2.5,text:'Boss 休眠防御：蓝色护盾无敌，必须先清空所有小怪。'},
  {kind:'barrage',duration:4,text:'Boss 一阶段：三段扇形弹幕，侧向走位躲避。'},
  {kind:'laserWall',duration:4,text:'Boss 一阶段：六道激光走廊，红线蓄力后爆发，站进空隙。'},
  {kind:'novaArray',duration:4,text:'Boss 一阶段：八个光圈阵，避开地面预警区域。'},
  {kind:'homing',duration:5,text:'Boss 一阶段：巨球追踪 3 秒，变橙后可用普攻击落。'},
  {kind:'laserSkill',duration:3,text:'E 激光：Boss 战解锁；同距离普攻 4 倍伤害，3 次，冷却 15 秒。'},
  {kind:'phaseTwo',duration:32,text:'Boss 二阶段测试：演示快进至半血，跳砸、有限护盾与分裂光球。'},
];
let demoIndex=-1,demoClipTime=0,demoActor=null;
const demoEvents=new Set();
function demoOnce(key,at,action){
  if(demoClipTime>=at&&!demoEvents.has(key)){demoEvents.add(key);action();}
}
function clearDemoStage(){
  clearBullets();clearBossBeams();clearBossNovas();clearHomings();clearSkillEffects();
  for(const m of monsters){
    clearLaser(m);clearNova(m);m.alive=false;m.g.visible=false;
    if(m.aura)m.aura.visible=false;if(m.healLines)for(const l of m.healLines)l.visible=false;
  }
  demoActor=null;
}
function showDemoMonster(kind,x=0,z=-3){
  const m=monsters.find(o=>o.kind===kind);
  m.alive=true;m.g.visible=true;m.g.position.set(x,0,z);m.hp=m.maxHp;
  m.aiState='chase';m.chaseTimer=100;m.restTimer=0;m.fireTimer=.25;
  m.laserCD=.25;m.hellCD=.25;m.novaCD=.25;refreshBar(m);
  if(m.aura){m.aura.visible=true;m.aura.position.set(x,.04,z);}
  return m;
}
function enterDemoClip(clip){
  $('hint').textContent=clip.text;
  clearDemoStage();player.position.set(0,0,3);player.rotation.y=Math.PI;
  boss.g.visible=false;boss.active=false;
  if(KINDS[clip.kind]){
    demoActor=showDemoMonster(clip.kind);
    if(clip.kind==='grunt')player.position.z=-1;
    if(clip.kind==='healer'){
      showDemoMonster('grunt',3,-3).hp=1;hp=3;updateHud();
    }
  }else{
    boss.g.visible=true;boss.g.position.set(0,0,BOSS.z);player.position.set(0,0,BOSS.z+7);
    if(clip.kind==='dormant'){
      boss.state='dormant';boss.shield.visible=true;
    }else if(clip.kind==='phaseTwo'){
      // 教学镜头明确跳过剩余血量，不修改正式游戏数值。
      boss.active=true;boss.alive=true;boss.hp=boss.maxHp/2;refreshBossBar();
      startBossPhaseTwo();
    }else{
      activateBoss();boss.timer=999;
      if(clip.kind==='laserWall')bossStartCast('laser');
      else if(clip.kind==='novaArray')bossStartCast('nova');
      else if(clip.kind!=='laserSkill')bossStartCast(clip.kind);
    }
  }
  camera.position.set(player.position.x,9,player.position.z+11);
  camera.lookAt(player.position.x,.85,player.position.z-2);updateHud();
}
function updateDemo(dt){
  demoTime+=dt;demoClipTime+=dt;
  if(demoIndex<0||demoClipTime>=DEMO_CLIPS[demoIndex].duration){
    demoIndex++;demoClipTime=0;demoEvents.clear();
    if(demoIndex>=DEMO_CLIPS.length){
      menu('演示结束','已展示各类小怪、Q 治疗、Boss 两阶段与护盾破除、E 激光。现在轮到你守护草原！');
      return {x:0,z:0};
    }
    enterDemoClip(DEMO_CLIPS[demoIndex]);
  }
  const clip=DEMO_CLIPS[demoIndex],t=demoClipTime;
  $('demoCaption').textContent=`${demoIndex+1} / ${DEMO_CLIPS.length} · ${clip.text}`;
  let x=0,z=0;
  if(clip.kind==='healer'){
    if(t>1&&demoActor.alive){player.rotation.y=Math.PI;attack();}
    demoOnce('q',4.8,()=>{if(healCharges>0){useHeal();$('hint').textContent='Q 已使用：消耗绿怪奖励 1 次，回复 1 血；无冷却，可保留至 Boss 战。';}});
  }else if(KINDS[clip.kind]){
    if(t>1.05&&t<1.8)x=1;
  }else if(clip.kind==='dormant'){
    player.rotation.y=Math.PI;attack();
  }else if(clip.kind==='phaseTwo'){
    if(boss.dead){$('hint').textContent='破盾后恢复全伤害，Boss 已被击败；演示即将结束。';}
    else if(boss.state==='jump'){
      // 沿远离落点方向跑出圆圈；空中不射击、不消耗 E。
      x=player.position.x-boss.jumpTarget.x;z=player.position.z-boss.jumpTarget.z;
      if(Math.hypot(x,z)<.1)x=player.position.x>0?-1:1;
      if(Math.hypot(player.position.x-boss.jumpTarget.x,player.position.z-boss.jumpTarget.z)>4){x=0;z=0;}
      $('hint').textContent='跳砸预警 1.5 秒：空中不可选中，离开紫圈；被砸中扣 3 血。';
    }else{
      // 围绕 Boss 侧移，避免站在首次合围中心把所有光球直接吃掉。
      const orbit=t*.7;
      x=THREE.MathUtils.clamp(boss.g.position.x+Math.cos(orbit)*6,-18,18)-player.position.x;
      z=THREE.MathUtils.clamp(boss.g.position.z+Math.sin(orbit)*6,-18,18)-player.position.z;
      player.rotation.y=Math.atan2(boss.g.position.x-player.position.x,boss.g.position.z-player.position.z);
      attack();
      if(laserCooldown<=0){
        demoOnce('shieldE',2,()=>usePlayerLaser());
        if(laserCooldown<=0)demoOnce('secondE',18,()=>usePlayerLaser());
      }
      const count=enemyBullets.filter(b=>b.surround).length;
      $('hint').textContent=boss.shieldHp>0?`护盾 ${boss.shieldHp.toFixed(1)} / 35：原伤扣盾，本体只承受 25%；E 与普攻正在破盾。光球 ${count} 颗。`:`护盾已破：不再恢复，普攻 / E 恢复原伤害。光球 ${count} 颗，落地四分裂，上限 256，反弹且不超时。`;
    }
  }else if(clip.kind==='laserSkill'){
    demoOnce('e',.5,()=>usePlayerLaser());
  }else if(clip.kind==='homing'){
    if(t<3){x=Math.cos(t*2);z=Math.sin(t*2);}
    else if(homings.length){
      const h=homings[0];player.rotation.y=Math.atan2(h.mesh.position.x-player.position.x,h.mesh.position.z-player.position.z);attack();
    }
    boss.timer=999;
  }else{
    if(t>.7&&t<1.5)x=1;
    if(boss.state==='idle')boss.timer=999;
  }
  return {x,z};
}

window.gameReady=true;
$('start').onclick=()=>begin(false);$('demo').onclick=()=>begin(true);$('exitDemo').onclick=()=>menu();$('mute').onclick=()=>{muted=!muted;$('mute').textContent=muted?'🔇 音效关':'🔊 音效开';if(!muted)tone(540);};
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat&&(e.code==='ShiftLeft'||e.code==='ShiftRight')&&mode==='play'){e.preventDefault();useDash();}if(!e.repeat&&e.code==='KeyR'&&mode==='play')useAttackBoost();if(!e.repeat&&e.code==='KeyQ'&&mode==='play')useHeal();if(!e.repeat&&e.code==='KeyE'&&mode==='play')usePlayerLaser();if(e.code==='Space'&&mode==='play')attack();if(e.code==='Escape'&&mode!=='menu')menu();});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
camera.position.set(0,9,21);camera.lookAt(0,.85,8);
reset();

const clock=new THREE.Clock();let elapsed=0;
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;attackCooldown=Math.max(0,attackCooldown-dt);attackFlash=Math.max(0,attackFlash-dt);invuln=Math.max(0,invuln-dt);
 if(mode==='play'||mode==='demo'){
  updateDashRecharge(dt);
  if(boostCooldown>0||boostTimer>0){
    boostCooldown=Math.max(0,boostCooldown-dt);
    boostTimer=Math.max(0,boostTimer-dt);
    updateHud();
  }
  if(laserCooldown>0){laserCooldown=Math.max(0,laserCooldown-dt);updateHud();}
  updateSkillEffects(dt);
  let dx=0,dz=0;
  if(mode==='play'){
    dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    dz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    if(keys.has('Space'))attack();   // 按住空格连射：配合下面的锁定，可以边跑边打
  }else{
    const movement=updateDemo(dt);dx=movement.x;dz=movement.z;
  }
  const len=Math.hypot(dx,dz);
  let aim=null;
  if(dashTimer>0){
    const step=Math.min(dt,dashTimer)*DASH.distance/DASH.duration;
    player.position.x=THREE.MathUtils.clamp(player.position.x+dashDirection.x*step,-21,21);
    player.position.z=THREE.MathUtils.clamp(player.position.z+dashDirection.z*step,-21,21);
    player.rotation.y=Math.atan2(dashDirection.x,dashDirection.z);
    // 本帧所有伤害结算完毕后再扣冲刺时间，保证最后一段位移仍无敌。
    aim=mode==='play'?onScreenTarget():null;
  }else if(len>.01){
    dx/=len;dz/=len;
    player.position.x=THREE.MathUtils.clamp(player.position.x+dx*PLAYER_SPEED*dt,-21,21);
    player.position.z=THREE.MathUtils.clamp(player.position.z+dz*PLAYER_SPEED*dt,-21,21);
    // 移动攻击：身体锁定屏幕内最近的怪，脚步照旧走 dx/dz，形成侧身/倒走射击
    aim=mode==='play'?onScreenTarget():null;
    if(aim)turnTo(Math.atan2(aim.g.position.x-player.position.x,aim.g.position.z-player.position.z),16,dt);
    else turnTo(Math.atan2(dx,dz),14,dt);
  }else{
    // 站桩时自动朝最近的怪，远程点射不会打偏
    const t=nearestMonster();
    aim=t;
    if(t)turnTo(Math.atan2(t.g.position.x-player.position.x,t.g.position.z-player.position.z),10,dt);
  }
  updateReticle(aim);

  for(const m of monsters){
    if(!m.alive)continue;
    const distance=m.g.position.distanceTo(player.position);
    m.g.position.y=Math.abs(Math.sin(elapsed*3+m.phase))*.16;
    if(m.hitFlash>0){m.hitFlash=Math.max(0,m.hitFlash-dt);m.bodyMat.emissiveIntensity=m.hitFlash/.16*.6;}
    if(m.halo)m.halo.rotation.y=elapsed*1.8;
    m.barGroup.quaternion.copy(camera.quaternion);

    if(mode==='play'||mode==='demo'){
      const vx=player.position.x-m.g.position.x,vz=player.position.z-m.g.position.z,l=Math.hypot(vx,vz)||1;

      // ── 行动状态机 ────────────────────────────────────────────────────
      // idle    ：原地不动，等玩家进入各自的警戒范围
      // chase   ：追 3 秒（各类型按自己的站位习惯走位）
      // retreat ：放弃追击，慢速退回最近回血怪的光圈里，进圈就停
      if(m.kind!=='healer'){
        // 正在施法（蓄力/开火/撒弹幕）时不推进计时，避免弹道起点随身体漂移
        const casting = m.laserState!=='idle'||m.hellState!=='idle'||m.novaState!=='idle';
        if(m.aiState==='idle'){
          if(m.restTimer>0)m.restTimer-=dt;
          else if(m.aggro>0&&distance<m.aggro){m.aiState='chase';m.chaseTimer=AGGRO.chaseTime;}
        }else if(m.aiState==='chase'){
          if(!casting){
            m.chaseTimer-=dt;
            if(m.chaseTimer<=0){m.aiState='retreat';m.chaseTimer=0;}
          }
        }else{
          const h=nearestHealer(m);
          // 没有回血怪，或者已经踏进治疗光圈 → 停下歇一会儿
          if(!h||h.g.position.distanceTo(m.g.position)<=HEAL.radius-.3){
            m.aiState='idle';m.restTimer=AGGRO.rest;
          }
        }
      }

      if(m.aiState==='chase'){
        if(m.kind==='shooter'){
          if(distance>7){m.g.position.x+=vx/l*1.15*dt;m.g.position.z+=vz/l*1.15*dt;}
          else if(distance<4.2){m.g.position.x-=vx/l*1.3*dt;m.g.position.z-=vz/l*1.3*dt;}
          m.fireTimer-=dt;
          if(distance<10&&m.fireTimer<=0){m.fireTimer=1;enemyShoot(m);}
        }else if(m.kind==='laser'){
          // 蓄力/开火期间钉在原地，避免弹道起点漂移
          if(m.laserState==='idle'){
            if(distance>9){m.g.position.x+=vx/l*1.1*dt;m.g.position.z+=vz/l*1.1*dt;}
            else if(distance<5.5){m.g.position.x-=vx/l*1.25*dt;m.g.position.z-=vz/l*1.25*dt;}
          }
        }else if(m.kind==='bullethell'){
          // 蓄力/撒弹幕期间钉在原地
          if(m.hellState==='idle'){
            if(distance>11){m.g.position.x+=vx/l*1.0*dt;m.g.position.z+=vz/l*1.0*dt;}
            else if(distance<7){m.g.position.x-=vx/l*1.1*dt;m.g.position.z-=vz/l*1.1*dt;}
          }
        }else if(m.kind==='nova'){
          // 投下光圈时站定，避免视觉上"边走边放"
          if(m.novaState==='idle'){
            if(distance>10){m.g.position.x+=vx/l*1.05*dt;m.g.position.z+=vz/l*1.05*dt;}
            else if(distance<6){m.g.position.x-=vx/l*1.15*dt;m.g.position.z-=vz/l*1.15*dt;}
          }
        }else if(m.kind!=='healer'&&distance<5&&distance>1){
          m.g.position.x+=vx/l*1.05*dt;m.g.position.z+=vz/l*1.05*dt;
        }
      }else if(m.aiState==='retreat'){
        // 慢慢走回最近的回血怪身边
        const h=nearestHealer(m);
        if(h){
          const hx=h.g.position.x-m.g.position.x,hz=h.g.position.z-m.g.position.z,hl=Math.hypot(hx,hz)||1;
          m.g.position.x+=hx/hl*AGGRO.retreatSpeed*dt;
          m.g.position.z+=hz/hl*AGGRO.retreatSpeed*dt;
        }
      }

      // 回血怪不参与状态机：永远原地给范围内的怪补血
      if(m.kind==='healer'){
        let working=false, lineN=0;
        for(const o of monsters){
          if(o===m||!o.alive||o.hp>=o.maxHp)continue;
          if(o.g.position.distanceToSquared(m.g.position)>HEAL.radius*HEAL.radius)continue;
          o.hp=Math.min(o.maxHp,o.hp+HEAL.rate*dt);
          refreshBar(o);working=true;
          if(m.healLines&&lineN<4){
            const geo=m.healLines[lineN].geometry, a=geo.attributes.position.array;
            a[0]=m.g.position.x;a[1]=.9;a[2]=m.g.position.z;
            a[3]=o.g.position.x;a[4]=.9;a[5]=o.g.position.z;
            geo.attributes.position.needsUpdate=true;
            m.healLines[lineN].visible=true;lineN++;
          }
        }
        if(m.healLines)for(let k=lineN;k<4;k++)m.healLines[k].visible=false;
        if(m.aura)m.aura.material.opacity=working?.3+.16*Math.abs(Math.sin(elapsed*5)):.2;
      }

      if(distance<.85&&invuln<=0)hurtPlayer(1);
      // 追击可能把怪推到场地外，软性夹回来
      m.g.position.x=THREE.MathUtils.clamp(m.g.position.x,-19.5,19.5);
      m.g.position.z=THREE.MathUtils.clamp(m.g.position.z,-19.5,19.5);
    }

    // 激光状态机（demo 里同样运行，便于展示；demo 中玩家不掉血）
    if(m.kind==='laser'){
      if(m.laserState==='idle'){
        m.laserCD-=dt;
        if(m.aiState==='chase'&&distance<LASER.trigger&&m.laserCD<=0)startLaser(m);
      }else if(m.laserState==='charge'){
        m.laserTimer-=dt;
        m.laserMat.opacity=.16+.42*Math.abs(Math.sin(elapsed*24)); // 闪烁 = 轨迹预警
        if(m.laserTimer<=0)fireLaser(m);
      }else{
        m.laserTimer-=dt;
        if(!m.laserHit&&playerOnBeam(m)){m.laserHit=true;hurtPlayer(2);}
        if(m.laserTimer<=0)endLaser(m);
      }
    }

    // 弹幕状态机：核心膨胀闪烁 0.55s 作为预警，然后一次性撒 10 颗
    if(m.kind==='bullethell'){
      if(m.hellState==='idle'){
        m.hellCD-=dt;
        if(m.aiState==='chase'&&distance<BARRAGE.trigger&&m.hellCD<=0){m.hellState='wind';m.hellTimer=BARRAGE.charge;tone(240,.1);}
      }else{
        m.hellTimer-=dt;
        const p=1-Math.max(0,m.hellTimer)/BARRAGE.charge;
        m.core.scale.setScalar(1+p*.9*Math.abs(Math.sin(elapsed*30)));
        if(m.hellTimer<=0){fireBarrage(m);m.core.scale.setScalar(1);m.hellState='idle';m.hellCD=BARRAGE.cooldown;}
      }
    }

    // 光圈状态机：脚下金色圆盘闪烁 1.0s 预警 → 变红爆发，范围判定
    if(m.kind==='nova'){
      if(m.novaState==='idle'){
        m.novaCD-=dt;
        if(m.aiState==='chase'&&distance<NOVA.trigger&&m.novaCD<=0)startNova(m);
      }else if(m.novaState==='charge'){
        m.novaTimer-=dt;
        const p=1-Math.max(0,m.novaTimer)/NOVA.charge;
        m.novaRing.opacity=.45+.4*Math.abs(Math.sin(elapsed*18));
        m.novaFill.opacity=.1+.32*p;               // 越接近爆发，内部越亮
        if(m.novaTimer<=0)burstNova(m);
      }else{
        m.novaTimer-=dt;
        if(!m.novaHit&&m.novaPos){
          const dx=player.position.x-m.novaPos.x,dz=player.position.z-m.novaPos.z;
          if(dx*dx+dz*dz<NOVA.radius*NOVA.radius){m.novaHit=true;hurtPlayer(NOVA.damage);}
        }
        if(m.novaTimer<=0)endNova(m);
      }
    }
  }

  updateBoss(dt);
  updateBossBeams(dt);
  updateBossNovas(dt);
  updateHomings(dt);
  updateBullets(dt);
  updateDmgLabels(dt);
  dashTimer=Math.max(0,dashTimer-dt);
 }
 if(mode!=='play')reticle.visible=false;   // 菜单/演示里不留准星
 player.scale.setScalar((attackFlash>0?1.13:1)*PLAYER_SCALE);player.visible=invuln<=0||Math.floor(invuln*10)%2===0;
 camera.position.lerp(new THREE.Vector3(player.position.x,player.position.y+9,player.position.z+11),.07);camera.lookAt(player.position.x,.85,player.position.z-2);renderer.render(scene,camera);
}frame();


