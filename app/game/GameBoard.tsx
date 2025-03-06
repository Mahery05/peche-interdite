"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import socket from "../../lib/socket";

const Sketch = dynamic(() => import("react-p5"), { ssr: false });

type Player = {
    id: string;
    username: string;
    score: number;
};

type Fish = {
    id: string;
    name: string;
    type: "common" | "rare" | "epic" | "danger";
    points: number;
    x: number;
    y: number;
    speed: number;
};

export default function GameBoard() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [fish, setFish] = useState<Fish[]>([]);
    const [timer, setTimer] = useState<number>(120);
    const [username, setUsername] = useState<string>("");
    const [roomId, setRoomId] = useState<string>("room1");
    const [isPlaying, setIsPlaying] = useState(false);
    const [caughtFish, setCaughtFish] = useState<Fish | null>(null);
    const [showEffect, setShowEffect] = useState(false);
    const [fishImage, setFishImage] = useState<any>(null);
    const [p5Instance, setP5Instance] = useState<any>(null);
    const [anonymousFishImage, setAnonymousFishImage] = useState<any>(null);
    const [commonFishImage, setCommonFishImage] = useState<any>(null);
    const [rareFishImage, setRareFishImage] = useState<any>(null);
    const [epicFishImage, setEpicFishImage] = useState<any>(null);
    const [dangerFishImage, setDangerFishImage] = useState<any>(null);
    const fishEffects = {
        common: { color: [255, 255, 255, 180], size: 100 },
        rare: { color: [255, 0, 255, 180], size: 120 },
        epic: { color: [255, 215, 0, 200], size: 140 },
        danger: { color: [255, 0, 0, 220], size: 160 }
    };    
    const [effectFrame, setEffectFrame] = useState(0);
    const [scoreEffects, setScoreEffects] = useState<{ [key: string]: { value: number, color: number[] } }>({});
    const [bubbles, setBubbles] = useState(
        Array.from({ length: 15 }, () => ({
            x: Math.random() * 800,
            y: Math.random() * 600,
            size: Math.random() * 10 + 5,
            speed: Math.random() * 0.3 + 0.1
        }))
    );
    const [captureLayer, setCaptureLayer] = useState<any>(null);
    const [backgroundSound, setBackgroundSound] = useState<any>(null);
    const [fishSounds, setFishSounds] = useState<{ [key: string]: HTMLAudioElement }>({});

    useEffect(() => {
        if (typeof window !== "undefined") { 
            const newFishSounds = {
                common: new Audio("/sounds/commun.mp3"),
                rare: new Audio("/sounds/rare.mp3"),
                epic: new Audio("/sounds/epic.mp3"),
                danger: new Audio("/sounds/danger.mp3"),
            };
    
            Object.values(newFishSounds).forEach(sound => {
                sound.volume = 0.1;
            });
    
            setFishSounds(newFishSounds);
    
            const oceanSound = new Audio("/sounds/water.mp3");
            oceanSound.loop = true;
            oceanSound.volume = 0.3;

            const startSound = () => {
                oceanSound.play().catch(err => console.warn("🔇 Audio bloqué :", err));
                document.removeEventListener("click", startSound);
                document.removeEventListener("keydown", startSound);
            };

            document.addEventListener("click", startSound);
            document.addEventListener("keydown", startSound);

            setBackgroundSound(oceanSound);
        }
    }, []);
    


    useEffect(() => {
        socket.on("updatePlayers", (updatedPlayers) => {
            console.log("🔄 Mise à jour des joueurs:", updatedPlayers);
            setPlayers(updatedPlayers);
        });

        socket.on("startGame", ({ timer, fish, players }) => {
            setTimer(timer);
            setFish(fish);
            setPlayers(players);
            setIsPlaying(true);
        });

        socket.on("updateGame", ({ timer, fish, players }) => {
            setTimer(timer);
            setFish(prevFish => prevFish.filter(f => fish.some(updatedFish => updatedFish.id === f.id)));
            setPlayers(players);
        });

        socket.on("endGame", ({ players }) => {
            setIsPlaying(false);
            alert(
                "Fin de la partie! Scores: " +
                players.map((p: Player) => `${p.username}: ${p.score}`).join(", ")
            );
        });

        return () => {
            socket.off("updatePlayers");
            socket.off("startGame");
            socket.off("updateGame");
            socket.off("endGame");
        };
    }, []);

    useEffect(() => {
        socket.on("newFish", (fish) => {
            console.log("🐟 Nouveau poisson reçu:", fish);
            setFish(prevFish => [...prevFish, fish]);
        });

        return () => {
            socket.off("newFish");
        };
    }, []);

    const joinGame = () => {
        if (username) {
            socket.emit("joinRoom", roomId, username);
        }
    };

    const catchFish = (fishId: string) => {
        const selectedFish = fish.find(f => f.id === fishId) || null;
        if (!selectedFish) return;
        if (selectedFish) {
            const sound = fishSounds[selectedFish.type];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(err => console.error("🎵 Erreur de lecture :", err));
        
                setTimeout(() => {
                    sound.pause();
                    sound.currentTime = 0;
                }, 1500);
            }
        }        
        
    
        setFish(prevFish => prevFish.filter(f => f.id !== fishId));
        socket.emit("catchFish", roomId, fishId);
    
        setCaughtFish(selectedFish);
        setShowEffect(true);
    
        setPlayers(prevPlayers =>
            prevPlayers.map(p => {
                if (p.id === socket.id) {
                    const effect = fishEffects[selectedFish.type] || fishEffects.common;
                    const color = effect.color.slice(0, 3);
        
                    setScoreEffects(prev => ({
                        ...prev,
                        [p.id]: { value: selectedFish.points, color }
                    }));
        
                    setTimeout(() => {
                        setScoreEffects(prev => {
                            const newEffects = { ...prev };
                            delete newEffects[p.id];
                            return newEffects;
                        });
                    }, 500);
        
                    return { ...p, score: p.score + selectedFish.points };
                }
                return p;
            })
        );             
    
        setTimeout(() => {
            setShowEffect(false);
            setCaughtFish(null);
        }, 1000);
    };    

    const setup = (p5, canvasParentRef) => {
        const newLayer = p5.createGraphics(800, 600);
        setCaptureLayer(newLayer);

        let canvas = p5.createCanvas(800, 600).parent(canvasParentRef);
        canvas.style("display", "block");
        canvas.style("margin", "auto");
        setP5Instance(p5);
    
        p5.loadImage("/images/fish.png", img => setAnonymousFishImage(img));
        p5.loadImage("/images/commun.png", img => setCommonFishImage(img));
        p5.loadImage("/images/rare.png", img => setRareFishImage(img));
        p5.loadImage("/images/epic.png", img => setEpicFishImage(img));
        p5.loadImage("/images/danger.png", img => setDangerFishImage(img));
    }; 
    

    const draw = (p5) => {
        p5.mousePressed = () => {
            fish.forEach(f => {
                const d = p5.dist(p5.mouseX, p5.mouseY, f.x, f.y);
                if (d < 20) {
                    catchFish(f.id, f.danger);
                }
            });
        };

        let gradient = p5.drawingContext.createLinearGradient(0, 0, 0, p5.height);
        gradient.addColorStop(1, "darkblue");
        gradient.addColorStop(0, "blue");

        p5.drawingContext.fillStyle = gradient;
        p5.rect(0, 0, p5.width, p5.height);

        bubbles.forEach((bubble, i) => {
            bubble.y -= bubble.speed;
        
            if (bubble.y < 0) {
                bubble.y = 600;
                bubble.x = Math.random() * 800;
            }
        
            p5.fill(255, 255, 255, 100);
            p5.noStroke();
            p5.ellipse(bubble.x, bubble.y, bubble.size, bubble.size);
        });
        
        //p5.background(0, 100, 255);
        p5.fill(255);
        p5.textSize(24);
        p5.text(`Temps: ${timer}s`, 10, 30);

        players.forEach((p, index) => {
            p5.fill(255);
            p5.text(`${p.username}: ${p.score}`, 10, 60 + index * 30);

            if (scoreEffects[p.id]) {
                const { value, color } = scoreEffects[p.id];
                p5.fill(...color);
                p5.text(`${value > 0 ? `+${value}` : value}`, 100, 60 + index * 30);
            }            
        });

        fish.forEach(f => {
            if (!f.x || !f.y) return;
        
            f.x -= f.speed;
            if (f.x < -40) f.x = p5.width;
        
            let floatOffset = Math.sin(p5.frameCount * 0.05 + f.x * 0.01) * 5;
            let yPosition = f.y + floatOffset;
        
            let baseScale = f.size || 1;
            let scaleFactor = baseScale + Math.sin(p5.frameCount * 0.02 + f.x * 0.01) * 0.05;
        
            if (anonymousFishImage) {
                p5.image(anonymousFishImage, f.x - 20 * scaleFactor, yPosition - 20 * scaleFactor, 70 * scaleFactor, 70 * scaleFactor);
            } else {
                p5.fill(100, 100, 100);
                p5.ellipse(f.x, yPosition, 40 * scaleFactor, 40 * scaleFactor);
            }
        });
        
        
        if (showEffect && caughtFish && captureLayer) {
            captureLayer.clear();
            captureLayer.imageMode(p5.CENTER);
            let fishImage;
            if (caughtFish.type === "common") fishImage = commonFishImage;
            else if (caughtFish.type === "rare") fishImage = rareFishImage;
            else if (caughtFish.type === "epic") fishImage = epicFishImage;
            else if (caughtFish.type === "danger") fishImage = dangerFishImage;

            if (fishImage) {
                captureLayer.image(fishImage, captureLayer.width / 2, captureLayer.height / 2, 100, 100);
        
                const effect = fishEffects[caughtFish.type] || fishEffects.common;
                let glowSize = effect.size + Math.sin(effectFrame * 0.1) * 10;
                let alpha = 150 + Math.sin(effectFrame * 0.1) * 50;
        
                captureLayer.noFill();
                captureLayer.stroke(...effect.color.slice(0, 3), alpha);
                captureLayer.strokeWeight(caughtFish.type === "epic" ? 6 : 4);
                captureLayer.ellipse(captureLayer.width / 2, captureLayer.height / 2, glowSize, glowSize);
                setEffectFrame(effectFrame + 1);
            }
        
            p5.image(captureLayer, 0, 0);
        }

    };

    return (
        <div className="h-screen flex items-center justify-center bg-blue-500 text-white">
            {!isPlaying ? (
                <div className="p-6 bg-white text-black rounded-lg shadow-xl flex flex-col items-center">
                    <h1 className="text-3xl font-bold mb-4">Rejoindre une Partie</h1>
                    <input 
                        type="text" 
                        placeholder="Room ID" 
                        value={roomId} 
                        onChange={(e) => setRoomId(e.target.value)} 
                        className="border p-2 mb-2 w-full rounded" 
                    />
                    <input 
                        type="text" 
                        placeholder="Pseudo" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        className="border p-2 mb-4 w-full rounded" 
                    />
                    <button onClick={joinGame} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        Rejoindre
                    </button>
                </div>
            ) : (
                <Sketch setup={setup} draw={draw} />
            )}
        </div>
    );
}
