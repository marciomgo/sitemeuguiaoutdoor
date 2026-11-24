// BLOCO natalProps: marcadores 3D do tema Natal DESENHADOS POR CODIGO (sem arquivos de modelo). Gerado de imagens-cenas/props-natal-3d.html (o visualizador).
// Cada funcao devolve um THREE.Group de ~3 unidades (metros) de altura; quem usa escala. Se o grupo tiver userData.anima(t), chame-o a cada quadro.
import * as THREE from 'three';
const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.75,metalness:0,flatShading:true},o));
const G=(g,m,x=0,y=0,z=0)=>{const s=new THREE.Mesh(g,m);s.position.set(x,y,z);s.castShadow=true;s.receiveShadow=true;return s;};
const box=(w,h,d,m,x,y,z)=>G(new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cyl=(rt,rb,h,m,x,y,z,seg=12)=>G(new THREE.CylinderGeometry(rt,rb,h,seg),m,x,y,z);
const cone=(r,h,m,x,y,z,seg=14)=>G(new THREE.ConeGeometry(r,h,seg),m,x,y,z);
const sph=(r,m,x,y,z,sx=1,sy=1,sz=1)=>{const s=G(new THREE.SphereGeometry(r,18,14),m,x,y,z);s.scale.set(sx,sy,sz);return s;};

const NEVE=M(0xf4f9ff,{roughness:.9}), MADEIRA=M(0x9a6232), MADEIRA2=M(0x6d4423), TELHA=M(0xb3392d),
      VERDE=M(0x2f8f4e), VERDE2=M(0x25783f), OURO=M(0xf6c43a,{metalness:.5,roughness:.35}), VERM=M(0xd7263d,{roughness:.4}),
      BRILHO=c=>M(c,{emissive:c,emissiveIntensity:1.1,roughness:.3});

// ---------- CHALÉ (padaria, oficina, casa dos sinos, biblioteca) ----------
function chale(corTelha=0xb3392d, corPorta=0x6d4423){
  const g=new THREE.Group();
  g.add(box(3,1.8,2.6,MADEIRA,0,.9,0));
  for(let i=0;i<5;i++){ const t=cyl(.09,.09,3.1,MADEIRA2,0,.25+i*.36,1.3,8);t.rotation.z=Math.PI/2;g.add(t); } // toras frente
  // frontão (triângulos nas pontas)
  const sh=new THREE.Shape();sh.moveTo(-1.3,0);sh.lineTo(1.3,0);sh.lineTo(0,1.1);sh.closePath();
  const fr=G(new THREE.ExtrudeGeometry(sh,{depth:3,bevelEnabled:false}),MADEIRA);
  fr.rotation.y=Math.PI/2;fr.position.set(-1.5,1.8,0);g.add(fr);
  const ang=Math.atan2(1.1,1.3);
  for(const s of [-1,1]){
    const t=box(3.5,.16,1.75,M(corTelha),0,2.34,s*.65);t.rotation.x=s*ang;g.add(t);
    const n=box(3.55,.14,1.8,NEVE,0,2.46,s*.65);n.rotation.x=s*ang;n.position.y+=.0;g.add(n);
  }
  // porta, janelas luminosas
  g.add(box(.7,1.2,.1,M(corPorta),0,.6,1.33)); g.add(sph(.05,OURO,.22,.6,1.4));
  for(const x of [-1,1]){ g.add(box(.62,.62,.08,M(0x3b2a1a),x*.95,1.0,1.33)); g.add(box(.5,.5,.1,BRILHO(0xffc857),x*.95,1.0,1.34));
    g.add(box(.7,.06,.14,NEVE,x*.95,.66,1.36)); }
  // chaminé
  g.add(box(.5,1.1,.5,M(0x7a4a3a),.9,2.5,-.5)); g.add(box(.6,.12,.6,NEVE,.9,3.1,-.5));
  // guirlanda (coroa) na porta
  const co=G(new THREE.TorusGeometry(.2,.06,8,20),VERDE,0,1.55,1.36);g.add(co);
  g.add(sph(.05,VERM,.15,1.5,1.4),sph(.05,VERM,-.1,1.65,1.4),sph(.05,OURO,-.2,1.45,1.4));
  // luzinhas na beirada
  const cs=[0xff5252,0xffd54f,0x4fc3f7,0x69f0ae];
  for(let i=0;i<9;i++){ g.add(sph(.07,BRILHO(cs[i%4]),-1.6+i*.4,1.86,1.34)); }
  // degrau com neve
  g.add(box(1.1,.12,.5,NEVE,0,.06,1.65));
  return g;
}

// ---------- RENA ----------
function rena(){
  const g=new THREE.Group(), PEL=M(0xa86a3c), CLARO=M(0xe8c9a0);
  g.add(sph(.55,PEL,0,1.05,0,1.5,.95,.9));            // corpo
  g.add(sph(.32,CLARO,.45,.95,0,1.1,.9,.9));          // peito
  for(const [x,z] of [[.55,.22],[.55,-.22],[-.55,.22],[-.55,-.22]]){ g.add(cyl(.09,.07,.8,PEL,x,.45,z,8)); g.add(cyl(.1,.1,.12,M(0x3b2a1a),x,.06,z,8)); }
  const pesc=cyl(.17,.22,.7,PEL,.82,1.4,0,10);pesc.rotation.z=-.5;g.add(pesc);
  g.add(sph(.3,PEL,1.12,1.75,0,1.1,1,.95));            // cabeça
  g.add(sph(.2,CLARO,1.42,1.65,0,1.1,.9,.9));          // focinho
  g.add(sph(.11,BRILHO(0xff2d2d),1.6,1.68,0));         // nariz vermelho
  g.add(sph(.05,M(0x111111),1.35,1.84,.2),sph(.05,M(0x111111),1.35,1.84,-.2)); // olhos
  for(const s of [-1,1]){ const o=cone(.1,.28,PEL,1.0,1.98,s*.3,8);o.rotation.x=s*.9;g.add(o);
    // chifres
    const a=cyl(.03,.045,.6,M(0xe2cfa6),1.05,2.2,s*.2,6);a.rotation.x=s*.35;g.add(a);
    const b=cyl(.025,.035,.3,M(0xe2cfa6),1.15,2.4,s*.33,6);b.rotation.set(s*.7,0,-.5);g.add(b);
    const c=cyl(.025,.035,.28,M(0xe2cfa6),.95,2.35,s*.28,6);c.rotation.set(s*.6,0,.5);g.add(c); }
  g.add(sph(.12,NEVE,-.85,1.1,0));                       // rabinho
  const ca=G(new THREE.TorusGeometry(.26,.07,8,18),VERM,.78,1.45,0);ca.rotation.y=Math.PI/2;ca.rotation.z=-.5;g.add(ca); // cachecol
  g.add(sph(.07,OURO,.86,1.18,.17));
  g.scale.setScalar(1.1);
  return g;
}

// ---------- ÁRVORE DE NATAL (acesa/apagada) ----------
function estrelaGeo(R=.5,r=.22,esp=.18){
  const s=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rad=i%2?r:R;const x=Math.cos(a)*rad,y=Math.sin(a)*rad;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:esp,bevelEnabled:true,bevelSize:esp*.25,bevelThickness:esp*.25,bevelSegments:1});g.translate(0,0,-esp/2);return g;
}
function arvore(acesa=true){
  const g=new THREE.Group();
  g.add(cyl(.28,.34,.6,MADEIRA2,0,.3,0,10));
  [[1.5,1.5,.6],[1.2,1.3,1.5],[.9,1.15,2.3]].forEach(([r,h,y],i)=>{ g.add(cone(r,h,i%2?VERDE2:VERDE,0,y+h/2,0,12)); g.add(cone(r*.72,h*.32,NEVE,0,y+h*.82,0,12)); });
  const cores=[0xd7263d,0xf6c43a,0x2979ff,0xd7263d,0xf6c43a];
  for(let i=0;i<14;i++){ const a=i*2.4,h=.9+i*.18,r=Math.max(.2,1.45-(h-.6)*.52);
    g.add(sph(.1,M(cores[i%5],{metalness:.5,roughness:.3}),Math.cos(a)*r*.9,h,Math.sin(a)*r*.9)); }
  if(acesa){ const cs=[0xff5252,0xffd54f,0x4fc3f7,0x69f0ae];
    for(let i=0;i<22;i++){ const a=i*.9,h=.8+i*.12,r=Math.max(.15,1.5-(h-.6)*.52); g.add(sph(.06,BRILHO(cs[i%4]),Math.cos(a)*r,h,Math.sin(a)*r)); }
    const st=G(estrelaGeo(.42,.19),BRILHO(0xffd23f),0,3.65,0);g.add(st);g.userData.gira=st;
  }
  return g;
}

