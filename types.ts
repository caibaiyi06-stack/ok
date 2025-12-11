export enum AppState {
  INTRO = 'INTRO',
  LANDING = 'LANDING',
  SELECTION = 'SELECTION',
  CHAT = 'CHAT',
  POSTCARD_VIEW = 'POSTCARD_VIEW',
  MEMORY_CORRIDOR = 'MEMORY_CORRIDOR'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface PostcardData {
  id: string;
  imageUrl: string;
  summary: string; // Chinese (Healing short)
  summaryEn: string; // English (Longer)
  date: string;
  time: string;
  duration: string; // e.g. "12m"
  viewCount: number;
  particles: number;
  mood: string;
  userNote?: string;
  position: [number, number, number];
}

export interface ParticleConfig {
  size: number;
  speed: number;
  density: number;
  color: string;
  dispersion: number;
  curvature: number;
  roughness: number;
}