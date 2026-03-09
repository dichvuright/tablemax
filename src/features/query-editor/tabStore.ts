import { create } from 'zustand';
import type { QueryResult } from '../../../shared/types/connection';

export interface QueryTab {
  id: string;
  title: string;
  query: string;
  result: QueryResult | null;
  error: string | null;
  isExecuting: boolean;
}

interface TabState {
  tabs: QueryTab[];
  activeTabId: string | null;

  // Actions
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabQuery: (id: string, query: string) => void;
  updateTabResult: (id: string, result: QueryResult | null) => void;
  updateTabError: (id: string, error: string | null) => void;
  updateTabExecuting: (id: string, isExecuting: boolean) => void;
  renameTab: (id: string, title: string) => void;
}

let tabCounter = 1;

function createTab(): QueryTab {
  const id = crypto.randomUUID();
  return {
    id,
    title: `Query ${tabCounter++}`,
    query: '',
    result: null,
    error: null,
    isExecuting: false,
  };
}

export const useTabStore = create<TabState>((set, get) => {
  const initialTab = createTab();
  initialTab.query = 'SELECT 1;';

  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,

    addTab: () => {
      const tab = createTab();
      set(state => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    },

    removeTab: (id) => {
      const { tabs, activeTabId } = get();
      if (tabs.length <= 1) return; // Keep at least one tab

      const newTabs = tabs.filter(t => t.id !== id);
      let newActiveId = activeTabId;

      if (activeTabId === id) {
        const idx = tabs.findIndex(t => t.id === id);
        newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null;
      }

      set({ tabs: newTabs, activeTabId: newActiveId });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateTabQuery: (id, query) => {
      set(state => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, query } : t),
      }));
    },

    updateTabResult: (id, result) => {
      set(state => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, result, error: null } : t),
      }));
    },

    updateTabError: (id, error) => {
      set(state => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, error, result: null } : t),
      }));
    },

    updateTabExecuting: (id, isExecuting) => {
      set(state => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, isExecuting } : t),
      }));
    },

    renameTab: (id, title) => {
      set(state => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, title } : t),
      }));
    },
  };
});
