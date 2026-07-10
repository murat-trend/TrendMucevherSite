"use client";

// STUDIO STORE — tek reducer + context. Timeline/overlay düzenlemeleri
// snapshot history'den geçer (undo/redo); proje her değişimde autosave edilir.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { canRedo, canUndo, createHistory, push, redo, undo, type History } from "./history";
import { loadProject, saveProject } from "./autosave";
import type {
  Asset,
  BrandKit,
  EditableState,
  IndustryKey,
  ModuleKey,
  PlatformKey,
  Project,
  VideoModeKey,
} from "./types";
import { uid } from "./types";

function defaultProject(): Project {
  return {
    id: uid("proj"),
    version: 1,
    name: "Yeni Proje",
    industry: "jewelry",
    platform: "instagram",
    videoMode: "showcase",
    assets: [],
    tracks: [
      { id: uid("trk"), kind: "video", label: "Video 1", clips: [] },
      { id: uid("trk"), kind: "audio", label: "Ses 1", clips: [] },
    ],
    overlays: [],
    brand: {
      logoAssetId: null,
      colors: ["#b76e79", "#c69575", "#0a0b0e"],
      fontFamily: "Outfit",
      watermark: { enabled: false, text: "", opacity: 0.5, position: "sag-alt" },
    },
    updatedAt: Date.now(),
  };
}

interface StudioState {
  project: Project;
  activeModule: ModuleKey;
  history: History<EditableState>;
}

type StudioAction =
  | { type: "SET_MODULE"; module: ModuleKey }
  | {
      type: "SET_META";
      meta: Partial<{ name: string; industry: IndustryKey; platform: PlatformKey; videoMode: VideoModeKey }>;
    }
  | { type: "ADD_ASSET"; asset: Asset }
  | { type: "REMOVE_ASSET"; assetId: string }
  | { type: "SET_BRAND"; brand: Partial<BrandKit> }
  | { type: "EDIT"; next: Partial<EditableState> }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD"; project: Project }
  | { type: "RESET" };

function withEditable(project: Project, e: EditableState): Project {
  return { ...project, tracks: e.tracks, overlays: e.overlays };
}

function reducer(state: StudioState, action: StudioAction): StudioState {
  const { project } = state;
  switch (action.type) {
    case "SET_MODULE":
      return { ...state, activeModule: action.module };
    case "SET_META":
      return { ...state, project: { ...project, ...action.meta } };
    case "ADD_ASSET":
      return { ...state, project: { ...project, assets: [action.asset, ...project.assets] } };
    case "REMOVE_ASSET": {
      // Varlık silinince onu kullanan klipler ve logo referansı da temizlenir.
      const tracks = project.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.assetId !== action.assetId),
      }));
      const brand: BrandKit =
        project.brand.logoAssetId === action.assetId
          ? { ...project.brand, logoAssetId: null }
          : project.brand;
      const nextEdit: EditableState = { tracks, overlays: project.overlays };
      return {
        ...state,
        history: push(state.history, nextEdit),
        project: {
          ...withEditable(project, nextEdit),
          assets: project.assets.filter((a) => a.id !== action.assetId),
          brand,
        },
      };
    }
    case "SET_BRAND":
      return { ...state, project: { ...project, brand: { ...project.brand, ...action.brand } } };
    case "EDIT": {
      const nextEdit: EditableState = {
        tracks: action.next.tracks ?? project.tracks,
        overlays: action.next.overlays ?? project.overlays,
      };
      return {
        ...state,
        history: push(state.history, nextEdit),
        project: withEditable(project, nextEdit),
      };
    }
    case "UNDO": {
      const h = undo(state.history);
      return { ...state, history: h, project: withEditable(project, h.present) };
    }
    case "REDO": {
      const h = redo(state.history);
      return { ...state, history: h, project: withEditable(project, h.present) };
    }
    case "LOAD":
      return {
        ...state,
        project: action.project,
        history: createHistory({ tracks: action.project.tracks, overlays: action.project.overlays }),
      };
    case "RESET": {
      const fresh = defaultProject();
      return {
        activeModule: "image",
        project: fresh,
        history: createHistory({ tracks: fresh.tracks, overlays: fresh.overlays }),
      };
    }
    default:
      return state;
  }
}

export type SaveStatus = "kaydedildi" | "kaydediliyor" | "hata";

interface StudioContextValue {
  project: Project;
  activeModule: ModuleKey;
  dispatch: React.Dispatch<StudioAction>;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: SaveStatus;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const fresh = defaultProject();
    return {
      project: fresh,
      activeModule: "image" as ModuleKey,
      history: createHistory<EditableState>({ tracks: fresh.tracks, overlays: fresh.overlays }),
    };
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("kaydedildi");
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // İlk açılışta autosave'den geri yükle.
  useEffect(() => {
    const saved = loadProject();
    if (saved) dispatch({ type: "LOAD", project: saved });
    hydrated.current = true;
  }, []);

  // Debounce'lu autosave.
  useEffect(() => {
    if (!hydrated.current) return;
    setSaveStatus("kaydediliyor");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus(saveProject(state.project) ? "kaydedildi" : "hata");
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.project]);

  const value = useMemo<StudioContextValue>(
    () => ({
      project: state.project,
      activeModule: state.activeModule,
      dispatch,
      canUndo: canUndo(state.history),
      canRedo: canRedo(state.history),
      saveStatus,
    }),
    [state, saveStatus],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio, StudioProvider içinde kullanılmalı.");
  return ctx;
}
