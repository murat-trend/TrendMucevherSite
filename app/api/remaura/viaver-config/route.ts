import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/remaura/viaver-config
 * Çalışan viaver ışıklandırma + materyal konfigürasyonunu döner.
 * viaver.html bozulursa buradan referans alınır.
 */
export async function GET() {
  const config = {
    version: "2.1.0",
    savedAt: "2026-06-25",
    description: "Takı stüdyosu — 5 ışık kurulumu + lightbox environment",

    renderer: {
      toneMapping: "ACESFilmicToneMapping",
      toneMappingExposure: 1.20,
      outputColorSpace: "SRGBColorSpace",
      shadowMap: "PCFSoftShadowMap",
    },

    environment: {
      type: "custom_lightbox_pmrem",
      description: "RoomEnvironment yerine özel takı stüdyosu lightbox",
      panels: [
        { name: "ceiling",    color: "#fff9f0", position: [0, 12, 0],   size: [30, 30] },
        { name: "floor",      color: "#080808", position: [0, -12, 0],  size: [30, 30] },
        { name: "leftStrip",  color: "#ffffff", position: [-12, 0, 0],  size: [2, 28]  },
        { name: "rightStrip", color: "#ffffff", position: [12, 0, 0],   size: [2, 28]  },
        { name: "frontFill",  color: "#d8d8d8", position: [0, 2, 12],   size: [20, 14] },
        { name: "backRim",    color: "#d0e0ff", position: [0, 4, -12],  size: [20, 10] },
        { name: "wallLeft",   color: "#404040", position: [-15, 0, 0],  size: [30, 30] },
        { name: "wallRight",  color: "#404040", position: [15, 0, 0],   size: [30, 30] },
      ],
    },

    lights: [
      {
        name: "ambient",
        type: "AmbientLight",
        color: "#fff8f0",
        intensity: 0.5,
        description: "Tabana hafif sıcaklık, sert gölgeleri yumuşatır",
      },
      {
        name: "dirLight1",
        type: "DirectionalLight",
        color: "#ffffff",
        intensity: 1.4,
        position: [5, 10, 7],
        castShadow: true,
        description: "Ana tepe ışığı — dönerken kayan parıltı",
      },
      {
        name: "dirWarm",
        type: "DirectionalLight",
        color: "#fff0c8",
        intensity: 0.7,
        position: [-3, 8, 10],
        description: "Sıcak üst-ön ışık — altın tonunu besler",
      },
      {
        name: "dirLight2",
        type: "DirectionalLight",
        color: "#00e5ff",
        intensity: 0.30,
        position: [-8, 3, 4],
        description: "Cyan dolgu — soldan hafif yukarıdan, gölgelere derinlik",
      },
      {
        name: "dirRim",
        type: "DirectionalLight",
        color: "#c8e0ff",
        intensity: 0.6,
        position: [0, 4, -10],
        description: "Arka rim — modeli zeminden ayırır",
      },
      {
        name: "sparkle",
        type: "PointLight",
        color: "#ffffff",
        intensity: 80,
        distance: 800,
        position: [20, 300, 80],
        description: "Faset sparkle — taş kesimlerinde nokta parlaması",
      },
    ],

    defaults: {
      roughness: 0.20,
      metalness: 0.95,
      envMapIntensity: 1.60,
      contrastValue: 1.0,
    },

    sliders: {
      roughness:  { min: 0,   max: 1,   step: 0.01, default: 0.20 },
      metalness:  { min: 0,   max: 1,   step: 0.01, default: 0.95 },
      env:        { min: 0,   max: 4,   step: 0.05, default: 1.60 },
      exposure:   { min: 0.3, max: 3.0, step: 0.05, default: 1.20 },
      contrast:   { min: 0.5, max: 3.0, step: 0.05, default: 1.0  },
    },

    materials: [
      { id: "mat-antik",  label: "Antik Gümüş", color: "#606060", roughness: 0.30, metalness: 0.85 },
      { id: "mat-parlak", label: "Parlak",       color: "#f0f0f0", roughness: 0.04, metalness: 1.00 },
      { id: "mat-sari",   label: "Sarı Altın",   color: "#D4A843", roughness: 0.12, metalness: 1.00 },
      { id: "mat-siyah",  label: "Siyah",        color: "#0a0a0a", roughness: 0.05, metalness: 1.00 },
      { id: "mat-gul",    label: "Gül Altın",    color: "#C0746A", roughness: 0.10, metalness: 1.00 },
      { id: "mat-oksitli",label: "Antik Altın",  color: "#7A5510", roughness: 0.28, metalness: 0.82 },
      { id: "mat-wax",    label: "Red Wax",      color: "#c01e14", roughness: 0.45, metalness: 0.00 },
    ],
  };

  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
