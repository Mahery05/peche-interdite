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

    const catchFish = (fishId: string, danger: boolean) => {
        setFish(prevFish => prevFish.filter(f => f.id !== fishId));
        socket.emit("catchFish", roomId, fishId);
    };
    

    const setup = (p5, canvasParentRef) => {
        p5.createCanvas(800, 600).parent(canvasParentRef);
    };

    const [fishList, setFishList] = useState<Fish[]>([]);

    useEffect(() => {
        setFishList(fish);
    }, [fish]);

    const draw = (p5) => {
        p5.mousePressed = () => {
            fishList.forEach(f => {
                const d = p5.dist(p5.mouseX, p5.mouseY, f.x, f.y);
                if (d < 20) {
                    catchFish(f.id, f.danger);
                }
            });
        };

        p5.background(0, 100, 255);
        p5.fill(255);
        p5.textSize(24);
        p5.text(`Temps: ${timer}s`, 10, 30);

        players.forEach((p, index) => {
            p5.fill(255);
            p5.text(`${p.username}: ${p.score}`, 10, 60 + index * 30);
        });

        fishList.forEach(f => {
            if (!f.x || !f.y) return;
            f.x += f.speed;
            if (f.x > p5.width) f.x = -40;

            p5.fill(f.danger ? 'red' : 'green');
            p5.ellipse(f.x, f.y, 40, 40);
            p5.fill(255);
            p5.textSize(16);
            p5.text(f.name, f.x - 20, f.y - 30);
        });
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
