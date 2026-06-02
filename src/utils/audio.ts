// Audio synthesis utility using Web Audio API

// Initialize AudioContext lazily so it complies with browser autoplay policies
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playSwoosh = () => {
  const ctx = initAudio();
  
  const bufferSize = ctx.sampleRate * 2.5; // 2.5 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Generate Pink Noise for a much softer, wind-like sound
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.11; // compensate for pink noise gain
    b6 = white * 0.115926;
  }
  
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  
  // Use a lowpass filter instead of bandpass for a deep "whoosh"
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.8;
  
  // Sweep frequency from muffled to bright back to muffled (Subtle)
  lowpass.frequency.setValueAtTime(50, ctx.currentTime);
  lowpass.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 1.25);
  lowpass.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 2.5);
  
  const gainNode = ctx.createGain();
  // Fade in and fade out smoothly (Subtle volume)
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 1.25); // Lower peak volume for subtlety
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
  
  noiseSource.connect(lowpass);
  lowpass.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  noiseSource.start();
  noiseSource.stop(ctx.currentTime + 2.5);
};

export const playSuccessChime = () => {
  const ctx = initAudio();
  const now = ctx.currentTime;
  
  // "Cha" part (Drawer opening / metal mechanism)
  // Short burst of high-frequency white noise
  const chaDuration = 0.15;
  const bufferSize = ctx.sampleRate * chaDuration; 
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 3000; // Lowered from 5000 for a thicker, deeper "cha"
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.7, now); // Slightly louder to compensate
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + chaDuration);
  
  noiseSource.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);
  
  // "Ching" part (The bell ring)
  const playRing = (freq: number, delay: number, duration: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Triangle gives a rich, metallic harmonic profile
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, now + delay);
    // Sharp attack
    gain.gain.linearRampToValueAtTime(vol, now + delay + 0.02);
    // Long exponential decay for the bell ring
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + delay);
    osc.stop(now + delay + duration);
  };

  // Deep, vintage cash register bell frequencies
  playRing(1200, 0.08, 1.2, 0.4); // Fundamental bell tone (lowered significantly)
  playRing(1800, 0.08, 1.5, 0.25); // First overtone
  playRing(2400, 0.1,  1.8, 0.15); // Shimmer
};
