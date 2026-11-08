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
uniform float uTime, uFlap, uMorph;
varying vec2 vUv;
varying vec3 vNormal, vView;
varying float vSeed, vSpan;

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
  vSeed = seed; vSpan = span;
  gl_Position = projectionMatrix * mv;
}`;

export const featherFragment = /* glsl */ `
precision highp float;
uniform float uBurn, uMask, uTime;
varying vec2 vUv;
varying vec3 vNormal, vView;
varying float vSeed, vSpan;
${noise}

vec3 ramp(float t){
  vec3 a=vec3(.16,.0,.02), b=vec3(.545,.0,.0), c=vec3(.88,.1,.1), d=vec3(1.,.47,.28), e=vec3(1.,.84,.74);
  if(t<.3) return mix(a,b,t/.3);
  if(t<.6) return mix(b,c,(t-.3)/.3);
  if(t<.85) return mix(c,d,(t-.6)/.25);
  return mix(d,e,(t-.85)/.15);
}

void main(){
  float e = abs(vUv.x*2.-1.);
  float split = smoothstep(.93,1.,sin(vUv.y*19.+vSeed*61.)*.5+.5);
  float cut = (smoothstep(.2,.9,sin(vUv.y*120.+vSeed*50.)*.5+.5)*.09 + split*.26) * smoothstep(.12,.45,vUv.y);
  if(e > 1.-cut) discard;
  if(uMask > .5){ gl_FragColor = vec4(1.); return; }

  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1. : -1.);
  float barb = sin((vUv.y + e*.42)*170. + vSeed*30.);
  n = normalize(n + vec3(barb*.14, barb*.1, 0.));
  float ndv = clamp(dot(n, vView), 0., 1.);
  vec3 L = normalize(vec3(.35,.7,.75));
  float dif = clamp(dot(n,L),0.,1.);
  float spec = pow(clamp(dot(reflect(-L,n),vView),0.,1.), 26.);
  float fres = pow(1.-ndv, 2.4);

  float irid = .5+.5*sin(ndv*6. + vSpan*5. + vSeed*4. + uTime*.3);
  float shaft = smoothstep(.07,.0,e);
  float t = .08 + irid*.3 + dif*.24 + fres*.34 + shaft*.12 - (1.-vUv.y)*.1;
  vec3 col = ramp(clamp(t,0.,1.));
  col += vec3(1.,.66,.58)*spec*.5;
  col += vec3(1.,.3,.22)*fres*.18;

  if(uBurn > 0.){
    vec3 dark = vec3(.018,.006,.006) + vec3(.1,.018,.01)*dif;
    float crack = smoothstep(.66,.7, fbm(vUv*vec2(5.,26.) + vSeed*20. + vec2(0.,uTime*.28)));
    float rim = smoothstep(.62,1.,e)*.55;
    vec3 ember = vec3(1.,.25,.04)*crack*.9 + vec3(1.,.27,.06)*(fres*.35+rim*.16);
    col = mix(col, dark+ember, uBurn);
  }
  gl_FragColor = vec4(col,1.);
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
  vec3 c=mix(vec3(.2,0.,0.),vec3(.75,.03,.02),smoothstep(.0,.35,t));
  c=mix(c,vec3(1.,.36,.06),smoothstep(.3,.7,t));
  return mix(c,vec3(1.,.82,.45),smoothstep(.7,1.,t));
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
  myth=mix(myth,vec3(1.,.93,.88),sun*uSun);
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
  cosmos+=vec3(1.,.42,.26)*war*uWar;

  vec3 col=mix(myth,cosmos,uCosmos);

  // 불사조 뒤의 빛과 불길
  vec2 uv=vUv;
  float glow=blurMask(uv,.05);
  col+=vec3(.95,.14,.12)*glow*(1.-uBurn)*.52;
  if(uBurn>0.01){
    float n1=fbm(vec2(p.x*6.+t*.15,p.y*3.6-t*1.05));
    float n2=fbm(vec2(p.x*14.-t*.2,p.y*8.-t*1.8));
    vec2 off=vec2((n1-.5)*.09,-.03-.075*n2);
    float m=blurMask(uv+off,.024+uRing*.012);
    float wide=blurMask(uv+off*2.2,.075);
    float flame=clamp(m*(.5+n2*.9)+wide*n1*.42,0.,1.);
    col=mix(col,fire(flame),smoothstep(.16,.56,flame)*uBurn);
    col+=vec3(.5,.04,.01)*wide*uBurn*.5;
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
  gl_FragColor=vec4(hull+vec3(1.,.28,.08)*vEngine*flick*1.7,1.);
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
  vec3 cool=vec3(1.,.8,.74), hot=vec3(1.,.42,.12);
  gl_FragColor=vec4(mix(cool,hot,uHeat)*a,a);
}`;
