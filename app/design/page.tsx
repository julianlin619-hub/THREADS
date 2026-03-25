'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CanvasConfig {
  minTopPadding: number;
  contentAreaHeight: number;
  maxFontSize: number;
  minFontSize: number;
  fontSizeStep: number;
  lineHeightMult: number;
  letterSpacing: number;
  blankLineRatio: number;
  gap: number;
  topOffset: number;
  headerX: number;
  headerWidth: number;
  textPaddingX: number;
  textRightBoundary: number;
  bgColor: string;
  textColor: string;
}

const DEFAULT_TEXT = `Buy shit from your friends businesses and try and get free shit from strangers

Not the other way around.`;

const FIELDS: { key: keyof CanvasConfig; label: string; type: 'number' | 'color' | 'slider'; step?: number; min?: number; max?: number }[] = [
];

export default function DesignPage() {
  const [config, setConfig] = useState<CanvasConfig | null>(null);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfig = useRef<CanvasConfig | null>(null);
  const latestText = useRef(DEFAULT_TEXT);

  const triggerRender = useCallback((cfg: CanvasConfig, txt: string) => {
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    renderTimeout.current = setTimeout(async () => {
      setPreviewLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/design-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: txt, config: cfg }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Render failed');
        setPreviewImage(data.image);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    fetch('/api/canvas-config')
      .then((r) => r.json())
      .then((cfg) => {
        setConfig(cfg);
        latestConfig.current = cfg;
        triggerRender(cfg, latestText.current);
      });
  }, [triggerRender]);

  function updateField(key: keyof CanvasConfig, value: string) {
    if (!config) return;
    const field = FIELDS.find((f) => f.key === key);
    const next = { ...config, [key]: field?.type === 'number' ? parseFloat(value) : value };
    latestConfig.current = next;
    setConfig(next);
    triggerRender(next, latestText.current);
  }

  function updateText(value: string) {
    latestText.current = value;
    setText(value);
    if (latestConfig.current) triggerRender(latestConfig.current, value);
  }

  async function handleApply() {
    if (!config) return;
    setSaveLoading(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/canvas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Failed to save config');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaveLoading(false);
    }
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading config…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-8 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
          C
        </div>
        <h1 className="font-bold text-lg tracking-tight">CANVAS</h1>
        <span className="text-muted-foreground text-sm">Design Debugger</span>
        <div className="ml-auto">
          <Link href="/pipeline" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Pipeline
          </Link>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Controls */}
        <div className="w-80 flex-shrink-0 border-r border-border overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-md border border-red-800 bg-red-950 text-red-400 px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample Text</label>
            <textarea
              value={text}
              onChange={(e) => updateText(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-border bg-secondary text-foreground text-sm px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Canvas Parameters</p>
            {FIELDS.map(({ key, label, type, step, min, max }) => (
              <div key={key} className="space-y-1">
                {type === 'slider' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <span className="text-xs text-foreground font-mono">{config[key]}px</span>
                    </div>
                    <input
                      type="range"
                      value={config[key] as number}
                      min={min}
                      max={max}
                      step={step}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full accent-primary"
                    />
                  </>
                ) : (
                  <>
                    <label className="text-xs text-muted-foreground">{label}</label>
                    {type === 'color' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config[key] as string}
                          onChange={(e) => updateField(key, e.target.value)}
                          className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                        />
                        <span className="text-sm text-foreground font-mono">{config[key] as string}</span>
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={config[key] as number}
                        step={step}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="w-full rounded-md border border-border bg-secondary text-foreground text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="secondary" onClick={handleApply} disabled={saveLoading}>
              {saveLoading ? 'Saving…' : 'Apply to All Outputs'}
            </Button>
            {saveSuccess && (
              <p className="text-xs text-green-500">Config saved. All future renders will use these settings.</p>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-8 bg-secondary/30">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              {previewLoading ? 'Rendering…' : '1080 × 1920px'}
            </p>
            {previewImage && (
              <img
                src={previewImage}
                alt="Canvas preview"
                style={{ width: 400, height: 'auto', display: 'block', opacity: previewLoading ? 0.5 : 1 }}
                className="rounded-md shadow-lg border border-border transition-opacity"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
