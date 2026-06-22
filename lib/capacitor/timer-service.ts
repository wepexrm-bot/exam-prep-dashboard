export interface TimerTickData {
  elapsed: number;
  running: boolean;
  paused: boolean;
}

type ListenerId = string;

const listeners: Record<string, { event: string; fn: Function }> = {};
let listenerIdCounter = 0;

function getPlugin(): any {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return (window as any).Capacitor.Plugins?.TimerService;
  }
  return null;
}

export const TimerService = {
  async startTimer(elapsed = 0): Promise<void> {
    const plugin = getPlugin();
    if (!plugin) return;
    try { await plugin.startTimer({ elapsed }); } catch {}
  },

  async pauseTimer(): Promise<void> {
    const plugin = getPlugin();
    if (!plugin) return;
    try { await plugin.pauseTimer(); } catch {}
  },

  async resumeTimer(): Promise<void> {
    const plugin = getPlugin();
    if (!plugin) return;
    try { await plugin.resumeTimer(); } catch {}
  },

  async stopTimer(): Promise<void> {
    const plugin = getPlugin();
    if (!plugin) return;
    try { await plugin.stopTimer(); } catch {}
  },

  async getTimerState(): Promise<{ running: boolean; paused: boolean; elapsed: number }> {
    const plugin = getPlugin();
    if (!plugin) return { running: false, paused: false, elapsed: 0 };
    try { return await plugin.getTimerState(); } catch { return { running: false, paused: false, elapsed: 0 }; }
  },

  addListener(event: string, fn: (...args: any[]) => void): () => void {
    const plugin = getPlugin();
    if (!plugin) return () => {};

    const id = `ls_${++listenerIdCounter}`;
    listeners[id] = { event, fn };

    if (plugin.addListener) {
      plugin.addListener(event, (data: any) => fn(data));
    }

    return () => { delete listeners[id]; };
  },
};
