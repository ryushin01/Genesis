import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchModel } from './fetchModel';

// 실제 HTTP 서버로 모델 받기를 확인합니다(ky가 쓰는 Fetch API로 받음).
const BODY = new Uint8Array(64 * 1024).map((_, i) => i % 251);
let server: Server;
let origin = '';

beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    if (request.url === '/missing.glb') {
      response.writeHead(404).end();
      return;
    }
    if (request.url === '/stall.glb') {
      // 앞부분만 두 번 나눠 보내고 멈춰, 받는 도중(진행률을 알린 뒤)에 취소하는 경우를 만듭니다.
      response.writeHead(200, { 'Content-Length': String(BODY.byteLength) });
      response.write(BODY.subarray(0, 1024));
      setTimeout(() => response.write(BODY.subarray(1024, 2048)), 20);
      return;
    }
    const headers: Record<string, string> = { 'Content-Type': 'model/gltf-binary' };
    if (request.url !== '/no-length.glb') headers['Content-Length'] = String(BODY.byteLength);
    response.writeHead(200, headers);
    // 두 번에 나눠 보내 진행률이 중간값도 알리게 합니다.
    response.write(BODY.subarray(0, BODY.byteLength / 2));
    setTimeout(() => response.end(BODY.subarray(BODY.byteLength / 2)), 20);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('시험 서버 주소를 얻지 못했습니다.');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

describe('fetchModel', () => {
  it('모델 파일을 그대로 받고, 받은 비율을 1까지 알린다', async () => {
    const ratios: number[] = [];
    const data = await fetchModel(`${origin}/phoenix.glb`, new AbortController().signal, (ratio) => ratios.push(ratio));
    expect(new Uint8Array(data)).toEqual(BODY);
    expect(ratios.length).toBeGreaterThan(0);
    expect(ratios.at(-1)).toBe(1);
    expect(ratios.every((ratio) => ratio > 0 && ratio <= 1)).toBe(true);
  });

  it('content-length가 없으면 중간 비율을 알리지 않고 파일만 받는다', async () => {
    const ratios: number[] = [];
    const data = await fetchModel(`${origin}/no-length.glb`, new AbortController().signal, (ratio) => ratios.push(ratio));
    expect(new Uint8Array(data)).toEqual(BODY);
    // 전체 크기를 모르면 다 받은 뒤의 1만 알립니다.
    expect(ratios.every((ratio) => ratio === 1)).toBe(true);
  });

  it('2xx가 아니면 주소와 상태 코드를 담아 실패한다', async () => {
    await expect(fetchModel(`${origin}/missing.glb`, new AbortController().signal)).rejects.toThrow(
      `${origin}/missing.glb: 404`,
    );
  });

  it('받는 도중 신호가 오면 AbortError로 멈춘다', async () => {
    const abort = new AbortController();
    const ratios: number[] = [];
    const pending = fetchModel(`${origin}/stall.glb`, abort.signal, (ratio) => {
      ratios.push(ratio);
      abort.abort();
    });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(ratios[0]).toBeGreaterThan(0);
    expect(ratios[0]).toBeLessThan(1);
  });

  it('서버에 닿지 못하면(오프라인) 그 오류 그대로 실패한다', async () => {
    // 아무도 듣지 않는 포트를 얻어 연결이 거절되게 합니다.
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const address = closed.address();
    if (address === null || typeof address === 'string') throw new Error('시험 서버 주소를 얻지 못했습니다.');
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    const pending = fetchModel(`http://127.0.0.1:${address.port}/phoenix.glb`, new AbortController().signal);
    await expect(pending).rejects.toBeInstanceOf(TypeError);
  });

  it('이미 멈춘 신호면 받지 않고 AbortError로 끝난다', async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(fetchModel(`${origin}/phoenix.glb`, abort.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
