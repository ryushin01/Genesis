const noise = /* glsl */ `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float a=.5,v=0.; for(int i=0;i<4;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return v; }
`;

const noise3 = /* glsl */ `
float hash3(vec3 p){ p=fract(p*.3183099+vec3(.71,.113,.419)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise3(vec3 x){
  vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm3(vec3 p){ float a=.5,v=0.; for(int i=0;i<4;i++){ v+=a*noise3(p); p=p*2.02+vec3(3.1,1.7,5.3); a*=.5; } return v; }
`;

/**
 * 장면 흐름에 맞춘 색 보정. 노출을 곱하고, 채도를 조절한 뒤 밝은 부분에는 highlight를 곱하고 어두운 부분에는 shadow를 섞습니다.
 * 배경·불사조·깃털이 같은 값을 써서 장면 전체가 한 색감으로 바뀝니다.
 */
export const gradeChunk = /* glsl */ `
uniform vec3 uShadow, uHighlight;
uniform float uSaturation, uExposure;
vec3 grade(vec3 c){
  c*=uExposure;
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=max(mix(vec3(l),c,uSaturation),0.);
  return c*mix(vec3(1.),uHighlight,smoothstep(.05,.8,l))+uShadow*(1.-smoothstep(0.,.35,l));
}
`;

/**
 * 결정 불사조·깃털(레퍼런스 모델)의 꼭짓점 셰이더. 뼈대 애니메이션을 적용하고, 면 노멀은 조각 셰이더가 화면 미분으로 만듭니다.
 * 모델의 사용자 속성 `_peaks`(결정 끝의 뾰족함)와 `_thickness`(조각 두께)를 넘깁니다.
 */
export const crystalVertex = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute float _peaks;
attribute float _thickness;
varying vec3 vView, vWorld, vLocal;
varying float vPeaks, vThick;
void main(){
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 world=modelMatrix*vec4(transformed,1.);
  vec4 mv=viewMatrix*world;
  vView=mv.xyz; vWorld=world.xyz; vLocal=position;
  vPeaks=_peaks; vThick=_thickness;
  gl_Position=projectionMatrix*mv;
}`;

/**
 * 진홍 결정: 레퍼런스의 유리 결정 불사조를 #8B0000 계열로 옮긴 재질입니다.
 *
 * - 결정 조각마다 면이 평평하므로 화면 미분으로 면 노멀을 만듭니다. 조각마다 밝기와 무지갯빛 위상을 조금씩 달리합니다.
 * - 얇은 조각은 태양 빛이 비쳐 주황으로 달아오르고(가짜 투과), 두꺼운 조각은 깊은 진홍으로 남습니다.
 * - 비스듬히 보이는 면(프레넬)과 결정 끝(_peaks)에는 금빛 테두리와 무지갯빛이 돌고, 태양 쪽 반사는 하얗게 빛납니다.
 * - 태양에 다가가면 표면을 따라 불길이 흐르고(uBurn), 빛 속에서 불씨로 흩어집니다(uDissolve).
 * - uMask가 켜지면 윤곽만 흰색으로 그립니다(배경의 빛 무리·불길용).
 */
export const crystalFragment = /* glsl */ `
uniform float uTime, uBurn, uMask, uDissolve, uRim, uGlow, uOpacity;
uniform vec3 uSunDir;
${gradeChunk}
varying vec3 vView, vWorld, vLocal;
varying float vPeaks, vThick;
${noise3}
void main(){
  if(uDissolve>0.){
    float d=fbm3(vLocal*9.);
    if(d<uDissolve*1.2-.1) discard;
  }
  if(uMask>.5){ gl_FragColor=vec4(1.); return; }
  vec3 n=normalize(cross(dFdx(vView),dFdy(vView)));
  vec3 v=normalize(-vView);
  if(dot(n,v)<0.) n=-n;
  vec3 wn=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
  float facet=hash3(floor(wn*7.+vLocal*3.));
  float ndv=clamp(dot(n,v),0.,1.);
  float fres=pow(1.-ndv,3.);
  float thin=1.-smoothstep(.008,.12,vThick);
  float peak=clamp(vPeaks*2.2,0.,1.);
  vec3 l=normalize(uSunDir);
  float through=pow(clamp(dot(-v,l)*.5+.5,0.,1.),2.);
  float diffuse=clamp(dot(n,l),0.,1.);
  float spec=pow(clamp(dot(reflect(-v,n),l),0.,1.),28.);
  float iri=.5+.5*sin(ndv*10.+facet*6.2832+peak*5.+uTime*.25);
  vec3 deep=vec3(.09,0.,.012), crimson=vec3(.545,0.,0.), ember=vec3(1.,.3,.1), gold=vec3(1.,.7,.42), rose=vec3(1.,.45,.5);
  float lit=.45+.55*diffuse;
  vec3 col=mix(deep,crimson,.2+.8*facet)*lit*(.85+.3*thin);
  float back=pow(through,4.);
  col+=vec3(.95,.14,.04)*back*(.2+.8*peak)*(.35+uGlow*.45);
  col+=mix(ember,gold,iri)*fres*.7;
  col+=rose*fres*iri*.22;
  col+=gold*peak*.22;
  col+=vec3(1.,.9,.85)*spec*.9;
  col+=vec3(1.,.28,.16)*fres*uRim;
  if(uBurn>0.){
    float flicker=fbm3(vLocal*6.+vec3(0.,-uTime*1.6,uTime*.4));
    float vein=smoothstep(.55,.85,fbm3(vLocal*3.5+vec3(uTime*.15,-uTime*.9,0.)));
    col+=(vec3(.6,.03,0.)*flicker+vec3(1.,.45,.15)*vein*.7)*uBurn;
  }
  if(uDissolve>0.){
    float d=fbm3(vLocal*9.);
    col+=vec3(1.,.55,.3)*smoothstep(.1,0.,d-(uDissolve*1.2-.1))*2.;
  }
  col=grade(col);
  col+=(fract(sin(dot(gl_FragCoord.xy+fract(uTime)*91.,vec2(12.9898,78.233)))*43758.5453)-.5)*.02;
  gl_FragColor=vec4(col,uOpacity);
}`;

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


export const skyVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`;

