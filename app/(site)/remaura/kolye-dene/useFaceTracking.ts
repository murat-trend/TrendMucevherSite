// MediaPipe Face Landmarker yükleyici — kolye-dene için izole yardımcı.
// Servis adları client'a sızmaz; hata mesajları genel tutulur.

import type { FaceLandmarker as FaceLandmarkerType } from "@mediapipe/tasks-vision";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Landmark indeksleri (468-nokta yüz meshi)
export const LM_CHIN = 152; // çene ucu
export const LM_FACE_LEFT = 234; // yüz sol kenar
export const LM_FACE_RIGHT = 454; // yüz sağ kenar

export async function loadFaceLandmarker(): Promise<FaceLandmarkerType> {
  const { FaceLandmarker, FilesetResolver } = await import(
    "@mediapipe/tasks-vision"
  );

  const fileset = await FilesetResolver.forVisionTasks(WASM_CDN);

  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFacialTransformationMatrixes: true,
  });
}
