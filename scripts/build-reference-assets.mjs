// 레퍼런스(storytelling.noomoagency.com, 사용자 허락) 리소스를 인트로용으로 줄여 public/models에 담습니다.
// 사용: node scripts/build-reference-assets.mjs <받은 폴더>
//   <받은 폴더>/models/v20.glb, models/feather.glb, timelines/cam.glb, timelines/cam-mob.glb, timelines/dev.glb
//
// - 불사조(v20.glb): Draco를 풀고, 셰이더가 쓰지 않는 속성(노멀·탄젠트·UV·일부 사용자 속성)을 뺀 뒤 같은 정점을 합칩니다.
//   면 노멀은 셰이더가 화면 미분으로 다시 만듭니다(결정 조각이라 면마다 평평함). 그 뒤 양자화·meshopt로 압축합니다.
//   타임라인이 쓰지 않는 클립(Float_WingPulse·Idle_MainPose_gliding)과 커서 꼬리용 띠(trail)는 뺍니다.
// - 깃털(feather.glb): 같은 방식으로 담습니다(정점 색은 남김).
// - 비행 타임라인(cam.glb·cam-mob.glb + dev.glb): 불사조·카메라·바라보는 점·태양·깃털 트랙과
//   클립 번호·포인터 영향·어둠 트랙만 남기고, 13초 뒤의 키를 버립니다.
// 결과는 meshopt(EXT_meshopt_compression)만 쓰므로 장면의 MeshoptDecoder로 읽습니다(Draco 디코더·CSP 변경 없음).
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, mergeDocuments, meshopt, prune, quantize, resample, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder } from 'meshoptimizer';

const [source, outDir = 'public/models'] = process.argv.slice(2);
if (!source) {
  console.error('사용: node scripts/build-reference-assets.mjs <받은 폴더> [출력 폴더]');
  process.exit(1);
}

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'meshopt.encoder': MeshoptEncoder });

/** Draco 확장을 떼어 내 결과에 남지 않게 합니다(읽을 때 이미 풀림). */
function dropDraco(doc) {
  for (const extension of doc.getRoot().listExtensionsUsed()) {
    if (extension.extensionName === 'KHR_draco_mesh_compression') extension.dispose();
  }
}

function dropAttributes(doc, names) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      for (const semantic of primitive.listSemantics()) if (names.includes(semantic)) primitive.setAttribute(semantic, null);
    }
  }
}

const compress = [
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8, quantizeGeneric: 8, quantizeWeight: 8 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
];

async function bird() {
  const doc = await io.read(path.join(source, 'models/v20.glb'));
  dropDraco(doc);
  dropAttributes(doc, ['NORMAL', 'TANGENT', 'TEXCOORD_0', '_CONCAVITY', '_CONVEXITY', '_DIST']);
  // 타임라인이 고르는 클립(번호 2 Wing_CloseUp, 번호 0 Idle_MainPose_flying)만 남깁니다.
  for (const animation of doc.getRoot().listAnimations()) {
    if (!['Wing_CloseUp', 'Idle_MainPose_flying'].includes(animation.getName())) animation.dispose();
  }
  // 커서 꼬리용 띠(trail)는 비행 장면에서 그리지 않으므로 뺍니다.
  for (const node of doc.getRoot().listNodes()) if (node.getMesh()?.getName() === 'trail') node.dispose();
  await doc.transform(prune(), dedup(), weld(), resample({ tolerance: 1e-4 }), prune(), ...compress);
  await io.write(path.join(outDir, 'phoenix-crystal.glb'), doc);
}

async function feather() {
  const doc = await io.read(path.join(source, 'models/feather.glb'));
  dropDraco(doc);
  dropAttributes(doc, ['NORMAL', 'TANGENT', 'TEXCOORD_0', '_concavity', '_convexity']);
  await doc.transform(prune(), dedup(), weld(), ...compress);
  await io.write(path.join(outDir, 'phoenix-feather.glb'), doc);
}

