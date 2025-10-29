"use client";

import { useEffect, useRef } from "react";

export default function StepsChart() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !ref.current) return;

    const w = ref.current.width = ref.current.clientWidth;
    const h = ref.current.height = 220;

    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "#0f1520";
    ctx.fillRect(0,0,w,h);

    // axes
    ctx.strokeStyle = "#2b3a50";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, h-30);
    ctx.lineTo(w-10, h-30);
    ctx.stroke();

    // mock weekly steps
    const data = [6200, 7400, 8100, 5600, 9000, 10400, 8400];
    const max = Math.max(...data) * 1.1;

    // line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#5aa6ff";
    data.forEach((v, i) => {
      const x = 40 + (i * (w - 60) / (data.length - 1));
      const y = (h - 30) - (v / max) * (h - 60);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // labels
    ctx.fillStyle = "#a7b3c2";
    ctx.font = "12px ui-sans-serif, system-ui";
    const days = ["M","T","W","T","F","S","S"];
    days.forEach((d, i) => {
      const x = 40 + (i * (w - 60) / (days.length - 1));
      ctx.fillText(d, x - 4, h - 12);
    });
    ctx.fillText("Weekly steps", 48, 22);
  }, []);

  return <canvas ref={ref} style={{width:"100%"}} aria-label="Weekly steps trend" />;
}
