const noise = /* glsl */ `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float a=.5,v=0.; for(int i=0;i<4;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return v; }
`;

export const phoenixVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`;

export const phoenixFragment = /* glsl */ `
precision highp float;
uniform sampler2D uFlight, uFlight2, uRingArt;
uniform vec2 uRes, uFocus;
uniform float uZoom, uTilt, uTime, uFlap, uBurn, uMorph, uMask, uView;
varying vec2 vUv;
${noise}

// 깃털 그림의 명도를 #8B0000 중심으로 옮깁니다.
vec3 featherRamp(float t){
  vec3 c = mix(vec3(.13,0.,.004),vec3(.545,0.,0.),smoothstep(.1,.5,t));
  c = mix(c,vec3(.86,.1,.07),smoothstep(.6,.82,t));
  return mix(c,vec3(1.,.82,.74),smoothstep(.86,1.,t));
}

vec3 glowRamp(float t){
  if(t<.5) return mix(vec3(.13,0.,.004),vec3(.545,0.,0.),smoothstep(.2,.5,t));
  if(t<.75) return mix(vec3(.545,0.,0.),vec3(.8,.06,.05),(t-.5)/.25);
  if(t<.92) return mix(vec3(.8,.06,.05),vec3(1.,.42,.3),(t-.75)/.17);
  return mix(vec3(1.,.42,.3),vec3(1.,.9,.83),(t-.92)/.08);
}

// 프레임 번호(각도*10+날갯짓)로 두 장의 4x4 이미지에서 한 칸을 읽습니다.
vec3 flight(vec2 q, float id, float lod){
  float local = mod(id,16.);
  float col = mod(local,4.), row = floor(local/4.);
  vec2 c = vec2((col+q.x+.5)/4., 1.-(row+.5-q.y)/4.);
  return (id < 16. ? texture2D(uFlight,c,lod) : texture2D(uFlight2,c,lod)).rgb;
}

void main(){
  float asp = uRes.x/uRes.y;
  vec2 q = (vUv-.5)*vec2(asp,1.)/uZoom + uFocus;
  float tc = cos(uTilt), ts = sin(uTilt);
  q = mat2(tc,ts,-ts,tc)*q;

  float frame = fract(uTime*.85)*10.;
  float a = floor(frame), b = mod(a+1.,10.), f = frame-a;
  float v0 = min(floor(uView),1.), vf = smoothstep(.38,.62,uView-v0);
  float main = floor(uView+.5)*10.+a;
  float inside = step(max(abs(q.x),abs(q.y)),.5);
  vec3 art0 = mix(flight(q,v0*10.+a,0.), flight(q,v0*10.+b,0.), f);
  vec3 art1 = mix(flight(q,(v0+1.)*10.+a,0.), flight(q,(v0+1.)*10.+b,0.), f);
  vec3 art = mix(art0, art1, vf) * inside;

  vec2 w = vec2(fbm(q*7.+vec2(0.,-uTime*1.1))-.5, fbm(q*6.+vec2(5.,-uTime*.9))-.5);
  float n = fbm(q*5.+3.);
  float burnFront = uBurn*1.3-.15;
  float burn = smoothstep(n-.06,n+.06,burnFront);

  // 날개에서 바깥으로 뻗는 불길. 날갯짓을 그대로 따라갑니다.
  float streak = 0.;
  if(uBurn > 0.){
    vec2 o = vec2(0.,-.02);
    for(int i=1;i<=10;i++){
      float k = float(i)/10.;
      vec2 p = o+(q-o)*(1.-k*.42)+w*.02;
      if(max(abs(p.x),abs(p.y))<.5) streak += flight(p,main,0.).b*(1.-k*.7);
    }
    streak /= 6.5;
    float ang = atan(q.y-o.y,q.x-o.x);
    float line = fbm(vec2(cos(ang),sin(ang))*9.+vec2(length(q-o)*3.-uTime*1.3,0.));
    streak = smoothstep(.2,.95,streak*(.5+line*1.15))*burn;
  }

  vec3 ring = texture2D(uRingArt, q+.5+w*.02).rgb;
  float ringFront = uMorph*1.2-.1;
  float ringNoise = mix(n,.5,.88);
  float toRing = smoothstep(ringNoise-.05,ringNoise+.05,ringFront);

  float body = smoothstep(.35,.65,art.b);
  float rays = streak*(1.-toRing);
  float ringAlpha = smoothstep(.35,.65,ring.b)*toRing;
  float alpha = max(max(body*(1.-toRing), rays*.92), ringAlpha) * smoothstep(.5,.47,max(abs(q.x),abs(q.y)));
  if(uMask > .5){ gl_FragColor = vec4(alpha); return; }

  float lit = max(burn,toRing);
  float base = mix(min(art.r*1.2,.8), art.r*1.2+.14, burn);
  float tone = mix(base, ring.r, toRing);
  tone += (fbm(q*11.+vec2(0.,-uTime*1.6))-.5)*.13*lit;
  vec3 col = mix(featherRamp(tone), glowRamp(tone), lit*.85);
  // 형상 밖은 불길 색으로 칠합니다.
  if(body*(1.-toRing)+ringAlpha < .5) col = glowRamp(.45+rays*.45);
  col = mix(col, vec3(.07,0.,.002), smoothstep(.4,.75,ring.g)*toRing*.92);

  float edge = smoothstep(.05,.0,abs(n-burnFront))*step(.001,uBurn)*(1.-step(1.,uBurn))*body;
  col = mix(col, vec3(.96,.36,.26), edge*.7);

  float near = mix(flight(q,main,3.2).r, texture2D(uRingArt,q+.5,3.5).r, toRing);
  float far = mix(flight(q,main,5.).r, texture2D(uRingArt,q+.5,5.5).r, toRing);
  vec3 bloom = (vec3(.8,.05,.03)*smoothstep(.1,.5,far)*.6 + vec3(.95,.14,.09)*smoothstep(.3,.9,near)*.38) * lit * smoothstep(.5,.38,max(abs(q.x),abs(q.y)));

  gl_FragColor = vec4(col*alpha + bloom, alpha);
}`;

export const backgroundVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`;

export const backgroundFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMaskTex;
uniform vec2 uRes;
uniform float uTime, uSun, uSunSize, uSunX, uCosmos, uWar, uRing, uBurn;
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
  col=mix(col,vec3(1.,.88,.84),sun*smoothstep(.03,.07,sunR));

  // 불사조 뒤의 빛과 불길
  vec2 uv=vUv;
  float glow=blurMask(uv,.05);
  col+=vec3(.545,0.,0.)*glow*mix(.62,.95,uBurn);
  if(uBurn>0.01){
    float n1=fbm(vec2(p.x*6.+t*.15,p.y*3.6-t*1.05));
    float n2=fbm(vec2(p.x*14.-t*.2,p.y*8.-t*1.8));
    vec2 off=vec2((n1-.5)*.09,-.03-.075*n2);
    float m=blurMask(uv+off,.024+uRing*.012);
    float wide=blurMask(uv+off*2.2,.075);
    float flame=clamp(m*(.5+n2*.9)+wide*n1*.42,0.,1.);
    float stepped=floor(flame*5.)/5.;
    col=mix(col,fire(stepped),smoothstep(.3,.85,flame)*uBurn*.22);
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
