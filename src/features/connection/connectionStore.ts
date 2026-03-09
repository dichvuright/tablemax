import { create } from 'zustand';
import type { DatabaseConnection, ConnectionTestResult, QueryResult } from '../../../shared/types/connection';
import * as api from '@/services/tauri-api';

interface ConnectionState {
  // Data
  connections: DatabaseConnection[];
  activeConnectionId: string | null;

  // UI state
  isConnecting: boolean;
  isTesting: boolean;
  testResult: ConnectionTestResult | null;
  isFormOpen: boolean;
  editingConnection: DatabaseConnection | null;

  // Query state
  queryResult: QueryResult | null;
  isExecuting: boolean;
  queryError: string | null;

  // Actions - Connection management
  loadConnections: () => Promise<void>;
  addConnection: (conn: DatabaseConnection) => Promise<void>;
  updateConnection: (conn: DatabaseConnection) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  setActiveConnection: (id: string | null) => void;
  testConnection: (conn: DatabaseConnection) => Promise<ConnectionTestResult>;
  connectToDatabase: (id: string) => Promise<void>;
  disconnectFromDatabase: (id: string) => Promise<void>;

  // Actions - UI
  openForm: (connection?: DatabaseConnection) => void;
  closeForm: () => void;
  clearTestResult: () => void;

  // Actions - Query
  executeQuery: (query: string) => Promise<void>;
  clearQueryResult: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // Initial state
  connections: [],
  activeConnectionId: null,
  isConnecting: false,
  isTesting: false,
  testResult: null,
  isFormOpen: false,
  editingConnection: null,
  queryResult: null,
  isExecuting: false,
  queryError: null,

  // Connection management
  loadConnections: async () => {
    try {
      const connections = await api.loadConnections();
      set({ connections });
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  },

  addConnection: async (conn) => {
    const connections = [...get().connections, conn];
    set({ connections });
    await api.saveConnections(connections);
  },

  updateConnection: async (conn) => {
    const connections = get().connections.map(c => c.id === conn.id ? conn : c);
    set({ connections });
    await api.saveConnections(connections);
  },

  removeConnection: async (id) => {
    const connections = get().connections.filter(c => c.id !== id);
    const activeId = get().activeConnectionId === id ? null : get().activeConnectionId;
    set({ connections, activeConnectionId: activeId });
    await api.saveConnections(connections);
  },

  setActiveConnection: (id) => {
    set({ activeConnectionId: id, queryResult: null, queryError: null });
  },

  testConnection: async (conn) => {
    set({ isTesting: true, testResult: null });
    try {
      const result = await api.testConnection(conn);
      set({ testResult: result, isTesting: false });
      return result;
    } catch (err) {
      const result: ConnectionTestResult = {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
      set({ testResult: result, isTesting: false });
      return result;
    }
  },

  connectToDatabase: async (id) => {
    set({ isConnecting: true });
    try {
      await api.connectDatabase(id);
      set({ activeConnectionId: id, isConnecting: false });
    } catch (err) {
      set({ isConnecting: false });
      throw err;
    }
  },

  disconnectFromDatabase: async (id) => {
    try {
      await api.disconnectDatabase(id);
      if (get().activeConnectionId === id) {
        set({ activeConnectionId: null, queryResult: null });
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  },

  // UI
  openForm: (connection) => {
    set({
      isFormOpen: true,
      editingConnection: connection || null,
      testResult: null,
    });
  },

  closeForm: () => {
    set({ isFormOpen: false, editingConnection: null, testResult: null });
  },

  clearTestResult: () => set({ testResult: null }),

  // Query
  executeQuery: async (query) => {
    const connectionId = get().activeConnectionId;
    if (!connectionId) return;

    const connection = get().connections.find(c => c.id === connectionId);
    if (!connection) return;

    set({ isExecuting: true, queryError: null, queryResult: null });
    try {
      const result = await api.executeQuery(connection, query);
      set({ queryResult: result, isExecuting: false });
    } catch (err) {
      set({
        queryError: err instanceof Error ? err.message : String(err),
        isExecuting: false,
      });
    }
  },

  clearQueryResult: () => set({ queryResult: null, queryError: null }),
}));
