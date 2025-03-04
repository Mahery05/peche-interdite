import { io } from "socket.io-client";

const socket = io("http://localhost:3001");  // Adresse de ton serveur Socket.IO
export default socket;
