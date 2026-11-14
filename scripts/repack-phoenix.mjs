// 불사조 모델(PNG 텍스처 원본)의 텍스처를 가볍게 다시 담습니다.
// 사용: node scripts/repack-phoenix.mjs <원본.glb> public/models/phoenix.glb
//
// - 발광 텍스처가 같은 재질의 기본 색 텍스처와 픽셀이 같으면 기본 색 이미지를 함께 씁니다.
// - 셰이더는 기본 색·발광의 선형 휘도와 알파만 쓰므로, 같은 휘도가 나오는 회색 + 무손실 알파 WebP(품질 85)로 바꿉니다.
// - 노멀 맵은 각도 오차가 1도 안팎인 near-lossless WebP(60)로 바꿉니다.
// - 형상·애니메이션(meshopt로 압축된 버퍼)은 그대로 옮기고, 이미지 버퍼만 바꿔 다시 이어 붙입니다.
// 결과는 Khronos glTF Validator로 오류가 없는지 확인합니다.
import fs from 'node:fs';
import { createRequire } from 'node:module';

// sharp는 Next.js가 이미지 최적화용으로 이미 설치하므로 그 경로에서 불러옵니다.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }));

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('사용: node scripts/repack-phoenix.mjs <원본.glb> <출력.glb>');
  process.exit(1);
}

const glb = fs.readFileSync(input);
if (glb.toString('ascii', 0, 4) !== 'glTF') throw new Error('GLB 파일이 아닙니다.');
const jsonLength = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
const binAt = 20 + jsonLength;
const bin = glb.subarray(binAt + 8, binAt + 8 + glb.readUInt32LE(binAt));
const viewBytes = (index) => {
  const view = json.bufferViews[index];
  const start = view.byteOffset ?? 0;
  return bin.subarray(start, start + view.byteLength);
};

const toLinear = (value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (linear) => {
  const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};
const LINEAR = Float64Array.from({ length: 256 }, (_, i) => toLinear(i));

/** 셰이더의 dot(rgb, (.3,.59,.11))가 원본과 같게 나오는 회색 + 원본 알파. */
async function grayWebp(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let p = 0; p < info.width * info.height; p += 1) {
    const i = p * 4;
    const gray = toSrgb(0.3 * LINEAR[data[i]] + 0.59 * LINEAR[data[i + 1]] + 0.11 * LINEAR[data[i + 2]]);
    out[i] = gray;
    out[i + 1] = gray;
    out[i + 2] = gray;
    out[i + 3] = data[i + 3];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 85, alphaQuality: 100, effort: 6, smartSubsample: true, exact: true })
    .toBuffer();
}
const normalWebp = (png) => sharp(png).webp({ nearLossless: true, quality: 60, effort: 6 }).toBuffer();

// 이미지마다 재질의 어느 자리에서 쓰이는지 모읍니다.
const roles = json.images.map(() => new Set());
const textureOf = (info) => (info ? json.textures[info.index] : undefined);
for (const material of json.materials) {
  const add = (info, role) => {
    const texture = textureOf(info);
    if (texture) roles[texture.source].add(role);
  };
  add(material.pbrMetallicRoughness?.baseColorTexture, 'base');
  add(material.emissiveTexture, 'emissive');
  add(material.normalTexture, 'normal');
  add(material.occlusionTexture, 'other');
  add(material.pbrMetallicRoughness?.metallicRoughnessTexture, 'other');
}

// 발광 이미지가 같은 재질의 기본 색 이미지와 RGB가 같으면 기본 색 이미지로 바꿉니다.
const rgbOf = (index) => sharp(viewBytes(json.images[index].bufferView)).removeAlpha().raw().toBuffer();
const sameAs = new Map();
for (const material of json.materials) {
  const base = textureOf(material.pbrMetallicRoughness?.baseColorTexture);
  const emissive = textureOf(material.emissiveTexture);
  if (!base || !emissive || base.source === emissive.source) continue;
  const [a, b] = await Promise.all([rgbOf(base.source), rgbOf(emissive.source)]);
  if (a.equals(b)) sameAs.set(emissive.source, base.source);
}

