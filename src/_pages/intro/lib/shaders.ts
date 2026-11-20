const noise = /* glsl */ `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float a=.5,v=0.; for(int i=0;i<4;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return v; }
`;

/**
 * 불사조 모델의 표준 재질에 끼워 넣는 조각: 모든 색을 #8B0000 한 색조로 바꾸고, 불길·소멸·윤곽 패스를 처리합니다.
 *
 * - 노이즈를 화면이 아니라 몸 표면(텍스처 좌표)에 붙입니다. 화면 좌표를 쓰면 불사조가 움직일 때 무늬가 미끄러져 보입니다.
 */
export const birdFragmentHead = /* glsl */ `
uniform float uBurn, uMask, uTime, uRim, uHazeAmount, uDissolve;
uniform vec3 uHaze;
${noise}
#ifdef USE_MAP
  #define SURFACE_UV vMapUv
#else
  #define SURFACE_UV (gl_FragCoord.xy*.004)
#endif
vec3 crimson(float l){
  vec3 c = mix(vec3(.16,0.,0.), vec3(.545,0.,0.), smoothstep(0.,.55,l));
  return mix(c, vec3(.7,.03,.02), smoothstep(.7,1.,l)*.6);
}
`;

export const birdAlbedo = /* glsl */ `
  float birdLum = pow(clamp(dot(diffuseColor.rgb, vec3(.3,.59,.11)),0.,1.), 1./2.2);
  diffuseColor.rgb = crimson(birdLum);
`;

/**
 * - 불이 붙으면 몸 표면을 따라 흘러가는 불길 결이 생깁니다.
 * - 역광에서도 #8B0000이 보이도록 바탕 발광을 조금 둡니다.
 */
export const birdEmissive = /* glsl */ `
  float glowLum = dot(totalEmissiveRadiance, vec3(.3,.59,.11));
  vec2 surface = SURFACE_UV;
  float flicker = .65 + .7*fbm(surface*7. + vec2(0.,-uTime*1.4));
  float vein = smoothstep(.55,.85, fbm(surface*4.5 + vec2(uTime*.12,-uTime*.9)));
  totalEmissiveRadiance = vec3(.545,0.,0.)*(.22 + glowLum*1.3) + vec3(.4,0.,0.)*uBurn*flicker + vec3(.75,.06,.03)*vein*uBurn*.55;
`;

/**
 * 배경에 녹아들도록 역광 테두리, 공기의 옅은 막, 입자감을 더합니다.
 *
 * - 태양 속에서 불씨처럼 흩어집니다. 무늬는 몸 표면에 붙어 함께 움직입니다.
 */
export const birdOutput = /* glsl */ `
  float rim = pow(1.-clamp(dot(normal, geometryViewDir),0.,1.), 2.6);
  gl_FragColor.rgb += vec3(.95,.16,.1)*rim*uRim;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, uHazeAmount);
  if(uDissolve > 0.){
    float d = fbm(SURFACE_UV*9.);
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
 *
 * - 큰 깃털은 진자처럼 좌우로 흔들리며, 흔들리는 쪽으로 몸을 기울입니다.
 */
export const featherVertex = /* glsl */ `
attribute float aSeed, aHero;
uniform float uTime, uFall, uAspect, uLogo, uHeroRoll;
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
    roll = uHeroRoll;
    spin = sin(uTime*.35)*.55;
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

/**
 * - 내려오는 큰 깃털은 스스로 빛나고, 로고가 나타나면 사라집니다.
 */
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

