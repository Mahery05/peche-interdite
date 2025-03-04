import express from "express";
import http from "http";
import { Server } from "socket.io";
import { manageGame } from "./gameManager";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

manageGame(io);

server.listen(3001, () => console.log("✅ Serveur Socket.IO lancé sur http://localhost:3001"));
