import React, { useEffect, useRef } from 'react';
import { MUSIC_URL } from '../constants';

interface AudioControllerProps {
  isPlaying: boolean;
  onData: (data: number) => void;
}

const AudioController: React.FC<AudioControllerProps> = ({ isPlaying, onData }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    // Initialize Audio Context on first interaction
    if (isPlaying && !contextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        contextRef.current = new AudioContext();
        analyserRef.current = contextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        audioRef.current = new Audio(MUSIC_URL);
        audioRef.current.loop = true;
        audioRef.current.crossOrigin = "anonymous";
        
        sourceRef.current = contextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(contextRef.current.destination);
    }

    if (isPlaying && audioRef.current && contextRef.current) {
        if(contextRef.current.state === 'suspended') {
            contextRef.current.resume();
        }
        audioRef.current.play().catch(e => console.log("Autoplay blocked waiting for user", e));
        
        const update = () => {
            if (analyserRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                // Get average frequency for simple reactivity
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                onData(avg / 255);
            }
            rafRef.current = requestAnimationFrame(update);
        };
        update();
    } else if (audioRef.current) {
        audioRef.current.pause();
        if(rafRef.current) cancelAnimationFrame(rafRef.current);
    }

    return () => {
        if(rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, onData]);

  return null; // Logic only component
};

export default AudioController;
