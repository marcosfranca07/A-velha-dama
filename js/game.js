class Game {
    constructor() {
        this.board = [];
        this.currentPlayer = 1; // 1 = Player 1 (Cyan), 2 = Player 2 (Pink)
        this.captures = { 1: 0, 2: 0 };
        this.selectedPiece = null;
        this.validMoves = [];
        this.mandatoryCaptures = [];
        this.isGameOver = false;
        this.winner = null;
        this.consecutiveCapturePiece = null; // Se estiver em uma sequência de capturas
        this.initBoard();
    }

    initBoard() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    if (r < 3) this.board[r][c] = { player: 2, isKing: false };
                    else if (r > 4) this.board[r][c] = { player: 1, isKing: false };
                }
            }
        }
    }

    // Retorna todos os movimentos válidos para o jogador atual
    getAllValidMoves(player) {
        let moves = [];
        let captures = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let piece = this.board[r][c];
                if (piece && piece.player === player) {
                    let pieceMoves = this.getPieceMoves(r, c, piece);
                    pieceMoves.forEach(m => {
                        if (m.isCapture) captures.push(m);
                        else moves.push(m);
                    });
                }
            }
        }

        return captures.length > 0 ? captures : moves;
    }

    // Pega os movimentos de uma peça específica
    getPieceMoves(r, c, piece) {
        let moves = [];
        let directions = piece.isKing 
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] 
            : (piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

        if (piece.isKing) {
            // Movimentação da Dama (múltiplas casas)
            for (let dir of directions) {
                let step = 1;
                let hasCaptured = false;
                let capturedPos = null;
                
                while (true) {
                    let nr = r + dir[0] * step;
                    let nc = c + dir[1] * step;
                    
                    if (!this.isValidPos(nr, nc)) break;
                    
                    let target = this.board[nr][nc];
                    
                    if (target === null) {
                        if (!hasCaptured) {
                            moves.push({ from: {r, c}, to: {r: nr, c: nc}, isCapture: false });
                        } else {
                            moves.push({ from: {r, c}, to: {r: nr, c: nc}, isCapture: true, captured: capturedPos });
                        }
                    } else {
                        if (target.player === piece.player || hasCaptured) break; // Bloqueado ou já tentou pular uma
                        // Encontrou inimigo, tenta pular
                        hasCaptured = true;
                        capturedPos = {r: nr, c: nc};
                    }
                    step++;
                }
            }
        } else {
            // Movimentação de peça normal
            for (let dir of directions) {
                let nr = r + dir[0];
                let nc = c + dir[1];
                
                if (this.isValidPos(nr, nc)) {
                    if (this.board[nr][nc] === null) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc}, isCapture: false });
                    } else if (this.board[nr][nc].player !== piece.player) {
                        // Tenta pular para capturar
                        let jr = nr + dir[0];
                        let jc = nc + dir[1];
                        if (this.isValidPos(jr, jc) && this.board[jr][jc] === null) {
                            moves.push({ from: {r, c}, to: {r: jr, c: jc}, isCapture: true, captured: {r: nr, c: nc} });
                        }
                    }
                }
            }
            
            // Regra brasileira: peão captura para trás também (opcional, vamos adicionar para dar dinâmica)
            let backDirs = piece.player === 1 ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
            for (let dir of backDirs) {
                let nr = r + dir[0];
                let nc = c + dir[1];
                if (this.isValidPos(nr, nc) && this.board[nr][nc] !== null && this.board[nr][nc].player !== piece.player) {
                    let jr = nr + dir[0];
                    let jc = nc + dir[1];
                    if (this.isValidPos(jr, jc) && this.board[jr][jc] === null) {
                        moves.push({ from: {r, c}, to: {r: jr, c: jc}, isCapture: true, captured: {r: nr, c: nc} });
                    }
                }
            }
        }

        return moves;
    }

    isValidPos(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // Seleciona uma peça (se válido)
    selectPiece(r, c) {
        if (this.consecutiveCapturePiece) {
            // Se estiver no meio de uma captura múltipla, só pode selecionar a mesma peça
            if (this.consecutiveCapturePiece.r === r && this.consecutiveCapturePiece.c === c) {
                this.selectedPiece = {r, c};
                this.updateValidMovesForSelected();
                return true;
            }
            return false;
        }

        let piece = this.board[r][c];
        if (piece && piece.player === this.currentPlayer) {
            let allMoves = this.getAllValidMoves(this.currentPlayer);
            let hasCaptures = allMoves.some(m => m.isCapture);
            
            // Filtra movimentos válidos para esta peça
            let pieceMoves = this.getPieceMoves(r, c, piece);
            if (hasCaptures) {
                pieceMoves = pieceMoves.filter(m => m.isCapture);
            }
            
            if (pieceMoves.length > 0 || !hasCaptures) {
                this.selectedPiece = {r, c};
                this.validMoves = pieceMoves;
                return true;
            }
        }
        return false;
    }

    updateValidMovesForSelected() {
        if (!this.selectedPiece) return;
        let piece = this.board[this.selectedPiece.r][this.selectedPiece.c];
        this.validMoves = this.getPieceMoves(this.selectedPiece.r, this.selectedPiece.c, piece).filter(m => m.isCapture);
    }

    // Executa um movimento
    makeMove(move) {
        let piece = this.board[move.from.r][move.from.c];
        
        // Move a peça
        this.board[move.to.r][move.to.c] = piece;
        this.board[move.from.r][move.from.c] = null;
        
        let captured = false;
        // Se foi captura
        if (move.isCapture) {
            this.board[move.captured.r][move.captured.c] = null;
            this.captures[this.currentPlayer]++;
            captured = true;
        }
        
        // Promoção à dama
        let promoted = false;
        if (!piece.isKing) {
            if ((piece.player === 1 && move.to.r === 0) || (piece.player === 2 && move.to.r === 7)) {
                piece.isKing = true;
                promoted = true;
            }
        }
        
        this.selectedPiece = null;
        this.validMoves = [];
        
        // Verifica se há mais capturas em sequência (não aplicável se acabou de promover)
        if (captured && !promoted) {
            let nextMoves = this.getPieceMoves(move.to.r, move.to.c, piece).filter(m => m.isCapture);
            if (nextMoves.length > 0) {
                this.consecutiveCapturePiece = { r: move.to.r, c: move.to.c };
                return { capture: true, consecutive: true, promoted };
            }
        }
        
        this.consecutiveCapturePiece = null;
        this.switchTurn();
        return { capture: captured, consecutive: false, promoted };
    }

    switchTurn() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.checkGameOver();
    }

    checkGameOver() {
        // Verifica se o jogador atual tem movimentos
        let moves = this.getAllValidMoves(this.currentPlayer);
        if (moves.length === 0) {
            this.isGameOver = true;
            this.winner = this.currentPlayer === 1 ? 2 : 1;
        } else if (this.captures[1] === 12) {
            this.isGameOver = true;
            this.winner = 1;
        } else if (this.captures[2] === 12) {
            this.isGameOver = true;
            this.winner = 2;
        }
    }

    // Usado pela IA para clonar estado
    clone() {
        let cloned = new Game();
        cloned.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
        cloned.currentPlayer = this.currentPlayer;
        cloned.captures = { ...this.captures };
        cloned.isGameOver = this.isGameOver;
        cloned.winner = this.winner;
        return cloned;
    }
}
