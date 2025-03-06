"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSockets = handleSockets;
const rooms = {};

function createRoom(roomId) {
    rooms[roomId] = {
        players: [],
        fish: [],
        timer: 120,
    };
}

function generateFish() {
    const fishTypes = [
        { type: "common", points: 1, name: "Poisson Commun", probability: 0.6 },
        { type: "rare", points: 2, name: "Poisson Rare", probability: 0.25 }, 
        { type: "epic", points: 4, name: "Poisson Épique", probability: 0.10 },
        { type: "danger", points: -2, name: "Poisson Dangereux", probability: 0.20 } 
    ];

    let rand = Math.random();
    let cumulativeProbability = 0;
    let selectedType = fishTypes[0];

    for (let fish of fishTypes) {
        cumulativeProbability += fish.probability;
        if (rand < cumulativeProbability) {
            selectedType = fish;
            break;
        }
    }

    return {
        id: Math.random().toString(36).substring(2, 9),
        name: selectedType.name,
        type: selectedType.type,
        points: selectedType.points,
        x: Math.random() * 750 + 25,
        y: Math.random() * 550 + 25,
        speed: Math.random() * 0.5 + 0.2
    };
}




function startGame(io, roomId) {
    const room = rooms[roomId];
    room.timer = 60;

    if (room.fish.length === 0) { 
        room.fish = Array.from({ length: 10 }, () => generateFish());
    }    

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
            if (room.timer % 1.5 === 0) { 
                const newFish = generateFish(); 
                room.fish.push(newFish); 
            
                console.log(`🐟 Nouveau poisson ajouté: ${newFish.id}, envoi à tous les joueurs...`);
                io.to(roomId).emit("newFish", newFish);
            }
            

            io.to(roomId).emit("updateGame", {
                timer: room.timer,
                fish: Array.isArray(room.fish) ? [...room.fish] : [],
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
            if (!rooms[roomId]) createRoom(roomId);

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
            if (!room) return;
        
            const player = room.players.find((p) => p.id === socket.id);
            const fishIndex = room.fish.findIndex((f) => f.id === fishId);
        
            if (player && fishIndex !== -1) {
                const fish = room.fish[fishIndex];
        
                console.log(`🎣 Joueur ${player.id} a attrapé ${fish.name} (Danger: ${fish.danger})`);
        
                player.score = Math.max(0, player.score + fish.points); 
        
                room.fish.splice(fishIndex, 1);
        
                io.to(roomId).emit("updateGame", {
                    timer: room.timer,
                    fish: room.fish,
                    players: room.players,
                });                
            } else {
                console.log("⚠️ Erreur: Poisson introuvable ou joueur non reconnu.");
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
