export interface Chapter {
  id: string;
  /** 큰 필기체로 얹는 라틴어 표제. */
  accent: string;
  lines: readonly string[];
  /** 스크롤 길이(svh). */
  length: number;
}

/** 작가의 작품 요약에서만 뽑은 초안 문구입니다. 소설 자료가 오면 이 파일만 바꿉니다. */
export const CHAPTERS: readonly Chapter[] = [
  { id: 'many', accent: 'myths', lines: ['신화는 하나가 아니다.'], length: 260 },
  { id: 'entangle', accent: 'entangled', lines: ['서로 다른 신화들이', '하나의 이야기로 얽힌다.'], length: 280 },
  { id: 'cosmos', accent: 'cosmos', lines: ['그 무대는 지구를 벗어나', '우주적 규모로 확대되고,'], length: 300 },
  { id: 'war', accent: 'war', lines: ['마침내', 'SF 전쟁으로 이어진다.'], length: 340 },
];

export const HERO_LENGTH = 200;
export const FINALE_LENGTH = 280;