// ---------- LUZINHA-ESTRELA (item coletável) ----------
function luzinha(cor){
  const g=new THREE.Group();
  const st=G(estrelaGeo(.4,.18,.16),BRILHO(cor));st.position.y=.7;g.add(st);
  g.add(cyl(.09,.11,.2,M(0x2e4a37),0,.38,0,8));
  g.userData.gira=st;
  g.add(new THREE.PointLight(cor,.6,3).translateY(.7));
  return g;
}

// ---------- PRESENTE ----------
function presente(cor=0xd7263d,fita=0xffffff){
  const g=new THREE.Group();
  g.add(box(1.2,.9,1.2,M(cor,{roughness:.4}),0,.45,0));
  g.add(box(1.24,.92,.2,M(fita,{roughness:.4}),0,.45,0)); g.add(box(.2,.92,1.24,M(fita,{roughness:.4}),0,.45,0));
  g.add(box(1.3,.2,1.3,M(cor,{roughness:.4}),0,.95,0));
  g.add(box(1.34,.22,.2,M(fita),0,.95,0)); g.add(box(.2,.22,1.34,M(fita),0,.95,0));
  for(const s of [-1,1]){ const l=G(new THREE.TorusGeometry(.2,.06,8,16),M(fita),s*.22,1.2,0);l.rotation.y=Math.PI/2;l.rotation.x=.3*s;g.add(l); }
  g.add(sph(.1,M(fita),0,1.12,0));
  return g;
}

