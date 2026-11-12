const noise = /* glsl */ `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float a=.5,v=0.; for(int i=0;i<4;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return v; }
`;

/** 불사조 모델의 표준 재질에 끼워 넣는 조각: 모든 색을 #8B0000 한 색조로 바꾸고, 불길·소멸·윤곽 패스를 처리합니다. */
export const birdFragmentHead = /* glsl */ `
uniform float uBurn, uMask, uTime, uRim, uHazeAmount, uDissolve;
uniform vec3 uHaze;
${noise}
vec3 crimson(float l){
  vec3 c = mix(vec3(.16,0.,0.), vec3(.545,0.,0.), smoothstep(0.,.55,l));
  return mix(c, vec3(.7,.03,.02), smoothstep(.7,1.,l)*.6);
}
`;

export const birdAlbedo = /* glsl */ `
  float birdLum = pow(clamp(dot(diffuseColor.rgb, vec3(.3,.59,.11)),0.,1.), 1./2.2);
  diffuseColor.rgb = crimson(birdLum);
`;

export const birdEmissive = /* glsl */ `
  float glowLum = dot(totalEmissiveRadiance, vec3(.3,.59,.11));
  float flicker = .65 + .7*fbm(gl_FragCoord.xy*.012 + vec2(0.,-uTime*1.4));
  // 역광에서도 #8B0000이 보이도록 바탕 발광을 조금 둡니다.
  totalEmissiveRadiance = vec3(.545,0.,0.)*(.22 + glowLum*1.3) + vec3(.4,0.,0.)*uBurn*flicker;
`;

/** 배경에 녹아들도록 역광 테두리, 공기의 옅은 막, 입자감을 더합니다. */
export const birdOutput = /* glsl */ `
  float rim = pow(1.-clamp(dot(normal, geometryViewDir),0.,1.), 2.6);
  gl_FragColor.rgb += vec3(.95,.16,.1)*rim*uRim;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, uHazeAmount);
  // 태양 속에서 불씨처럼 흩어집니다.
  if(uDissolve > 0.){
    float d = fbm(gl_FragCoord.xy*.012);
    float front = uDissolve*1.25-.1;
    if(d < front) discard;
    gl_FragColor.rgb += vec3(1.,.5,.4)*smoothstep(.08,0.,d-front);
  }
  gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy+fract(uTime)*91.,vec2(12.9898,78.233)))*43758.5453)-.5)*.022;
  if(uMask > .5) gl_FragColor = vec4(1.);
`;

/**
 * 불사조가 태양 속에서 터진 뒤의 깃털(3D 모델).
 * 작은 깃털들은 사방으로 흩어졌다 사라지고, 큰 깃털 하나(aHero=1)가 빛을 끌며 화면 가운데로 천천히 내려옵니다.
 */
export const featherVertex = /* glsl */ `
attribute float aSeed, aHero;
uniform float uTime, uFall, uAspect, uLogo;
uniform vec2 uSun, uHeroAt;
varying float vSeed, vFacing, vY, vLight, vHero;
void main(){
  vSeed = aSeed;
  vY = position.y;
  vHero = aHero;
  float s = aSeed;
  float spin = uTime*(.35+s*.5) + s*20.;
  float roll = sin(uTime*(.6+s*.4) + s*31.)*.55;
  vec3 local = position;
  vec3 n = normal;
  float size;
  vec2 at;
  if(aHero > .5){
    size = 2.6*(1.-uLogo*.6);
    at = uHeroAt;
    roll = sin(uTime*.6)*.22;
    spin = sin(uTime*.4)*.7;
  } else {
    size = .6 + s*.7;
    float a = s*6.2832*3.;
    vec2 dir = vec2(cos(a), sin(a));
    float out1 = 1.-exp(-uFall*7.);
    at = uSun + dir*vec2(uAspect,1.)*(1.4+s*3.)*out1 + vec2(0., -uFall*uFall*(2.+s*3.));
  }
  float c = cos(spin), sn = sin(spin);
  local.xz = mat2(c,-sn,sn,c)*local.xz;
  n.xz = mat2(c,-sn,sn,c)*n.xz;
  float cr = cos(roll), sr = sin(roll);
  local.xy = mat2(cr,-sr,sr,cr)*(local.xy - vec2(0.,.5));
  n.xy = mat2(cr,-sr,sr,cr)*n.xy;
  vFacing = abs(n.z);
  vLight = clamp(dot(normalize(n), normalize(vec3(.3,.6,.75)))*.5+.5, 0., 1.);
  gl_Position = projectionMatrix*modelViewMatrix*vec4(local*size + vec3(at,0.), 1.);
}`;

