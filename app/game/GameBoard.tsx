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
    danger: boolean;
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
            setFish(prevFish =>
                prevFish.filter(f => fish.some(updatedFish => updatedFish.id === f.id))
            );
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

    const catchFish = (fishId: string, danger: boolean) => {
        setFish(prevFish => prevFish.filter(f => f.id !== fishId));
        socket.emit("catchFish", roomId, fishId);
        if (danger) {
            alert("Oh non ! Un monstre marin !");
        }
    };

    const setup = (p5: any, canvasParentRef: any) => {
        p5.createCanvas(800, 600).parent(canvasParentRef);
    };

    const draw = (p5: any) => {
        p5.mousePressed = () => {
            fish.forEach(f => {
                const d = p5.dist(p5.mouseX, p5.mouseY, f.x, f.y);
                if (d < 20) {
                    catchFish(f.id, f.danger);
                }
            });
        };

        p5.background(0, 100, 255);

        // Timer Bar
        p5.fill(255);
        p5.rect(10, 10, 780, 20);
        p5.fill(50, 205, 50);
        p5.rect(10, 10, (timer / 120) * 780, 20);

        // Scores
        p5.fill(255);
        players.forEach((p, index) => {
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
        });
    };

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