/**
 * 우주 배경. 화소마다 카메라 방향(uCamRot·uTan)으로 시선을 만들어, 아주 먼 것은 카메라가 돌 때만 움직이게 합니다.
 * 가까운 별·우주 먼지는 3D 점(starfield.ts)으로 따로 그려 비행할 때 겹마다 다르게 흐릅니다(시차).
 *
 * - 먼 별: 시선 방향의 3D 칸마다 별 하나. 칸 크기를 화면 픽셀로 바꿔 별이 늘 1~2픽셀로 또렷합니다. 두 겹이고 반짝입니다.
 * - 은하수 띠: 기울어진 큰 원을 따라 빛나는 띠와 그 안의 어두운 먼지 줄기, 띠 안에서 더 촘촘한 별.
 * - 성운: 3D 노이즈 두 겹으로 진홍·자줏빛 구름과 주황빛 가장자리. 우주로 나아갈수록 짙어지고 끝 장면에서는 가라앉습니다.
 * - 먼 은하: 정해 둔 방향 몇 곳에 기울어진 나선 은하(가운데 팽대부와 휘감기는 팔).
 * - 태양(화면에 투영한 자리 uSunAt, 반지름 uSunR): 가장자리 감광과 끓는 표면, 둘레의 코로나 줄기, 가장자리의 홍염(플레어),
 *   넓은 빛 번짐, 빛살, 화면 가운데를 지나는 렌즈 고스트.
 * - 초신성: 불사조가 태양에 닿는 순간의 섬광과 퍼지는 충격파.
 * - 내려오는 깃털: 빛 무리와 위로 길게 뻗는 빛줄기, 그 줄기를 따라 피어오르는 불씨.
 * - 로고 뒤의 잔광과 나타나는 순간의 섬광.
 * - 불사조 윤곽(uMaskTex)으로 뒤의 빛 무리와 불길·빛줄기. 윤곽의 흐림은 밉맵에서 몇 번만 읽습니다.
 * - 끝으로 색 보정, 가장자리 어둡게, 입자감.
 */
export const skyFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMaskTex;
uniform vec2 uRes, uMaskSize, uTan;
uniform mat3 uCamRot;
uniform float uTime, uSunOn, uSunR, uCosmos, uWar, uBurn, uNova, uLogo, uFeatherGlow, uMaskOn, uDark;
uniform vec2 uSunAt, uBird, uNovaAt, uLogoAt, uFeatherAt, uShift;
${gradeChunk}
varying vec2 vUv;
${noise}
${noise3}

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

