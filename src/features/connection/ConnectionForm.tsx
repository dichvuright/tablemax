import { useState, useEffect, useCallback } from 'react';
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
  type ConnectionMethod,
  DB_DEFAULT_PORTS,
  DB_LABELS,
  DB_URI_PREFIXES,
} from '../../../shared/types/connection';
import { toast } from 'sonner';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Link2,
  FormInput,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DatabaseIcon } from '@/components/icons/database-icons';

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

const DB_TYPES = Object.keys(DB_LABELS) as DatabaseType[];

/** Try to detect database type from URI */
function detectDbTypeFromUri(uri: string): DatabaseType | null {
  const lower = uri.toLowerCase().trim();
  for (const [prefix, type] of Object.entries(DB_URI_PREFIXES)) {
    if (lower.startsWith(prefix)) return type;
  }
  return null;
}

/** Build a display URI from form fields */
function buildUriPreview(form: Partial<DatabaseConnection>): string {
  const { type, host, port, username, database } = form;
  switch (type) {
    case 'mysql':
      return `mysql://${username || 'root'}:****@${host || 'localhost'}:${port || 3306}/${database || ''}`;
    case 'postgres':
      return `postgres://${username || 'postgres'}:****@${host || 'localhost'}:${port || 5432}/${database || ''}`;
    case 'sqlite':
      return `sqlite:${database || './database.db'}`;
    case 'mongodb':
      if (username) return `mongodb://${username}:****@${host || 'localhost'}:${port || 27017}/${database || ''}`;
      return `mongodb://${host || 'localhost'}:${port || 27017}/${database || ''}`;
    case 'redis':
      if (username) return `redis://${username}:****@${host || 'localhost'}:${port || 6379}`;
      return `redis://${host || 'localhost'}:${port || 6379}`;
    default:
      return '';
  }
}

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
    connectionMethod: 'form',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: '',
    name: '',
    uri: '',
    color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
    ssl: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editingConnection) {
      setForm({ ...editingConnection });
    } else {
      setForm({
        type: 'mysql',
        connectionMethod: 'form',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '',
        database: '',
        name: '',
        uri: '',
        color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
        ssl: false,
      });
    }
    clearTestResult();
    setShowPassword(false);
  }, [editingConnection, isFormOpen]);

  const handleDbTypeChange = useCallback((value: string | null) => {
    if (!value) return;
    const dbType = value as DatabaseType;
    setForm(prev => ({
      ...prev,
      type: dbType,
      port: DB_DEFAULT_PORTS[dbType],
      username: dbType === 'mysql' ? 'root' : dbType === 'postgres' ? 'postgres' : '',
    }));
    clearTestResult();
  }, [clearTestResult]);

  const handleConnectionMethodChange = useCallback((value: string | null) => {
    if (!value) return;
    setForm(prev => ({ ...prev, connectionMethod: value as ConnectionMethod }));
    clearTestResult();
  }, [clearTestResult]);

  const handleUriChange = useCallback((uri: string) => {
    setForm(prev => {
      const detected = detectDbTypeFromUri(uri);
      return {
        ...prev,
        uri,
        ...(detected ? { type: detected, port: DB_DEFAULT_PORTS[detected] } : {}),
      };
    });
    clearTestResult();
  }, [clearTestResult]);

  const handleTest = async () => {
    const conn = buildConnectionForTest();
    if (!conn) return;
    await testConnection(conn);
  };

  const buildConnectionForTest = (): DatabaseConnection | null => {
    return {
      id: editingConnection?.id || generateId(),
      name: form.name || `${DB_LABELS[form.type!]} Connection`,
      type: form.type!,
      connectionMethod: form.connectionMethod || 'form',
      host: form.host || 'localhost',
      port: form.port || DB_DEFAULT_PORTS[form.type!],
      username: form.username || '',
      password: form.password || '',
      database: form.database || '',
      uri: form.uri || '',
      color: form.color || '#6366f1',
      ssl: form.ssl || false,
      authSource: form.authSource || '',
    };
  };

  const handleSave = async () => {
    const conn = buildConnectionForTest();
    if (!conn) return;

    if (!conn.name.trim()) {
      conn.name = `${DB_LABELS[conn.type]} Connection`;
    }

    // Validate
    if (conn.connectionMethod === 'uri') {
      if (!conn.uri?.trim()) {
        toast.error('Please enter a connection URI');
        return;
      }
    } else {
      if (conn.type !== 'sqlite' && !conn.host.trim()) {
        toast.error('Please enter a host');
        return;
      }
    }

    try {
      if (editingConnection) {
        await updateConnection(conn);
        toast.success('Connection updated');
      } else {
        await addConnection(conn);
        toast.success('Connection saved');
      }
      closeForm();
    } catch (err) {
      toast.error('Failed to save', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const isSqlite = form.type === 'sqlite';
  const isRedis = form.type === 'redis';
  const isMongo = form.type === 'mongodb';

  return (
    <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {editingConnection ? 'Edit Connection' : 'New Connection'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Connection Name + Color */}
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

          {/* Database Type + Connection Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Database Type</Label>
              <Select value={form.type} onValueChange={handleDbTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DB_TYPES.map(t => (
                    <SelectItem key={t} value={t}>
                      <DatabaseIcon type={t} className="size-4 shrink-0" />
                      {DB_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Connection Method</Label>
              <Select value={form.connectionMethod} onValueChange={handleConnectionMethodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="form">
                    <FormInput className="size-3.5 mr-1 inline" />
                    Form
                  </SelectItem>
                  <SelectItem value="uri">
                    <Link2 className="size-3.5 mr-1 inline" />
                    URI
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Connection Details */}
          {form.connectionMethod === 'uri' ? (
            /* ─── URI Mode ─── */
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="conn-uri">Connection URI</Label>
                <Input
                  id="conn-uri"
                  placeholder={
                    form.type === 'mongodb'
                      ? 'mongodb://user:pass@localhost:27017/mydb'
                      : form.type === 'postgres'
                      ? 'postgres://user:pass@localhost:5432/mydb'
                      : form.type === 'mysql'
                      ? 'mysql://user:pass@localhost:3306/mydb'
                      : form.type === 'redis'
                      ? 'redis://localhost:6379'
                      : 'sqlite:./database.db'
                  }
                  value={form.uri || ''}
                  onChange={e => handleUriChange(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Paste your full connection string. DB type is auto-detected from the URI prefix.
                </p>
              </div>
            </div>
          ) : (
            /* ─── Form Mode ─── */
            <div className="space-y-3">
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

              {!isSqlite && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="conn-user">Username</Label>
                    <Input
                      id="conn-user"
                      placeholder={form.type === 'mysql' ? 'root' : 'user'}
                      value={form.username || ''}
                      onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conn-pass">Password</Label>
                    <div className="relative">
                      <Input
                        id="conn-pass"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.password || ''}
                        onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isRedis && (
                <div className="space-y-2">
                  <Label htmlFor="conn-db">
                    {isSqlite ? 'Database File Path' : 'Database'}
                  </Label>
                  <Input
                    id="conn-db"
                    placeholder={isSqlite ? './my-database.db' : 'my_database'}
                    value={form.database || ''}
                    onChange={e => setForm(prev => ({ ...prev, database: e.target.value }))}
                  />
                </div>
              )}

              {/* MongoDB-specific: Auth Source */}
              {isMongo && (
                <div className="space-y-2">
                  <Label htmlFor="conn-auth-source">Auth Source</Label>
                  <Input
                    id="conn-auth-source"
                    placeholder="admin"
                    value={form.authSource || ''}
                    onChange={e => setForm(prev => ({ ...prev, authSource: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Authentication database (default: admin)
                  </p>
                </div>
              )}

              {/* SSL Toggle */}
              {!isSqlite && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, ssl: !prev.ssl }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                      form.ssl 
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ShieldCheck className="size-3.5" />
                    SSL {form.ssl ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              )}

              {/* URI Preview */}
              <div className="rounded-md border border-border/50 bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground mb-1">Connection String Preview</p>
                <code className="text-[11px] font-mono text-foreground/70 break-all">
                  {buildUriPreview(form)}
                </code>
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`flex items-center gap-2 p-2.5 rounded-md text-sm ${
              testResult.success
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="text-xs flex-1">{testResult.message}</span>
              {testResult.latency_ms !== undefined && (
                <span className="text-[10px] opacity-70">{testResult.latency_ms}ms</span>
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
          >
            {isTesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Zap className="h-3.5 w-3.5 mr-1.5" />
            )}
            Test
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={closeForm}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            {editingConnection ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
