import { Server, Socket } from "socket.io";

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

type GameState = {
    players: Player[];
    fish: Fish[];
    timer: number;
    interval?: NodeJS.Timeout;
};

const rooms: Record<string, GameState> = {};

function createRoom(roomId: string) {
    rooms[roomId] = {
        players: [],
        fish: generateFish(),
        timer: 120,
    };
}

function generateFish(): Fish[] {
    return Array.from({ length: 5 }, () => ({
        id: Math.random().toString(36).substring(2, 9),
        name: "Poisson rare",
        danger: Math.random() < 0.2,
    }));
}

function startGame(io: Server, roomId: string) {
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
        } else {
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

function endGame(io: Server, roomId: string) {
    const room = rooms[roomId];
    clearInterval(room.interval);
    io.to(roomId).emit("endGame", { players: room.players });
    delete rooms[roomId];
}

export function handleSockets(io: Server) {
    io.on("connection", (socket: Socket) => {
        socket.on("joinRoom", (roomId: string, username: string) => {
            if (!rooms[roomId]) createRoom(roomId);

            const room = rooms[roomId];
            room.players.push({ id: socket.id, username, score: 0 });
            socket.join(roomId);

            io.to(roomId).emit("updatePlayers", room.players);

            if (room.players.length >= 2 && !room.interval) {
                startGame(io, roomId);
            }
        });

        socket.on("catchFish", (roomId: string, fishId: string) => {
            const room = rooms[roomId];
            const player = room.players.find((p) => p.id === socket.id);
            const fish = room.fish.find((f) => f.id === fishId);
        
            if (player && fish) {
                if (fish.danger) {
                    player.score = Math.max(0, player.score - 5);
                    console.log(`Joueur ${player.id} a perdu 5 points. Nouveau score: ${player.score}`);
                } else {
                    player.score += 1;
                    console.log(`Joueur ${player.id} a gagné 1 point. Nouveau score: ${player.score}`);
                }
        
                room.fish = room.fish.filter((f) => f.id !== fishId);
        
                io.to(roomId).emit("updateScore", { playerId: player.id, newScore: player.score });
        
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
