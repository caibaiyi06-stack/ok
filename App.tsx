import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, ContactShadows } from '@react-three/drei';
import { Upload, X, Mic, Send, Minimize2, Maximize2, RotateCw, Save, Grid, MessageSquare, Sparkles } from 'lucide-react';
import { AppState, Message, ParticleConfig, PostcardData } from './types';
import { DEFAULT_PARTICLE_CONFIG } from './constants';
import * as GeminiService from './services/geminiService';
import ParticleScene from './components/ParticleScene';
import Postcard3D from './components/Postcard3D';
import MemoryCorridor from './components/MemoryCorridor';
import AudioController from './components/AudioController';

const App = () => {
  const [state, setState] = useState<AppState>(AppState.LANDING);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [particleConfig, setParticleConfig] = useState<ParticleConfig>(DEFAULT_PARTICLE_CONFIG);
  const [showConfig, setShowConfig] = useState(true);
  const [showChat, setShowChat] = useState(false); 
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [memories, setMemories] = useState<PostcardData[]>([]);
  const [currentPostcard, setCurrentPostcard] = useState<PostcardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPostcard, setIsGeneratingPostcard] = useState(false); // New state for postcard loading

  // Keyboard Listener for Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state === AppState.CHAT && e.code === 'Space') {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          setShowChat(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  // Handlers
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImageUrl(base64);
        setState(AppState.CHAT);
        setIsPlayingAudio(true);
        setShowChat(true); 
        
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
    // Start Visual Loading Sequence
    setShowChat(false);
    setIsGeneratingPostcard(true);

    // AI Generation
    const summary = await GeminiService.generatePostcardSummary(messages);
    
    // Simulate a bit of "processing" time for the visual effect if API is too fast
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newMemory: PostcardData = {
      id: Date.now().toString(),
      imageUrl: imageUrl!,
      summary,
      date: new Date().toLocaleDateString('zh-CN'),
      time: new Date().toLocaleTimeString('zh-CN'),
      viewCount: 1,
      particles: 15000,
      mood: 'Peaceful'
    };
    
    setMemories(prev => [...prev, newMemory]);
    setCurrentPostcard(newMemory);
    
    // Transition
    setIsGeneratingPostcard(false);
    setState(AppState.POSTCARD_VIEW);
  };

  const renderUI = () => {
    // Global Loading Overlay for Postcard Generation
    if (isGeneratingPostcard) {
      return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
           <div className="relative">
             <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
             <Sparkles className="text-yellow-200 w-16 h-16 animate-spin-slow mb-6 relative z-10 opacity-80" />
           </div>
           <h2 className="text-3xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 to-yellow-600 tracking-[0.3em] animate-pulse">
             正在凝结记忆...
           </h2>
           <p className="text-white/40 font-serif mt-4 text-sm tracking-widest">
             将时间的碎片编织成永恒
           </p>
        </div>
      );
    }

    switch (state) {
      case AppState.LANDING:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black text-white overflow-hidden">
            <div className="absolute w-[600px] h-[600px] bg-yellow-900/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
            
            <h1 className="text-6xl md:text-8xl font-title tracking-widest mb-8 relative z-20 text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-800 drop-shadow-lg">
              记忆回廊
            </h1>
            <p className="text-xl md:text-2xl font-serif text-yellow-100/60 mb-12 tracking-widest text-center max-w-lg">
              每一次对话，都是一颗消融的粒子<br/>在时间的缝隙中起舞
            </p>
            
            <label className="group relative px-8 py-4 border border-yellow-700/50 hover:border-yellow-500 transition-all cursor-pointer overflow-hidden">
               <div className="absolute inset-0 bg-yellow-900/10 group-hover:bg-yellow-800/20 transition-all" />
               <span className="relative font-serif text-yellow-500 tracking-[0.2em] flex items-center gap-2">
                 <Upload size={18} /> 上传记忆
               </span>
               <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>

            {memories.length > 0 && (
                <button 
                  onClick={() => setState(AppState.MEMORY_CORRIDOR)}
                  className="mt-6 text-yellow-800/70 hover:text-yellow-600 font-serif text-sm tracking-widest flex items-center gap-2"
                >
                   <Grid size={14} /> 进入回廊
                </button>
            )}
          </div>
        );

      case AppState.CHAT:
        return (
          <>
            {/* Control Panel */}
            <div className={`absolute top-10 left-10 z-20 transition-all duration-500 ease-out ${showConfig ? 'w-64 opacity-100 translate-x-0' : 'w-10 opacity-50 -translate-x-4'}`}>
              <div className="backdrop-blur-md bg-black/40 border border-white/10 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  {showConfig && <h3 className="font-serif text-yellow-500 text-sm tracking-widest">粒子调谐</h3>}
                  <button onClick={() => setShowConfig(!showConfig)} className="text-white/50 hover:text-white">
                    {showConfig ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
                
                {showConfig && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">大小 (Size)</label>
                      <input 
                        type="range" min="0.5" max="5" step="0.1" 
                        value={particleConfig.size}
                        onChange={(e) => setParticleConfig({...particleConfig, size: parseFloat(e.target.value)})}
                        className="w-full accent-yellow-600 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">扩散 (Dispersion)</label>
                      <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={particleConfig.dispersion}
                        onChange={(e) => setParticleConfig({...particleConfig, dispersion: parseFloat(e.target.value)})}
                        className="w-full accent-yellow-600 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">曲度 (Curvature)</label>
                      <input 
                        type="range" min="0" max="3" step="0.1" 
                        value={particleConfig.curvature}
                        onChange={(e) => setParticleConfig({...particleConfig, curvature: parseFloat(e.target.value)})}
                        className="w-full accent-yellow-600 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">起伏 (Amplitude)</label>
                      <input 
                        type="range" min="0.1" max="4.0" step="0.1" 
                        value={particleConfig.roughness}
                        onChange={(e) => setParticleConfig({...particleConfig, roughness: parseFloat(e.target.value)})}
                        className="w-full accent-yellow-600 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="text-xs text-gray-500 font-mono pt-2">
                      音频响应: {(audioLevel * 100).toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hint for Spacebar */}
            {!showChat && (
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white/30 text-xs font-serif tracking-[0.2em] animate-pulse">
                [ 空格键 开启对话 ]
              </div>
            )}

            {/* Chat Interface - ENHANCED STYLE */}
            <div 
              className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-30
                ${showChat ? 'bottom-24 opacity-100 translate-y-0 scale-100' : 'bottom-0 opacity-0 translate-y-20 scale-95 pointer-events-none'}
                w-[90vw] md:w-[700px] flex flex-col
              `}
            >
              <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-yellow-900/10 ring-1 ring-white/5">
                
                {/* Header/Close Handle */}
                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 hover:bg-white/20 cursor-pointer transition-colors" onClick={() => setShowChat(false)} />

                {/* Chat History */}
                <div className="max-h-[45vh] overflow-y-auto mb-6 custom-scrollbar pr-4">
                  {messages.length === 0 && (
                     <div className="text-center text-white/40 font-serif italic py-10 text-lg">
                       在记忆的微尘中，你想说什么？
                     </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`mb-6 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-6 py-4 rounded-3xl text-lg font-serif leading-relaxed tracking-wide shadow-lg ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-yellow-900/60 to-yellow-900/20 text-yellow-50 border border-yellow-700/30 rounded-br-sm' 
                          : 'bg-white/10 text-gray-100 border border-white/5 rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 pl-4 text-yellow-500/50">
                       <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                       <span className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
                       <span className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
                    </div>
                  )}
                </div>
                
                {/* Input Area */}
                <div className="relative flex items-center gap-4 border-t border-white/10 pt-6">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="写下你的感受..."
                    className="flex-1 bg-transparent border-none outline-none text-white font-serif placeholder-white/20 text-lg"
                    autoFocus={showChat}
                  />
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSendMessage} 
                        disabled={isLoading} 
                        className="p-3 rounded-full hover:bg-white/10 text-yellow-600 hover:text-yellow-400 transition-all disabled:opacity-50"
                    >
                        <Send size={24} />
                    </button>
                    <button 
                        onClick={handleEndChat}
                        title="生成明信片"
                        className="p-3 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-all group relative"
                    >
                        <Save size={24} />
                        <span className="absolute -top-10 right-0 bg-black/80 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            储存记忆
                        </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case AppState.POSTCARD_VIEW:
        return (
          <div className="absolute top-10 left-10 z-20 animate-fade-in">
             <button 
               onClick={() => setState(AppState.MEMORY_CORRIDOR)}
               className="px-6 py-2 border border-white/20 text-white font-serif hover:bg-white/5 transition-all flex items-center gap-2"
             >
               <Grid size={16} /> 存入记忆回廊
             </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-screen bg-[#050505] relative overflow-hidden">
      <AudioController isPlaying={isPlayingAudio} onData={setAudioLevel} />

      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [3, 2, 5], fov: 75 }} dpr={[1, 2]}>
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 5, 15]} />
          
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            
            {state === AppState.CHAT && !isGeneratingPostcard && imageUrl && (
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

            {/* Render Postcard only after generation is complete */}
            {state === AppState.POSTCARD_VIEW && currentPostcard && (
               <>
                 <Postcard3D 
                   data={currentPostcard} 
                   onClose={() => setState(AppState.MEMORY_CORRIDOR)} 
                 />
                 <Environment preset="night" />
               </>
            )}

            {state === AppState.MEMORY_CORRIDOR && (
              <>
                <MemoryCorridor 
                  memories={memories} 
                  onBack={() => setState(AppState.LANDING)}
                />
                <OrbitControls enableRotate={false} enableZoom={true} />
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