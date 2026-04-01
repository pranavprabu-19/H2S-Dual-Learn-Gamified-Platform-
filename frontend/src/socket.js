import { io } from 'socket.io-client';

// If running backend on localhost:5000
const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const socket = io(URL, {
  autoConnect: false
});
