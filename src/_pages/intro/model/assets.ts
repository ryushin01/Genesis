import { CRYSTAL_FEATHER_URL, FLIGHT_TIMELINE, PHOENIX_MODEL } from '../config/phoenix.config';

/**
 * 인트로 장면이 받는 3D 파일 주소. 불사조·비행 타임라인·결정 깃털은 레퍼런스(storytelling.noomoagency.com, 사용자 허락)
 * 리소스이고, 작은 깃털·로고는 Sketchfab의 CC BY 4.0 모델입니다(출처는 화면과 README에 표기).
 */
export const MODEL_URLS = {
  /** 불사조(phoenix.config.ts에서 고름). */
  phoenix: PHOENIX_MODEL.url,
  /** 비행 타임라인: 가로 화면용·세로 화면용. */
  flight: FLIGHT_TIMELINE.desktop,
  flightMobile: FLIGHT_TIMELINE.mobile,
  /** 불사조가 변해 내려오는 결정 깃털. */
  crystalFeather: CRYSTAL_FEATHER_URL,
  /** “Feathers” by victorberdugo1. 터진 뒤 흩어지는 작은 깃털. */
  feathers: '/models/feathers.glb',
  /** “Phoenix Logo” by Suraj-456tyu. */
  logo: '/models/phoenix-logo.glb',
} as const;
