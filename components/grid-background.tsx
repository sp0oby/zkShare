"use client";

import { useEffect, useRef } from "react";

export function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gridSize = 60;
      const cols = Math.ceil(canvas.width / gridSize) + 1;
      const rows = Math.ceil(canvas.height / gridSize) + 1;

      // Draw grid lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
      ctx.lineWidth = 1;

      // Vertical lines
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
      }

      // Animated intersection dots
      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * gridSize;
          const y = j * gridSize;
          const pulse = Math.sin(time * 0.02 + i * 0.3 + j * 0.2) * 0.5 + 0.5;

          ctx.beginPath();
          ctx.arc(x, y, 1.5 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + pulse * 0.12})`;
          ctx.fill();
        }
      }

      // Traveling light pulses along random grid lines
      const pulseCount = 5;
      for (let p = 0; p < pulseCount; p++) {
        const seed = p * 1000 + Math.floor(time * 0.01);
        const isVertical = (seed % 2) === 0;
        const lineIndex = (seed * 7) % (isVertical ? cols : rows);
        const progress = ((time * 0.5 + p * 200) % 1000) / 1000;

        if (isVertical) {
          const x = lineIndex * gridSize;
          const y = progress * canvas.height;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
          gradient.addColorStop(0, "rgba(0, 0, 0, 0.2)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(x - 40, y - 40, 80, 80);
        } else {
          const y = lineIndex * gridSize;
          const x = progress * canvas.width;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
          gradient.addColorStop(0, "rgba(0, 0, 0, 0.2)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(x - 40, y - 40, 80, 80);
        }
      }

      time++;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