export const featherFragment = /* glsl */ `
precision highp float;
uniform float uFall, uLogo;
varying float vSeed, vFacing, vY, vLight, vHero;
void main(){
  vec3 col = mix(vec3(.2,0.,0.), vec3(.545,0.,0.), vLight);
  col *= .72 + .4*vFacing;
  float ember = (1.-smoothstep(.15,.7,uFall)) + .2;
  col += vec3(.9,.12,.06)*smoothstep(.6,1.,vY)*ember;
  float alpha;
  if(vHero > .5){
    // 내려오는 큰 깃털은 스스로 빛나고, 로고가 나타나면 사라집니다.
    col += vec3(.75,.08,.05)*(.55+.45*smoothstep(.2,1.,vY));
    alpha = smoothstep(0.,.06,uFall)*(1.-smoothstep(.2,.7,uLogo));
  } else {
    alpha = smoothstep(0.,.04,uFall)*(1.-smoothstep(.25,.6,uFall));
  }
  gl_FragColor = vec4(col, alpha);
}`;

export const backgroundVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`;

export const backgroundFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMaskTex;
uniform vec2 uRes;
uniform float uTime, uSun, uSunSize, uSunX, uCosmos, uWar, uBurn, uNova, uLogo, uHeroGlow;
uniform vec2 uBird, uNovaAt, uLogoAt, uHeroAt;
varying vec2 vUv;
${noise}

float blurMask(vec2 uv, float r){
  float s=0.;
  for(int i=0;i<14;i++){
    float a=float(i)*2.39996; float d=sqrt((float(i)+.5)/14.)*r;
    s+=texture2D(uMaskTex,uv+vec2(cos(a),sin(a)*uRes.x/uRes.y)*d).r;
  }
  return s/14.;
}

vec3 fire(float t){
  vec3 c=mix(vec3(.16,0.,0.),vec3(.545,0.,0.),smoothstep(.0,.42,t));
  return mix(c,vec3(.8,.05,.04),smoothstep(.45,.95,t));
}

float stars(vec2 p, float scale){
  vec2 g=p*scale, i=floor(g), f=fract(g)-.5;
  float h=hash(i); if(h<.9) return 0.;
  vec2 o=vec2(hash(i+3.1),hash(i+7.7))-.5;
  return smoothstep(.09,.0,length(f-o*.7))*(h-.9)*10.*(.6+.4*sin(uTime*2.+h*90.));
}

float beam(vec2 p, vec2 a, vec2 b, float head){
  if(head>1.24) return 0.;
  vec2 ab=b-a;
  vec2 tip=a+ab*min(head,1.), end=a+ab*max(head-.24,0.);
  vec2 seg=tip-end;
  float len2=max(dot(seg,seg),1e-5);
  float h=clamp(dot(p-end,seg)/len2,0.,1.);
  float d=length(p-end-seg*h);
  return h*h*(smoothstep(.006,.0,d)+exp(-d*60.)*.3);
}

void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(vUv-.5)*vec2(asp,1.);
  float t=uTime;

  // 신화: 진홍빛 극광과 빛의 고리
  float diag=dot(p,normalize(vec2(.7,-.72)));
  float flow=fbm(vec2(diag*2.4+t*.04, dot(p,vec2(.72,.7))*.8-t*.03));
  vec3 myth=mix(vec3(.2,0.,.012),vec3(.545,0.,0.),smoothstep(.2,.72,flow));
  myth=mix(myth,vec3(.74,.06,.07),smoothstep(.6,.86,flow)*.6);
  vec2 sc=p-vec2(uSunX,.24);
  float r=length(sc);
  float halo=sin(r*11.-flow*3.+t*.2)*.5+.5;
  myth+=vec3(.45,.07,.07)*halo*smoothstep(.9,.25,r)*smoothstep(.1,.42,r)*uSun*.65;
  float sunR=mix(.09,.2,uSunSize)*smoothstep(0.,.55,uSun)*mix(.62,1.,smoothstep(.5,1.,asp));
  float sun=smoothstep(sunR+.04,sunR,r);
  // 태양에서 뻗는 빛살
  vec2 around=normalize(sc+vec2(1e-4));
  float beam2=pow(fbm(around*5.5+vec2(t*.05,-t*.04)),2.2);
  myth+=vec3(.8,.08,.05)*beam2*exp(-r*1.5)*uSun*2.4;
  myth+=vec3(1.,.4,.3)*exp(-r*5.2)*uSun*1.05;

  // 우주: 별과 성운, 행성의 가장자리
  float neb=fbm(p*1.7+vec2(t*.012,0.)+fbm(p*2.6)*.8);
  vec3 cosmos=vec3(.012,.003,.008)+vec3(.34,.012,.03)*smoothstep(.42,.86,neb)+vec3(.65,.1,.06)*smoothstep(.68,.95,neb)*.5;
  float st=stars(p,34.)+stars(p+.37,62.)*.7;
  cosmos+=vec3(1.,.86,.82)*st;
  vec2 pc=p-vec2(-.34*asp,-1.42);
  float pd=length(pc)-1.14;
  float limb=exp(-abs(pd)*26.);
  float disc=smoothstep(.004,-.004,pd);
  cosmos=mix(cosmos,vec3(.022,.004,.006)+vec3(.13,.008,.01)*fbm(pc*7.),disc);
  cosmos+=vec3(1.,.2,.1)*limb*.8*(1.-disc*.35);

  // 전쟁: 먼 함대의 포화
  float war=0.;
  for(int i=0;i<9;i++){
    float f=float(i);
    float cyc=fract(t*(.17+f*.021)+f*.37);
    vec2 a=vec2(-1.2+mod(f*.47,2.4),.62-mod(f*.31,1.1))*vec2(asp*.62,1.);
    vec2 b=vec2(1.1-mod(f*.71,2.2),-.56+mod(f*.53,1.0))*vec2(asp*.62,1.);
    war+=beam(p,a,b,cyc*1.3);
  }
  cosmos+=vec3(1.,.2,.14)*war*uWar;

  vec3 col=mix(myth,cosmos,uCosmos);
  // 태양 원반은 우주로 넘어가도 색이 탁해지지 않게 마지막에 얹습니다.
  col=mix(col,vec3(1.,.88,.84),sun*smoothstep(.03,.07,sunR)*(1.-uNova));
  // 초신성: 섬광, 퍼져 나가는 충격파, 로고 뒤에 남는 잔광
  vec2 np=p-uNovaAt;
  float nr=length(np);
  float flash=exp(-nr*mix(1.2,6.,uNova))*sin(uNova*3.14159);
  float shock=smoothstep(.05,0.,abs(nr-uNova*1.6))*(1.-uNova);
  col+=vec3(1.,.55,.45)*flash*1.6+vec3(.95,.12,.08)*shock*1.4;
  col+=vec3(.545,0.,0.)*exp(-length(p-uLogoAt)*2.6)*uLogo*.9;
  // 내려오는 깃털의 빛 무리와 위로 길게 남는 빛줄기
  vec2 hp=p-uHeroAt;
  float heroHalo=exp(-length(hp)*4.5);
  float trail=exp(-abs(hp.x)*70.)*exp(-max(hp.y,0.)*1.6)*step(0.,hp.y);
  float sparks=step(.985,hash(floor(vec2(hp.x*90.,hp.y*30.-t*6.))))*exp(-abs(hp.x)*14.)*exp(-max(hp.y,0.)*2.2)*step(0.,hp.y);
  col+=(vec3(.78,.06,.04)*heroHalo*.9+vec3(1.,.4,.3)*trail*.55+vec3(1.,.6,.5)*sparks)*uHeroGlow;
  // 로고가 나타나는 순간의 섬광
  col+=vec3(1.,.5,.4)*exp(-length(p-uLogoAt)*5.)*sin(uLogo*3.14159)*1.2;

  // 불사조 뒤의 빛과 불길
  vec2 uv=vUv;
  float glow=blurMask(uv,.05);
  col+=vec3(.545,0.,0.)*glow*mix(.62,.95,uBurn);
  if(uBurn>0.01){
    float n1=fbm(vec2(p.x*6.+t*.15,p.y*3.6-t*1.05));
    float n2=fbm(vec2(p.x*14.-t*.2,p.y*8.-t*1.8));
    vec2 off=vec2((n1-.5)*.09,-.03-.075*n2);
    float m=blurMask(uv+off,.024);
    float wide=blurMask(uv+off*2.2,.075);
    float flame=clamp(m*(.5+n2*.9)+wide*n1*.42,0.,1.);
    float stepped=floor(flame*5.)/5.;
    col=mix(col,fire(stepped),smoothstep(.3,.85,flame)*uBurn*.22);
    col+=vec3(.4,0.,0.)*wide*uBurn*.5;
    // 불사조 형상에서 바깥으로 뻗는 불길 줄기
    float rays=0.;
    for(int i=0;i<12;i++){
      float k=float(i)/12.;
      rays+=texture2D(uMaskTex,mix(uv,uBird,k*.42)).r*(1.-k);
    }
    vec2 dir=normalize((uv-uBird)*vec2(asp,1.)+1e-4);
    float lines=fbm(dir*9.+vec2(length(uv-uBird)*3.-t*1.3,0.));
    rays=smoothstep(.15,.9,rays/6.5*(.45+lines*1.2));
    col+=vec3(.62,0.,0.)*rays*uBurn*1.1;
  }

  // 글자가 묻히지 않도록 가장자리를 눌러 줍니다.
  float vig=smoothstep(1.25,.25,length(p/vec2(max(asp,1.),1.))*1.28);
  col*=mix(.52,1.,vig);
  col+=(hash(vUv*uRes+fract(t))-.5)*.018;
  gl_FragColor=vec4(col,1.);
}`;

