const noise = /* glsl */ `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float a=.5,v=0.; for(int i=0;i<4;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return v; }
`;

export const featherVertex = /* glsl */ `
attribute vec4 aMeta;
attribute float aShade;
uniform float uTime, uFlap, uMorph;
varying vec2 vUv;
varying vec3 vNormal, vView;
varying float vSeed, vSpan, vShade, vRadius;

void main(){
  vUv = uv;
  float side = aMeta.x, span = aMeta.y, seed = aMeta.z;
  vec3 p = (instanceMatrix * vec4(position,1.)).xyz;
  vec3 n = normalize(mat3(instanceMatrix) * normal);

  if(abs(side) > .5){
    float a = uFlap * (sin(uTime*1.5 - span*1.7) * (.1 + .42*span) + .04) * side;
    float c = cos(a), s = sin(a);
    mat2 r = mat2(c,s,-s,c);
    vec2 pivot = vec2(side*.2,.42);
    p.xy = pivot + r*(p.xy-pivot);
    n.xy = r*n.xy;
  } else if(p.y < -1.){
    p.x += sin(uTime*1.1 + p.y*1.3 + seed*2.) * .05 * (-p.y-1.) * uFlap;
  }

  float m = smoothstep(seed*.4, seed*.4+.6, uMorph);
  if(m > 0.){
    float ang = aMeta.w + uTime*.22 + (1.-m)*2.6;
    vec3 rad = vec3(cos(ang),sin(ang),0.), tang = vec3(-sin(ang),cos(ang),0.);
    vec3 dir = normalize(tang + rad*(.28 + seed*.5));
    vec3 ax = normalize(cross(vec3(0.,0.,1.),dir));
    float R = 3.05 + (fract(seed*13.)-.5)*.46;
    float z = (fract(seed*29.)-.5)*.7;
    float l = .5 + fract(seed*41.)*.62;
    vec3 rp = rad*R + vec3(0.,0.,z) + ax*position.x*.3 + dir*position.y*l + vec3(0.,0.,1.)*position.z*.3;
    p = mix(p, rp, m);
    n = normalize(mix(n, normalize(vec3(rad.xy*.35,1.)), m));
  }

  vec4 mv = modelViewMatrix * vec4(p,1.);
  vNormal = normalize(normalMatrix * n);
  vView = normalize(-mv.xyz);
  vSeed = seed; vSpan = span; vShade = aShade; vRadius = length(p.xy);
  gl_Position = projectionMatrix * mv;
}`;

export const featherFragment = /* glsl */ `
precision highp float;
uniform float uBurn, uMask, uTime, uMorph;
varying vec2 vUv;
varying vec3 vNormal, vView;
varying float vSeed, vSpan, vShade, vRadius;
${noise}

// 넓은 평탄 구간을 #8B0000(.545, 0, 0)에 두어 깃털 대부분이 이 색으로 나오게 합니다.
vec3 ramp(float t){
  vec3 deep=vec3(.2,0.,.008), core=vec3(.545,0.,0.), lift=vec3(.68,.03,.03), hot=vec3(.98,.68,.6);
  if(t<.3) return mix(deep,core,t/.3);
  if(t<.72) return core;
  if(t<.93) return mix(core,lift,(t-.72)/.21);
  return mix(lift,hot,(t-.93)/.07);
}

vec3 flameRamp(float h){
  vec3 c = mix(vec3(.25,0.,0.),vec3(.545,0.,0.),smoothstep(0.,.35,h));
  c = mix(c,vec3(.86,.1,.07),smoothstep(.35,.62,h));
  c = mix(c,vec3(1.,.56,.44),smoothstep(.62,.84,h));
  return mix(c,vec3(1.,.93,.86),smoothstep(.84,1.,h));
}

void main(){
  float e = abs(vUv.x*2.-1.);
  // 깃가지 방향으로 갈라진 틈과 잔 톱니
  float barbY = vUv.y - e*.3;
  float slit = smoothstep(.955,.975,fract(barbY*8.+vSeed*17.)) * smoothstep(.25,.55,e) * smoothstep(.12,.35,vUv.y);
  float cut = smoothstep(.2,.9,sin(vUv.y*130.+vSeed*50.)*.5+.5)*.07*smoothstep(.1,.4,vUv.y);
  if(slit > .5 || e > 1.-cut) discard;
  if(uMask > .5){ gl_FragColor = vec4(1.); return; }

  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1. : -1.);
  float barb = sin((vUv.y + e*.42)*170. + vSeed*30.);
  n = normalize(n + vec3(barb*.1, barb*.08, 0.));
  float ndv = clamp(dot(n, vView), 0., 1.);
  vec3 L = normalize(vec3(.35,.7,.75));
  float dif = clamp(dot(n,L),0.,1.);
  float spec = pow(clamp(dot(reflect(-L,n),vView),0.,1.), 40.);
  float fres = pow(1.-ndv, 3.);

  float sheen = .5+.5*sin(ndv*5. + vSpan*4. + vSeed*4. + uTime*.3);
  float shaft = smoothstep(.06,.0,e);
  float t = .24 + sheen*.14 + dif*.3 + vShade*.14 + fres*.36 + shaft*.26;
  vec3 col = ramp(clamp(t,0.,1.));
  // 위층 깃털 끝에 가려지는 뿌리 쪽과 깃가지 결에 음영을 넣습니다.
  col *= mix(.5,1.,smoothstep(0.,.42,vUv.y));
  col *= .9+.1*barb;
  col += vec3(1.,.5,.44)*spec*.34;

  // 색조는 그대로 두고 명암만 바꿔 깃털 한 장 한 장을 구분합니다.
  float tone = (.86 + fract(vSeed*91.)*.34) * mix(1.,.34,smoothstep(.48,1.,e)) * (.72 + .42*dif);
  col *= tone;

  // 전쟁 장면부터 몸 전체가 스스로 빛나는 불꽃이 됩니다. 중심이 가장 뜨겁습니다.
  if(uBurn > 0.){
    float flow = fbm(vec2(vUv.x*2.+vSeed*9., vUv.y*3.-uTime*.8+vSeed*3.));
    float core = .56*exp(-vRadius*vRadius/2.4)*(1.-uMorph);
    float heat = clamp(.47 - vRadius*.022 + core + (flow-.5)*.62 + smoothstep(.72,1.,e)*.16, 0., 1.);
    col = mix(col, flameRamp(heat), uBurn);
  }
  gl_FragColor = vec4(col,1.);
}`;

