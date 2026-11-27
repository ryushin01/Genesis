import ky, { isHTTPError } from 'ky';

/**
 * 모델 파일을 받습니다. 받은 비율을 알리고, 신호가 오면 받기를 멈춥니다.
 * 진행률은 전체 크기(content-length)를 알 때만 알립니다. 2xx가 아니면 실패로 봅니다.
 * 같은 주소를 다시 시도하지 않고(retry: 0), 큰 모델을 느린 망에서 받을 수 있게 시간 제한을 두지 않습니다.
 * 멈추면 예전 Fetch API와 같이 이름이 `AbortError`인 오류로 끝납니다.
 */
export async function fetchModel(
  url: string,
  signal: AbortSignal,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> {
  try {
    return await ky
      .get(url, {
        signal,
        retry: 0,
        timeout: false,
        onDownloadProgress: onProgress
          ? ({ transferredBytes, totalBytes }) => {
              if (totalBytes) onProgress(Math.min(1, transferredBytes / totalBytes));
            }
          : undefined,
      })
      .arrayBuffer();
  } catch (error) {
    if (signal.aborted) throw new DOMException('장면을 만들기 전에 화면을 떠났습니다.', 'AbortError');
    if (isHTTPError(error)) throw new Error(`${url}: ${error.response.status}`);
    throw error;
  }
}
