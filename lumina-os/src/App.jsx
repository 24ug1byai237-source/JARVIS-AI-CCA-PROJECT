import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Float, 
  MeshDistortMaterial, 
  Sphere, 
  Stars, 
  Text, 
  PresentationControls,
  PerspectiveCamera,
  Environment,
  OrbitControls,
  MeshWobbleMaterial
} from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

// --- Constants & Commands ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api";

const COMMANDS = {
  YOUTUBE: 'https://www.youtube.com',
  GOOGLE: 'https://www.google.com',
  SPOTIFY: 'https://open.spotify.com',
  GITHUB: 'https://github.com',
  NETFLIX: 'https://www.netflix.com',
  CHATGPT: 'https://chat.openai.com',
  CALCULATOR: 'https://www.google.com/search?q=calculator',
};

const MUSIC_TRACKS = {
  'BELIEVER': '7wtfhZwyrcc',
  'RELAXING': 'lTRiuFIWV54',
  'LO-FI': 'jfKfPfyJRdk',
  'CINEMATIC': 'ASj8V-7S-aM',
  'STAY': 'WaI-O6W-nIs',
  'STARBOY': 'dXv7ZrvI0No'
};

const CONTACTS = {
  "ullas": "+916361258145",
  "aryan": "+919142817966",
  "akshata": "+919980965961",
  "ganesh": "+918197900121"
};

// --- 3D Components ---