export const strandVertex = /* glsl */ `
attribute vec3 aBase, aDir;
attribute vec4 aParams;
attribute vec2 aWing;
uniform float uTime, uFlap, uMorph, uFlame;
varying float vAlong, vAcross, vSeed;

vec3 pathAt(float t, vec3 base, vec3 dir, float len, float seed){
  vec3 perp = normalize(vec3(-dir.y, dir.x, 0.) + 1e-4);
  float wave = sin(t*3.6 + seed*25. + uTime*(1.1+seed*.8)) * .2 + sin(t*7. + seed*9. - uTime*1.7) * .025;
  return base + dir*len*t + perp*wave*t*len + vec3(0.,.22,0.)*t*t*len;
}

void main(){
  float seed = aParams.z;
  vec3 base = aBase, dir = aDir;
  float side = aWing.x, span = aWing.y;
  if(abs(side) > .5){
    float a = uFlap * (sin(uTime*1.5 - span*1.7) * (.1 + .42*span) + .04) * side;
    float c = cos(a), s = sin(a);
    mat2 r = mat2(c,s,-s,c);
    vec2 pivot = vec2(side*.2,.42);
    base.xy = pivot + r*(base.xy-pivot);
    dir.xy = r*dir.xy;
  }

  // 고리로 바뀌면 불길도 고리 바깥으로 뻗습니다.
  float m = smoothstep(seed*.4, seed*.4+.6, uMorph);
  float ang = aParams.w + uTime*.22 + (1.-m)*2.6;
  vec3 rad = vec3(cos(ang),sin(ang),0.), tang = vec3(-sin(ang),cos(ang),0.);
  base = mix(base, rad*3.3, m);
  dir = normalize(mix(dir, normalize(rad + tang*.7), m));
  float len = aParams.x * mix(1.,.6,m);

  float t = position.y;
  vec3 p = pathAt(t, base, dir, len, seed);
  vec3 q = pathAt(t+.02, base, dir, len, seed);
  vec3 ax = normalize(cross(normalize(q-p), vec3(0.,0.,1.)));
  float width = aParams.y * pow(sin(3.14159*pow(t,.55)), .8) * uFlame;
  p += ax * position.x * width;

  vAlong = t; vAcross = position.x*2.; vSeed = seed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.);
}`;

export const strandFragment = /* glsl */ `
precision highp float;
varying float vAlong, vAcross, vSeed;
void main(){
  float across = abs(vAcross);
  float a = smoothstep(1.,.15,across) * smoothstep(1.,.5,vAlong);
  float core = smoothstep(.55,.0,across) * pow(1.-vAlong, 1.6);
  vec3 col = mix(vec3(.5,.0,.0), vec3(1.,.46,.36), core*.72);
  gl_FragColor = vec4(col, a);
}`;

export const backgroundVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`;

export const backgroundFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMaskTex;
uniform vec2 uRes;
uniform float uTime, uSun, uCosmos, uWar, uRing, uBurn;
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
  vec2 sc=p-vec2(0.,.24);
  float r=length(sc);
  float halo=sin(r*11.-flow*3.+t*.2)*.5+.5;
  myth+=vec3(.45,.07,.07)*halo*smoothstep(.9,.25,r)*smoothstep(.1,.42,r)*uSun*.65;
  float sun=smoothstep(.15,.11,r);
  myth=mix(myth,vec3(1.,.88,.84),sun*uSun);
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

  // 불사조 뒤의 빛과 불길
  vec2 uv=vUv;
  float glow=blurMask(uv,.05);
  col+=vec3(.545,0.,0.)*glow*(1.-uBurn)*.62;
  if(uBurn>0.01){
    float n1=fbm(vec2(p.x*6.+t*.15,p.y*3.6-t*1.05));
    float n2=fbm(vec2(p.x*14.-t*.2,p.y*8.-t*1.8));
    vec2 off=vec2((n1-.5)*.09,-.03-.075*n2);
    float m=blurMask(uv+off,.024+uRing*.012);
    float wide=blurMask(uv+off*2.2,.075);
    float flame=clamp(m*(.5+n2*.9)+wide*n1*.42,0.,1.);
    col=mix(col,fire(flame*.86),smoothstep(.24,.82,flame)*uBurn*(.5+n1*.7));
    col+=vec3(.4,0.,0.)*wide*uBurn*.5;
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
uniform float uTime, uHeat, uScale;
varying float vLife, vSeed;
void main(){
  vec3 p=position;
  float speed=.12+aSeed*.25+uHeat*.5;
  float life=fract(uTime*speed*.14+aSeed*7.);
  p.y+=(life-.5)*16.;
  p.x+=sin(life*9.+aSeed*30.)*.5;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vLife=life; vSeed=aSeed;
  gl_PointSize=(.035+pow(aSeed,5.)*.2)*uScale/max(1.,-mv.z)*(1.+uHeat*.5);
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
