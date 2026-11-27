// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { createFlight } from './flight';

async function loadTimeline(file: string) {
  const buffer = readFileSync(path.join(process.cwd(), 'public/models', file));
  const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data, '');
}

describe('createFlight', () => {
  it('타임라인을 넘기면 불사조와 카메라가 앞(+x)으로 날아간다', async () => {
    const flight = createFlight(await loadTimeline('phoenix-flight.glb'));
    const start = flight.seek(0);
    const phoenixX = start.phoenixPosition.x;
    const cameraX = start.camera.x;
    const later = flight.seek(8);
    expect(later.phoenixPosition.x).toBeGreaterThan(phoenixX);
    expect(later.camera.x).toBeGreaterThan(cameraX);
    flight.dispose();
  });

  it('태양은 10초 뒤 사라지고 우주가 어두워지며, 깃털은 11.2초부터 나타난다', async () => {
    const flight = createFlight(await loadTimeline('phoenix-flight.glb'));
    expect(flight.seek(2).sunOpacity).toBeCloseTo(1);
    expect(flight.seek(2).darkness).toBeCloseTo(0);
    expect(flight.seek(2).featherScale).toBeCloseTo(0);
    expect(flight.seek(11.5).sunOpacity).toBeCloseTo(0);
    expect(flight.seek(11.5).darkness).toBeCloseTo(1);
    expect(flight.seek(12.5).featherScale).toBeCloseTo(1);
    flight.dispose();
  });

  it('세로 화면 타임라인도 태양이 10초 뒤 사라진다(데스크톱의 밝기 트랙을 합침)', async () => {
    const flight = createFlight(await loadTimeline('phoenix-flight-mobile.glb'));
    expect(flight.seek(2).sunOpacity).toBeCloseTo(1);
    expect(flight.seek(11).sunOpacity).toBeCloseTo(0);
    flight.dispose();
  });

  it('맨 처음에는 날개를 가까이 보여 주는 클립(2), 비행 중에는 평소 날갯짓(0)을 고른다', async () => {
    const flight = createFlight(await loadTimeline('phoenix-flight-mobile.glb'));
    expect(flight.seek(0).clipId).toBe(2);
    expect(flight.seek(5).clipId).toBe(0);
    flight.dispose();
  });
});