const ParticleField = ({ count = 2000, dreamMode }) => {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 50;
      p[i * 3 + 1] = (Math.random() - 0.5) * 50;
      p[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return p;
  }, [count]);

  const pointsRef = useRef();
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = time * 0.05;
    pointsRef.current.rotation.x = time * 0.02;
    if (dreamMode) {
      pointsRef.current.scale.setScalar(1 + Math.sin(time) * 0.2);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color={dreamMode ? "#a78bfa" : "#06b6d4"}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

const FloatingGrid = ({ dreamMode }) => {
  const gridRef = useRef();
  useFrame((state) => {
    gridRef.current.position.z = (state.clock.getElapsedTime() * 2) % 2;
  });

  return (
    <group ref={gridRef}>
      <gridHelper 
        args={[100, 50, dreamMode ? "#8b5cf6" : "#06b6d4", dreamMode ? "#4c1d95" : "#083344"]} 
        position={[0, -5, 0]} 
        rotation={[0, 0, 0]}
      />
    </group>
  );
};

const AIOrb = ({ active, dreamMode, isSpeaking }) => {
  const orbRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    orbRef.current.position.y = Math.sin(t) * 0.2;
    ring1Ref.current.rotation.z = t * 0.5;
    ring1Ref.current.rotation.x = t * 0.3;
    ring2Ref.current.rotation.z = -t * 0.8;
    ring2Ref.current.rotation.y = t * 0.4;
    
    if (isSpeaking) {
      orbRef.current.scale.setScalar(1.4 + Math.sin(t * 15) * 0.15);
    } else if (active) {
      orbRef.current.scale.setScalar(1.2 + Math.sin(t * 10) * 0.1);
    } else {
      orbRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    }
  });

  const baseColor = dreamMode ? "#8b5cf6" : (isSpeaking ? "#22d3ee" : "#06b6d4");
  const emissiveColor = dreamMode ? "#4c1d95" : (isSpeaking ? "#083344" : "#083344");

  return (
    <group position={[0, 0, 0]}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <Sphere ref={orbRef} args={[1, 64, 64]}>
          <MeshDistortMaterial
            color={baseColor}
            speed={isSpeaking ? 5 : 3}
            distort={isSpeaking ? 0.6 : 0.4}
            radius={1}
            emissive={emissiveColor}
            emissiveIntensity={isSpeaking ? 4 : 2}
          />
        </Sphere>
      </Float>

      {/* Holographic Rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.5, 0.02, 16, 100]} />
        <meshStandardMaterial color={baseColor} emissive={baseColor} emissiveIntensity={5} transparent opacity={0.5} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.8, 0.01, 16, 100]} />
        <meshStandardMaterial color={baseColor} emissive={baseColor} emissiveIntensity={3} transparent opacity={0.3} />
      </mesh>

      <pointLight intensity={isSpeaking ? 15 : 10} color={baseColor} distance={10} />
    </group>
  );
};

// --- UI Components ---

const GlassCard = ({ children, className = "", title = "" }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`glass-panel p-6 neon-border-cyan ${className}`}
  >
    {title && <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
      {title}
    </h3>}
    {children}
  </motion.div>
);

const Terminal = ({ logs }) => {
  const [systemLogs, setSystemLogs] = useState([]);
  
  useEffect(() => {
    const sysMsgs = [
      "SYNCHRONIZING NEURAL PATHS...",
      "UPDATING CORE FRAGMENT #829...",
      "FIREWALL: NOMINAL",
      "DECRYPTING SECURE SECTOR...",
      "OPTIMIZING DATA THROUGHPUT...",
      "NEURAL LINK STABLE",
      "SCANNING FOR INTRUSIONS... NONE"
    ];
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const msg = sysMsgs[Math.floor(Math.random() * sysMsgs.length)];
        setSystemLogs(prev => [msg, ...prev].slice(0, 5));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[10px] text-cyan-300/60 space-y-1 h-48 overflow-y-auto scroll-smooth">
      {systemLogs.map((log, i) => (
        <div key={`sys-${i}`} className="flex gap-2 opacity-40">
          <span className="text-cyan-700">DEBUG:</span>
          <span>{log}</span>
        </div>
      ))}
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2 text-xs">
          <span className="text-violet-400 font-bold">[SYSTEM]</span>
          <span className={log.startsWith('>') ? 'text-white' : 'text-cyan-300'}>{log}</span>
        </div>
      ))}
    </div>
  );
};

const VoiceWaveform = ({ active }) => (
  <div className="flex items-center justify-center gap-1 h-8">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ 
          height: active ? [4, Math.random() * 24 + 8, 4] : 4,
          opacity: active ? 1 : 0.3
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 0.5 + Math.random() * 0.5,
          ease: "easeInOut"
        }}
        className="w-1 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"
      />
    ))}
  </div>
);

const Suggestions = () => {
  const [index, setIndex] = useState(0);
  const hints = [
    "PLAY BELIEVER",
    "ACTIVATE DREAM MODE",
    "OPEN CHATGPT",
    "WHAT TIME IS IT?",
    "MESSAGE ULLAS",
    "SYSTEM RESTART"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % hints.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 opacity-50">
      <span className="text-[8px] font-mono text-cyan-600 uppercase tracking-[0.3em]">Neural Suggestions</span>
      <AnimatePresence mode="wait">
        <motion.p 
          key={index}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-[10px] font-bold text-cyan-400 tracking-widest italic"
        >
          "JARVIS, {hints[index]}"
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

const MusicPlayer = ({ track, isPlaying, onToggleVideo }) => (
  <div className="flex items-center gap-4 group cursor-pointer" onClick={onToggleVideo}>
    <div className="relative w-12 h-12 flex items-end justify-center gap-1 bg-cyan-500/5 rounded-lg border border-cyan-500/20 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="music-bar w-1 bg-cyan-400/80" 
          style={{ 
            animationDuration: `${0.5 + Math.random()}s`,
            animationPlayState: isPlaying ? 'running' : 'paused',
            height: isPlaying ? '100%' : '20%'
          }} 
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
        <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
    <div className="flex-1 overflow-hidden">
      <p className="text-[8px] text-cyan-500 uppercase tracking-widest font-bold mb-1">Neural Audio Stream</p>
      <p className="text-sm font-bold text-white truncate w-full group-hover:text-cyan-400 transition-colors">
        {track || 'SYSTEM IDLE'}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-[8px] text-cyan-700 uppercase tracking-tighter">
          {isPlaying ? 'Streaming Direct' : 'Standby'}
        </span>
      </div>
    </div>
  </div>
);

const HolographicVideo = ({ song, isVisible, onClose }) => {
  if (!song || !isVisible) return null;
  
  // If it's a known track ID, use watch, otherwise use search playlist
  const isId = song.length === 11 && !song.includes(' ');
  const src = isId 
    ? `https://www.youtube.com/embed/${song}?autoplay=1&modestbranding=1&rel=0`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(song)}&autoplay=1&modestbranding=1`;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, x: 100 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 100 }}
      className="fixed top-24 right-8 w-96 z-50 perspective-1000"
    >
      <div className="glass-panel p-1 neon-border-cyan overflow-hidden transform-gpu rotate-y-[-10deg]">
        <div className="flex justify-between items-center px-4 py-2 bg-cyan-950/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Live Visual Data</span>
          </div>
          <button onClick={onClose} className="text-cyan-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="aspect-video bg-black relative">
          <iframe 
            width="100%" 
            height="100%" 
            src={src}
            title="YouTube player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            className="opacity-90"
          ></iframe>
          <div className="absolute inset-0 pointer-events-none border-2 border-cyan-500/20" />
          {/* Scanning line effect for the video */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        </div>
        <div className="p-3 flex items-center justify-between bg-black/40">
          <div className="flex gap-1">
            <div className="w-4 h-1 bg-cyan-500/50" />
            <div className="w-8 h-1 bg-cyan-500" />
            <div className="w-2 h-1 bg-cyan-500/30" />
          </div>
          <span className="text-[8px] font-mono text-cyan-600 uppercase">Direct Link Established</span>
        </div>
      </div>
      {/* Decorative holographic elements */}
      <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400/50" />
      <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400/50" />
    </motion.div>
  );
};

