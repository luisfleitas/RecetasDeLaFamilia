"use client";

import { useEffect, useRef } from "react";

type Orb = {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
};

export default function HomeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const orbs: Orb[] = [
      { x: 0.2, y: 0.22, radius: 220, vx: 0.00022, vy: 0.00016, color: "rgba(201, 111, 51, 0.18)" },
      { x: 0.8, y: 0.18, radius: 210, vx: -0.00016, vy: 0.0002, color: "rgba(232, 167, 78, 0.17)" },
      { x: 0.55, y: 0.85, radius: 260, vx: 0.00013, vy: -0.00016, color: "rgba(156, 86, 49, 0.12)" },
    ];

    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (const orb of orbs) {
        if (!prefersReducedMotion) {
          orb.x += orb.vx;
          orb.y += orb.vy;
          if (orb.x < 0.05 || orb.x > 0.95) {
            orb.vx *= -1;
          }
          if (orb.y < 0.05 || orb.y > 0.95) {
            orb.vy *= -1;
          }
        }

        const px = orb.x * width;
        const py = orb.y * height;
        const gradient = context.createRadialGradient(px, py, 16, px, py, orb.radius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(px, py, orb.radius, 0, Math.PI * 2);
        context.fill();
      }
    };

    const animate = () => {
      draw();
      frameRef.current = window.requestAnimationFrame(animate);
    };

    resize();
    if (prefersReducedMotion) {
      draw();
    } else {
      animate();
    }

    window.addEventListener("resize", resize);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />;
}
