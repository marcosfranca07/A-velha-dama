class AI {
    constructor(difficulty) {
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
        
        switch (difficulty) {
            case 'easy': this.maxDepth = 2; break;
            case 'medium': this.maxDepth = 4; break;
            case 'hard': this.maxDepth = 6; break;
            default: this.maxDepth = 4;
        }
    }

    // Retorna a melhor jogada
    getBestMove(game) {
        let bestMove = null;
        let bestValue = -Infinity;
        
        let validMoves = game.getAllValidMoves(game.currentPlayer);
        if (validMoves.length === 0) return null;
        
        // Se houver apenas uma jogada válida (ex: captura obrigatória), não precisa calcular muito
        if (validMoves.length === 1 && this.difficulty !== 'hard') {
            return validMoves[0];
        }

        // Embaralha para evitar jogar sempre no mesmo canto quando os valores forem iguais
        validMoves.sort(() => Math.random() - 0.5);

        for (let move of validMoves) {
            let clonedGame = game.clone();
            let result = clonedGame.makeMove(move);
            
            // Se for captura consecutiva, a IA deve continuar o turno nesse clone até terminar
            while (result.consecutive && !clonedGame.isGameOver) {
                let nextMoves = clonedGame.getAllValidMoves(clonedGame.currentPlayer).filter(m => m.isCapture);
                if (nextMoves.length > 0) {
                    result = clonedGame.makeMove(nextMoves[0]); // Pega a primeira captura possível pra simplificar no clone
                } else {
                    break;
                }
            }

            let moveValue = this.minimax(clonedGame, this.maxDepth - 1, -Infinity, Infinity, false);
            
            if (moveValue > bestValue) {
                bestValue = moveValue;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    minimax(game, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0 || game.isGameOver) {
            return this.evaluateBoard(game);
        }

        let validMoves = game.getAllValidMoves(game.currentPlayer);
        
        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (let move of validMoves) {
                let clonedGame = game.clone();
                let result = clonedGame.makeMove(move);
                
                // Trata capturas consecutivas no minimax
                while (result.consecutive && !clonedGame.isGameOver) {
                    let nextMoves = clonedGame.getAllValidMoves(clonedGame.currentPlayer).filter(m => m.isCapture);
                    if (nextMoves.length > 0) result = clonedGame.makeMove(nextMoves[0]);
                    else break;
                }

                let evalValue = this.minimax(clonedGame, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evalValue);
                alpha = Math.max(alpha, evalValue);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of validMoves) {
                let clonedGame = game.clone();
                let result = clonedGame.makeMove(move);
                
                while (result.consecutive && !clonedGame.isGameOver) {
                    let nextMoves = clonedGame.getAllValidMoves(clonedGame.currentPlayer).filter(m => m.isCapture);
                    if (nextMoves.length > 0) result = clonedGame.makeMove(nextMoves[0]);
                    else break;
                }

                let evalValue = this.minimax(clonedGame, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evalValue);
                beta = Math.min(beta, evalValue);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            return minEval;
        }
    }

    evaluateBoard(game) {
        let score = 0;
        let aiPlayer = 2; // AI é sempre o jogador 2
        
        if (game.isGameOver) {
            if (game.winner === aiPlayer) return 10000;
            else if (game.winner === 1) return -10000;
            return 0;
        }

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let piece = game.board[r][c];
                if (piece) {
                    let pieceValue = piece.isKing ? 50 : 10;
                    
                    // Bônus por avançar no tabuleiro para peças normais
                    if (!piece.isKing) {
                        if (piece.player === 1) pieceValue += (7 - r);
                        if (piece.player === 2) pieceValue += r;
                    }
                    
                    // Bônus para controle do centro no modo Difícil
                    if (this.difficulty === 'hard') {
                        if (r >= 3 && r <= 4 && c >= 3 && c <= 4) {
                            pieceValue += 3;
                        }
                        // Bônus por defender a base
                        if (piece.player === 1 && r === 7) pieceValue += 5;
                        if (piece.player === 2 && r === 0) pieceValue += 5;
                    }

                    if (piece.player === aiPlayer) score += pieceValue;
                    else score -= pieceValue;
                }
            }
        }
        return score;
    }
}
