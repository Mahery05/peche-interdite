"use client";

import { useEffect, useState } from "react";
import socket from "../../lib/socket";

type Player = {
    id: string;
    username: string;
    score: number;
};

type Fish = {
    id: string;
    name: string;
    danger: boolean;
};

export default function GameBoard() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [fish, setFish] = useState<Fish[]>([]);
    const [timer, setTimer] = useState<number>(120);
    const [username, setUsername] = useState<string>("");
    const [roomId, setRoomId] = useState<string>("room1");
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        socket.on("updatePlayers", setPlayers);
        socket.on("startGame", ({ timer, fish, players }) => {
            setTimer(timer);
            setFish(fish);
            setPlayers(players);
            setIsPlaying(true);
        });
        socket.on("updateGame", ({ timer, fish, players }) => {
            setTimer(timer);
            setFish(fish);
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

    const joinGame = () => {
        if (username) {
            socket.emit("joinRoom", roomId, username);
        }
    };

    const catchFish = (fishId: string, danger: boolean) => {
        if (danger) {
            alert("Oh non! Un monstre marin !");
        } else {
            socket.emit("catchFish", roomId, fishId);
        }
    };

    return (
        <div>
            {!isPlaying ? (
                <div>
                    <input type="text" placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
                    <input type="text" placeholder="Pseudo" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <button onClick={joinGame}>Rejoindre la partie</button>
                </div>
            ) : (
                <div>
                    <p>Temps: {timer}s</p>
                    {players.map(p => <p key={p.id}>{p.username}: {p.score}</p>)}
                    {fish.map(f => (
                        <button key={f.id} onClick={() => catchFish(f.id, f.danger)}>
                            {f.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