// ---------- PLACA DE LARGADA (com a palavra INÍCIO e bandeira quadriculada) ----------
function texturaTexto(txt, w, h, fundo, cor, seta){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.fillStyle=fundo;x.fillRect(0,0,w,h);
  x.strokeStyle='#4a2c12';x.lineWidth=14;x.strokeRect(7,7,w-14,h-14);
  x.fillStyle=cor;x.textAlign='center';x.textBaseline='middle';x.font='900 '+Math.round(h*0.42)+'px "Arial Black",Arial,sans-serif';
  x.lineWidth=10;x.strokeStyle='#3b1f0a';x.strokeText(txt,w/2-(seta?h*0.12:0),h*0.5);x.fillText(txt,w/2-(seta?h*0.12:0),h*0.5);
  if(seta){x.fillStyle='#3fd16a';x.strokeStyle='#145a2a';x.lineWidth=8;x.beginPath();x.moveTo(w-h*0.62,h*0.28);x.lineTo(w-h*0.18,h*0.5);x.lineTo(w-h*0.62,h*0.72);x.closePath();x.fill();x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function texturaXadrez(){
  const c=document.createElement('canvas');c.width=256;c.height=160;const x=c.getContext('2d');
  for(let i=0;i<8;i++)for(let j=0;j<5;j++){x.fillStyle=(i+j)%2?'#111':'#fff';x.fillRect(i*32,j*32,32,32);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function placaLargada(){
  const g=new THREE.Group();
  g.add(cyl(.1,.12,3.0,MADEIRA2,0,1.5,0,8));
  const tex=texturaTexto('INÍCIO',512,256,'#c98a4b','#ffffff',true);
  const mf=new THREE.MeshStandardMaterial({map:tex,roughness:.8}), mc=M(0x9a6232);
  const placa=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.2,.2),[mc,mc,mc,mc,mf,mf]);placa.position.set(0,1.9,0);placa.castShadow=true;g.add(placa);
  g.add(box(2.5,.12,.3,NEVE,0,2.55,0));
  // bandeira quadriculada de largada no topo do poste
  const bm=new THREE.MeshBasicMaterial({map:texturaXadrez(),side:THREE.DoubleSide});
  const band=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.7),bm);band.position.set(.62,3.2,0);g.add(band);
  g.add(cyl(.03,.03,.9,MADEIRA2,.07,3.2,0,6));
  const cs=[0xff5252,0xffd54f,0x4fc3f7,0x69f0ae];
  for(let i=0;i<7;i++) g.add(sph(.06,BRILHO(cs[i%4]),-1.0+i*.33,1.22,.16));
  g.add(cone(.45,1.1,VERDE,1.7,.55,-.1,10)); g.add(cone(.3,.5,NEVE,1.7,.95,-.1,10));
  g.add(box(1.3,.1,.8,NEVE,0,.05,.2));
  return g;
}

