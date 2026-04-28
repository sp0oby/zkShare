"use client";

import { useEffect, useRef } from "react";

export function ZKVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, isInside: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        isInside: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.isInside = false;
    };

    const handleMouseEnter = () => {
      mouseRef.current.isInside = true;
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("mouseenter", handleMouseEnter);

    interface Node {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      radius: number;
      pulse: number;
      orbitAngle: number;
      orbitSpeed: number;
      orbitRadius: number;
    }

    const nodes: Node[] = [];
    const nodeCount = 16;

    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      nodes.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 3 + Math.random() * 3,
        pulse: Math.random() * Math.PI * 2,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.005 + Math.random() * 0.01,
        orbitRadius: 20 + Math.random() * 30,
      });
    }

    // Particles that spawn near mouse
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }
    const particles: Particle[] = [];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Spawn particles near mouse
      if (mouse.isInside && Math.random() > 0.7) {
        particles.push({
          x: mouse.x + (Math.random() - 0.5) * 40,
          y: mouse.y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 60,
          maxLife: 60,
        });
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = (p.life / p.maxLife) * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fill();
      }

      // Update node positions with mouse interaction
      nodes.forEach((node) => {
        // Orbit motion
        node.orbitAngle += node.orbitSpeed;
        const orbitX = Math.cos(node.orbitAngle) * node.orbitRadius;
        const orbitY = Math.sin(node.orbitAngle) * node.orbitRadius;

        // Base movement
        node.baseX += node.vx;
        node.baseY += node.vy;

        if (node.baseX < 50 || node.baseX > canvas.width - 50) node.vx *= -1;
        if (node.baseY < 50 || node.baseY > canvas.height - 50) node.vy *= -1;

        // Calculate target position
        let targetX = node.baseX + orbitX;
        let targetY = node.baseY + orbitY;

        // Mouse influence - nodes are attracted to mouse
        if (mouse.isInside) {
          const dx = mouse.x - targetX;
          const dy = mouse.y - targetY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 200;

          if (dist < maxDist) {
            const force = (1 - dist / maxDist) * 0.15;
            targetX += dx * force;
            targetY += dy * force;
          }
        }

        // Smooth interpolation
        node.x += (targetX - node.x) * 0.08;
        node.y += (targetY - node.y) * 0.08;

        node.pulse += 0.03;
      });

      // Draw connections with mouse influence
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Increased connection distance near mouse
          let connectionDist = 120;
          if (mouse.isInside) {
            const midX = (nodes[i].x + nodes[j].x) / 2;
            const midY = (nodes[i].y + nodes[j].y) / 2;
            const mouseDist = Math.sqrt(
              (mouse.x - midX) ** 2 + (mouse.y - midY) ** 2
            );
            if (mouseDist < 150) {
              connectionDist = 180;
            }
          }

          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.4;
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();

            // Animated data packet
            const packetProgress = ((time * 0.008 + i * 0.5 + j * 0.3) % 1);
            const packetX = nodes[i].x + dx * packetProgress;
            const packetY = nodes[i].y + dy * packetProgress;

            ctx.beginPath();
            ctx.arc(packetX, packetY, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 1.5})`;
            ctx.fill();
          }
        }

        // Draw connection to mouse if close
        if (mouse.isInside) {
          const dx = mouse.x - nodes[i].x;
          const dy = mouse.y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.3;
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Draw nodes with hover effect
      nodes.forEach((node) => {
        let hoverScale = 1;
        if (mouse.isInside) {
          const dist = Math.sqrt(
            (mouse.x - node.x) ** 2 + (mouse.y - node.y) ** 2
          );
          if (dist < 80) {
            hoverScale = 1 + (1 - dist / 80) * 0.5;
          }
        }

        const pulseRadius = (node.radius + Math.sin(node.pulse) * 1.5) * hoverScale;

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseRadius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.05 * hoverScale})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Outer ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 * hoverScale})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.85})`;
        ctx.fill();

        // Center dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5 * hoverScale, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
      });

      // Central proof visualization - reacts to mouse
      const hexRadius = mouse.isInside 
        ? 50 + Math.sin(time * 0.02) * 10 
        : 60 + Math.sin(time * 0.01) * 5;
      
      // Mouse influence on center
      let adjustedCenterX = centerX;
      let adjustedCenterY = centerY;
      if (mouse.isInside) {
        const dx = mouse.x - centerX;
        const dy = mouse.y - centerY;
        adjustedCenterX = centerX + dx * 0.05;
        adjustedCenterY = centerY + dy * 0.05;
      }

      // Rotating hexagon vertices
      const hexPoints: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2 + time * 0.003;
        const x = adjustedCenterX + Math.cos(angle) * hexRadius;
        const y = adjustedCenterY + Math.sin(angle) * hexRadius;
        hexPoints.push({ x, y });

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fill();
      }

      // Connect hexagon points
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hexPoints[0].x, hexPoints[0].y);
      for (let i = 1; i < hexPoints.length; i++) {
        ctx.lineTo(hexPoints[i].x, hexPoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner rotating triangle
      const innerRadius = hexRadius * 0.5;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i - time * 0.005;
        const x = adjustedCenterX + Math.cos(angle) * innerRadius;
        const y = adjustedCenterY + Math.sin(angle) * innerRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Central proof indicator - pulses more when mouse is near
      const centerDist = mouse.isInside
        ? Math.sqrt((mouse.x - centerX) ** 2 + (mouse.y - centerY) ** 2)
        : 999;
      const centerPulse = centerDist < 150 
        ? 10 + Math.sin(time * 0.08) * 4 
        : 8 + Math.sin(time * 0.04) * 2;

      // Outer glow
      ctx.beginPath();
      ctx.arc(adjustedCenterX, adjustedCenterY, centerPulse + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(adjustedCenterX, adjustedCenterY, centerPulse, 0, Math.PI * 2);
      ctx.fillStyle = "black";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(adjustedCenterX, adjustedCenterY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();

      // Mouse cursor indicator
      if (mouse.isInside) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 6 + Math.sin(time * 0.1) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();
      }

      time++;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
    />
  );
}
