/**
 * 인트로 불사조 장면의 설정을 한곳에 모읍니다. 불사조 모델을 바꿀 때는 이 파일만 고칩니다.
 *
 * 비행 궤적·카메라·태양·깃털의 움직임은 타임라인 파일(레퍼런스의 Blender 타임라인)을 따르고, 모델은 그 위에 얹습니다.
 * 타임라인의 불사조 노드는 레퍼런스 모델(phoenix-crystal.glb)의 원래 자세·크기를 기준으로 움직이므로,
 * 다른 모델을 넣을 때는 `rotation`·`wingspan`으로 그 자세·크기에 맞추고 `clips`에 날갯짓 클립 이름을 적습니다.
 */

export interface PhoenixClips {
  /** 평소 날갯짓(타임라인 클립 번호 0). */
  flying: string;
  /** 맨 처음 날개를 화면 가득 보여 줄 때의 클립(번호 2). 없으면 flying을 씁니다. */
  closeUp?: string;
  /** 활공(번호 3). 없으면 flying을 씁니다. */
  gliding?: string;
}

export interface PhoenixModelConfig {
  /** 모델 주소(public 아래). meshopt·양자화로 압축한 glTF 바이너리. */
  url: string;
  /**
   * 날개 폭(장면 단위). 모델의 실제 크기를 이 값에 맞춥니다. 레퍼런스 모델은 약 3.76입니다.
   * 타임라인의 카메라 거리는 이 크기에 맞춰져 있으므로 바꾸면 화면 속 크기가 함께 바뀝니다.
   */
  wingspan: number;
  /** 모델을 타임라인의 자세에 맞추는 회전(라디안, XYZ 오일러). 레퍼런스 모델은 머리가 +z, 날개가 x축입니다. */
  rotation: readonly [number, number, number];
  /** 크기를 맞춘 뒤의 위치 보정(장면 단위). 몸의 중심을 타임라인 노드에 맞춥니다. */
  offset: readonly [number, number, number];
  /** 애니메이션 클립 이름. 타임라인의 클립 번호(Phoenix_animationId)를 이 이름으로 바꿔 재생합니다. */
  clips: PhoenixClips;
  /**
   * 재질: `crystal`은 면 노멀을 화면 미분으로 만들어 그리는 진홍 결정(노멀·UV가 없는 레퍼런스 모델용),
   * `textured`는 모델의 텍스처·노멀을 그대로 쓰면서 같은 진홍 색조·불길 셰이더를 입힙니다.
   */
  material: 'crystal' | 'textured';
  /**
   * 클립의 처음·끝 자세를 맞추고 곡선으로 다시 샘플할지. 키가 성기고 이음매에서 튀는 모델에만 켭니다.
   * 레퍼런스 모델의 클립은 이미 촘촘하고 이어지므로 그대로 재생합니다(레퍼런스와 같음).
   */
  smoothLoop: boolean;
  /** 그리지 않을 메시 이름(레퍼런스 원본의 `trail`은 커서 꼬리용 띠라 숨김. 줄인 파일에서는 이미 뺐음). */
  hiddenMeshes: readonly string[];
}

/** 레퍼런스(storytelling.noomoagency.com, 사용자 허락)의 결정 불사조. 노멀·UV를 빼고 줄인 판입니다. */
const CRYSTAL: PhoenixModelConfig = {
  url: '/models/phoenix-crystal.glb',
  wingspan: 3.76,
  rotation: [0, 0, 0],
  offset: [0, 0, 0],
  clips: { flying: 'Idle_MainPose_flying', closeUp: 'Wing_CloseUp' },
  material: 'crystal',
  smoothLoop: false,
  hiddenMeshes: ['trail'],
};

/** 예전 불사조(“Phoenix” by NORBERTO-3D, CC BY 4.0). 모델만 바꿔 같은 연출에 입히는 예시로 남겨 둡니다. */
const EMBER: PhoenixModelConfig = {
  url: '/models/phoenix.glb',
  wingspan: 3.76,
  rotation: [0, 0, 0],
  offset: [0, 0, 0],
  clips: { flying: '' },
  material: 'textured',
  smoothLoop: true,
  hiddenMeshes: [],
};

/** 고를 수 있는 불사조 모델. */
export const PHOENIX_MODELS = { crystal: CRYSTAL, ember: EMBER } as const;

/** 지금 쓰는 불사조 모델. 사용자가 준 모델로 바꿀 때는 위에 항목을 더하고 여기를 바꿉니다. */
export const PHOENIX_MODEL: PhoenixModelConfig = PHOENIX_MODELS.crystal;

/** 비행 타임라인(레퍼런스의 cam.glb·cam-mob.glb에 dev.glb의 클립 번호·포인터 영향·어둠 트랙을 합친 것). */
export const FLIGHT_TIMELINE = {
  desktop: '/models/phoenix-flight.glb',
  /** 세로 화면(화면 비율 1 미만)에서 쓰는 카메라 경로. */
  mobile: '/models/phoenix-flight-mobile.glb',
} as const;

/** 불사조가 깃털로 변해 내려오는 결정 깃털(레퍼런스의 feather.glb). */
export const CRYSTAL_FEATHER_URL = '/models/phoenix-feather.glb';

/** 카메라 시야각(도). 레퍼런스와 같이 25도이고, 스크롤이 빠를수록 최대 10도까지 넓어집니다. */
export const CAMERA_FOV = 25;
export const CAMERA_FOV_BOOST = 10;