const MemoryBank = ({ memories, isVisible, onClose }) => {
  if (!isVisible) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, x: -100 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
      className="fixed top-24 left-8 w-80 z-50 perspective-1000"
    >
      <div className="glass-panel p-4 neon-border-cyan transform-gpu rotate-y-[10deg]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-ping" />
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Neural Memory Core</span>
          </div>
          <button onClick={onClose} className="text-cyan-400">×</button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {memories.length === 0 ? (
            <p className="text-[10px] text-cyan-700 italic">Memory core is empty, sir.</p>
          ) : (
            memories.map((m, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={m.id || i} 
                className="p-2 border-l-2 border-violet-500/30 bg-violet-500/5 rounded-r-lg"
              >
                <p className="text-xs text-white leading-relaxed">{m.content}</p>
                <p className="text-[8px] text-violet-700 mt-1 font-mono uppercase">
                  Stored: {new Date(m.timestamp).toLocaleString()}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TranscriptionOverlay = ({ text, active }) => (
  <AnimatePresence>
    {active && text && (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
      >
        <div className="glass-panel px-6 py-2 border-cyan-500/50 flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <p className="text-sm font-mono text-cyan-400 uppercase tracking-widest italic opacity-80">
            {text}...
          </p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const HardwareMonitor = () => {
  const [stats, setStats] = useState({ cpu: 45, gpu: 32, ram: 58, temp: 42 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(30 + Math.random() * 40),
        gpu: Math.floor(20 + Math.random() * 50),
        ram: Math.floor(50 + Math.random() * 10),
        temp: Math.floor(38 + Math.random() * 12)
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const Bar = ({ label, val, color }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[8px] font-mono">
        <span className="text-white/40">{label}</span>
        <span style={{ color }}>{val}%</span>
      </div>
      <div className="w-full bg-white/5 h-0.5 rounded-full overflow-hidden">
        <motion.div 
          animate={{ width: `${val}%` }}
          className="h-full"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <Bar label="NEURAL-CPU" val={stats.cpu} color="#22d3ee" />
      <Bar label="CORE-TEMP" val={stats.temp} color="#f43f5e" />
      <Bar label="VISION-GPU" val={stats.gpu} color="#a78bfa" />
      <Bar label="BUFFER-RAM" val={stats.ram} color="#10b981" />
    </div>
  );
};

const StartupSequence = ({ onComplete }) => {
  const [percent, setPercent] = useState(0);
  const [log, setLog] = useState("Initializing Core...");

  useEffect(() => {
    const sequence = [
      { p: 10, m: "PROBING HARDWARE..." },
      { p: 25, m: "CPU: QUANTUM-7 DETECTED" },
      { p: 40, m: "GPU: NEURAL-RTX ACTIVE" },
      { p: 60, m: "MEMORY BANK: CONNECTED" },
      { p: 85, m: "BYPASSING FIREWALLS..." },
      { p: 100, m: "SYSTEM STABLE" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setPercent(prev => {
        const next = prev + 1;
        if (currentStep < sequence.length && next >= sequence[currentStep].p) {
          setLog(sequence[currentStep].m);
          currentStep++;
        }
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return 100;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div 
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]" />
      
      <div className="relative w-96 h-96 flex flex-col items-center justify-center">
        {/* Animated Rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.05, 1] }}
            transition={{ rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity } }}
            className="absolute border border-cyan-500/20 rounded-full"
            style={{ inset: i * 20 }}
          />
        ))}

        <div className="z-10 flex flex-col items-center">
          <motion.h1 
            initial={{ letterSpacing: "1em", opacity: 0 }}
            animate={{ letterSpacing: "0.2em", opacity: 1 }}
            className="text-6xl font-black text-cyan-400 neon-text-cyan italic mb-8"
          >
            JARVIS
          </motion.h1>
          
          <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden mb-4">
            <motion.div 
              className="h-full bg-cyan-400 shadow-[0_0_20px_#22d3ee]"
              style={{ width: `${percent}%` }}
            />
          </div>
          
          <div className="h-4">
            <AnimatePresence mode="wait">
              <motion.p 
                key={log}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[10px] font-mono text-cyan-500/80 uppercase tracking-[0.5em]"
              >
                {log}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FingerprintScanner = () => (
  <div className="relative w-32 h-32 text-cyan-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="w-full h-full">
      <path d="M12 11c0-1.657-1.343-3-3-3s-3 1.343-3 3v2" />
      <path d="M15 13V11c0-3.314-2.686-6-6-6S3 7.686 3 11v5" />
      <path d="M18 16V11c0-4.971-4.029-9-9-9S0 6.029 0 11v8" />
      <path d="M21 19V11c0-6.627-5.373-12-12-12S-3 4.373-3 11v11" />
      <path d="M9 11c0 1.657 1.343 3 3 3s3-1.343 3-3V9" />
      <path d="M12 14v2c0 3.314 2.686 6 6 6s6-2.686 6-6V11" />
    </svg>
    <motion.div 
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] z-10"
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [booted, setBooted] = useState(false);
  const [dreamMode, setDreamMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [commandLog, setCommandLog] = useState(['JARVIS OS Online', 'Awaiting command...']);
  const [musicTrack, setMusicTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [pendingUrl, setPendingUrl] = useState(null);
  const [systemState, setSystemState] = useState('online'); 
  const [isLocked, setIsLocked] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [activeSong, setActiveSong] = useState(null); // Can be ID or name
  const [memories, setMemories] = useState([]);
  const [showMemory, setShowMemory] = useState(false);
  const [interimText, setInterimText] = useState("");
  const videoRef = useRef(null);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/memory`);
        const data = await res.json();
        setMemories(data);
      } catch (e) {
        console.warn("Memory backend unavailable.");
      }
    };
    fetchMemories();
  }, []);

  // Cursor Trail
  const cursorRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (cursorRef.current) {
        gsap.to(cursorRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.5,
          ease: "power2.out"
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Hand Gesture Detection (Disabled for Manual Demo)
  useEffect(() => {
    // MediaPipe detection removed for stable manual demo
  }, [isLocked]);

  const isProcessingRef = useRef(false);
  const previousCommandRef = useRef('');

  // Voice Recognition Setup
  const recognition = useMemo(() => {
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) return null;
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true; // Stay on for better "JARVIS" feel
    rec.interimResults = true; // Real-time feedback
    rec.lang = 'en-US';
    return rec;
  }, []);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const command = event.results[i][0].transcript.toLowerCase().trim();
          
          // Debounce same command
          if (isProcessingRef.current || command === previousCommandRef.current) return;
          
          previousCommandRef.current = command;
          isProcessingRef.current = true;
          setInterimText(""); // Clear interim on final
          
          addLog(`> ${command.toUpperCase()}`);
          handleVoiceCommand(command);
          
          setTimeout(() => { 
            isProcessingRef.current = false; 
            previousCommandRef.current = ''; 
          }, 3000);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      addLog(`System Error: ${event.error}`);
    };

    recognition.onstart = () => {
      setIsListening(true);
      addLog("System: JARVIS is listening...");
    };

    recognition.onend = () => {
      // Auto-restart if we're supposed to be listening (makes it more stable than continuous:true)
      if (isListening) {
        try {
          recognition.start();
        } catch(e) {
          console.error("Failed to restart recognition:", e);
        }
      } else {
        setIsListening(false);
        addLog("System: Mic deactivated.");
      }
    };

    return () => recognition.stop();
  }, [recognition, isListening]);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const addLog = (msg) => setCommandLog(prev => [msg, ...prev].slice(0, 50));

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes('English') && (v.name.includes('Male') || v.name.includes('UK')));
    if (jarvisVoice) utterance.voice = jarvisVoice;
    window.speechSynthesis.speak(utterance);
  };

  const openInNewTab = (url) => {
    // Direct attempt - bypasses blocks if browser thinks mic-activation is a 'gesture'
    const newWin = window.open(url, '_blank');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      addLog("System: Popup blocked. Please use the [LAUNCH] button.");
    }
  };

  const respond = (text, url = null) => {
    setAiResponse(text);
    setPendingUrl(url); 
    addLog(`AI: ${text}`);
    speak(text);
    
    if (url) {
      // Execute IMMEDIATELY (no delay) to stay in the same event stack
      openInNewTab(url);
    }

    setTimeout(() => {
      setAiResponse('');
      setPendingUrl(null);
    }, url ? 10000 : 5000); // 10 seconds for URLs, 5 seconds for normal speech
  };

  const handleVoiceCommand = (cmd) => {
    // --- APP & NAVIGATION ---
    const match = (keys) => keys.some(k => cmd.includes(k));

    if (match(['youtube'])) {
      respond('Opening YouTube.', 'https://www.youtube.com');
    } else if (match(['google', 'search'])) {
      const query = cmd.split(/google|search/i)[1]?.trim();
      if (query) {
        respond(`Searching for ${query}.`, `https://www.google.com/search?q=${encodeURIComponent(query)}`);
      } else {
        respond('Opening Google.', 'https://www.google.com');
      }
    } else if (match(['spotify'])) {
      respond('Launching Spotify.', 'https://open.spotify.com');
    } else if (match(['github'])) {
      respond('Accessing GitHub.', 'https://github.com');
    } else if (match(['whatsapp', 'message', 'text'])) {
      // Improved WhatsApp Logic
      const contactName = Object.keys(CONTACTS).find(name => cmd.includes(name));
      if (contactName) {
        const phone = CONTACTS[contactName].replace('+', '');
        const messageParts = cmd.split(contactName);
        const text = messageParts.length > 1 ? messageParts[1].replace(/saying|say|message/i, '').trim() : '';
        
        if (text) {
          respond(`Preparing message to ${contactName}: "${text}"`, `https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
        } else {
          respond(`Opening chat with ${contactName}.`, `https://wa.me/${phone}`);
        }
      } else {
        respond("Contact not found in neural database. Opening WhatsApp Web.", "https://web.whatsapp.com");
      }
    }

    // --- MEDIA CONTROL ---
    else if (match(['play '])) {
      const songName = cmd.split('play ')[1].trim();
      if (songName) {
        const upperSong = songName.toUpperCase();
        const trackId = MUSIC_TRACKS[upperSong];
        
        setMusicTrack(songName.charAt(0).toUpperCase() + songName.slice(1));
        setIsPlaying(true);
        setActiveSong(trackId || songName);
        setShowVideo(true);
        
        respond(`Initializing direct neural uplink for ${songName}. Auto-play engaged.`);
        // Note: No second tab open for music to ensure holographic player has priority
      }
    } else if (match(['pause music', 'stop music', 'stop'])) {
      respond('Terminating all audio transmissions.');
      setIsPlaying(false);
      setShowVideo(false);
      setActiveSong(null);
    }

    // --- SYSTEM & HARDWARE ---
    else if (match(['shutdown', 'turn off laptop'])) {
      respond("System shutdown sequence initiated. All hardware components will power down in 5 seconds. Goodbye, sir.");
      setSystemState('shutdown');
      setTimeout(async () => {
        try {
          await fetch(`${BACKEND_URL}/system/shutdown`, { method: 'POST' });
        } catch (e) {
          addLog("System Error: Local hardware controller not responding.");
        }
      }, 5000);
    } else if (match(['restart', 'reboot'])) {
      respond("Rebooting JARVIS core and physical hardware.");
      setSystemState('restarting');
      setTimeout(async () => {
        try {
          await fetch(`${BACKEND_URL}/system/restart`, { method: 'POST' });
        } catch (e) {
          addLog("System Error: Local hardware controller not responding.");
        }
      }, 5000);
    }

    // --- MEMORY ---
    else if (match(['remember ', 'save '])) {
      const info = cmd.replace(/remember|save/i, '').trim();
      if (info) {
        respond(`Committing to neural memory: ${info}`);
        const saveMemory = async () => {
          try {
            const res = await fetch(`${BACKEND_URL}/memory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: info })
            });
            const data = await res.json();
            setMemories(prev => [data, ...prev]);
            setShowMemory(true);
          } catch (e) {
            addLog("Memory Error: Database uplink failed.");
          }
        };
        saveMemory();
      }
    } else if (match(['recall', 'show memory', 'what do you know'])) {
      respond("Accessing neural memory core.");
      setShowMemory(true);
    }

    // --- UTILS & GREETINGS ---
    else if (match(['time'])) {
      respond(`The current time is ${new Date().toLocaleTimeString()}.`);
    } else if (match(['date'])) {
      respond(`Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`);
    } else if (match(['hello', 'hi', 'hey', 'jarvis'])) {
      respond("At your service, sir. Systems are nominal.");
    } else if (match(['who are you'])) {
      respond("I am JARVIS. A Kinetic Neural Interface assistant.");
    } else if (match(['thank'])) {
      respond("The pleasure is mine, sir.");
    }

    // --- FALLBACK ---
    else {
      respond(`I've found something for "${cmd}".`, `https://www.google.com/search?q=${encodeURIComponent(cmd)}`);
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${dreamMode ? 'bg-purple-950/20' : 'bg-black'}`}>
      <AnimatePresence>
        {!booted && <StartupSequence onComplete={() => setBooted(true)} />}
      </AnimatePresence>

      {/* Interactive Cursor Trail */}
      <div 
        ref={cursorRef}
        className="fixed w-8 h-8 pointer-events-none z-[9999] rounded-full border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
      >
        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" />
      </div>

      {/* Background Visuals */}
      <div className="fixed inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <ParticleField count={dreamMode ? 4000 : 2000} dreamMode={dreamMode} />
            <FloatingGrid dreamMode={dreamMode} />
            <AIOrb active={isListening} dreamMode={dreamMode} isSpeaking={isSpeaking} />
            
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
            <Environment preset="city" />
            
            <EffectComposer>
              <Bloom intensity={1.5} luminanceThreshold={0.2} radius={0.4} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* HUD & UI Layout */}
      {booted && (
        <div className="relative z-10 w-full h-full p-8 flex flex-col justify-between pointer-events-none">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start pointer-events-auto">
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center neon-border-cyan">
                <span className="font-black text-xl text-cyan-400">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-widest text-cyan-400 neon-text-cyan">JARVIS</h1>
                <p className="text-[10px] font-mono text-cyan-600/80 tracking-[0.2em]">KINETIC NEURAL INTERFACE v2.0</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-right"
            >
              <p className="text-xs font-mono text-cyan-400">SESSION ID: #LX-9902</p>
              <p className="text-sm font-bold text-white tracking-widest">
                {new Date().toLocaleTimeString()}
              </p>
              <div className="flex gap-2 justify-end mt-2">
                <span className={`w-2 h-2 rounded-full ${dreamMode ? 'bg-violet-400 shadow-[0_0_10px_#a78bfa]' : 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'}`} />
                <span className="text-[10px] text-cyan-500 uppercase">{dreamMode ? 'DREAM MODE ACTIVE' : 'SYSTEM NOMINAL'}</span>
              </div>
            </motion.div>
          </div>

          {/* Center Visual/Voice */}
          <div className="flex-1 flex items-center justify-center relative">
            <AnimatePresence>
              {aiResponse && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.1, y: -20 }}
                  className="absolute bottom-1/4 glass-panel px-8 py-4 neon-border-cyan flex flex-col items-center gap-4 z-50"
                >
                  <p className="text-xl font-medium text-cyan-300 neon-text-cyan tracking-wide italic text-center">
                    "{aiResponse}"
                  </p>
                  
                  <VoiceWaveform active={isSpeaking} />
                  
                  {pendingUrl && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openInNewTab(pendingUrl)}
                      className="px-6 py-2 bg-cyan-500/20 border border-cyan-400 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full pointer-events-auto shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                    >
                      EXECUTE LAUNCH sequence
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-10 flex flex-col items-center gap-4 pointer-events-auto">
              <Suggestions />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isListening 
                    ? 'bg-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.8)]' 
                    : 'bg-cyan-500/10 border border-cyan-500/50 backdrop-blur-md'
                }`}
              >
                {isListening ? (
                  <div className="flex gap-1 items-center h-6">
                    <motion.div animate={{ height: [8, 24, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-white" />
                    <motion.div animate={{ height: [12, 32, 12] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-white" />
                    <motion.div animate={{ height: [8, 24, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-white" />
                  </div>
                ) : (
                  <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                )}
              </motion.button>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.4em]">
                {isListening ? 'LISTENING...' : 'TAP TO TRANSMIT'}
              </p>
            </div>
          </div>

          {/* Bottom Grid Layout */}
          <div className="grid grid-cols-12 gap-6 items-end pointer-events-auto">
            
            {/* Left: Terminal */}
            <div className="col-span-3">
              <GlassCard title="Command Stream" className="h-64">
                <Terminal logs={commandLog} />
              </GlassCard>
            </div>

            {/* Center: Quick Links / Apps */}
            <div className="col-span-6 flex flex-col items-center gap-6 pb-4">
              <HardwareMonitor />
              <div className="flex flex-wrap justify-center gap-4">
                {Object.keys(COMMANDS).map((key) => (
                  <motion.button
                    key={key}
                    whileHover={{ y: -5, scale: 1.05 }}
                    onClick={() => handleVoiceCommand(`open ${key.toLowerCase()}`)}
                    className="btn-futuristic flex flex-col items-center gap-2 min-w-[100px]"
                  >
                    <span className="text-[10px] font-bold text-cyan-400 tracking-widest">{key}</span>
                    <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Right: Status & Music */}
            <div className="col-span-3 space-y-4">
              <GlassCard title="Network Diagnostics">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-cyan-600 uppercase font-mono">Quantum Encryption</span>
                    <span className="text-cyan-400">ACTIVE [AES-512]</span>
                  </div>
                  <div className="w-full bg-cyan-900/30 h-1 rounded-full overflow-hidden relative">
                    <motion.div animate={{ width: ['20%', '80%', '40%', '90%'] }} transition={{ duration: 10, repeat: Infinity }} className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                    <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-y-0 w-20 bg-white/20 skew-x-12" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <p className="text-[8px] text-cyan-700 uppercase mb-1 font-mono">Neural Uplink</p>
                      <div className="flex items-end gap-1 h-4">
                        {[...Array(4)].map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [4, 16, 8, 12, 4] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 bg-violet-500/50 rounded-t-sm"
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] text-cyan-700 uppercase mb-1 font-mono">Sync Rate</p>
                      <p className="text-xs font-black text-cyan-400">99.2%</p>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] pt-1">
                    <span className="text-cyan-600 uppercase font-mono">Sub-Space Ping</span>
                    <span className="text-cyan-400">12ms</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard title="Media Controller">
                <MusicPlayer 
                  track={musicTrack} 
                  isPlaying={isPlaying} 
                  onToggleVideo={() => setShowVideo(!showVideo)}
                />
              </GlassCard>
            </div>

          </div>
        </div>
      )}

      {/* Holographic Projections */}
      <AnimatePresence>
        {showVideo && activeSong && (
          <HolographicVideo 
            song={activeSong} 
            isVisible={showVideo} 
            onClose={() => setShowVideo(false)} 
          />
        )}
        {showMemory && (
          <MemoryBank 
            memories={memories} 
            isVisible={showMemory} 
            onClose={() => setShowMemory(false)} 
          />
        )}
      </AnimatePresence>

      <TranscriptionOverlay text={interimText} active={isListening} />

      {/* Scanning Effect Overlay */}
      <div className="scanline" />
      <div className="fixed inset-0 pointer-events-none hologram-grid opacity-20" />

      {/* Shutdown Overlay */}
      <AnimatePresence>
        {systemState !== 'online' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-cyan-500 font-mono text-xl tracking-[0.5em]"
            >
              {systemState === 'shutdown' ? 'SYSTEM SHUTDOWN' : 'REBOOTING SYSTEM...'}
            </motion.div>
            <div className="mt-8 w-64 h-1 bg-cyan-900 overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="w-full h-full bg-cyan-400"
              />
            </div>
            {systemState === 'shutdown' && (
              <button 
                onClick={() => setSystemState('online')}
                className="mt-12 text-xs text-cyan-800 hover:text-cyan-400 transition-colors pointer-events-auto"
              >
                [ EMERGENCY OVERRIDE ]
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Lock Screen Overlay */}
      <AnimatePresence>
        {isLocked && booted && (
          <motion.div 
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center"
          >
            <div className="relative w-80 h-80 flex items-center justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-cyan-500/30 rounded-full"
              />
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { 
                  setIsLocked(false); 
                  respond("Biometric scan complete. Welcome back, sir.");
                }}
                className="w-48 h-48 border-4 border-cyan-400 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.5)] bg-cyan-500/10 pointer-events-auto cursor-pointer group"
              >
                <FingerprintScanner />
                <motion.span 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="mt-2 text-[8px] font-black text-cyan-400 uppercase tracking-widest"
                >
                  Scan Biometrics
                </motion.span>
              </motion.button>
            </div>
            
            <h2 className="mt-12 text-2xl font-black tracking-[0.3em] text-cyan-400 neon-text-cyan">
              BIOMETRIC LOCK ACTIVE
            </h2>
            <p className="mt-4 text-cyan-600 font-mono text-sm uppercase tracking-widest animate-pulse">
              TAP SENSOR TO UNLOCK JARVIS
            </p>

            <button 
              onClick={() => { setIsLocked(false); respond("Manual override accepted."); }}
              className="mt-8 px-4 py-2 border border-cyan-900 text-[10px] text-cyan-800 hover:text-cyan-400 transition-all pointer-events-auto"
            >
              [ MANUAL OVERRIDE ]
            </button>

            {/* Hidden Video for Detection */}
            <video ref={videoRef} className="hidden" playsInline muted />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
