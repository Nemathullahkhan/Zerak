import { create } from 'zustand';

export interface StreamingStep {
  type: 'intent' | 'plan' | 'question';
  content: string;
}

interface StreamingState {
  steps: StreamingStep[];
  partialNodes: any[]; // nodes built so far
  isStreaming: boolean;
  error: string | null;
  addStep: (step: StreamingStep) => void;
  setPartialNodes: (nodes: any[]) => void;
  reset: () => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStreamingStore = create<StreamingState>((set) => ({
  steps: [],
  partialNodes: [],
  isStreaming: false,
  error: null,
  addStep: (step) => set((state) => ({ steps: [...state.steps, step] })),
  setPartialNodes: (nodes) => set({ partialNodes: nodes }),
  reset: () => set({ steps: [], partialNodes: [], error: null }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
}));