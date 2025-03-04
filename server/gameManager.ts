import { Server } from "socket.io";

type Player = { id: string; username: string; score: number };
type Fish = { id: string; name: string; danger: boolean };

let players: Player[] = [];
let fish: Fish[] = [];
let timer = 120;
let gameInterval: NodeJS.Timeout | null = null;

export function manageGame(io: Server) {
    io.on("connection", (socket) => {
        console.log(`🔗 Nouveau joueur : ${socket.id}`);

        socket.on("joinGame", (username) => {
            players.push({ id: socket.id, username, score: 0 });
            io.emit("updatePlayers", players);

            if (players.length >= 2 && !gameInterval) {
                startGame(io);
            }
        });

        socket.on("catchFish", (fishId) => {
            const player = players.find((p) => p.id === socket.id);
            if (player) {
                player.score += 1;
                fish = fish.filter((f) => f.id !== fishId);
                io.emit("updateGame", { players, fish, timer });
            }
        });

        socket.on("disconnect", () => {
            players = players.filter((p) => p.id !== socket.id);
            io.emit("updatePlayers", players);
            if (players.length < 2) endGame(io);
        });
    });
}

function startGame(io: Server) {
    timer = 120;
    fish = generateFish();
    io.emit("startGame", { timer, fish, players });

    gameInterval = setInterval(() => {
        timer--;
        if (timer <= 0) {
            endGame(io);
        } else {
            if (Math.random() < 0.3) fish.push(generateRandomFish());
            io.emit("updateGame", { timer, fish, players });
        }
    }, 1000);
}

function endGame(io: Server) {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = null;
    io.emit("endGame", { players });
    players = [];
    fish = [];
}

function generateFish() {
    return Array.from({ length: 5 }, () => generateRandomFish());
}

function generateRandomFish(): Fish {
    return {
        id: Math.random().toString(36).substring(2, 9),
        name: "Poisson rare",
        danger: Math.random() < 0.2,
    };
}
