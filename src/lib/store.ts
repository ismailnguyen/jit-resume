import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Settings {
  openAIApiKey: string | null;
  model: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1-mini' | 'gpt-4.1';
  pdfTheme: 'classic' | 'modern' | 'compact';
  defaultLanguage: 'en' | 'fr' | 'de' | 'es';
  includeContactLinks: boolean;
  anonymizeLocation: boolean;
  // Cost controls
  costControlsEnabled?: boolean;
  priceInPer1k?: number;   // USD per 1k input tokens (editable)
  priceOutPer1k?: number;  // USD per 1k output tokens (editable)
  maxGenerationCost?: number; // USD cap per generation
  showEstimateBeforeGenerate?: boolean;
  // ATS weights
  atsWeights?: { skills: number; experience: number; summary: number; other: number };
}

export interface PersonalMeta {
  updatedAt: string;
  lengthBytes: number;
}

export interface ResumeMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  language: 'auto' | 'en' | 'fr' | 'de' | 'es';
  score?: number;
  fitScore?: number;
  tags?: string[];
}

interface Store {
  // Settings
  settings: Settings;
  setSettings: (partial: Partial<Settings>) => void;
  
  // Personal details
  personalMeta: PersonalMeta | null;
  setPersonalMeta: (meta: PersonalMeta | null) => void;
  firstRunSeen: boolean;
  setFirstRunSeen: (seen: boolean) => void;
  
  // Resumes
  resumesIndex: ResumeMeta[];
  setResumesIndex: (resumes: ResumeMeta[]) => void;
  addResume: (resume: ResumeMeta) => void;
  updateResume: (id: string, updates: Partial<ResumeMeta>) => void;
  deleteResume: (id: string) => void;
  
  // Clear all data
  clearAllData: () => void;
}

const defaultSettings: Settings = {
  openAIApiKey: null,
  model: 'gpt-4o-mini',
  pdfTheme: 'modern',
  defaultLanguage: 'en',
  includeContactLinks: true,
  anonymizeLocation: false,
  costControlsEnabled: false,
  priceInPer1k: 0.15,   // defaults; users can adjust
  priceOutPer1k: 0.6,
  maxGenerationCost: 0,
  showEstimateBeforeGenerate: true,
  atsWeights: { skills: 3, experience: 2, summary: 1.5, other: 1 },
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Settings
      settings: defaultSettings,
      setSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      
      // Personal details
      personalMeta: null,
      setPersonalMeta: (meta) => set({ personalMeta: meta }),
      firstRunSeen: false,
      setFirstRunSeen: (seen) => set({ firstRunSeen: seen }),
      
      // Resumes
      resumesIndex: [],
      setResumesIndex: (resumes) => set({ resumesIndex: resumes }),
      addResume: (resume) =>
        set((state) => ({
          resumesIndex: [resume, ...state.resumesIndex],
        })),
      updateResume: (id, updates) =>
        set((state) => ({
          resumesIndex: state.resumesIndex.map((resume) =>
            resume.id === id ? { ...resume, ...updates } : resume
          ),
        })),
      deleteResume: (id) =>
        set((state) => ({
          resumesIndex: state.resumesIndex.filter((resume) => resume.id !== id),
        })),
      
      // Clear all data
      clearAllData: () =>
        set({
          settings: defaultSettings,
          personalMeta: null,
          resumesIndex: [],
        }),
    }),
    {
      name: 'jit-store',
      partialize: (state) => ({
        settings: state.settings,
        personalMeta: state.personalMeta,
        resumesIndex: state.resumesIndex,
        firstRunSeen: state.firstRunSeen,
      }),
    }
  )
);
