
import React, { useRef, useEffect } from 'react';

interface Props {
  history: { x: number; y: number }[];
  isClicking: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const CursorOverlay: React.FC<Props> = ({ history, isClicking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      // 1. Clear Screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // 2. Update and Draw Particles (Sparks)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95; // Shrink

        if (p.life <= 0 || p.size < 0.5) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 3. Draw Flame Trail
      if (history.length > 1) {
        // Draw the core glowing line
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer Glow (Red/Orange)
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4500';
        
        // We draw segments with decreasing opacity/width from head to tail
        for (let i = 0; i < history.length - 1; i++) {
            const pt1 = history[i];
            const pt2 = history[i+1];
            
            // i=0 is oldest (tail), i=length-1 is newest (head)
            const progress = i / (history.length - 1); 
            
            const x1 = pt1.x * width;
            const y1 = pt1.y * height;
            const x2 = pt2.x * width;
            const y2 = pt2.y * height;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);

            // Dynamic Width: Thicker at head, thinner at tail
            const lineWidth = 4 + (progress * 20);
            ctx.lineWidth = lineWidth;

            // Gradient Color
            if (progress > 0.8) {
                ctx.strokeStyle = `rgba(255, 255, 200, ${progress})`; // White/Yellow
            } else if (progress > 0.5) {
                ctx.strokeStyle = `rgba(255, 165, 0, ${progress * 0.8})`; // Orange
            } else {
                ctx.strokeStyle = `rgba(255, 69, 0, ${progress * 0.5})`; // Red
            }

            ctx.stroke();

            // Spawn Particles along the trail occasionally
            if (Math.random() < 0.3) {
                 particlesRef.current.push({
                    x: x1 + (Math.random() - 0.5) * 10,
                    y: y1 + (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2 + 1, // Slight upward drift (fire)
                    life: 20 + Math.random() * 20,
                    maxLife: 40,
                    size: 2 + Math.random() * 3,
                    color: Math.random() > 0.5 ? '#ffcc00' : '#ff4500'
                });
            }
        }
        ctx.shadowBlur = 0;
      }

      // 4. Draw Head (Jet Core)
      if (history.length > 0) {
        const head = history[history.length - 1];
        const hx = head.x * width;
        const hy = head.y * height;

        // Intense Core Glow
        const gradient = ctx.createRadialGradient(hx, hy, 2, hx, hy, 30);
        gradient.addColorStop(0, '#ffffff'); // White hot center
        gradient.addColorStop(0.2, '#fff700'); // Yellow
        gradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.5)'); // Orange
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Transparent

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(hx, hy, 40, 0, Math.PI * 2);
        ctx.fill();

        // Inner Jet "Nozzle"
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, hy, isClicking ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();

        // Add bursts of particles at head
        for(let k=0; k<2; k++) {
             particlesRef.current.push({
                x: hx,
                y: hy,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                size: 3 + Math.random() * 2,
                color: '#ffffff'
            });
        }
      }

      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [history, isClicking]);

  return (
    <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-50 pointer-events-none"
    />
  );
};
