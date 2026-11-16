import { useRef, useState } from 'react';
import { useStore } from '../store';
import { PageHeader, Plate, Segmented } from '../components/ui/primitives';
import { Hand } from '../components/cards/PlayingCard';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSettings);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const reset = useStore((s) => s.reset);
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-academy-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Progress exported.');
  };

  return (
    <div>
      <PageHeader serial="00" kicker="Settings" title="Settings and data" lede="Everything is stored in this browser only. Export a file to move your progress to another device or to keep a backup." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Plate title="Appearance" serial="S-01">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px]">Theme</div>
                <div className="text-[13px] text-dim">Ink is the dark theme, paper the light one.</div>
              </div>
              <Segmented label="Theme" value={settings.theme} onChange={(theme) => set({ theme })} options={[{ value: 'dark', label: 'Ink' }, { value: 'light', label: 'Paper' }]} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px]">Deck</div>
                <div className="text-[13px] text-dim">Four colours makes suits readable at a glance and does not rely on red against black.</div>
              </div>
              <Segmented label="Deck colours" value={settings.fourColor ? 'four' : 'two'} onChange={(v) => set({ fourColor: v === 'four' })} options={[{ value: 'two', label: 'Two' }, { value: 'four', label: 'Four' }]} />
            </div>
            <Hand cards={[51, 46, 41, 36]} size="lg" />
          </div>
        </Plate>
        <Plate title="Your data" serial="S-02">
          <div className="space-y-5">
            <p className="text-[14px] text-dim">The export holds lesson progress, drill statistics, review schedule, notes and saved ranges as plain JSON.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={download}>Export progress</button>
              <button type="button" className="btn" onClick={() => file.current?.click()}>Import a file</button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setMsg(importData(await f.text()) ? 'Progress imported.' : 'That file is not a Poker Academy export.');
                  e.target.value = '';
                }}
              />
            </div>
            <div className="border-t border-bone/15 pt-5">
              {confirm ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[14px]">Erase all progress in this browser?</span>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => { reset(); setConfirm(false); setMsg('Progress erased.'); }}>Erase</button>
                  <button type="button" className="btn btn-sm" onClick={() => setConfirm(false)}>Keep it</button>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>Erase all progress</button>
              )}
            </div>
            {msg && <p className="label text-verd" role="status">{msg}</p>}
          </div>
        </Plate>
      </div>
    </div>
  );
}
