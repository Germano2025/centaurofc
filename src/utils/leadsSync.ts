import { TrialLead, TrialClass } from '../types';

export async function saveLeadToServer(lead: TrialLead): Promise<boolean> {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not post lead to server API:', err);
    return false;
  }
}

export async function fetchServerLeads(): Promise<TrialLead[]> {
  try {
    const res = await fetch('/api/leads');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.leads)) return data.leads;
      return [];
    }
  } catch (err) {
    console.warn('Could not fetch leads from server:', err);
  }
  return [];
}

export async function syncLeadsToServer(leads: TrialLead[]): Promise<boolean> {
  try {
    const res = await fetch('/api/leads/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not sync leads to server:', err);
    return false;
  }
}

export async function fetchServerTrialClasses(): Promise<TrialClass[]> {
  try {
    const res = await fetch('/api/trial-classes');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.trialClasses)) return data.trialClasses;
      return [];
    }
  } catch (err) {
    console.warn('Could not fetch trial classes from server:', err);
  }
  return [];
}

export async function saveTrialClassToServer(tc: TrialClass): Promise<boolean> {
  try {
    const res = await fetch('/api/trial-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tc),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not save trial class to server:', err);
    return false;
  }
}

export async function deleteLeadFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteTrialClassFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/trial-classes/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export function getLeadsBroadcastChannel(): BroadcastChannel | null {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel('ps_leads_channel');
    }
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }
  return null;
}

export function playNewLeadChime() {
  try {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
}

export function broadcastNewLead(lead: TrialLead) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('ps_leads_channel');
      channel.postMessage({ type: 'NEW_LEAD', lead });
      setTimeout(() => {
        try {
          channel.close();
        } catch {}
      }, 500);
    }
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }
}
