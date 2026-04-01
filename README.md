# DuelLearn: Gamified Learning Platform 🎮📚

DuelLearn is an interactive, real-time gamified learning platform that pits users against each other in fast-paced question battles. By combining competitive matchmaking with AI-generated educational content, DuelLearn makes learning highly engaging and rewarding. 

## ✨ Key Features

- **⚔️ Real-Time Duels**: Challenge other players to live, head-to-head educational matches powered by WebSockets (Socket.io).
- **🧠 AI-Powered Content**: Adaptive question generation and post-match answer explanations powered by the Google Gemini AI.
- **📈 ELO & Progression System**: Track your skill level with a comprehensive ELO rating system, earn XP, and level up as you win.
- **🏆 Global Leaderboards**: Climb the seasonal leaderboards and showcase your knowledge.
- **🎨 Modern UI**: A premium, responsive interface featuring dynamic animations, sound effects, and glassmorphism design.

## 🛠️ Technology Stack

**Frontend:**
- React 19 (Vite)
- React Router DOM
- Socket.io Client
- HTML-to-Image / Canvas Confetti

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- Socket.io (Real-time websocket connections)
- Google Gemini API (`@google/genai`)
- JWT for Authentication & bcryptjs

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js installed on your machine
- A MongoDB cluster/URI
- A Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/pranavprabu-19/H2S-Dual-Learn-Gamified-Platform-.git
cd H2S-Dual-Learn-Gamified-Platform-
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory and add the following:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
npm install
```
Start the frontend development server:
```bash
npm run dev
```

### 4. Play!
Open your browser and navigate to `http://localhost:5173` to explore DuelLearn!

## 🤝 Contributing
Contributions are always welcome! Feel free to open an issue or submit a Pull Request.

## 📝 License
This project is open-source and available for educational and personal use.