/**
 * 배경: 신화(붉은 하늘) → 우주 → 전쟁 → 폭발·깃털·로고.
 * 단계마다 쓰지 않는 부분은 계산하지 않고, 불사조 윤곽의 흐림은 밉맵에서 몇 번만 읽어 만듭니다.
 *
 * - 반지름 r(화면 높이 비율)만큼 흐린 윤곽: 그 크기에 맞는 밉맵 단계에서 네 점을 읽습니다.
 * - uShift: 폭발 순간 화면 흔들림. 3D 장면의 카메라와 같은 방향으로 움직입니다.
 * - 신화: 진홍빛 극광과 태양의 빛살. 우주로 다 넘어가면 계산하지 않습니다.
 * - 우주: 별과 성운, 행성의 가장자리, 전쟁의 포화
 * - 태양: 가장자리로 갈수록 붉어지고(주연 감광) 표면이 천천히 끓습니다. 둘레에는 일렁이는 코로나.
 * - 초신성: 섬광, 퍼져 나가는 충격파
 * - 로고 뒤의 잔광과 나타나는 순간의 섬광
 * - 내려오는 깃털의 빛 무리와 위로 길게 남는 빛줄기
 * - 빛줄기를 따라 피어오르는 불씨: 칸마다 하나씩 둥글고 부드러운 점으로 반짝입니다.
 * - 불사조 뒤의 빛과 불길. 불사조가 사라진 뒤에는 읽지 않습니다.
 * - 불길은 빛이므로 밝은 태양 앞에서는 어둡게 덮지 않습니다(밝아지는 쪽만 남깁니다).
 * - 불사조 형상에서 바깥으로 뻗는 불길 줄기
 * - 글자가 묻히지 않도록 가장자리를 눌러 줍니다.
 */
export const backgroundFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMaskTex;
uniform vec2 uRes, uMaskSize;
uniform float uTime, uSun, uSunSize, uSunX, uCosmos, uWar, uBurn, uNova, uLogo, uHeroGlow, uMaskOn;
uniform vec2 uBird, uNovaAt, uLogoAt, uHeroAt, uShift;
varying vec2 vUv;
${noise}

