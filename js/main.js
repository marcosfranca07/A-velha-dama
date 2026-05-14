class App {
    constructor() {
        this.game = null;
        this.ai = null;
        this.gameMode = null; // 'pvp' ou 'ai'
        this.boardElement = document.getElementById('board');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.p1Captures = document.getElementById('p1-captures');
        this.p2Captures = document.getElementById('p2-captures');
        this.p2Name = document.getElementById('p2-name');
        
        // Adiciona som base placeholder (se tivéssemos os arquivos, descomentaríamos e usaríamos Audio API)
        // this.sounds = { move: new Audio('assets/move.mp3'), capture: new Audio('assets/capture.mp3') };
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    startGame(mode, difficulty = 'medium') {
        this.gameMode = mode;
        this.game = new Game();
        
        if (mode === 'ai') {
            this.ai = new AI(difficulty);
            this.p2Name.innerText = `CPU (${difficulty})`;
        } else {
            this.ai = null;
            this.p2Name.innerText = 'Jogador 2 (Rosa)';
        }

        document.getElementById('game-over-overlay').classList.add('hidden');
        this.showScreen('game-screen');
        this.updateUI();
    }

    quitGame() {
        this.game = null;
        this.ai = null;
        document.getElementById('game-over-overlay').classList.add('hidden');
        this.showScreen('main-menu');
    }

    restartGame() {
        if (this.gameMode) {
            let diff = this.ai ? this.ai.difficulty : 'medium';
            this.startGame(this.gameMode, diff);
        }
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let cell = document.createElement('div');
                cell.className = `cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                // Highlight valid moves
                if (this.game.validMoves.some(m => m.to.r === r && m.to.c === c)) {
                    cell.classList.add('highlight');
                    cell.onclick = () => this.handleCellClick(r, c);
                } else if ((r + c) % 2 === 1) { // Só permite clique nas casas escuras
                    cell.onclick = () => this.handleCellClick(r, c);
                }

                let piece = this.game.board[r][c];
                if (piece) {
                    let pieceDiv = document.createElement('div');
                    pieceDiv.className = `piece player${piece.player} ${piece.isKing ? 'king' : ''}`;
                    
                    if (this.game.selectedPiece && this.game.selectedPiece.r === r && this.game.selectedPiece.c === c) {
                        pieceDiv.classList.add('selected');
                    }
                    
                    cell.appendChild(pieceDiv);
                }
                
                this.boardElement.appendChild(cell);
            }
        }
    }

    updateUI() {
        this.renderBoard();
        
        this.p1Captures.innerText = this.game.captures[1];
        this.p2Captures.innerText = this.game.captures[2];
        
        document.querySelector('.player1').classList.toggle('active-turn', this.game.currentPlayer === 1);
        document.querySelector('.player2').classList.toggle('active-turn', this.game.currentPlayer === 2);
        
        if (this.game.currentPlayer === 1) {
            this.turnIndicator.innerText = "Turno do Jogador 1";
            this.turnIndicator.style.color = "var(--primary-color)";
        } else {
            this.turnIndicator.innerText = this.gameMode === 'ai' ? "Turno da CPU" : "Turno do Jogador 2";
            this.turnIndicator.style.color = "var(--secondary-color)";
        }

        if (this.game.isGameOver) {
            this.showGameOver();
            return;
        }

        // Se for turno da CPU
        if (this.gameMode === 'ai' && this.game.currentPlayer === 2 && !this.game.isGameOver) {
            setTimeout(() => this.makeAIMove(), 500); // Delay pro jogador ver o turno passando
        }
    }

    handleCellClick(r, c) {
        if (this.game.isGameOver) return;
        if (this.gameMode === 'ai' && this.game.currentPlayer === 2) return; // Ignora cliques no turno da CPU

        // Verifica se clicou em um destino de movimento válido
        let moveIndex = this.game.validMoves.findIndex(m => m.to.r === r && m.to.c === c);
        if (moveIndex !== -1) {
            let move = this.game.validMoves[moveIndex];
            this.game.makeMove(move);
            this.updateUI();
        } else {
            // Tenta selecionar a peça
            if (this.game.selectPiece(r, c)) {
                this.updateUI();
            }
        }
    }

    makeAIMove() {
        if (this.game.isGameOver) return;
        
        let move = this.ai.getBestMove(this.game);
        if (move) {
            this.game.makeMove(move);
            this.updateUI();
        }
    }

    showGameOver() {
        let overlay = document.getElementById('game-over-overlay');
        let text = document.getElementById('winner-text');
        
        if (this.game.winner === 1) {
            text.innerText = "Jogador 1 Venceu!";
            text.style.color = "var(--primary-color)";
            text.style.textShadow = "0 0 10px var(--primary-color)";
        } else {
            text.innerText = this.gameMode === 'ai' ? "CPU Venceu!" : "Jogador 2 Venceu!";
            text.style.color = "var(--secondary-color)";
            text.style.textShadow = "0 0 10px var(--secondary-color)";
        }
        
        overlay.classList.remove('hidden');
    }
}

// Inicialização
const app = new App();
