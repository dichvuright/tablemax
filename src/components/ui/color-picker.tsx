import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HexColorPicker } from 'react-colorful';
import { cn } from '@/lib/utils';
import { Palette, Check } from 'lucide-react';

const COLOR_PRESETS = [
  '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c',
  '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c',
  '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c',
  '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309',
  '#fef9c3', '#fef08a', '#fde047', '#eab308', '#ca8a04', '#a16207',
  '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f',
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d',
  '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857',
  '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e',
  '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490',
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8',
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
  '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce',
  '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d',
  '#ffffff', '#cbd5e1', '#64748b', '#475569', '#0f172a', '#000000',
];

/**
 * Check if a hex color is dark (for choosing text contrast)
 */
function isHexDark(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

export function ColorPicker({ value, onChange, label = 'Color', className }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  // Sync input when value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (v: string) => {
    setInputValue(v);
    // Only fire onChange for valid hex colors
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v);
    }
  };

  const handleInputBlur = () => {
    // Reset to current value if invalid
    if (!/^#[0-9a-fA-F]{6}$/.test(inputValue)) {
      setInputValue(value);
    }
  };

  return (
    <div className={cn('grid gap-2 self-start w-fit', className)}>
      {label && (
        <Label className="text-sm text-foreground leading-none block">
          {label}
        </Label>
      )}
      <Popover>
        <PopoverTrigger
          className="border-foreground/10 grid size-[46px] place-content-center rounded-xl border outline-2 outline-offset-2 outline-transparent duration-200 hover:outline-primary cursor-pointer"
          style={{ backgroundColor: value }}
        >
          <Palette
            className={cn('size-4', isHexDark(value) ? 'text-white/80' : 'text-black/60')}
          />
        </PopoverTrigger>
        <PopoverContent className="w-[228px] p-3">
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="mb-3 grid grid-cols-2 w-full">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="picker">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="presets" className="space-y-2">
              <div className="flex max-h-44 flex-wrap gap-1 overflow-y-auto">
                {COLOR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(preset)}
                    className={cn(
                      'relative size-7 rounded-full border-2 transition-all hover:scale-110',
                      value === preset
                        ? 'ring-2 ring-primary border-primary/30'
                        : 'border-transparent hover:border-foreground/20',
                    )}
                    style={{ backgroundColor: preset }}
                  >
                    {value === preset && (
                      <div className="absolute inset-0 grid place-content-center">
                        <Check
                          className={cn(
                            'size-3.5 drop-shadow',
                            isHexDark(preset) ? 'text-white' : 'text-black'
                          )}
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="picker" className="space-y-2">
              <HexColorPicker
                color={value}
                onChange={onChange}
              />
            </TabsContent>
            <div className="relative mt-2">
              <div className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
                HEX
              </div>
              <Input
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                className="pl-10 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { COLOR_PRESETS, isHexDark };
