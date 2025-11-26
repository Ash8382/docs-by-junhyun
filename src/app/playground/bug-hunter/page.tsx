"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  markedForDeletion: boolean;
}

interface Player extends GameObject {
  score: number;
}

export default function BugHunterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Game Loop Refs (to avoid re-renders)
  const requestRef = useRef<number>(0);
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    speed: 5,
    color: "#3b82f6", // blue-500
    markedForDeletion: false,
    score: 0,
  });
  const projectilesRef = useRef<GameObject[]>([]);
  const enemiesRef = useRef<GameObject[]>([]);
  const lastTimeRef = useRef<number>(0);
  const enemyTimerRef = useRef<number>(0);
  const enemyInterval = 1000;

  useEffect(() => {
    const storedHighScore = localStorage.getItem("bugHunterHighScore");
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore));
    }
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    playerRef.current.score = 0;
    projectilesRef.current = [];
    enemiesRef.current = [];
    lastTimeRef.current = 0;
    
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      playerRef.current.x = canvas.width / 2 - playerRef.current.width / 2;
      playerRef.current.y = canvas.height - playerRef.current.height - 20;
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  const animate = (timestamp: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player
    drawPlayer(ctx, playerRef.current);

    // Projectiles
    projectilesRef.current.forEach((projectile) => {
      projectile.y -= projectile.speed;
      if (projectile.y < 0) projectile.markedForDeletion = true;
      drawProjectile(ctx, projectile);
    });
    projectilesRef.current = projectilesRef.current.filter((p) => !p.markedForDeletion);

    // Enemies
    if (enemyTimerRef.current > enemyInterval) {
      spawnEnemy(canvas.width);
      enemyTimerRef.current = 0;
    } else {
      enemyTimerRef.current += deltaTime;
    }

    enemiesRef.current.forEach((enemy) => {
      enemy.y += enemy.speed;
      if (enemy.y > canvas.height) {
        enemy.markedForDeletion = true;
        // Game Over condition if enemy passes player? Optional.
        // For now, let's just let them pass or maybe deduct score.
      }
      drawEnemy(ctx, enemy);

      // Collision with Projectiles
      projectilesRef.current.forEach((projectile) => {
        if (!projectile.markedForDeletion && checkCollision(projectile, enemy)) {
          enemy.markedForDeletion = true;
          projectile.markedForDeletion = true;
          playerRef.current.score += 10;
          setScore(playerRef.current.score);
        }
      });

      // Collision with Player
      if (checkCollision(playerRef.current, enemy)) {
        setGameState("gameover");
        cancelAnimationFrame(requestRef.current);
        return; // Stop animation
      }
    });
    enemiesRef.current = enemiesRef.current.filter((e) => !e.markedForDeletion);

    if (gameState === "playing") {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  const spawnEnemy = (canvasWidth: number) => {
    const size = Math.random() * 30 + 20;
    enemiesRef.current.push({
      x: Math.random() * (canvasWidth - size),
      y: 0 - size,
      width: size,
      height: size,
      speed: Math.random() * 2 + 1,
      color: "#ef4444", // red-500
      markedForDeletion: false,
    });
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    ctx.fillStyle = player.color;
    // Simple spaceship shape (triangle)
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, projectile: GameObject) => {
    ctx.fillStyle = projectile.color;
    ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: GameObject) => {
    ctx.fillStyle = enemy.color;
    // Bug shape (circle)
    ctx.beginPath();
    ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(enemy.x + enemy.width / 3, enemy.y + enemy.height / 3, enemy.width / 8, 0, Math.PI * 2);
    ctx.arc(enemy.x + enemy.width * 2 / 3, enemy.y + enemy.height / 3, enemy.width / 8, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkCollision = (rect1: GameObject, rect2: GameObject) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.height + rect1.y > rect2.y
    );
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Clamp player within canvas
    playerRef.current.x = Math.max(0, Math.min(canvasRef.current.width - playerRef.current.width, mouseX - playerRef.current.width / 2));
  };

  const handleClick = () => {
    if (gameState !== "playing") return;
    projectilesRef.current.push({
      x: playerRef.current.x + playerRef.current.width / 2 - 2.5,
      y: playerRef.current.y,
      width: 5,
      height: 10,
      speed: 10,
      color: "#fbbf24", // amber-400
      markedForDeletion: false,
    });
  };

  useEffect(() => {
    if (gameState === "gameover") {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("bugHunterHighScore", score.toString());
      }
    }
  }, [gameState, score, highScore]);

  return (
    <div className="container py-10 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold mb-2 text-foreground">Bug Hunter 🚀</h1>
        <p className="text-muted-foreground">마우스로 이동하고 클릭하여 버그를 잡으세요!</p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-800 cursor-crosshair max-w-full"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {gameState === "start" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm">
            <button
              onClick={startGame}
              className="px-8 py-4 bg-primary text-primary-foreground text-2xl font-bold rounded-full hover:scale-105 transition-transform"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
            <h2 className="text-5xl font-bold text-red-500 mb-4">GAME OVER</h2>
            <p className="text-2xl text-white mb-8">Score: {score}</p>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-primary text-primary-foreground text-2xl font-bold rounded-full hover:scale-105 transition-transform"
            >
              Try Again
            </button>
          </div>
        )}
        
        <div className="absolute top-4 left-4 text-white font-mono text-xl">
          Score: {score}
        </div>
        <div className="absolute top-4 right-4 text-white font-mono text-xl">
          High Score: {highScore}
        </div>
      </div>

      <div className="mt-8">
        <Link href="/playground" className="text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Playground
        </Link>
      </div>
    </div>
  );
}
