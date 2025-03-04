"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSockets = handleSockets;
const rooms = {};
function createRoom(roomId) {
    rooms[roomId] = {
        players: [],
        fish: generateFish(),
        timer: 120,
    };
}
function generateFish() {
    return Array.from({ length: 5 }, () => ({
        id: Math.random().toString(36).substring(2, 9),
        name: "Poisson rare",
        danger: Math.random() < 0.2,
    }));
}
function startGame(io, roomId) {
    const room = rooms[roomId];
    room.timer = 120;
    room.fish = generateFish();
    io.to(roomId).emit("startGame", {
        timer: room.timer,
        fish: room.fish,
        players: room.players,
    });
    room.interval = setInterval(() => {
        room.timer -= 1;
        if (room.timer <= 0) {
            endGame(io, roomId);
        }
        else {
            if (Math.random() < 0.3) {
                room.fish.push(generateFish()[0]);
            }
            io.to(roomId).emit("updateGame", {
                timer: room.timer,
                fish: room.fish,
                players: room.players,
            });
        }
    }, 1000);
}
function endGame(io, roomId) {
    const room = rooms[roomId];
    clearInterval(room.interval);
    io.to(roomId).emit("endGame", { players: room.players });
    delete rooms[roomId];
}
function handleSockets(io) {
    io.on("connection", (socket) => {
        socket.on("joinRoom", (roomId, username) => {
            if (!rooms[roomId])
                createRoom(roomId);
            const room = rooms[roomId];
            room.players.push({ id: socket.id, username, score: 0 });
            socket.join(roomId);
            io.to(roomId).emit("updatePlayers", room.players);
            if (room.players.length >= 2 && !room.interval) {
                startGame(io, roomId);
            }
        });
        socket.on("catchFish", (roomId, fishId) => {
            const room = rooms[roomId];
            const player = room.players.find((p) => p.id === socket.id);
            if (player) {
                player.score += 1;
                room.fish = room.fish.filter((f) => f.id !== fishId);
                io.to(roomId).emit("updateGame", {
                    timer: room.timer,
                    fish: room.fish,
                    players: room.players,
                });
            }
        });
        socket.on("disconnecting", () => {
            for (const roomId of socket.rooms) {
                if (rooms[roomId]) {
                    rooms[roomId].players = rooms[roomId].players.filter((p) => p.id !== socket.id);
                    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
                    if (rooms[roomId].players.length < 2 && rooms[roomId].interval) {
                        endGame(io, roomId);
                    }
                }
            }
        });
    });
}
