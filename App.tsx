import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Cloud } from '@react-three/drei';
import { Send, Minimize2, Maximize2, Save, Aperture } from 'lucide-react';
import { AppState, Message, ParticleConfig, PostcardData } from './types';
import { DEFAULT_PARTICLE_CONFIG } from './constants';
import * as GeminiService from './services/geminiService';
import ParticleScene from './components/ParticleScene';
import MemoryCorridor from './components/MemoryCorridor';
import AudioController from './components/AudioController';
import Postcard3D from './components/Postcard3D';

// --- Camera Controller Component ---
const CameraController = ({ state }: { state: AppState }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    if (state === AppState.MEMORY_CORRIDOR) {
        const t = setTimeout(() => {
           // Move camera back to view the whole collection
           camera.position.set(0, 0, 14);
           camera.lookAt(0, 0, 0);
           camera.updateProjectionMatrix();
        }, 100);
        return () => clearTimeout(t);
    } else if (state === AppState.POSTCARD_VIEW) {
         camera.position.set(0, 0, 6);
         camera.lookAt(0, 0, 0);
    }
  }, [state, camera]);
  
  return null;
};

const App = () => {
  const [state, setState] = useState<AppState>(AppState.INTRO);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [particleConfig, setParticleConfig] = useState<ParticleConfig>(DEFAULT_PARTICLE_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [showChat, setShowChat] = useState(false); 
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [memories, setMemories] = useState<PostcardData[]>([]);
  const [currentPostcard, setCurrentPostcard] = useState<PostcardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatStartTimeRef = useRef<number>(0);
  
  // Transition states
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Keyboard Listener for Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state === AppState.CHAT && e.code === 'Space') {
        if (document.activeElement?.tagName === 'INPUT') {
            return;
        }
        e.preventDefault();
        setShowChat(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  // Handlers
  const handleEnterApp = () => {
    setIsPlayingAudio(true); 
    setIsTransitioning(true);
    setTimeout(() => {
        setState(AppState.LANDING);
        setIsTransitioning(false);
    }, 1500);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImageUrl(base64);
        setState(AppState.CHAT);
        setShowChat(false); 
        chatStartTimeRef.current = Date.now();
        
        setIsLoading(true);
        const mimeType = file.type;
        const initialText = await GeminiService.startChatWithImage(base64.split(',')[1], mimeType);
        setMessages([{ role: 'model', text: initialText, timestamp: new Date() }]);
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMsg: Message = { role: 'user', text: inputText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    const reply = await GeminiService.sendMessage([...messages, userMsg], inputText);
    setMessages(prev => [...prev, { role: 'model', text: reply, timestamp: new Date() }]);
    setIsLoading(false);
  };

  const handleEndChat = async () => {
    // Calculate Duration
    const durationMs = Date.now() - chatStartTimeRef.current;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const durationStr = `${minutes}m ${seconds}s`;

    // Indicate loading state
    setIsLoading(true);

    // AI Generation
    const result = await GeminiService.generatePostcardSummary(messages);

    // Random initial position for the puzzle piece (scattered)
    const randomX = (Math.random() - 0.5) * 6;
    const randomY = (Math.random() - 0.5) * 4;

    const newMemory: PostcardData = {
      id: Date.now().toString(),
      imageUrl: imageUrl!,
      summary: result.cn,
      summaryEn: result.en,
      date: new Date().toLocaleDateString('zh-CN'),
      time: new Date().toLocaleTimeString('zh-CN'),
      duration: durationStr,
      viewCount: 1,
      particles: particleConfig.size * 1000, 
      mood: result.mood,
      position: [randomX, randomY, 0]
    };
    
    // Set current postcard for viewing before saving to list
    setCurrentPostcard(newMemory);
    
    setIsLoading(false);
    setShowChat(false);
    // Transition to Postcard View first
    setState(AppState.POSTCARD_VIEW);
  };

  const handleSavePostcard = (userNote: string) => {
      if (currentPostcard) {
          const updatedMemory = { ...currentPostcard, userNote };
          
          // Check if memory already exists to update it, or add new
          setMemories(prev => {
              const exists = prev.find(m => m.id === updatedMemory.id);
              if (exists) {
                  return prev.map(m => m.id === updatedMemory.id ? updatedMemory : m);
              }
              return [...prev, updatedMemory];
          });
          
          setState(AppState.MEMORY_CORRIDOR);
          setCurrentPostcard(null);
      }
  };

  const handleSelectMemory = (data: PostcardData) => {
      setCurrentPostcard(data);
      setState(AppState.POSTCARD_VIEW);
  };

  const renderUI = () => {
    switch (state) {
      case AppState.INTRO:
        return (
           <div className={`absolute inset-0 flex flex-col items-center justify-center z-50 bg-black text-white overflow-hidden transition-all duration-[1500ms] ease-in-out ${isTransitioning ? 'opacity-0 scale-110 blur-3xl' : 'opacity-100'}`}>
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-yellow-900/10 rounded-full blur-[100px] animate-pulse delay-1000" />
                
                <div className="relative z-10 text-center space-y-12">
                    <h1 className="text-6xl md:text-8xl font-title tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    记忆回廊
                    </h1>
                    <p className="text-xs md:text-sm font-serif text-white/30 tracking-[0.8em] uppercase border-t border-white/5 pt-8 inline-block">
                    The Memory Garden
                    </p>

                    <div className="pt-16">
                         <button 
                            onClick={handleEnterApp}
                            className="group relative px-10 py-3 overflow-hidden rounded-sm border-b border-white/20 hover:border-yellow-500/50 transition-all duration-700"
                         >
                            <span className="relative z-10 font-serif text-[10px] text-white/60 tracking-[0.4em] flex items-center gap-4 group-hover:text-yellow-100 transition-colors uppercase">
                                Enter the Void
                            </span>
                         </button>
                    </div>
                </div>
           </div>
        );

      case AppState.LANDING:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-transparent text-white animate-fade-in">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_120%)] pointer-events-none" />
            
            <div className="relative z-20 flex flex-col items-center group">
                <div className="absolute w-[400px] h-[400px] border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute w-[380px] h-[380px] border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-50" />
                
                <label className="relative w-64 h-64 rounded-full flex items-center justify-center cursor-pointer transition-all duration-700 hover:scale-105">
                    <div className="absolute inset-0 bg-yellow-500/0 rounded-full blur-3xl group-hover:bg-yellow-900/20 transition-colors duration-1000" />
                    <div className="absolute inset-0 border border-dashed border-white/20 rounded-full group-hover:animate-[spin_10s_linear_infinite] group-hover:border-yellow-500/30 transition-colors" />
                    
                    <div className="text-center z-10 space-y-4">
                        <Aperture className="w-6 h-6 text-white/40 mx-auto group-hover:text-yellow-100 transition-colors duration-500" strokeWidth={1} />
                        <div className="space-y-1">
                            <span className="block text-[10px] text-white/60 tracking-[0.4em] font-serif uppercase group-hover:text-white transition-colors">
                                Upload Image
                            </span>
                            <span className="block text-[8px] text-white/20 tracking-[0.2em] font-serif uppercase">
                                Initialize Particle System
                            </span>
                        </div>
                    </div>

                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>

                <div className="mt-12 text-[9px] text-white/20 tracking-[0.3em] font-serif">
                   SUPPORTING: JPG / PNG / WEBP
                </div>
            </div>

            {memories.length > 0 && (
                <button 
                  onClick={() => setState(AppState.MEMORY_CORRIDOR)}
                  className="absolute bottom-12 px-6 py-2 border border-white/5 bg-black/20 text-white/30 hover:text-yellow-100 hover:border-yellow-500/30 font-serif text-[9px] tracking-[0.4em] transition-all uppercase backdrop-blur-sm"
                >
                   Access Archive
                </button>
            )}
          </div>
        );

      case AppState.CHAT:
        return (
          <>
            <div className={`absolute top-10 left-10 z-20 transition-all duration-500 ${showConfig ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}>
               <button onClick={() => setShowConfig(!showConfig)} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                  {showConfig ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
               </button>
            </div>

            <div className={`absolute top-24 left-10 z-20 w-64 backdrop-blur-md bg-black/60 border border-white/10 p-6 rounded-sm transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top-left ${showConfig ? 'scale-100 opacity-100 visible' : 'scale-90 opacity-0 invisible'}`}>
                <h3 className="font-serif text-yellow-500/80 text-[9px] tracking-[0.2em] mb-6 border-b border-white/10 pb-2">PARTICLE TUNING</h3>
                <div className="space-y-6">
                    {['Size', 'Dispersion', 'Curvature', 'Roughness'].map((label) => (
                        <div key={label}>
                            <label className="text-[9px] text-gray-400 block mb-2 uppercase tracking-widest">{label}</label>
                            <input 
                            type="range" min="0" max={label === 'Size' ? 5 : 3} step="0.1"
                            value={particleConfig[label.toLowerCase() as keyof ParticleConfig] as number}
                            onChange={(e) => setParticleConfig({...particleConfig, [label.toLowerCase()]: parseFloat(e.target.value)})}
                            className="w-full accent-yellow-600 h-px bg-white/20 appearance-none cursor-pointer hover:bg-white/40 transition-colors"
                            />
                        </div>
                    ))}
                    <div className="text-[9px] text-yellow-500/50 font-mono pt-2 text-right tracking-widest">
                      AUDIO REACTIVITY: {(audioLevel * 100).toFixed(0)}%
                    </div>
                </div>
            </div>

            {!showChat && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-center pointer-events-none mix-blend-difference">
                 <div className="text-white/40 text-[9px] font-serif tracking-[0.4em] animate-pulse pb-2 uppercase">
                    Press Space to Converse
                 </div>
                 <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-auto" />
              </div>
            )}

            <div 
              className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] z-30
                ${showChat ? 'bottom-24 opacity-100 translate-y-0' : 'bottom-0 opacity-0 translate-y-12 pointer-events-none'}
                w-[90vw] md:w-[600px] flex flex-col
              `}
            >
              <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black ring-1 ring-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent opacity-50" />
                <div className="w-8 h-1 bg-white/10 rounded-full mx-auto mb-8 hover:bg-white/30 cursor-pointer transition-colors" onClick={() => setShowChat(false)} />

                <div className="max-h-[40vh] overflow-y-auto mb-8 custom-scrollbar pr-4 relative z-10">
                  {messages.map((msg, i) => (
                    <div key={i} className={`mb-6 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] px-5 py-3 text-sm font-serif leading-loose tracking-wide ${
                        msg.role === 'user' 
                          ? 'text-yellow-50/90 border-r-2 border-yellow-500/30 text-right pr-4' 
                          : 'text-gray-300 border-l-2 border-white/10 pl-4'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-1 pl-4 opacity-30">
                       <span className="w-1 h-1 bg-white rounded-full animate-bounce" />
                       <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-100" />
                       <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-200" />
                    </div>
                  )}
                </div>
                
                <div className="relative flex items-center gap-4 pt-4 border-t border-white/5 z-10">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Whisper to the void..."
                    className="flex-1 bg-transparent border-none outline-none text-white/80 font-serif placeholder-white/10 text-sm tracking-wider"
                    autoFocus={showChat}
                  />
                  <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSendMessage} 
                        disabled={isLoading} 
                        className="text-white/20 hover:text-yellow-500 transition-colors disabled:opacity-50"
                    >
                        <Send size={16} strokeWidth={1.5} />
                    </button>
                    <button 
                        onClick={handleEndChat}
                        disabled={isLoading}
                        className="text-white/20 hover:text-white transition-colors disabled:opacity-50"
                        title="Condense Memory"
                    >
                        <Save size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-screen bg-[#050505] relative overflow-hidden selection:bg-yellow-500/30">
      <AudioController isPlaying={isPlayingAudio} onData={setAudioLevel} />

      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [3, 2, 5], fov: 75 }} dpr={[1, 2]}>
          <CameraController state={state} />
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 5, 20]} />
          
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
            
            {(state === AppState.INTRO || state === AppState.LANDING) && (
               <Cloud opacity={0.3} speed={0.2} bounds={[10, 2, 1.5]} segments={20} position={[0, -2, -10]} color="#1a1a1a" />
            )}

            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            
            {state === AppState.CHAT && imageUrl && (
              <>
                <ParticleScene 
                  imageUrl={imageUrl} 
                  config={particleConfig}
                  audioData={audioLevel}
                />
                <OrbitControls 
                  enableZoom={true} 
                  enablePan={false} 
                  autoRotate={!isLoading && !showChat} 
                  autoRotateSpeed={0.5} 
                />
              </>
            )}

            {state === AppState.POSTCARD_VIEW && currentPostcard && (
               <Postcard3D 
                 data={currentPostcard} 
                 onClose={() => {}}
                 onSave={handleSavePostcard}
               />
            )}

            {state === AppState.MEMORY_CORRIDOR && (
              <>
                <MemoryCorridor 
                  memories={memories} 
                  onBack={() => setState(AppState.LANDING)}
                  onSelectMemory={handleSelectMemory}
                />
                <OrbitControls enableRotate={false} enableZoom={true} minDistance={5} maxDistance={20}/>
                <Environment preset="city" />
              </>
            )}

          </Suspense>
        </Canvas>
      </div>

      {renderUI()}
    </div>
  );
};

export default App;