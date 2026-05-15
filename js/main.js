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
    playVictory() {
        // Fanfarra ascendente de vitória
        let notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator('sine', freq, freq * 1.01, 0.4, 0.08);
                this.playOscillator('triangle', freq * 0.5, freq * 0.5, 0.4, 0.04);
            }, i * 150);
        });
    }
    playDefeat() {
        // Som descendente de derrota
        let notes = [392.00, 329.63, 261.63, 196.00];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator('sine', freq, freq * 0.95, 0.5, 0.06);
            }, i * 200);
        });
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
        
        // Motor de música ambiente procedural
        this.music = new AmbientMusicEngine();
        this.musicEnabled = true;
        
        this.sfx = new SoundEngine();

        // Suporte a Enter no campo de nome
        let nameInput = document.getElementById('player-name-input');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.login();
            });
        }

        this.init();
    }

    playSound(type) {
        this.sfx.init();
        switch(type) {
            case 'click': this.sfx.playClick(); break;
            case 'move': this.sfx.playMove(); break;
            case 'capture': this.sfx.playCapture(); break;
            case 'promote': this.sfx.playPromote(); break;
            case 'victory': this.sfx.playVictory(); break;
            case 'defeat': this.sfx.playDefeat(); break;
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
            this.playMusic('menu');
            this.init();
        }
    }

    logout() {
        this.playSound('click');
        this.playerName = '';
        localStorage.removeItem('damaPlayerName');
        this.init();
    }

    playMusic(theme = 'menu') {
        if (this.musicEnabled) {
            this.music.play(theme);
            document.getElementById('audio-toggle').innerText = '🔊 Som';
        }
    }

    toggleMusic() {
        let btn = document.getElementById('audio-toggle');
        if (this.music.isPlaying) {
            this.music.stop();
            this.musicEnabled = false;
            btn.innerText = '🔇 Som';
        } else {
            this.musicEnabled = true;
            // Determina o tema correto baseado no estado atual
            let theme = 'menu';
            if (this.game && this.ai) {
                theme = this.ai.difficulty;
            } else if (this.game) {
                theme = 'medium';
            }
            this.playMusic(theme);
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

        let medals = ['🥇', '🥈', '🥉'];
        sortedScores.slice(0, 5).forEach(([name, score], i) => {
            let li = document.createElement('li');
            let medal = i < 3 ? medals[i] + ' ' : '';
            li.innerHTML = `<span>${medal}${name}</span> <span>${score} 👑</span>`;
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
            this.playMusic('menu');
        }
    }

    startGame(mode, difficulty = 'medium') {
        this.playSound('click');
        this.gameMode = mode;
        this.game = new Game();
        let theme = mode === 'ai' ? difficulty : 'medium';
        this.setTheme(theme);
        this.playMusic(theme);
        
        this.p1Name.innerText = this.playerName;

        if (mode === 'ai') {
            this.ai = new AI(difficulty);
            this.p2Name.innerText = `CPU (${difficulty})`;
        } else {
            this.ai = null;
            this.p2Name.innerText = 'Jogador 2';
        }

        // Limpa qualquer confetti anterior
        this.clearConfetti();

        document.getElementById('game-over-overlay').classList.add('hidden');
        this.showScreen('game-screen');
        this.updateUI();
    }

    quitGame() {
        this.playSound('click');
        this.game = null;
        this.ai = null;
        this.clearConfetti();
        document.getElementById('game-over-overlay').classList.add('hidden');
        this.showScreen('main-menu');
    }

    restartGame() {
        this.playSound('click');
        this.clearConfetti();
        if (this.gameMode) {
            let diff = this.ai ? this.ai.difficulty : 'medium';
            this.startGame(this.gameMode, diff);
        }
    }

    // Gera nomes de coordenadas para acessibilidade (ex: "A8", "B7")
    getCellName(r, c) {
        let col = String.fromCharCode(65 + c); // A-H
        let row = 8 - r; // 8-1
        return `${col}${row}`;
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        
        let allMoves = this.game.getAllValidMoves(this.game.currentPlayer);
        let mandatoryCaptures = allMoves.filter(m => m.isCapture);
        let mustCapturePos = mandatoryCaptures.map(m => `${m.from.r},${m.from.c}`);
        
        // Quantas peças existem no tabuleiro (para o delay escalonado na entrada)
        let pieceIndex = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let cell = document.createElement('div');
                let isDark = (r + c) % 2 === 1;
                cell.className = `cell ${isDark ? 'dark' : 'light'}`;
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.setAttribute('role', 'gridcell');
                
                // Highlight de último movimento
                if (this.game.lastMove) {
                    if (this.game.lastMove.from.r === r && this.game.lastMove.from.c === c) {
                        cell.classList.add('last-move-source');
                    }
                    if (this.game.lastMove.to.r === r && this.game.lastMove.to.c === c) {
                        cell.classList.add('last-move-target');
                    }
                }

                let cellName = this.getCellName(r, c);
                let piece = this.game.board[r][c];

                // Construir aria-label descritivo
                let ariaDesc = `Casa ${cellName}`;
                if (piece) {
                    let playerLabel = piece.player === 1 ? 'Jogador 1' : 'Jogador 2';
                    let typeLabel = piece.isKing ? 'Dama' : 'Peça';
                    ariaDesc += `, ${typeLabel} do ${playerLabel}`;
                } else if (isDark) {
                    ariaDesc += ', vazia';
                }

                // Verificar se é um destino válido
                let isValidTarget = this.game.validMoves.some(m => m.to.r === r && m.to.c === c);
                if (isValidTarget) {
                    cell.classList.add('highlight');
                    cell.onclick = () => this.handleCellClick(r, c);
                    ariaDesc += ' (movimento disponível)';
                } else if (isDark) {
                    cell.onclick = () => this.handleCellClick(r, c);
                }

                cell.setAttribute('aria-label', ariaDesc);
                
                if (piece) {
                    let pieceDiv = document.createElement('div');
                    pieceDiv.className = `piece player${piece.player} ${piece.isKing ? 'king' : ''}`;
                    
                    // Animação de entrada inicial
                    if (!this.game.lastMove) {
                        pieceDiv.classList.add('piece-enter');
                        pieceDiv.style.animationDelay = `${pieceIndex * 0.02}s`;
                    }
                    pieceIndex++;
                    
                    // Animação de deslizamento (FLIP manual via CSS Transform inicial)
                    if (this.game.lastMove && this.game.lastMove.to.r === r && this.game.lastMove.to.c === c) {
                        let dy = this.game.lastMove.from.r - r;
                        let dx = this.game.lastMove.from.c - c;
                        
                        // Posiciona a peça no local antigo usando transform
                        pieceDiv.style.transform = `translate(calc(var(--cell-size) * ${dx}), calc(var(--cell-size) * ${dy}))`;
                        
                        // No próximo frame, remove o transform para ela deslizar até a posição real
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                pieceDiv.classList.add('sliding-piece');
                                pieceDiv.style.transform = '';
                            });
                        });
                    }

                    if (this.game.selectedPiece && this.game.selectedPiece.r === r && this.game.selectedPiece.c === c) {
                        pieceDiv.classList.add('selected');
                    }

                    if (mustCapturePos.includes(`${r},${c}`)) {
                        pieceDiv.classList.add('must-capture');
                    }
                    
                    cell.appendChild(pieceDiv);
                }
                
                // Efeito de explosão de captura no último turno
                if (this.game.lastMove && this.game.lastMove.isCapture && this.game.lastMove.captured.r === r && this.game.lastMove.captured.c === c) {
                    let explodeDiv = document.createElement('div');
                    // Cria uma peça fantasma para explodir
                    let capturedPlayer = piece ? (piece.player === 1 ? 2 : 1) : (this.game.currentPlayer === 1 ? 2 : 1);
                    explodeDiv.className = `piece player${capturedPlayer} captured`;
                    cell.appendChild(explodeDiv);
                    
                    // Remove do DOM após animação
                    setTimeout(() => { if(explodeDiv.parentElement) explodeDiv.remove(); }, 500);
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
            if (this.gameMode === 'ai') {
                this.turnIndicator.innerHTML = `A CPU está pensando<span class="ai-thinking"></span>`;
            } else {
                this.turnIndicator.innerText = "Turno do Jogador 2";
            }
            this.turnIndicator.style.color = "var(--secondary-color)";
        }

        if (this.game.isGameOver) {
            this.showGameOver();
            return;
        }

        // Aplica o brilho de promoção se ocorreu
        if (lastMovePromoted && this.game.lastMove) {
            setTimeout(() => {
                let cell = document.querySelector(`.cell[data-r="${this.game.lastMove.to.r}"][data-c="${this.game.lastMove.to.c}"] .piece`);
                if (cell) cell.classList.add('promote-animation');
            }, 300); // Espera o slide terminar
        }

        if (this.gameMode === 'ai' && this.game.currentPlayer === 2 && !this.game.isGameOver) {
            // Adiciona um pequeno delay aleatório para a IA parecer mais humana
            let thinkingTime = 600 + Math.random() * 800;
            setTimeout(() => this.makeAIMove(), thinkingTime); 
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

    // ==================== ANIMAÇÕES DE VITÓRIA ====================

    showVictoryAnimation(winner) {
        // 1. Faz as peças do vencedor brilharem
        let pieces = this.boardElement.querySelectorAll(`.piece.player${winner}`);
        pieces.forEach(p => p.classList.add('victory-glow'));

        // 2. Faz as casas escuras piscarem de verde
        let darkCells = this.boardElement.querySelectorAll('.cell.dark');
        darkCells.forEach((cell, i) => {
            setTimeout(() => cell.classList.add('victory-flash'), i * 50);
        });

        // 3. Lança confetti
        this.spawnConfetti();
    }

    spawnConfetti() {
        let container = document.createElement('div');
        container.className = 'victory-confetti';
        container.id = 'confetti-container';
        document.body.appendChild(container);

        let colors = [
            'var(--primary-color)', 'var(--secondary-color)', 
            '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1', '#dda0dd'
        ];
        // Cores hardcoded como fallback para CSS vars em pseudo-elementos
        let rawColors = ['#00ffff', '#ff00ff', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1', '#dda0dd'];

        for (let i = 0; i < 60; i++) {
            let piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + 'vw';
            piece.style.backgroundColor = rawColors[Math.floor(Math.random() * rawColors.length)];
            piece.style.width = (5 + Math.random() * 10) + 'px';
            piece.style.height = (5 + Math.random() * 10) + 'px';
            piece.style.animationDuration = (2 + Math.random() * 3) + 's';
            piece.style.animationDelay = Math.random() * 2 + 's';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.opacity = 0.8 + Math.random() * 0.2;
            container.appendChild(piece);
        }

        // Auto-limpa após 6 segundos
        setTimeout(() => this.clearConfetti(), 6000);
    }

    clearConfetti() {
        let existing = document.getElementById('confetti-container');
        if (existing) existing.remove();
    }

    showGameOver() {
        let overlay = document.getElementById('game-over-overlay');
        let text = document.getElementById('winner-text');
        
        if (this.game.winner === 1) {
            text.innerText = `🏆 Vitória de ${this.playerName}!`;
            text.style.color = "var(--primary-color)";
            text.style.textShadow = "0 0 10px var(--primary-color)";
            this.playSound('victory');
            
            // Registra a vitória apenas se foi no modo Campanha e ganhou da máquina
            // ou se quiser registrar no PvP. O mais comum é rankear contra IA.
            this.addWin();
        } else {
            text.innerText = this.gameMode === 'ai' ? "💀 A CPU Venceu!" : "🏆 Jogador 2 Venceu!";
            text.style.color = "var(--secondary-color)";
            text.style.textShadow = "0 0 10px var(--secondary-color)";
            this.playSound('defeat');
        }

        // Animação de vitória no tabuleiro
        this.showVictoryAnimation(this.game.winner);
        
        // Mostra o overlay com um pequeno delay para dar tempo de ver a animação
        setTimeout(() => {
            overlay.classList.remove('hidden');
        }, 800);
    }
}

const app = new App();
