import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConnectionStore } from './connectionStore';
import { generateId } from '@/services/tauri-api';
import {
  type DatabaseConnection,
  type DatabaseType,
  DB_DEFAULT_PORTS,
  DB_LABELS,
} from '../../../shared/types/connection';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

export function ConnectionForm() {
  const {
    isFormOpen,
    editingConnection,
    closeForm,
    addConnection,
    updateConnection,
    testConnection,
    isTesting,
    testResult,
    clearTestResult,
  } = useConnectionStore();

  const [form, setForm] = useState<Partial<DatabaseConnection>>({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: '',
    name: '',
    color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isFormOpen) {
      if (editingConnection) {
        setForm(editingConnection);
      } else {
        setForm({
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: '',
          database: '',
          name: '',
          color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
        });
      }
      clearTestResult();
    }
  }, [isFormOpen, editingConnection, clearTestResult]);

  const handleTypeChange = (type: DatabaseType) => {
    setForm(prev => ({
      ...prev,
      type,
      port: DB_DEFAULT_PORTS[type],
      host: type === 'sqlite' ? '' : prev?.host || 'localhost',
      username: type === 'sqlite' ? '' : prev?.username || 'root',
    }));
  };

  const handleTest = async () => {
    const conn = buildConnection();
    const result = await testConnection(conn);
    if (result.success) {
      toast.success('Connection successful!', {
        description: result.latency_ms ? `Latency: ${result.latency_ms}ms` : undefined,
      });
    } else {
      toast.error('Connection failed', { description: result.message });
    }
  };

  const handleSave = async () => {
    const conn = buildConnection();
    if (!conn.name.trim()) {
      toast.error('Please enter a connection name');
      return;
    }

    if (editingConnection) {
      await updateConnection(conn);
      toast.success('Connection updated');
    } else {
      await addConnection(conn);
      toast.success('Connection saved');
    }
    closeForm();
  };

  const buildConnection = (): DatabaseConnection => ({
    id: editingConnection?.id || generateId(),
    name: form.name || '',
    type: (form.type as DatabaseType) || 'mysql',
    host: form.host || 'localhost',
    port: form.port || 3306,
    username: form.username || '',
    password: form.password || '',
    database: form.database || '',
    color: form.color || DEFAULT_COLORS[0],
  });

  const isSqlite = form.type === 'sqlite';

  return (
    <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingConnection ? 'Edit Connection' : 'New Connection'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Connection Name */}
          <div className="space-y-2">
            <Label htmlFor="conn-name">Connection Name</Label>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  id="conn-name"
                  placeholder="My Database"
                  value={form.name || ''}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <ColorPicker
                value={form.color || '#6366f1'}
                onChange={(color) => setForm(prev => ({ ...prev, color }))}
                label=""
              />
            </div>
          </div>

          {/* Database Type */}
          <div className="space-y-2">
            <Label>Database Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => handleTypeChange(v as DatabaseType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DB_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Host & Port (not for SQLite) */}
          {!isSqlite && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="conn-host">Host</Label>
                <Input
                  id="conn-host"
                  placeholder="localhost"
                  value={form.host || ''}
                  onChange={e => setForm(prev => ({ ...prev, host: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conn-port">Port</Label>
                <Input
                  id="conn-port"
                  type="number"
                  value={form.port || ''}
                  onChange={e => setForm(prev => ({ ...prev, port: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          )}

          {/* Username & Password (not for SQLite) */}
          {!isSqlite && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="conn-user">Username</Label>
                <Input
                  id="conn-user"
                  placeholder="root"
                  value={form.username || ''}
                  onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conn-pass">Password</Label>
                <Input
                  id="conn-pass"
                  type="password"
                  placeholder="••••••••"
                  value={form.password || ''}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Database */}
          <div className="space-y-2">
            <Label htmlFor="conn-db">
              {isSqlite ? 'Database File Path' : 'Database'}
            </Label>
            <Input
              id="conn-db"
              placeholder={isSqlite ? '/path/to/database.db' : 'my_database'}
              value={form.database || ''}
              onChange={e => setForm(prev => ({ ...prev, database: e.target.value }))}
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                testResult.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{testResult.message}</span>
              {testResult.latency_ms && (
                <span className="ml-auto text-xs opacity-60">
                  {testResult.latency_ms}ms
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
            className="gap-1.5"
          >
            {isTesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Test Connection
          </Button>
          <Button size="sm" onClick={handleSave}>
            {editingConnection ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
