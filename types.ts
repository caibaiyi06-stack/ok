export enum AppState {
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
  summary: string;
  date: string;
  time: string;
  viewCount: number;
  particles: number;
  mood: string;
}

export interface ParticleConfig {
  size: number;
  speed: number;
  density: number;
  color: string;
  dispersion: number;
  curvature: number;
  roughness: number; // Amplitude of undulation
}