vec3 starLayer(vec3 d, float scale, float keep, float px, float t){
  vec3 g=d*scale, id=floor(g), f=fract(g)-.5;
  float h=hash3(id);
  if(h>keep) return vec3(0.);
  vec3 o=(vec3(hash3(id+1.7),hash3(id+3.1),hash3(id+5.9))-.5)*.5;
  float r=length(f-o)/px;
  float mag=pow(hash3(id+9.3),3.);
  float core=exp(-r*r*(1.6-mag))*(.35+mag*1.6);
  float tw=.75+.25*sin(t*(1.3+h*4.)+h*80.);
  vec3 tint=mix(vec3(1.,.78,.7),vec3(.82,.86,1.),step(.82,hash3(id+4.4)));
  return tint*core*tw;
}

vec3 galaxy(vec3 d, vec3 axis, vec3 up, float size, float tilt, float seed){
  float c=dot(d,axis);
  if(c<.985) return vec3(0.);
  vec3 t=normalize(cross(axis,up)), b=cross(t,axis);
  vec2 q=vec2(dot(d,t),dot(d,b))/size;
  float ca=cos(seed), sa=sin(seed);
  q=mat2(ca,-sa,sa,ca)*q;
  q.y/=tilt;
  float r=length(q);
  float a=atan(q.y,q.x);
  float arms=.5+.5*cos(2.*a-log(r+.05)*5.+seed);
  float disk=exp(-r*3.2)*(.35+.9*arms*smoothstep(.05,.35,r));
  float bulge=exp(-r*r*40.);
  float dust=fbm(q*9.+seed);
  return (vec3(.9,.55,.5)*disk*(.6+.6*dust)+vec3(1.,.86,.75)*bulge*1.4)*smoothstep(.985,.993,c);
}