const KEEP_NODES = new Set([
  'Phoenix',
  'Camera',
  'Target',
  'Sun',
  'Sun_opacity',
  'Feather',
  'Phoenix_animationId',
  'Camera_pointerInfluence',
  'Env_darkness',
]);
const END = 13;

async function timeline(file, output) {
  const doc = await io.read(path.join(source, 'timelines', file));
  const dev = await io.read(path.join(source, 'timelines/dev.glb'));
  // dev.glb의 노드·애니메이션을 같은 문서로 옮깁니다.
  mergeDocuments(doc, dev);
  // 모바일 타임라인에는 태양 밝기(Sun_opacity) 트랙이 없어, 데스크톱 타임라인의 것을 가져옵니다.
  const hasSunOpacity = doc
    .getRoot()
    .listAnimations()
    .some((animation) => animation.listChannels().some((channel) => channel.getTargetNode()?.getName() === 'Sun_opacity'));
  if (!hasSunOpacity) {
    const desktop = await io.read(path.join(source, 'timelines/cam.glb'));
    const desktopRoot = desktop.getRoot();
    for (const animation of desktopRoot.listAnimations()) {
      for (const channel of animation.listChannels()) if (channel.getTargetNode()?.getName() !== 'Sun_opacity') channel.dispose();
      const used = new Set(animation.listChannels().map((channel) => channel.getSampler()));
      for (const sampler of animation.listSamplers()) if (!used.has(sampler)) sampler.dispose();
      if (animation.listChannels().length === 0) animation.dispose();
    }
    for (const node of desktopRoot.listNodes()) if (node.getName() !== 'Sun_opacity') node.dispose();
    mergeDocuments(doc, desktop);
  }
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  for (const extra of root.listScenes().slice(1)) {
    for (const child of extra.listChildren()) scene.addChild(child);
    extra.dispose();
  }
  for (const animation of root.listAnimations()) {
    for (const channel of animation.listChannels()) {
      const name = channel.getTargetNode()?.getName() ?? '';
      // 카메라는 위치와 바라보는 점(Target)만 씁니다(레퍼런스도 회전 트랙은 쓰지 않음).
      if (!KEEP_NODES.has(name) || (name === 'Camera' && channel.getTargetPath() === 'rotation')) channel.dispose();
    }
    const used = new Set(animation.listChannels().map((channel) => channel.getSampler()));
    for (const sampler of animation.listSamplers()) if (!used.has(sampler)) sampler.dispose();
    if (animation.listChannels().length === 0) animation.dispose();
  }
  for (const node of root.listNodes()) if (!KEEP_NODES.has(node.getName())) node.dispose();
  // END초 뒤의 키를 버립니다(END 바로 뒤의 키 하나는 남겨 END까지의 보간이 그대로입니다).
  // 위치·회전 샘플러가 같은 시간 접근자를 함께 쓰므로, 시간을 먼저 한 번씩만 자르고 값은 그 길이에 맞춥니다.
  const samplers = root.listAnimations().flatMap((animation) => animation.listSamplers());
  for (const input of new Set(samplers.map((sampler) => sampler.getInput()))) {
    const times = input.getArray();
    const after = times.findIndex((time) => time > END);
    if (after >= 0 && after + 1 < times.length) input.setArray(times.slice(0, after + 1));
  }
  for (const sampler of samplers) {
    const count = sampler.getInput().getCount();
    const output = sampler.getOutput();
    if (output.getCount() > count) output.setArray(output.getArray().slice(0, count * output.getElementSize()));
  }
  // 두 문서를 합치며 생긴 버퍼를 하나로 모읍니다(GLB는 버퍼가 하나뿐).
  const [buffer, ...others] = root.listBuffers();
  for (const accessor of root.listAccessors()) accessor.setBuffer(buffer);
  others.forEach((other) => other.dispose());
  await doc.transform(prune(), resample({ tolerance: 1e-4 }), prune());
  await io.write(path.join(outDir, output), doc);
}

await bird();
await feather();
await timeline('cam.glb', 'phoenix-flight.glb');
await timeline('cam-mob.glb', 'phoenix-flight-mobile.glb');
console.log('완료:', outDir);