// ---------- PORTAL PARA O MUNDO DAS FANTASIAS (largada) ----------
function texturaRedemoinho(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const g=x.createRadialGradient(256,256,10,256,256,256);g.addColorStop(0,'#fff6c8');g.addColorStop(.35,'#7be3ff');g.addColorStop(.7,'#8a4dff');g.addColorStop(1,'#2a0f66');
  x.fillStyle=g;x.fillRect(0,0,512,512);
  for(let b=0;b<6;b++){ x.save();x.translate(256,256);x.rotate(b*Math.PI/3);
    for(let r=20;r<250;r+=3){ const a=r*.022; x.fillStyle='rgba(255,255,255,'+(0.5-r/600)+')'; x.beginPath();x.arc(Math.cos(a)*r,Math.sin(a)*r,4+r*.012,0,7);x.fill(); }
    x.restore(); }
  const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx;
}
function portal(){
  const g=new THREE.Group(), PEDRA=M(0x8a8f99,{roughness:.95}), PEDRA2=M(0x6f747e,{roughness:.95}), MUSGO=M(0x4f9b4a);
  // anel de pedras (14 blocos em circulo, levemente irregulares)
  const R=1.65, cy=2.1;
  for(let i=0;i<14;i++){ const a=i/14*Math.PI*2; const b=box(.62,.5,.55,i%2?PEDRA:PEDRA2,Math.cos(a)*R,cy+Math.sin(a)*R,0); b.rotation.z=a+Math.PI/2; b.scale.set(1,1,1+(i%3)*.12); g.add(b);
    if(i%4===0) g.add(sph(.16,MUSGO,Math.cos(a)*R,cy+Math.sin(a)*R+.2,.2,1,.6,1)); }
  // pedestais
  g.add(box(1.0,.5,.9,PEDRA2,-1.2,.25,0)); g.add(box(1.0,.5,.9,PEDRA2,1.2,.25,0)); g.add(box(3.6,.18,1.4,PEDRA,0,.09,0));
  // redemoinho (disco com giro) + brilho
  const dm=new THREE.MeshBasicMaterial({map:texturaRedemoinho(),side:THREE.DoubleSide,transparent:true});
  const disco=new THREE.Mesh(new THREE.CircleGeometry(R-.28,40),dm);disco.position.set(0,cy,0);g.add(disco);
  const halo=new THREE.Mesh(new THREE.RingGeometry(R-.3,R+.35,40),new THREE.MeshBasicMaterial({color:0x9be8ff,transparent:true,opacity:.35,side:THREE.DoubleSide}));halo.position.set(0,cy,-.02);g.add(halo);
  g.add(new THREE.PointLight(0x8fd8ff,1.4,7).translateY(cy).translateZ(.8));
  // runas luminosas e pisca-pisca de Natal no anel
  const cs=[0xff5252,0xffd54f,0x4fc3f7,0x69f0ae];
  for(let i=0;i<20;i++){ const a=i/20*Math.PI*2+.1; g.add(sph(.07,BRILHO(cs[i%4]),Math.cos(a)*(R+.33),cy+Math.sin(a)*(R+.33),.3)); }
  // estrela no topo
  const st=G(estrelaGeo(.35,.16,.14),BRILHO(0xffd23f),0,cy+R+.75,0);g.add(st);
  // placa INICIO no pe do portal
  const tex=texturaTexto('INÍCIO',512,200,'#c98a4b','#ffffff',true);
  const mf=new THREE.MeshStandardMaterial({map:tex,roughness:.8}), mc=M(0x9a6232);
  const pl=new THREE.Mesh(new THREE.BoxGeometry(1.5,.6,.12),[mc,mc,mc,mc,mf,mf]);pl.position.set(0,.55,.85);pl.rotation.x=-.25;g.add(pl);
  g.userData.anima=(tt)=>{ disco.rotation.z=tt*.9; halo.material.opacity=.3+Math.sin(tt*2.2)*.12; st.rotation.y=Math.sin(tt*1.3)*.7; };
  return g;
}

