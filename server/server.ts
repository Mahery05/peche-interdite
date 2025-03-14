import express from "express";
import http from "http";
import { Server } from "socket.io";
import { handleSockets } from "./gameManager";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

handleSockets(io);

server.listen(3001, () => console.log("✅ Serveur lancé sur http://localhost:3001"));