void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(vUv-.5)*vec2(asp,1.)+uShift;
  float t=uTime;
  vec2 ndc=vUv*2.-1.;
  vec3 d=normalize(uCamRot*vec3(ndc*uTan,-1.));
  float px=2.*uTan.y/uRes.y;
  float calm=1.-uDark*.7;

  vec3 col=mix(vec3(.018,.002,.008),vec3(.006,.001,.006),uDark);
  vec3 bandN=normalize(vec3(.12,.92,.38));
  float lat=dot(d,bandN);
  float band=exp(-lat*lat/.03);
  float lanes=smoothstep(.56,.72,fbm3(d*19.+vec3(4.,1.,2.)));
  float glow=band*(.55+.7*fbm3(d*5.))*(1.-lanes*.5);
  col+=vec3(.32,.07,.09)*glow*.55*calm;
  float n1=fbm3(d*2.2+vec3(0.,t*.004,0.));
  float n2=fbm3(d*5.3+n1*1.8);
  float cloud=smoothstep(.36,.8,n1)*(.45+.75*n2);
  float front=exp(-length(d-normalize(vec3(1.,.06,.12)))*2.2);
  vec3 neb=mix(vec3(.3,.01,.04),vec3(.24,.015,.1),smoothstep(.3,.7,n2));
  neb+=vec3(.85,.22,.08)*smoothstep(.7,.95,n2)*smoothstep(.55,.8,n1)*.6;
  col+=neb*(cloud*1.6+front*.35*(.5+n2))*mix(.5,1.,uCosmos)*calm;
  col+=galaxy(d,normalize(vec3(1.,.13,-.3)),vec3(0.,1.,0.),.03,.38,1.3)*calm;
  col+=galaxy(d,normalize(vec3(1.,-.14,-.2)),vec3(0.,1.,0.),.02,.55,4.1)*calm;
  col+=galaxy(d,normalize(vec3(1.,.2,-.08)),vec3(0.,1.,0.),.016,.3,2.6)*calm*.8;
  col+=galaxy(d,normalize(vec3(1.,-.02,.3)),vec3(0.,1.,0.),.012,.45,5.2)*calm;
  col+=starLayer(d,260.,.11+band*.22,px*260.,t);
  col+=starLayer(d+.37,520.,.06+band*.3,px*520.,t)*.75;

  vec2 sc=p-uSunAt;
  float r=length(sc);
  float R=max(uSunR,1e-4);
  if(uSunOn>.001){
    float ang=atan(sc.y,sc.x);
    float x=r/R;
    float edge=clamp(x,0.,1.);
    float boil=fbm(sc/R*3.2+vec2(t*.07,-t*.05));
    vec3 disc=mix(vec3(1.,.96,.92),vec3(1.,.62,.48),edge*edge*.9+boil*.25);
    float inside=smoothstep(1.02,.98,x);
    float streamers=.55+.45*fbm(vec2(ang*4.,x*2.2-t*.12));
    float corona=exp(-max(x-1.,0.)*1.8)*streamers;
    float flareA=fbm(vec2(ang*7.+1.3,t*.18));
    float flares=smoothstep(.55,.8,flareA)*exp(-max(x-1.,0.)*7.)*smoothstep(.97,1.05,x);
    float bloom=1./(1.+x*x*.9);
    float rays=pow(abs(cos(ang*5.+t*.03)),160.)*(.4+.6*vnoise(vec2(ang*9.,t*.3)))+pow(abs(cos(ang*3.-.6-t*.02)),220.)*.6;
    rays*=exp(-x*.45)*smoothstep(1.,1.8,x);
    vec3 sun=vec3(1.,.42,.26)*corona*.75*(1.-inside)+vec3(1.,.3,.12)*flares*1.4+vec3(1.,.36,.22)*bloom*.55+vec3(1.,.72,.6)*rays*.18;
    for(int i=0;i<3;i++){
      float k=-.35-float(i)*.55;
      float gr=R*(1.6+float(i)*1.4);
      float gd=length(p-uSunAt*k);
      sun+=vec3(.55,.12,.1)*smoothstep(gr,gr*.7,gd)*smoothstep(gr*.4,gr*.85,gd)*.09;
    }
    col=mix(col,disc,inside*uSunOn);
    col+=sun*uSunOn;
  }

  if(uNova>.001 && uNova<.999){
    float nr=length(p-uNovaAt);
    float flash=exp(-nr*mix(1.,6.,uNova))*sin(uNova*3.14159);
    float shock=exp(-abs(nr-uNova*1.7)*60.)*(1.-uNova);
    float ring2=exp(-abs(nr-uNova*1.1)*120.)*(1.-uNova);
    col+=vec3(1.,.62,.5)*flash*2.+vec3(.95,.16,.08)*shock*.9+vec3(1.,.5,.3)*ring2*.5;
  }
  if(uLogo>.001){
    float lr=length(p-uLogoAt);
    col+=vec3(.545,0.,0.)*exp(-lr*2.6)*uLogo*.9;
    col+=vec3(1.,.5,.4)*exp(-lr*5.)*sin(uLogo*3.14159)*1.2;
  }
  if(uFeatherGlow>.001){
    vec2 hp=p-uFeatherAt;
    float halo=exp(-length(hp*vec2(1.,.75))*4.2);
    float beam=exp(-abs(hp.x)*55.)*exp(-max(hp.y,0.)*1.1)*step(0.,hp.y);
    float wide=exp(-abs(hp.x)*9.)*exp(-max(hp.y,0.)*.9)*step(0.,hp.y);
    vec2 cell=vec2(60.,20.);
    vec2 g=vec2(hp.x,hp.y-t*.2)*cell;
    vec2 id=floor(g);
    float h=hash(id);
    float sparks=0.;
    if(h>.92){
      vec2 o=(vec2(hash(id+3.1),hash(id+7.7))-.5)*.7;
      float sd=length((fract(g)-.5-o)/cell);
      sparks=smoothstep(.0055,0.,sd)*(.55+.45*sin(t*7.+h*60.))*exp(-abs(hp.x)*14.)*exp(-max(hp.y,0.)*2.)*step(0.,hp.y);
    }
    col+=(vec3(.7,.04,.03)*halo*.9+vec3(1.,.42,.3)*beam*.6+vec3(.5,.03,.02)*wide*.5+vec3(1.,.62,.5)*sparks*1.4)*uFeatherGlow;
  }

  if(uMaskOn>.5){
    vec2 uv=vUv;
    float halo=maskBlur(uv,.05);
    col+=vec3(.545,0.,0.)*halo*mix(.45,.95,uBurn);
    if(uBurn>.01){
      float m1=fbm(vec2(p.x*6.+t*.15,p.y*3.6-t*1.05));
      float m2=fbm(vec2(p.x*14.-t*.2,p.y*8.-t*1.8));
      vec2 off=vec2((m1-.5)*.09,-.03-.075*m2);
      float m=maskBlur(uv+off,.024);
      float wide=maskBlur(uv+off*2.2,.075);
      float flame=clamp(m*(.5+m2*.9)+wide*m1*.42,0.,1.);
      col=max(col,mix(col,fire(floor(flame*5.)/5.),smoothstep(.3,.85,flame)*uBurn*.3));
      col+=vec3(.45,0.,0.)*wide*uBurn*.6;
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

  col=grade(col);
  float vig=smoothstep(1.25,.25,length(p/vec2(max(asp,1.),1.))*1.28);
  col*=mix(.55,1.,vig);
  col+=(hash(vUv*uRes+fract(t))-.5)*.016;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * 가까운 별·중간 별·우주 먼지(3D 점). 비행 경로를 둘러싸고 놓여, 카메라가 날아갈 때 가까운 겹일수록 빠르게 스칩니다.
 *
 * - aKind 0: 별(먼 곳, 작고 또렷함), 1: 먼지(경로 가까이, 크고 흐림, 천천히 떠다님).
 * - 크기는 화면 높이(uScale)와 거리로 정하고, 픽셀 하나보다 작아지면 크기 대신 밝기를 줄여 깜빡이지 않게 합니다.
 * - 카메라 바로 앞의 먼지는 큰 흐린 원이 되지 않게 흐리게 지웁니다.
 */
export const starVertex = /* glsl */ `
attribute float aSeed, aKind;
uniform float uTime, uScale, uMaxPoint, uPixelRatio, uDust, uStars;
varying float vAlpha, vKind, vSeed;
void main(){
  vec3 p=position;
  if(aKind>.5){
    p+=vec3(sin(uTime*.07+aSeed*40.)*.6,sin(uTime*.11+aSeed*23.)*.4,cos(uTime*.05+aSeed*17.)*.6);
  }
  vec4 mv=modelViewMatrix*vec4(p,1.);
  float z=max(-mv.z,.1);
  float base=aKind>.5?(.035+aSeed*.05):(.05+pow(aSeed,6.)*.3);
  float size=base*uScale/z;
  float minSize=1.2*uPixelRatio;
  vAlpha=clamp(size/minSize,0.,1.);
  gl_PointSize=clamp(size,minSize,uMaxPoint);
  vAlpha*=aKind>.5?uDust*smoothstep(.6,2.5,z)*(1.-smoothstep(25.,40.,z)):uStars*(.6+.4*sin(uTime*(1.+aSeed*3.)+aSeed*60.));
  vKind=aKind; vSeed=aSeed;
  gl_Position=projectionMatrix*mv;
}`;

export const starFragment = /* glsl */ `
precision highp float;
uniform vec3 uHighlight;
varying float vAlpha, vKind, vSeed;
void main(){
  vec2 c=gl_PointCoord-.5;
  float d=length(c);
  float a;
  vec3 col;
  if(vKind>.5){
    a=smoothstep(.5,0.,d)*.35;
    col=mix(vec3(.9,.25,.15),vec3(1.,.7,.5),vSeed);
  } else {
    a=exp(-d*d*28.)+smoothstep(.08,.0,abs(c.x)*abs(c.y)*40.)*smoothstep(.5,.1,d)*.4;
    col=mix(vec3(1.,.82,.76),vec3(.85,.88,1.),step(.85,vSeed));
  }
  gl_FragColor=vec4(col*uHighlight*a*vAlpha,1.);
}`;

/**
 * 불사조가 태양에 닿아 터진 뒤 흩어지는 작은 깃털들(3D 모델). 터진 자리(uSun)에서 사방으로 흩어졌다 사라집니다.
 */
export const featherVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uFall, uAspect;
uniform vec2 uSun;
varying float vFacing, vY, vLight;
void main(){
  vY = position.y;
  float s = aSeed;
  float spin = uTime*(.35+s*.5) + s*20.;
  float roll = sin(uTime*(.6+s*.4) + s*31.)*.55;
  vec3 local = position;
  vec3 n = normal;
  float size = .6 + s*.7;
  float a = s*6.2832*3.;
  vec2 dir = vec2(cos(a), sin(a));
  float out1 = 1.-exp(-uFall*7.);
  vec2 at = uSun + dir*vec2(uAspect,1.)*(1.4+s*3.)*out1 + vec2(0., -uFall*uFall*(2.+s*3.));
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
uniform float uFall;
varying float vFacing, vY, vLight;
void main(){
  vec3 col = mix(vec3(.2,0.,0.), vec3(.545,0.,0.), vLight);
  col *= .72 + .4*vFacing;
  float ember = (1.-smoothstep(.15,.7,uFall)) + .2;
  col += vec3(.9,.12,.06)*smoothstep(.6,1.,vY)*ember;
  float alpha = smoothstep(0.,.04,uFall)*(1.-smoothstep(.25,.6,uFall));
  gl_FragColor = vec4(col, alpha);
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
