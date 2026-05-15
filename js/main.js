class SoundEngine {
    constructor() {
        this.ctx = null;
    }
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playOscillator(type, freqStart, freqEnd, duration, vol = 0.1) {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        let now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(freqStart, now);
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
        }
        
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
    }

    playClick() { this.playOscillator('sine', 600, 800, 0.1, 0.05); }
    playMove() { this.playOscillator('triangle', 300, 100, 0.15, 0.1); }
    playCapture() { this.playOscillator('sawtooth', 800, 100, 0.3, 0.1); }
    playPromote() {
        this.playOscillator('sine', 400, 600, 0.2, 0.1);
        setTimeout(() => this.playOscillator('sine', 600, 800, 0.4, 0.1), 150);
    }
}

class App {
    constructor() {
        this.game = null;
        this.ai = null;
        this.gameMode = null; 
        this.playerName = localStorage.getItem('damaPlayerName') || '';
        this.boardElement = document.getElementById('board');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.p1Captures = document.getElementById('p1-captures');
        this.p2Captures = document.getElementById('p2-captures');
        this.p1Name = document.getElementById('p1-name');
        this.p2Name = document.getElementById('p2-name');
        this.bgMusic = document.getElementById('bg-music');
        
        if (this.bgMusic) this.bgMusic.volume = 0.2; 
        
        this.sfx = new SoundEngine();

        this.init();
    }

    playSound(type) {
        this.sfx.init();
        switch(type) {
            case 'click': this.sfx.playClick(); break;
            case 'move': this.sfx.playMove(); break;
            case 'capture': this.sfx.playCapture(); break;
            case 'promote': this.sfx.playPromote(); break;
        }
    }

    init() {
        if (this.playerName) {
            this.showScreen('main-menu');
            document.getElementById('welcome-text').innerText = `Bem-vindo de volta, ${this.playerName}!`;
            this.updateLeaderboard();
        } else {
            this.showScreen('login-screen');
        }
    }

    login() {
        this.playSound('click');
        let input = document.getElementById('player-name-input').value.trim();
        if (input) {
            this.playerName = input;
            localStorage.setItem('damaPlayerName', this.playerName);
            this.playMusic();
            this.init();
        }
    }

    logout() {
        this.playSound('click');
        this.playerName = '';
        localStorage.removeItem('damaPlayerName');
        this.init();
    }

