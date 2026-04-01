import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { Trophy, Home, Loader, Download } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { useRef } from 'react';
import { playSound } from '../utils/audio';
import { getRankDetails } from '../utils/ranks';
import './arena.css';

export default function Arena() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const opponentName = state.opponentName || 'Opponent';
  const opponentElo = state.opponentElo || 1000;
  const oppRank = getRankDetails(opponentElo);

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [scores, setScores] = useState({ me: 0, opponent: 0 });
  const [gameOver, setGameOver] = useState(null);
  const resultCardRef = useRef(null);

  const handleShareResult = async () => {
    if (!resultCardRef.current) return;
    try {
      playSound('click');
      const dataUrl = await toPng(resultCardRef.current, { cacheBust: true, style: { background: '#0f0f13' } });
      const link = document.createElement('a');
      link.download = `duellearn-result-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  useEffect(() => {
    socket.on('game_start', (data) => {
      setQuestions(data.questions);
      setCurrentIdx(0);
      setTimeLeft(15);
    });

    socket.on('opponent_answered', () => {
       // Optional: animate opponent's avatar to show they answered
    });

    socket.on('round_result', (data) => {
        // Evaluate score
        let newScores = { me: scores.me, opponent: scores.opponent };
        if(data.player1.id === socket.id) {
            newScores.me = data.player1.score;
            newScores.opponent = data.player2.score;
        } else {
            newScores.me = data.player2.score;
            newScores.opponent = data.player1.score;
        }
        setScores(newScores);
        setShowResult(true);

        setTimeout(() => {
            if (currentIdx + 1 < questions.length) {
                setCurrentIdx(prev => prev + 1);
                setShowResult(false);
                setSelectedAnswer(null);
                setTimeLeft(15);
            } else {
                const winner = newScores.me > newScores.opponent ? 'me' : newScores.me < newScores.opponent ? 'opponent' : 'draw';
                setGameOver({ winner });
                if (winner === 'me') {
                    playSound('victory');
                    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
                }
            }
        }, 3000);
    });

    return () => {
      socket.off('game_start');
      socket.off('opponent_answered');
      socket.off('round_result');
    };
  }, [questions, currentIdx, scores]);

  useEffect(() => {
    if(!questions.length || showResult || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if(prev <= 1) {
            handleAnswer(null);
            return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions, currentIdx, showResult, gameOver]);

  const handleAnswer = (answer) => {
    if(selectedAnswer || showResult) return;
    const isCorrect = answer === questions[currentIdx].correctAnswer;
    if (answer && answer !== 'TIMEOUT') playSound(isCorrect ? 'correct' : 'incorrect');
    setSelectedAnswer(answer || 'TIMEOUT');
    
    // Simulate immediately updating UI to show choice
    socket.emit('submit_answer', {
        matchId: state.matchId,
        questionIndex: currentIdx,
        answer: answer,
        isCorrect: isCorrect
    });
  };

  if (!questions.length) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems:'center', height:'100vh', flexDirection:'column', gap: '2rem' }}>
        <Loader size={48} className="pulse-ring" style={{ animation: 'none', background:'none' }} />
        <h2>Generating AI Questions...</h2>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="container arena-container">
      <div className="glass-panel arena-header">
        <div className="player-score">
          <span>You</span>
          <span className="score-value">{scores.me}</span>
        </div>
        <div className="vs-badge">VS</div>
        <div className="player-score" style={{alignItems: 'flex-end', textAlign: 'right'}}>
          <span>{opponentName} <span style={{fontSize:'0.7rem', color: oppRank.color}}>[{oppRank.title}]</span></span>
          <span className="score-value">{scores.opponent}</span>
        </div>
      </div>

      <div className="glass-panel question-card">
        <div className="timer-bar">
          <div className="timer-fill" style={{ width: `${(timeLeft / 15) * 100}%` }}></div>
        </div>

        <h2 className="question-text">{currentQ.text}</h2>

        <div className="options-grid">
          {currentQ.options.map((opt, i) => {
            let className = "option-btn";
            if (showResult) {
                if (opt === currentQ.correctAnswer) className += " correct";
                else if (opt === selectedAnswer) className += " incorrect";
            } else if (selectedAnswer === opt) {
                className += " selected";
            }

            return (
              <button 
                key={i}
                className={className}
                onClick={() => handleAnswer(opt)}
                disabled={!!selectedAnswer || showResult}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {showResult && currentQ.explanation && (
          <div style={{
            marginTop: '2rem', padding: '1.5rem', 
            background: 'rgba(0, 210, 255, 0.1)', 
            borderLeft: '4px solid var(--primary)', 
            borderRadius: '0 12px 12px 0', 
            animation: 'pulse 2s infinite'
          }}>
             <h4 style={{color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px'}}>The Explanation</h4>
             <p style={{color: '#e0e0e0', lineHeight: '1.5'}}>{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {gameOver && (
        <div className="post-game-overlay">
          <div className="glass-panel results-card" style={{display:'flex', flexDirection:'column', gap:'1rem', width:'100%', maxWidth:'400px'}}>
            <div ref={resultCardRef} style={{padding:'2rem', background:'rgba(20,20,30,0.9)', borderRadius:'16px', display:'flex', flexDirection:'column', alignItems:'center'}}>
              {gameOver.winner === 'me' && <h1 style={{ color: '#00ca65' }}>Victory!</h1>}
              {gameOver.winner === 'opponent' && <h1 style={{ color: '#ff4757' }}>Defeat</h1>}
              {gameOver.winner === 'draw' && <h1 style={{ color: 'var(--secondary)' }}>Draw</h1>}

              <div style={{ margin: '1.5rem 0', textAlign: 'center' }}>
                 <Trophy size={64} style={{ color: gameOver.winner === 'me' ? '#ffd700' : '#444' }} />
                 {gameOver.winner === 'me' && <h3 style={{marginTop:'0.5rem'}}>+XP Gained!</h3>}
                 {gameOver.winner === 'me' && <p style={{color:'var(--secondary)', fontSize:'0.8rem', marginTop:'0.5rem'}}>Win Streaks apply 1.5x Multipliers!</p>}
              </div>

              <div style={{display:'flex', gap:'3rem', width:'100%', justifyContent:'center', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'1.5rem'}}>
                 <div style={{textAlign:'center'}}>
                   <span style={{color:'var(--text-muted)'}}>You</span>
                   <h2 style={{color:'white'}}>{scores.me}</h2>
                 </div>
                 <div style={{textAlign:'center'}}>
                   <span style={{color:'var(--text-muted)'}}>{opponentName}</span>
                   <h2 style={{color:'white'}}>{scores.opponent}</h2>
                 </div>
              </div>
            </div>

            <div style={{display:'flex', gap:'1rem', width:'100%', padding:'0 1rem'}}>
              <button className="btn-secondary" style={{flex:1, display:'flex', gap:'0.5rem', justifyContent:'center', alignItems:'center', padding:'0.8rem', borderRadius:'8px', background:'rgba(255,255,255,0.1)', color:'white', border:'none'}} onClick={handleShareResult}>
                <Download size={18} /> Save Image
              </button>
              <button className="btn-primary" style={{flex:1, display:'flex', gap:'0.5rem', justifyContent:'center', alignItems:'center', padding:'0.8rem', borderRadius:'8px', border:'none'}} onClick={() => { playSound('click'); navigate('/'); }}>
                <Home size={18} /> Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
