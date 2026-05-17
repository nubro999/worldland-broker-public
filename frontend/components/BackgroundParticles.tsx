import React from 'react';

export default function BackgroundParticles() {
  // Generate 30 subtle background particles with custom animations
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 20 + 40, // 40-60px (much bigger)
    left: Math.random() * 100,
    top: Math.random() * 100,
    animationDelay: Math.random() * 8,
    animationDuration: 3 + Math.random() * 8, // 3-11s (faster movement)
    opacity: Math.random() * 0.15 + 0.05, // 0.05-0.2 (keep faint)
    animationType: i % 4 // 0=up-down, 1=left-right, 2=diagonal, 3=circular
  }));

  return (
    <>
      {/* Custom floating animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float-up-down {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
          }

          @keyframes float-left-right {
            0%, 100% { transform: translateX(0px); }
            50% { transform: translateX(40px); }
          }

          @keyframes float-diagonal {
            0%, 100% { transform: translate(0px, 0px); }
            25% { transform: translate(20px, -20px); }
            50% { transform: translate(0px, -40px); }
            75% { transform: translate(-20px, -20px); }
          }

          @keyframes float-circular {
            0% { transform: translate(0px, 0px); }
            25% { transform: translate(30px, 0px); }
            50% { transform: translate(30px, 30px); }
            75% { transform: translate(0px, 30px); }
            100% { transform: translate(0px, 0px); }
          }

          .particle-up-down {
            animation: float-up-down infinite ease-in-out;
          }

          .particle-left-right {
            animation: float-left-right infinite ease-in-out;
          }

          .particle-diagonal {
            animation: float-diagonal infinite ease-in-out;
          }

          .particle-circular {
            animation: float-circular infinite ease-in-out;
          }
        `
      }} />

      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0}}
      >
        {particles.map((particle) => {
          let animationClass = '';
          switch (particle.animationType) {
            case 0: animationClass = 'particle-up-down'; break;
            case 1: animationClass = 'particle-left-right'; break;
            case 2: animationClass = 'particle-diagonal'; break;
            case 3: animationClass = 'particle-circular'; break;
          }

          return (
            <div
              key={particle.id}
              className={`absolute rounded-full bg-blue-400 ${animationClass}`}
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                opacity: particle.opacity,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`,
                animationIterationCount: 'infinite'
              }}
            />
          );
        })}
      </div>
    </>
  );
}