float maskBlur(vec2 uv, float r){
  float lod = max(log2(max(r*uMaskSize.y, 1.)) - 1., 0.);
  vec2 o = vec2(r*uRes.y/uRes.x, r)*.5;
  return (texture2DLodEXT(uMaskTex, uv+vec2( o.x, o.y), lod).r
        + texture2DLodEXT(uMaskTex, uv+vec2(-o.x, o.y), lod).r
        + texture2DLodEXT(uMaskTex, uv+vec2( o.x,-o.y), lod).r
        + texture2DLodEXT(uMaskTex, uv+vec2(-o.x,-o.y), lod).r)*.25;
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
  vec2 p=(vUv-.5)*vec2(asp,1.)+uShift;
  float t=uTime;
  vec2 sc=p-vec2(uSunX,.24);
  float r=length(sc);
  vec2 around=normalize(sc+vec2(1e-4));
  vec3 col=vec3(0.);

  if(uCosmos<.999){
    float diag=dot(p,normalize(vec2(.7,-.72)));
    float flow=fbm(vec2(diag*2.4+t*.04, dot(p,vec2(.72,.7))*.8-t*.03));
    vec3 myth=mix(vec3(.2,0.,.012),vec3(.545,0.,0.),smoothstep(.2,.72,flow));
    myth=mix(myth,vec3(.74,.06,.07),smoothstep(.6,.86,flow)*.6);
    float halo=sin(r*11.-flow*3.+t*.2)*.5+.5;
    myth+=vec3(.45,.07,.07)*halo*smoothstep(.9,.25,r)*smoothstep(.1,.42,r)*uSun*.65;
    float rays=pow(fbm(around*5.5+vec2(t*.05,-t*.04)),2.2);
    myth+=vec3(.8,.08,.05)*rays*exp(-r*1.5)*uSun*2.4;
    myth+=vec3(1.,.4,.3)*exp(-r*5.2)*uSun*1.05;
    col=myth;
  }

  if(uCosmos>.001){
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
    if(uWar>.001){
      float war=0.;
      for(int i=0;i<9;i++){
        float f=float(i);
        float cyc=fract(t*(.17+f*.021)+f*.37);
        vec2 a=vec2(-1.2+mod(f*.47,2.4),.62-mod(f*.31,1.1))*vec2(asp*.62,1.);
        vec2 b=vec2(1.1-mod(f*.71,2.2),-.56+mod(f*.53,1.0))*vec2(asp*.62,1.);
        war+=beam(p,a,b,cyc*1.3);
      }
      cosmos+=vec3(1.,.2,.14)*war*uWar;
    }
    col=mix(col,cosmos,uCosmos);
  }

  float sunR=mix(.09,.2,uSunSize)*smoothstep(0.,.55,uSun)*mix(.62,1.,smoothstep(.5,1.,asp));
  if(sunR>.001 && uNova<.999){
    float sun=smoothstep(sunR+.04,sunR,r);
    float edge=clamp(r/max(sunR,1e-3),0.,1.);
    float boil=fbm(sc/max(sunR,.02)*4.+vec2(t*.06,-t*.05));
    vec3 disc=mix(vec3(1.,.93,.9),vec3(1.,.72,.64),edge*edge*.85+boil*.22);
    col=mix(col,disc,sun*smoothstep(.03,.07,sunR)*(1.-uNova));
    float corona=exp(-max(r-sunR,0.)*16.)*(.55+.45*fbm(around*6.+vec2(t*.25,r*4.-t*.4)));
    col+=vec3(1.,.32,.22)*corona*(1.-sun)*.32*smoothstep(.03,.08,sunR)*(1.-uNova);
  }

  if(uNova>.001 && uNova<.999){
    float nr=length(p-uNovaAt);
    float flash=exp(-nr*mix(1.2,6.,uNova))*sin(uNova*3.14159);
    float shock=smoothstep(.05,0.,abs(nr-uNova*1.6))*(1.-uNova);
    col+=vec3(1.,.55,.45)*flash*1.6+vec3(.95,.12,.08)*shock*1.4;
  }
  if(uLogo>.001){
    float lr=length(p-uLogoAt);
    col+=vec3(.545,0.,0.)*exp(-lr*2.6)*uLogo*.9;
    col+=vec3(1.,.5,.4)*exp(-lr*5.)*sin(uLogo*3.14159)*1.2;
  }
  if(uHeroGlow>.001){
    vec2 hp=p-uHeroAt;
    float heroHalo=exp(-length(hp)*4.5);
    float trail=exp(-abs(hp.x)*70.)*exp(-max(hp.y,0.)*1.6)*step(0.,hp.y);
    vec2 cell=vec2(60.,20.);
    vec2 g=vec2(hp.x,hp.y-t*.2)*cell;
    vec2 id=floor(g);
    float h=hash(id);
    float sparks=0.;
    if(h>.92){
      vec2 o=(vec2(hash(id+3.1),hash(id+7.7))-.5)*.7;
      float d=length((fract(g)-.5-o)/cell);
      sparks=smoothstep(.0055,0.,d)*(.55+.45*sin(t*7.+h*60.))*exp(-abs(hp.x)*14.)*exp(-max(hp.y,0.)*2.2)*step(0.,hp.y);
    }
    col+=(vec3(.78,.06,.04)*heroHalo*.9+vec3(1.,.4,.3)*trail*.55+vec3(1.,.6,.5)*sparks*1.4)*uHeroGlow;
  }

  if(uMaskOn>.5){
    vec2 uv=vUv;
    float glow=maskBlur(uv,.05);
    col+=vec3(.545,0.,0.)*glow*mix(.62,.95,uBurn);
    if(uBurn>.01){
      float n1=fbm(vec2(p.x*6.+t*.15,p.y*3.6-t*1.05));
      float n2=fbm(vec2(p.x*14.-t*.2,p.y*8.-t*1.8));
      vec2 off=vec2((n1-.5)*.09,-.03-.075*n2);
      float m=maskBlur(uv+off,.024);
      float wide=maskBlur(uv+off*2.2,.075);
      float flame=clamp(m*(.5+n2*.9)+wide*n1*.42,0.,1.);
      float stepped=floor(flame*5.)/5.;
      col=max(col,mix(col,fire(stepped),smoothstep(.3,.85,flame)*uBurn*.22));
      col+=vec3(.4,0.,0.)*wide*uBurn*.5;
      float rays=0.;
      for(int i=0;i<10;i++){
        float k=float(i)/10.;
        rays+=texture2DLodEXT(uMaskTex,mix(uv,uBird,k*.42),1.).r*(1.-k);
      }
      vec2 dir=normalize((uv-uBird)*vec2(asp,1.)+1e-4);
      float lines=fbm(dir*9.+vec2(length(uv-uBird)*3.-t*1.3,0.));
      rays=smoothstep(.15,.9,rays/5.5*(.45+lines*1.2));
      col+=vec3(.62,0.,0.)*rays*uBurn*1.1;
    }
  }

  float vig=smoothstep(1.25,.25,length(p/vec2(max(asp,1.),1.))*1.28);
  col*=mix(.52,1.,vig);
  col+=(hash(vUv*uRes+fract(t))-.5)*.018;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * 유성. 배경 셰이더와 같은 화면 단위(세로 -0.5~0.5, 가로는 화면 비율만큼)에서 바로 화면 좌표를 냅니다.
 * - 모든 유성은 화면 오른쪽 위 바깥의 한 점(복사점)에서 퍼져 나옵니다. 복사점에서 멀수록 길고 빠르게 긋습니다.
 * - 저마다 3~6.4초 주기로 다시 태어나며 주기마다 자리·빠르기·밝기를 새로 뽑습니다. 다섯 번에 한 번은 쉬어 박자가 고르지 않습니다.
 * - 밝기는 희미한 것이 많고 밝은 것은 드뭅니다. 꼬리는 지나온 거리보다 길어지지 않고, 밝을수록 끝에서 한 번 더 타오릅니다.
 * - 밝은 불덩이는 다 탄 뒤에도 자국(잔광)이 남아 넓게 번지며 1초쯤 식고, 바람에 흔들리듯 살짝 굽습니다.
 * - 화면 흔들림(uShift)은 배경과 같게 따르고, 세기(uIntensity)가 오를수록 더 많이 떨어집니다.
 * - 보이지 않는 유성은 화면 밖으로 보내 조각 셰이더를 돌리지 않습니다.
 */
export const meteorVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uIntensity, uAspect, uPixel;
uniform vec2 uShift;
varying vec2 vLocal;
varying float vLen, vCore, vGlow, vBright, vHeat, vTrain, vAfter, vSeed;
float h(float n){return fract(sin(mod(n,628.3185))*43758.5453);}
void main(){
  float period=3.+h(aSeed*3.1)*3.4;
  float cyc=uTime/period+h(aSeed*5.7)*7.;
  float k=mod(floor(cyc),997.);
  float age=fract(cyc)*period;
  float s=aSeed*17.3+k*1.618;
  float bright=pow(h(s+.11),1.7);
  float dur=mix(.45,1.,h(s+.23))*(1.+bright*.6);
  vec2 R=vec2(uAspect*.5+.32,.86);
  vec2 S=vec2((h(s+.37)-.5)*uAspect*1.1,mix(-.08,.5,h(s+.41)));
  float dist=length(S-R);
  vec2 D=(S-R)/dist;
  float speed=dist*mix(.5,.95,h(s+.53));
  float flown=speed*min(age,dur);
  float trail=min(min(dist*mix(.13,.28,h(s+.67))*(1.+bright*.6),.5),flown);
  vec2 head=S+D*flown;
  float life=age/dur;
  float after=max(age-dur,0.);
  float flare=1.+bright*.9*smoothstep(.5,.78,life)*(1.-smoothstep(.78,.96,life));
  float heat=smoothstep(0.,.14,life)*(1.-smoothstep(.62,1.,life))*flare;
  float train=step(1.,life)*smoothstep(.5,.85,bright)*exp(-after*2.4)*(1.-smoothstep(.9,1.3,after));
  float on=step(h(s+.79),.8)*smoothstep(h(s+.83)-.12,h(s+.83)+.12,uIntensity*1.15)*uIntensity;
  float core=mix(.85,2.3,bright)*uPixel;
  float glow=core*mix(4.5,8.5,bright)*step(life,1.);
  float halfW=max(max(glow*1.6,core*(1.2+after*5.)*3.),uPixel*3.);
  float a=mix(-max(glow,uPixel*2.),trail,position.x);
  vec2 p=head-D*a+vec2(-D.y,D.x)*position.y*halfW;
  if((heat+train)*on<.002) p=vec2(9.);
  vLocal=vec2(a,position.y*halfW);
  vLen=max(trail,uPixel);
  vCore=core; vGlow=max(glow,1e-5); vBright=bright; vAfter=after; vSeed=aSeed;
  vHeat=heat*on; vTrain=train*on;
  gl_Position=vec4((p-uShift)/vec2(uAspect,1.)*2.,0.,1.);
}`;

/**
 * - 머리는 하얗게 달아오른 점과 뒤로 조금 늘어진 빛 무리, 꼬리는 주황에서 진홍을 거쳐 검붉게 식으며 가늘어지고,
 *   머리 쪽 꼬리 둘레로는 빛이 은은하게 번집니다.
 * - 한 픽셀보다 가는 선은 넓히는 대신 그만큼 어둡게 해 움직일 때 깜빡이지 않게 합니다.
 * - 밝은 불덩이는 머리 쪽 꼬리가 부서지듯 자글거립니다.
 * - 더하기 섞기에서 알파를 1로 두고, 색 자체를 빛의 양으로 씁니다.
 */
export const meteorFragment = /* glsl */ `
precision highp float;
uniform float uTime, uPixel;
varying vec2 vLocal;
varying float vLen, vCore, vGlow, vBright, vHeat, vTrain, vAfter, vSeed;
float h(float n){return fract(sin(mod(n,628.3185))*43758.5453);}
void main(){
  float a=vLocal.x;
  float t=clamp(a/vLen,0.,1.);
  float back=step(0.,a);
  float w=vCore*(1.-t*.8);
  float we=max(w,uPixel*.75);
  float body=back*exp(-vLocal.y*vLocal.y/(we*we)*1.6)*(w/we)*exp(-t*2.4)*(1.-smoothstep(.72,1.,t));
  float grain=mix(1.,.55+.9*h(floor(a/(uPixel*4.))+floor(uTime*28.)+vSeed*91.),smoothstep(.6,1.,vBright)*(1.-t));
  vec2 q=vec2(a*(a<0.?1.6:.55),vLocal.y);
  float r2=dot(q,q);
  float halo=exp(-r2/(vGlow*vGlow)*2.2);
  float ce=max(vCore,uPixel*.8);
  float hot=exp(-r2/(ce*ce)*1.4)*(vCore/ce);
  vec3 white=vec3(1.,.95,.88);
  vec3 tail=mix(mix(vec3(1.,.6,.38),vec3(.95,.18,.1),smoothstep(.04,.42,t)),vec3(.48,.02,.04),smoothstep(.42,1.,t));
  tail=mix(white,tail,smoothstep(0.,.07,t));
  float bloom=back*exp(-vLocal.y*vLocal.y/(we*we*9.))*exp(-t*3.5)*.22;
  vec3 col=(tail*(body*grain*1.15+bloom)+vec3(1.,.5,.36)*halo*(.35+vBright*.6)+white*hot*1.6)*vHeat;
  float c=vLocal.y-sin(a*70.+vSeed*40.)*vAfter*.006;
  float tw=vCore*(1.2+vAfter*5.);
  float train=back*exp(-c*c/(tw*tw))*(1.-smoothstep(.8,1.,t))*smoothstep(0.,.1,t+.03);
  col+=mix(vec3(.95,.3,.22),vec3(.55,.03,.05),clamp(vAfter*1.2,0.,1.))*train*vTrain*.55;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * 혜성. 유성과 같은 화면 단위를 씁니다.
 * - 11~17초에 한 번씩 화면 양옆 바깥에서 들어와 태양 곁을 겨누고 날아듭니다. 태양에 끌려 휘며 점점 빨라지고,
 *   다가갈수록 꼬리가 길고 밝아지다가 태양의 눈부심 속으로 사라집니다. 씨앗을 고르게 나눠 한꺼번에 몰리지 않습니다.
 * - 길은 태양이 늘 있는 자리(가운데 위)를 기준으로 정해, 스크롤에 따라 태양이 옮겨 가도 혜성이 미끄러지지 않습니다.
 * - 세로로 긴 화면에서는 태양이 위쪽을 거의 덮어 곁으로 날아들 자리가 없으므로, 화면이 좁을수록 불사조와 글 사이의
 *   하늘을 천천히 가로질러 건너고 태양에 덜 끌립니다(데스크톱의 길에서 부드럽게 바뀜). 이때는 늘 태양 반대쪽
 *   가장자리에서 태양 쪽으로 건너, 꼬리가 진행 방향의 앞에 놓이지 않습니다.
 * - 꼬리는 늘 지금의 태양(uSun) 반대쪽, 곧 날아가는 방향의 뒤를 향합니다. 곧고 가는 이온 꼬리와,
 *   지나온 길 쪽으로 휘며 넓게 퍼지는 먼지 꼬리 두 갈래입니다.
 */
export const cometVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uIntensity, uAspect;
uniform vec2 uShift, uSun;
varying vec2 vLocal;
varying float vLen, vComa, vCurve, vAlpha, vSeed;
float h(float n){return fract(sin(mod(n,628.3185))*43758.5453);}
void main(){
  float period=11.+h(aSeed*3.3)*6.;
  float cyc=uTime/period+aSeed;
  float k=mod(floor(cyc),997.);
  float life=fract(cyc);
  float t=life*period;
  float s=aSeed*13.7+k*2.414;
  float side=h(s+.1)<.5?-1.:1.;
  float hw=uAspect*.5;
  float narrow=1.-smoothstep(.6,1.2,uAspect);
  side=narrow>.5?-sign(uSun.x+1e-4):side;
  vec2 focus=vec2(0.,.24);
  vec2 start=vec2(side*(hw+.04),mix(mix(-.02,.44,h(s+.3)),mix(-.22,-.06,h(s+.3)),narrow));
  vec2 aim=mix(focus+vec2(side*mix(.14,.34,h(s+.2)),mix(-.2,.16,h(s+.4))),vec2(-side*hw*mix(.3,.9,h(s+.2)),start.y+mix(-.05,.05,h(s+.4))),narrow);
  float speed=mix(mix(.075,.12,h(s+.5)),mix(.045,.07,h(s+.5)),narrow);
  vec2 vel=normalize(aim-start)*speed;
  vec2 pull=normalize(focus-start)*mix(.003,.008,h(s+.6))*(1.-narrow*.8);
  vec2 C=start+vel*t+.5*pull*t*t;
  vec2 v=vel+pull*t;
  float ta=length(aim-start)*1.25/speed;
  float r=length(C-uSun);
  vec2 T=(C-uSun)/max(r,1e-4);
  vec2 N=vec2(-T.y,T.x);
  float near=1.-smoothstep(.25,.95,r);
  float len=mix(.15,.26,h(s+.7))*(1.+near*.7);
  float coma=mix(.008,.013,h(s+.8))*(1.+near*.25)*(1.+.06*sin(uTime*1.7+aSeed*9.));
  float curve=-sign(dot(v,N)+1e-5)*mix(.1,.2,h(s+.9));
  float alpha=smoothstep(0.,.08,life)*(1.-smoothstep(.9,1.,life))*(1.-smoothstep(ta*.8,ta,t))*smoothstep(.17,.32,r)*(.75+near*.5)*smoothstep(h(s+.95)*.5,h(s+.95)*.5+.3,uIntensity)*uIntensity;
  float halfW=len*(.13+abs(curve))+coma*3.5;
  float a=mix(-coma*5.,len,position.x);
  vec2 p=C+T*a+N*position.y*halfW;
  vLocal=vec2(a,position.y*halfW);
  vLen=len; vComa=coma; vCurve=curve; vAlpha=alpha; vSeed=aSeed;
  if(alpha<.002) p=vec2(9.);
  gl_Position=vec4((p-uShift)/vec2(uAspect,1.)*2.,0.,1.);
}`;

/**
 * - 핵은 작고 하얗게 반짝이고, 둘레의 코마는 숨 쉬듯 조금씩 부풀며 꼬리 쪽으로 늘어집니다.
 * - 이온 꼬리는 분홍빛 흰색으로 가늘게 곧고, 결이 꼬리 끝으로 빠르게 흘러갑니다.
 * - 먼지 꼬리는 주황에서 진홍으로 식으며 끝으로 갈수록 넓고 흐려지고, 떨어져 나온 부스러기가 반짝이며 뒤로 흩어집니다.
 */
export const cometFragment = /* glsl */ `
precision highp float;
uniform float uTime, uPixel;
varying vec2 vLocal;
varying float vLen, vComa, vCurve, vAlpha, vSeed;
float h(float n){return fract(sin(mod(n,628.3185))*43758.5453);}
float vn(float x){float i=floor(x),f=fract(x);return mix(h(i),h(i+1.),f*f*(3.-2.*f));}
void main(){
  float a=vLocal.x, c=vLocal.y;
  float s=clamp(a/vLen,0.,1.);
  float back=step(0.,a);
  float wi=vComa*.45+s*vLen*.03;
  float ion=back*exp(-c*c/(wi*wi))*exp(-s*2.)*(1.-s)*(.45+.55*vn(c/wi*2.5+vSeed*31.)*vn(s*7.-uTime*2.4+vSeed*17.));
  float c0=vCurve*s*s*vLen;
  float wd=vComa*.9+s*vLen*.11;
  float dust=back*exp(-(c-c0)*(c-c0)/(wd*wd)*1.4)*exp(-s*1.5)*(1.-s*s)*(.8+.2*vn(s*12.-uTime*.9+vSeed*7.));
  vec2 cell=vec2(a/vComa*1.1-uTime*1.6,(c-c0)/vComa*1.1);
  float speck=back*step(.9,h(floor(cell.x)+floor(cell.y)*7.13+vSeed*57.))*smoothstep(.32,.06,length(fract(cell)-.5))*exp(-(c-c0)*(c-c0)/(wd*wd)*.9)*smoothstep(0.,.06,s)*(1.-s);
  vec2 q=vec2(a*(a<0.?1.3:.75),c);
  float d2=dot(q,q);
  float coma=exp(-d2/(vComa*vComa)*1.2);
  float halo=exp(-d2/(vComa*vComa*5.8));
  float pe=max(uPixel*1.1,vComa*.12);
  float nucleus=exp(-d2/(pe*pe))*(.9+.1*sin(uTime*6.+vSeed*40.));
  vec3 col=vec3(1.,.97,.93)*nucleus*1.7+vec3(1.,.8,.72)*coma*.9+vec3(1.,.4,.32)*halo*.28+vec3(1.,.74,.76)*ion*.5+mix(vec3(1.,.52,.34),vec3(.72,.07,.06),s)*dust*.55+vec3(1.,.7,.55)*speck*.45;
  gl_FragColor=vec4(col*vAlpha,1.);
}`;

/**
 * - 비행 중에는 태양 쪽에서 카메라 쪽으로 스쳐 지나갑니다.
 * - 카메라 바로 앞의 불티는 커다란 흐린 점이 되므로 크기를 묶고 흐리게 지웁니다.
 */
export const emberVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uHeat, uScale, uFlight, uMaxPoint;
varying float vLife, vSeed, vNear;
void main(){
  vec3 p=position;
  float speed=.12+aSeed*.25+uHeat*.5;
  float life=fract(uTime*speed*.14+aSeed*7.);
  p.y+=(life-.5)*16.;
  p.x+=sin(life*9.+aSeed*30.)*.5;
  float rush=fract(uTime*(.22+aSeed*.3)+aSeed*11.);
  vec2 dir=normalize(position.xy+vec2(.01));
  vec3 flown=vec3(dir*(.2+rush*rush*13.)+vec2(0.,1.9),position.z*.3+rush*7.);
  p=mix(p,flown,uFlight);
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vLife=mix(life,.1+rush*.5,uFlight); vSeed=aSeed;
  vNear=smoothstep(1.2,3.5,-mv.z);
  gl_PointSize=min((.035+pow(aSeed,5.)*.2)*uScale/max(1.,-mv.z)*(1.+uHeat*.5+uFlight*.8), uMaxPoint);
  gl_Position=projectionMatrix*mv;
}`;

export const emberFragment = /* glsl */ `
precision highp float;
uniform float uHeat;
varying float vLife, vSeed, vNear;
void main(){
  vec2 c=gl_PointCoord-.5;
  float d=length(c);
  float star=smoothstep(.09,.0,abs(c.x)*abs(c.y)*42.)*smoothstep(.5,.05,d);
  float a=(star+smoothstep(.2,.0,d))*smoothstep(0.,.14,vLife)*smoothstep(1.,.65,vLife)*vNear;
  vec3 cool=vec3(1.,.74,.68), hot=vec3(1.,.2,.12);
  gl_FragColor=vec4(mix(cool,hot,uHeat)*a,a);
}`;

/** 불사조 날개 뒤로 흩날리는 불티 꼬리. 날아가는 속도감과 열기를 더합니다. */
export const trailVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uIntensity, uScale, uMaxPoint, uSpan;
uniform vec3 uOrigin, uBack, uRight, uUp;
varying float vLife, vAlpha;
void main(){
  float s=aSeed;
  float life=fract(uTime*(.45+s*.5)+s*17.);
  float lane=fract(s*7.13)-.5;
  float lift=fract(s*3.71)-.5;
  vec3 start=uOrigin+uRight*lane*uSpan*.95+uUp*lift*.5;
  vec3 drift=uBack*(life*life*10.+life*1.5)+uUp*(sin(life*6.+s*20.)*.35+life*.8)+uRight*sin(life*4.+s*9.)*.4;
  vec4 mv=modelViewMatrix*vec4(start+drift,1.);
  vLife=life;
  vAlpha=uIntensity*smoothstep(0.,.08,life)*(1.-life)*smoothstep(.8,3.,-mv.z);
  gl_PointSize=min((.09+fract(s*5.3)*.15)*uScale/max(1.,-mv.z)*(1.4-life*.6), uMaxPoint);
  gl_Position=projectionMatrix*mv;
}`;

/**
 * - 더하기 섞기라 알파가 한 번 더 곱해집니다. 색에는 알파를 곱하지 않습니다.
 */
export const trailFragment = /* glsl */ `
precision highp float;
varying float vLife, vAlpha;
void main(){
  float d=length(gl_PointCoord-.5);
  float a=smoothstep(.5,0.,d)*vAlpha;
  vec3 col=mix(vec3(1.,.5,.36),vec3(.6,.02,.01),vLife);
  gl_FragColor=vec4(col*1.5,a);
}`;