export const fleetVertex = /* glsl */ `
attribute vec3 aOffset;
attribute float aSeed;
uniform float uTime, uWar;
varying float vEngine, vSeed;
void main(){
  vec3 o=aOffset;
  o.x=mod(o.x+uTime*(.55+aSeed*.5)+30.,60.)-30.;
  vec3 local=position*(.7+aSeed*.9)*uWar;
  vEngine=smoothstep(-.1,-.27,local.x/max(.2,(.7+aSeed*.9)));
  vSeed=aSeed;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(local+o,1.);
}`;

export const fleetFragment = /* glsl */ `
precision highp float;
uniform float uTime;
varying float vEngine, vSeed;
void main(){
  vec3 hull=vec3(.03,.012,.014);
  float flick=.75+.25*sin(uTime*18.+vSeed*40.);
  gl_FragColor=vec4(hull+vec3(.9,.08,.05)*vEngine*flick*1.5,1.);
}`;

export const emberVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uHeat, uScale, uFlight;
varying float vLife, vSeed;
void main(){
  vec3 p=position;
  float speed=.12+aSeed*.25+uHeat*.5;
  float life=fract(uTime*speed*.14+aSeed*7.);
  p.y+=(life-.5)*16.;
  p.x+=sin(life*9.+aSeed*30.)*.5;
  // 비행 중에는 태양 쪽에서 카메라 쪽으로 스쳐 지나갑니다.
  float rush=fract(uTime*(.22+aSeed*.3)+aSeed*11.);
  vec2 dir=normalize(position.xy+vec2(.01));
  vec3 flown=vec3(dir*(.2+rush*rush*13.)+vec2(0.,1.9),position.z*.3+rush*7.);
  p=mix(p,flown,uFlight);
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vLife=mix(life,.1+rush*.5,uFlight); vSeed=aSeed;
  gl_PointSize=(.035+pow(aSeed,5.)*.2)*uScale/max(1.,-mv.z)*(1.+uHeat*.5+uFlight*.8);
  gl_Position=projectionMatrix*mv;
}`;

export const emberFragment = /* glsl */ `
precision highp float;
uniform float uHeat;
varying float vLife, vSeed;
void main(){
  vec2 c=gl_PointCoord-.5;
  float d=length(c);
  float star=smoothstep(.09,.0,abs(c.x)*abs(c.y)*42.)*smoothstep(.5,.05,d);
  float a=(star+smoothstep(.2,.0,d))*smoothstep(0.,.14,vLife)*smoothstep(1.,.65,vLife);
  vec3 cool=vec3(1.,.74,.68), hot=vec3(1.,.2,.12);
  gl_FragColor=vec4(mix(cool,hot,uHeat)*a,a);
}`;
