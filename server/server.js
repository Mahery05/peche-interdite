import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const players = [];
let fish = [];
let timer = 120;
let gameInterval = null;

io.on("connection", (socket) => {
    console.log(`🔗 Nouveau joueur connecté : ${socket.id}`);

    socket.on("joinGame", (username) => {
        players.push({ id: socket.id, username, score: 0 });
        io.emit("updatePlayers", players);

        if (players.length >= 2 && !gameInterval) startGame();
    });

    socket.on("catchFish", () => {
        const player = players.find((p) => p.id === socket.id);
        if (player) {
            player.score += 1;
            io.emit("updateGame", { players, fish, timer });
        }
    });

    socket.on("disconnect", () => {
        players.splice(players.findIndex((p) => p.id === socket.id), 1);
        io.emit("updatePlayers", players);

        if (players.length < 2) endGame();
    });
});

function startGame() {
    timer = 120;
    fish = [];
    io.emit("startGame", { timer, fish, players });

    gameInterval = setInterval(() => {
        timer--;
        if (timer <= 0) endGame();
        io.emit("updateGame", { timer, fish, players });
    }, 1000);
}

function endGame() {
    clearInterval(gameInterval);
    gameInterval = null;
    io.emit("endGame", { players });
    players.length = 0;
    fish.length = 0;
}

server.listen(3001, () => console.log("✅ Serveur lancé sur http://localhost:3001"));