// ---------- ESTRELA DO NATAL (baú/final) ----------
function estrelaNatal(){
  const g=new THREE.Group();
  const st=G(estrelaGeo(.8,.36,.3),M(0xffd23f,{emissive:0xffa000,emissiveIntensity:.8,metalness:.6,roughness:.25}),0,1.2,0);
  g.add(st);g.userData.gira=st;
  g.add(new THREE.PointLight(0xffd23f,1.1,5).translateY(1.2));
  g.add(cyl(.5,.6,.25,M(0x6b4a2a),0,.12,0,14));
  return g;
}

// ---------- CARTA (so o rolinho de pergaminho, lacre vermelho e fita) ----------
function carta(){
  const g=new THREE.Group(), pm=M(0xf1e2b5,{roughness:.9}), pe=M(0xd9c58f,{roughness:.9});
  const rolo=cyl(.3,.3,1.6,pm,0,.5,0,16);rolo.rotation.z=Math.PI/2;g.add(rolo);
  for(const s of [-1,1]){
    const ponta=cyl(.33,.33,.06,pe,s*.82,.5,0,16);ponta.rotation.z=Math.PI/2;g.add(ponta);
    const miolo=cyl(.12,.12,.09,M(0xb9975b),s*.84,.5,0,12);miolo.rotation.z=Math.PI/2;g.add(miolo);
  }
  const fita=G(new THREE.TorusGeometry(.31,.05,8,20),VERM,0,.5,0);fita.rotation.y=Math.PI/2;g.add(fita);
  g.add(sph(.15,VERM,0,.5,.3,1,1,.55));
  const laco=G(new THREE.TorusGeometry(.12,.04,8,12),VERM,0,.82,.0);laco.rotation.y=Math.PI/2;g.add(laco);
  g.scale.setScalar(1.6);
  return g;
}

// ---------- BONECO DE NEVE ----------
function boneco(){
  const g=new THREE.Group(), PRETO=M(0x222831);
  g.add(sph(.85,NEVE,0,.8,0)); g.add(sph(.62,NEVE,0,1.9,0)); g.add(sph(.45,NEVE,0,2.7,0));
  const nar=cone(.09,.5,M(0xff8a1f),0,2.7,.55,8);nar.rotation.x=Math.PI/2;g.add(nar);
  g.add(sph(.06,PRETO,-.16,2.82,.4),sph(.06,PRETO,.16,2.82,.4));
  for(let i=0;i<5;i++){const a=(i-2)*.28;g.add(sph(.04,PRETO,Math.sin(a)*.3,2.55-Math.abs(a)*.12,.4+Math.cos(a)*.0));}
  for(let i=0;i<3;i++) g.add(sph(.07,PRETO,0,2.1-i*.32,.6-i*.02));
  g.add(cyl(.5,.5,.06,PRETO,0,3.05,0,14)); g.add(cyl(.3,.3,.5,PRETO,0,3.3,0,14)); g.add(cyl(.31,.31,.1,VERM,0,3.12,0,14));
  const ca=G(new THREE.TorusGeometry(.5,.11,8,18),VERM,0,2.3,0);ca.rotation.x=Math.PI/2;g.add(ca);
  const ponta=box(.2,.7,.1,VERM,.35,1.95,.45);ponta.rotation.z=.2;g.add(ponta);
  for(const s of [-1,1]){const b=cyl(.04,.05,1.3,MADEIRA2,s*1.0,1.9,0,6);b.rotation.z=s*-1.0;g.add(b);
    const d=cyl(.03,.03,.35,MADEIRA2,s*1.55,2.3,0,5);d.rotation.z=s*-.3;g.add(d);}
  return g;
}

// ---------- TRENÓ DO PAPAI NOEL ----------
function treno(){
  const g=new THREE.Group();
  for(const s of [-1,1]){
    g.add(box(2.6,.1,.12,OURO,0,.3,s*.5));
    const ponta=G(new THREE.TorusGeometry(.32,.055,6,14,Math.PI*.6),OURO,1.3,.62,s*.5);ponta.rotation.z=-Math.PI*.5;g.add(ponta);
    g.add(box(.1,.35,.1,OURO,-.7,.5,s*.5),box(.1,.35,.1,OURO,.7,.5,s*.5));
  }
  g.add(box(2.2,.55,1.1,VERM,0,.85,0));
  g.add(box(2.3,.1,1.2,OURO,0,1.15,0));
  const costas=box(.18,1.0,1.1,VERM,-1.05,1.4,0);g.add(costas); g.add(box(.2,.1,1.2,OURO,-1.05,1.95,0));
  const frente=box(.18,.7,1.1,VERM,1.05,1.3,0);frente.rotation.z=-.25;g.add(frente);
  g.add(sph(.68,M(0x8b5a2b),-.25,1.65,0,1,1.05,1)); g.add(G(new THREE.TorusGeometry(.2,.06,8,12),M(0xd9b46a),-.25,2.28,0).rotateX(Math.PI/2));
  const p1=presente(0x2f8f4e,0xffd54f);p1.scale.setScalar(.38);p1.position.set(.45,1.2,.25);g.add(p1);
  const p2=presente(0x2979ff,0xffffff);p2.scale.setScalar(.3);p2.position.set(.5,1.2,-.3);g.add(p2);
  g.scale.setScalar(.95);
  return g;
}

