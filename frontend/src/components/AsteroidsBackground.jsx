import { useState } from "react";
import "./AsteroidsBackground.css";

const buildAsteroids = () => Array.from({ length: 22 }).map((_, i) => {
  const width = Math.floor(Math.random() * 110) + 80;
  const top = Math.floor(Math.random() * 110) - 20;
  const right = Math.floor(Math.random() * 70) - 20;
  const duration = (Math.random() * 4 + 3).toFixed(2);
  const delay = (Math.random() * 12).toFixed(2);
  const opacity = (Math.random() * 0.4 + 0.6).toFixed(2);
  const scale = (Math.random() * 0.5 + 0.75).toFixed(2);

  return {
    id: i,
    style: {
      width: `${width}px`,
      top: `${top}%`,
      right: `${right}%`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      opacity: opacity,
      transform: `scale(${scale}) rotate(-45deg)`,
    },
  };
});

const buildParticles = () => Array.from({ length: 35 }).map((_, i) => {
  const size = Math.floor(Math.random() * 3) + 2;
  const top = Math.floor(Math.random() * 100);
  const left = Math.floor(Math.random() * 100);
  const duration = (Math.random() * 4 + 2.5).toFixed(2);
  const delay = (Math.random() * 6).toFixed(2);

  return {
    id: i,
    style: {
      width: `${size}px`,
      height: `${size}px`,
      top: `${top}%`,
      left: `${left}%`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    },
  };
});

export default function AsteroidsBackground() {
  // Random layout is generated once via useState's lazy initializer —
  // the correct place for one-time non-deterministic setup work,
  // rather than during render (useMemo) or synchronously in an effect.
  const [asteroids] = useState(buildAsteroids);
  const [particles] = useState(buildParticles);

  return (
    <div className="asteroids-bg-container" aria-hidden="true">
      {asteroids.map((ast) => (
        <div key={ast.id} className="asteroid-streak" style={ast.style} />
      ))}
      {particles.map((p) => (
        <div key={p.id} className="asteroid-dust-particle" style={p.style} />
      ))}
    </div>
  );
}