const kept = json.images.map((_, index) => index).filter((index) => !sameAs.has(index));
const newIndex = new Map(kept.map((index, i) => [index, i]));
const encoded = new Map();
for (const index of kept) {
  if (roles[index].has('other')) throw new Error('예상하지 못한 텍스처 자리가 있습니다.');
  const png = viewBytes(json.images[index].bufferView);
  encoded.set(index, roles[index].has('normal') ? await normalWebp(png) : await grayWebp(png));
}
for (const texture of json.textures) {
  const source = sameAs.get(texture.source) ?? texture.source;
  delete texture.source;
  texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: newIndex.get(source) } };
}

// 버퍼 뷰: 지운 이미지의 뷰를 빼고, 남은 데이터(meshopt 압축분 포함)를 4바이트 정렬로 다시 이어 붙입니다.
// 남기는 이미지가 같은 뷰를 함께 쓰면 그 뷰는 지우지 않습니다.
const keptViews = new Set(kept.map((index) => json.images[index].bufferView));
const dropped = new Set(
  [...sameAs.keys()].map((index) => json.images[index].bufferView).filter((view) => !keptViews.has(view)),
);
const imageOfView = new Map(kept.map((index) => [json.images[index].bufferView, index]));
const segments = [];
json.bufferViews.forEach((view, index) => {
  if (dropped.has(index)) return;
  if (view.buffer === 0) segments.push({ index, compressed: false, at: view.byteOffset ?? 0 });
  const meshopt = view.extensions?.EXT_meshopt_compression;
  if (meshopt && meshopt.buffer === 0) segments.push({ index, compressed: true, at: meshopt.byteOffset ?? 0 });
});
segments.sort((a, b) => a.at - b.at);
const chunks = [];
let size = 0;
for (const segment of segments) {
  const view = json.bufferViews[segment.index];
  const holder = segment.compressed ? view.extensions.EXT_meshopt_compression : view;
  const start = holder.byteOffset ?? 0;
  let bytes = bin.subarray(start, start + holder.byteLength);
  if (!segment.compressed && imageOfView.has(segment.index)) bytes = encoded.get(imageOfView.get(segment.index));
  const pad = (4 - (size % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    size += pad;
  }
  holder.byteOffset = size;
  holder.byteLength = bytes.length;
  chunks.push(bytes);
  size += bytes.length;
}
const viewIndex = new Map();
const views = [];
json.bufferViews.forEach((view, index) => {
  if (dropped.has(index)) return;
  viewIndex.set(index, views.length);
  views.push(view);
});
json.bufferViews = views;
for (const accessor of json.accessors ?? []) {
  if (accessor.bufferView !== undefined) accessor.bufferView = viewIndex.get(accessor.bufferView);
  if (accessor.sparse) {
    accessor.sparse.indices.bufferView = viewIndex.get(accessor.sparse.indices.bufferView);
    accessor.sparse.values.bufferView = viewIndex.get(accessor.sparse.values.bufferView);
  }
}
json.images = kept.map((index) => ({
  ...json.images[index],
  bufferView: viewIndex.get(json.images[index].bufferView),
  mimeType: 'image/webp',
}));
json.buffers[0].byteLength = size;
json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'EXT_texture_webp'])];
json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), 'EXT_texture_webp'])];

const padTo4 = (buffer, fill) => Buffer.concat([buffer, Buffer.alloc((4 - (buffer.length % 4)) % 4, fill)]);
const jsonChunk = padTo4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
const binChunk = padTo4(Buffer.concat(chunks), 0);
const header = Buffer.alloc(12);
header.write('glTF', 0, 'ascii');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
const chunkHeader = (length, type) => {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32LE(length, 0);
  buffer.write(type, 4, 'ascii');
  return buffer;
};
fs.writeFileSync(output, Buffer.concat([header, chunkHeader(jsonChunk.length, 'JSON'), jsonChunk, chunkHeader(binChunk.length, 'BIN\0'), binChunk]));
console.log(`이미지 ${json.images.length}장(같은 이미지 ${sameAs.size}장 합침), ${glb.length} → ${fs.statSync(output).size} 바이트`);