// ---------- CAVERNA DO DRAGÃO ----------
function caverna(){
  const g=new THREE.Group(), PED=M(0x6b7280,{roughness:.95}), PED2=M(0x555b66,{roughness:.95});
  const arco=G(new THREE.TorusGeometry(1.15,.5,6,12,Math.PI),PED);arco.position.set(0,.2,1.0);g.add(arco);
  const rochas=[[-1.9,.9,.6,1.0],[1.9,.9,.6,1.0],[-1.3,1.9,.4,.9],[1.3,1.9,.4,.9],[0,2.1,.2,1.1],[-2.3,.5,1.3,.8],[2.3,.5,1.3,.8],[-1,1.4,-.9,1.3],[1,1.4,-.9,1.3],[0,1.8,-1.1,1.5]];
  rochas.forEach(([x,y,z,r],i)=>{ const m=G(new THREE.DodecahedronGeometry(r,0),i%2?PED:PED2,x,y,z);m.rotation.set(i,i*2,0);g.add(m);
    g.add(cone(r*.55,r*.25,NEVE,x,y+r*.82,z,7)); });
  const fundo=G(new THREE.CircleGeometry(1.0,20),M(0x120505,{emissive:0x7a1010,emissiveIntensity:.9}),0,1.0,.45);g.add(fundo);
  for(const x of [-.55,-.15,.35,.7]) { const e=cone(.09,.4,M(0xb8bcc6),x,1.95-Math.abs(x)*.5,.95,6);e.rotation.x=Math.PI;g.add(e); }
  g.add(new THREE.PointLight(0xff3b1f,1.1,5).translateY(1).translateZ(.8));
  g.add(cone(.35,.9,VERDE2,-2.7,.45,2.0,8),cone(.28,.6,NEVE,-2.7,.7,2.0,8));
  g.scale.setScalar(.6);
  return g;
}

// ---------- BAÚ DO TESOURO ----------
function bau(){
  const g=new THREE.Group(), BAU=M(0x8a4f22), FERRO=OURO;
  g.add(box(2,.9,1.2,BAU,0,.45,0));
  const tampa=G(new THREE.CylinderGeometry(.6,.6,2,14,1,false,0,Math.PI),BAU,0,.9,0);tampa.rotation.z=Math.PI/2;tampa.rotation.y=0;tampa.rotation.x=0;
  tampa.rotation.set(0,0,Math.PI/2);tampa.rotation.order='YXZ';g.add(tampa);
  for(const x of [-.75,.75]){ g.add(box(.16,.95,1.26,FERRO,x,.47,0)); const fx=G(new THREE.CylinderGeometry(.66,.66,.16,14,1,false,0,Math.PI),FERRO,x,.9,0);fx.rotation.z=Math.PI/2;g.add(fx); }
  g.add(box(2.06,.12,1.26,FERRO,0,.9,0));
  g.add(box(.34,.4,.12,FERRO,0,.8,.65)); g.add(G(new THREE.TorusGeometry(.12,.04,8,12,Math.PI),FERRO,0,1.02,.65)); g.add(cyl(.05,.05,.08,M(0x222222),0,.78,.72,8));
  for(let i=0;i<9;i++){ const c=cyl(.18,.18,.05,OURO,1.5+Math.cos(i*2.1)*.3*((i%3)+1)*.5,.03+Math.floor(i/4)*.05,.4+Math.sin(i*2.1)*.3,12);g.add(c); }
  return g;
}


export { chale, rena, arvore, luzinha, presente, placaLargada, portal, estrelaNatal, carta, boneco, treno, caverna, bau, estrelaGeo, BRILHO, VERM, OURO };
