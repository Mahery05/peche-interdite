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
            const uniquePlayers = updatedPlayers.filter((player, index, self) =>
                index === self.findIndex((p) => p.id === player.id)
            );
            setPlayers(uniquePlayers);
        });

        socket.on("startGame", ({ timer, fish, players }) => {
            setTimer(timer);
            setFish(fish);
            setPlayers(players);
            setIsPlaying(true);
        });

        socket.on("updateGame", ({ timer, fish, players }) => {
            setTimer(timer);
<<<<<<< HEAD
            setFish(prevFish =>
                prevFish.filter(f => fish.some(updatedFish => updatedFish.id === f.id))
            );
=======
            setFish(prevFish => prevFish.filter(f => fish.some(updatedFish => updatedFish.id === f.id)));
>>>>>>> 538d5905f18e840512ae980ec80f0fa344c41a9a
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
        socket.on("newFish", (newFish) => {
            setFish(prevFish => [...prevFish, newFish]);
        });

        return () => {
            socket.off("newFish");
        };
    }, []);

    const joinGame = () => {
        if (username.trim()) {
            socket.emit("joinRoom", roomId, username);
        } else {
            alert("Merci d'entrer un pseudo !");
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
<<<<<<< HEAD
        if (danger) {
            alert("Oh non ! Un monstre marin !");
        }
    };

    const setup = (p5: any, canvasParentRef: any) => {
        p5.createCanvas(800, 600).parent(canvasParentRef);
    };

    const draw = (p5: any) => {
=======
    
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
>>>>>>> 538d5905f18e840512ae980ec80f0fa344c41a9a
        p5.mousePressed = () => {
            fish.forEach(f => {
                const d = p5.dist(p5.mouseX, p5.mouseY, f.x, f.y);
                if (d < 20) {
                    catchFish(f.id, f.danger);
                }
            });
        };

<<<<<<< HEAD
        p5.background(0, 100, 255);
=======
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
>>>>>>> 538d5905f18e840512ae980ec80f0fa344c41a9a

        // Timer Bar
        p5.fill(255);
        p5.rect(10, 10, 780, 20);
        p5.fill(50, 205, 50);
        p5.rect(10, 10, (timer / 120) * 780, 20);

        // Scores
        p5.fill(255);
        players.forEach((p, index) => {
<<<<<<< HEAD
            p5.text(`${p.username}: ${p.score}`, 10, 50 + index * 20);
        });

        // Poissons
        fish.forEach(f => {
            f.x += f.speed;
            if (f.x > p5.width) f.x = -40;

            p5.fill(f.danger ? "red" : "green");
            p5.ellipse(f.x, f.y, 40, 40);
            p5.fill(255);
            p5.text(f.name, f.x - 20, f.y - 30);
=======
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
>>>>>>> 538d5905f18e840512ae980ec80f0fa344c41a9a
        });
        
        
        if (showEffect && caughtFish && captureLayer) {
            captureLayer.clear();
            captureLayer.imageMode(p5.CENTER);
            let fishImage;
            if (caughtFish.type === "common") fishImage = commonFishImage;
            else if (caughtFish.type === "rare") fishImage = rareFishImage;
            else if (caughtFish.type === "epic") fishImage = epicFishImage;
            else if (caughtFish.type === "danger") fishImage = dangerFishImage;

<<<<<<< HEAD
    if (!isPlaying) {
        return (
            <div style={styles.pageContainer}>
                <div style={styles.card}>
                    <h1 style={styles.title}>🎣 La Pêche Interdite</h1>
                    <p style={styles.subtitle}>Rejoignez une partie et affrontez d'autres pêcheurs !</p>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Pseudo :</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Votre pseudo"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Room ID :</label>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="Nom de la salle"
                            style={styles.input}
                        />
                    </div>

                    <button
                        onClick={joinGame}
                        style={styles.button}
                    >
                        Rejoindre la partie
                    </button>

                    {players.length > 0 && (
                        <div style={styles.playersList}>
                            <h2 style={styles.playersTitle}>Joueurs dans la salle :</h2>
                            <ul>
                                {players.map((player) => (
                                    <li key={player.id}>{player.username}</li>
                                ))}
                            </ul>
                            <p style={styles.waitingMessage}>En attente d&apos;un autre joueur...</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
=======
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
>>>>>>> 538d5905f18e840512ae980ec80f0fa344c41a9a

    return (
        <div className="h-screen flex items-center justify-center bg-blue-500 text-white">
            <Sketch setup={setup} draw={draw} />
        </div>
    );
}

const styles = {
    pageContainer: {
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
        fontFamily: 'Arial, sans-serif',
    },
    card: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '400px',
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: '10px',
    },
    subtitle: {
        fontSize: '14px',
        color: '#555',
        marginBottom: '20px',
        textAlign: 'center',
    },
    formGroup: {
        width: '100%',
        marginBottom: '15px',
        textAlign: 'left' as const,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: '5px',
        display: 'block',
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #ccc',
    },
    button: {
        padding: '10px 20px',
        borderRadius: '8px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    playersList: {
        marginTop: '20px',
        textAlign: 'left' as const,
        width: '100%',
    },
    playersTitle: {
        fontWeight: 'bold',
        marginBottom: '5px',
    },
    waitingMessage: {
        marginTop: '10px',
        fontStyle: 'italic',
        color: '#666',
    }
};