    playMusic() {
        // Tenta tocar o áudio caso o navegador permita após interação
        if (this.bgMusic.paused) {
            let playPromise = this.bgMusic.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    document.getElementById('audio-toggle').innerText = '🔊 Som';
                }).catch(e => {
                    console.log("Áudio bloqueado até interação:", e);
                    document.getElementById('audio-toggle').innerText = '🔇 Som';
                });
            }
        }
    }

    toggleMusic() {
        let btn = document.getElementById('audio-toggle');
        if (this.bgMusic.paused) {
            this.bgMusic.play();
            btn.innerText = '🔊 Som';
        } else {
            this.bgMusic.pause();
            btn.innerText = '🔇 Som';
        }
    }

    updateLeaderboard() {
        let scores = JSON.parse(localStorage.getItem('damaScores')) || {};
        let list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        
        let sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        
        if (sortedScores.length === 0) {
            list.innerHTML = '<li>Ainda sem vitórias. Seja o primeiro!</li>';
            return;
        }

        sortedScores.slice(0, 5).forEach(([name, score]) => {
            let li = document.createElement('li');
            li.innerHTML = `<span>${name}</span> <span>${score} 👑</span>`;
            list.appendChild(li);
        });
    }

    addWin() {
        let scores = JSON.parse(localStorage.getItem('damaScores')) || {};
        if (!scores[this.playerName]) scores[this.playerName] = 0;
        scores[this.playerName]++;
        localStorage.setItem('damaScores', JSON.stringify(scores));
        this.updateLeaderboard();
    }

    setTheme(difficulty) {
        document.body.className = '';
        if (difficulty) {
            document.body.classList.add(`theme-${difficulty}`);
        } else {
            document.body.classList.add(`theme-medium`); // PvP default
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        if(screenId === 'main-menu' || screenId === 'login-screen' || screenId === 'difficulty-menu') {
            this.setTheme('menu'); 
        }
    }

    startGame(mode, difficulty = 'medium') {
        this.playSound('click');
        this.playMusic();
        this.gameMode = mode;
        this.game = new Game();
        this.setTheme(mode === 'ai' ? difficulty : 'medium');
        
        this.p1Name.innerText = this.playerName;

        if (mode === 'ai') {
            this.ai = new AI(difficulty);
            this.p2Name.innerText = `CPU (${difficulty})`;
        } else {
            this.ai = null;
            this.p2Name.innerText = 'Jogador 2';
        }

        document.getElementById('game-over-overlay').classList.add('hidden');
        this.showScreen('game-screen');
        this.updateUI();
    }

    quitGame() {
        this.playSound('click');
        this.game = null;
        this.ai = null;
        document.getElementById('game-over-overlay').classList.add('hidden');
        this.showScreen('main-menu');
    }

    restartGame() {
        this.playSound('click');
        if (this.gameMode) {
            let diff = this.ai ? this.ai.difficulty : 'medium';
            this.startGame(this.gameMode, diff);
        }
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        
        let allMoves = this.game.getAllValidMoves(this.game.currentPlayer);
        let mandatoryCaptures = allMoves.filter(m => m.isCapture);
        let mustCapturePos = mandatoryCaptures.map(m => `${m.from.r},${m.from.c}`);

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let cell = document.createElement('div');
                cell.className = `cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                if (this.game.validMoves.some(m => m.to.r === r && m.to.c === c)) {
                    cell.classList.add('highlight');
                    cell.onclick = () => this.handleCellClick(r, c);
                } else if ((r + c) % 2 === 1) { 
                    cell.onclick = () => this.handleCellClick(r, c);
                }

                let piece = this.game.board[r][c];
                if (piece) {
                    let pieceDiv = document.createElement('div');
                    pieceDiv.className = `piece player${piece.player} ${piece.isKing ? 'king' : ''}`;
                    
                    if (this.game.selectedPiece && this.game.selectedPiece.r === r && this.game.selectedPiece.c === c) {
                        pieceDiv.classList.add('selected');
                    }

                    if (mustCapturePos.includes(`${r},${c}`)) {
                        pieceDiv.classList.add('must-capture');
                    }
                    
                    cell.appendChild(pieceDiv);
                }
                
                this.boardElement.appendChild(cell);
            }
        }
    }

    updateUI(lastMovePromoted = false, captureOccurred = false) {
        if (captureOccurred) this.playSound('capture');
        else if (!lastMovePromoted && this.game.selectedPiece === null) this.playSound('move');
        if (lastMovePromoted) this.playSound('promote');

        this.renderBoard();
        
        this.p1Captures.innerText = this.game.captures[1];
        this.p2Captures.innerText = this.game.captures[2];
        
        document.querySelector('.player1').classList.toggle('active-turn', this.game.currentPlayer === 1);
        document.querySelector('.player2').classList.toggle('active-turn', this.game.currentPlayer === 2);
        
        if (this.game.currentPlayer === 1) {
            this.turnIndicator.innerText = `Turno de ${this.playerName}`;
            this.turnIndicator.style.color = "var(--primary-color)";
        } else {
            this.turnIndicator.innerText = this.gameMode === 'ai' ? "Turno da CPU" : "Turno do Jogador 2";
            this.turnIndicator.style.color = "var(--secondary-color)";
        }

        if (this.game.isGameOver) {
            this.showGameOver();
            return;
        }

        if (this.gameMode === 'ai' && this.game.currentPlayer === 2 && !this.game.isGameOver) {
            setTimeout(() => this.makeAIMove(), 600); 
        }
    }

    handleCellClick(r, c) {
        if (this.game.isGameOver) return;
        if (this.gameMode === 'ai' && this.game.currentPlayer === 2) return; 

        let moveIndex = this.game.validMoves.findIndex(m => m.to.r === r && m.to.c === c);
        if (moveIndex !== -1) {
            let move = this.game.validMoves[moveIndex];
            let result = this.game.makeMove(move);
            this.updateUI(result.promoted, result.capture);
        } else {
            if (this.game.selectPiece(r, c)) {
                this.updateUI();
                this.playSound('click');
            }
        }
    }

    makeAIMove() {
        if (this.game.isGameOver) return;
        
        let move = this.ai.getBestMove(this.game);
        if (move) {
            let result = this.game.makeMove(move);
            this.updateUI(result.promoted, result.capture);
        }
    }

    showGameOver() {
        let overlay = document.getElementById('game-over-overlay');
        let text = document.getElementById('winner-text');
        
        if (this.game.winner === 1) {
            text.innerText = `Vitória de ${this.playerName}!`;
            text.style.color = "var(--primary-color)";
            text.style.textShadow = "0 0 10px var(--primary-color)";
            
            // Registra a vitória apenas se foi no modo Campanha e ganhou da máquina
            // ou se quiser registrar no PvP. O mais comum é rankear contra IA.
            this.addWin();
        } else {
            text.innerText = this.gameMode === 'ai' ? "A CPU Venceu!" : "Jogador 2 Venceu!";
            text.style.color = "var(--secondary-color)";
            text.style.textShadow = "0 0 10px var(--secondary-color)";
        }
        
        overlay.classList.remove('hidden');
    }
}

const app = new App();
