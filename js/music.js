// ========================================================
// AmbientMusicEngine - Gerador de trilha sonora procedural
// Usa Web Audio API para criar atmosferas únicas por tema
// ========================================================

class AmbientMusicEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeNodes = [];
        this.currentTheme = null;
        this.isPlaying = false;
        this.volume = 0.25;
        this.loopTimers = [];

        // Escalas musicais para cada tema
        this.scales = {
            menu:   [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C Pentatônica Maior (lo-fi chill)
            easy:   [220.00, 246.94, 261.63, 293.66, 329.63, 392.00, 440.00], // A Menor Natural (medieval)
            medium: [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13], // C Menor (synthwave)
            hard:   [110.00, 116.54, 130.81, 146.83, 164.81, 174.61, 207.65]  // A Frígio (sombrio)
        };
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Cria um reverb simples usando um buffer de ruído
    createReverb(duration = 2, decay = 2) {
        let sampleRate = this.ctx.sampleRate;
        let length = sampleRate * duration;
        let impulse = this.ctx.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            let data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        
        let convolver = this.ctx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }

    // Toca uma nota com envelope ADSR suave
    playNote(freq, startTime, duration, type = 'sine', vol = 0.08, destination = null) {
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Envelope ADSR suave
        let attack = Math.min(duration * 0.15, 0.3);
        let release = Math.min(duration * 0.4, 1.5);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + attack);
        gain.gain.setValueAtTime(vol, startTime + duration - release);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(destination || this.masterGain);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
        
        this.activeNodes.push(osc, gain);
        return osc;
    }

    // Cria um pad (acorde sustentado) atmosférico
    playPad(freqs, startTime, duration, type = 'sine', vol = 0.04, destination = null) {
        freqs.forEach(f => {
            this.playNote(f, startTime, duration, type, vol, destination);
            // Adiciona leve detuning para "espessura"
            this.playNote(f * 1.003, startTime, duration, type, vol * 0.5, destination);
        });
    }

    // ==================== TEMAS ====================

    // MENU: Lo-Fi Chill - acordes quentes e notas soltas
    playMenuTheme() {
        let scale = this.scales.menu;
        let reverb = this.createReverb(3, 2.5);
        reverb.connect(this.masterGain);

        // Pad de fundo suave
        let padLoop = () => {
            if (!this.isPlaying || this.currentTheme !== 'menu') return;
            let now = this.ctx.currentTime;

            // Acorde quente
            let rootIdx = Math.floor(Math.random() * 3);
            let root = scale[rootIdx];
            this.playPad(
                [root * 0.5, root, root * 1.5, scale[rootIdx + 2]],
                now, 8, 'sine', 0.035, reverb
            );

            // Notas melódicas aleatórias (lo-fi piano feel)
            for (let i = 0; i < 4; i++) {
                let delay = 1.5 + Math.random() * 5;
                let note = scale[Math.floor(Math.random() * scale.length)];
                let octave = Math.random() > 0.3 ? 1 : 2;
                this.playNote(note * octave, now + delay, 1.5 + Math.random(), 'triangle', 0.06, reverb);
            }

            this.loopTimers.push(setTimeout(padLoop, 7500));
        };
        padLoop();
    }

    // EASY: Medieval/Clássico - tons quentes, harpa simulada
    playEasyTheme() {
        let scale = this.scales.easy;
        let reverb = this.createReverb(2.5, 2);
        reverb.connect(this.masterGain);

        // Drone de fundo (bordão medieval)
        let droneLoop = () => {
            if (!this.isPlaying || this.currentTheme !== 'easy') return;
            let now = this.ctx.currentTime;

            // Drone na fundamental
            this.playNote(110, now, 10, 'sine', 0.04, reverb);
            this.playNote(165, now, 10, 'sine', 0.02, reverb); // Quinta

            // Arpejos de "harpa" (triângulo = som mais suave)
            let arpeggioNotes = [];
            for (let i = 0; i < 6; i++) {
                arpeggioNotes.push(scale[i % scale.length] * (i < 4 ? 1 : 2));
            }

            arpeggioNotes.forEach((note, i) => {
                let delay = 1 + i * 0.6 + Math.random() * 0.2;
                this.playNote(note, now + delay, 2, 'triangle', 0.055, reverb);
            });

            // Nota melódica ocasional
            if (Math.random() > 0.4) {
                let melodyNote = scale[Math.floor(Math.random() * scale.length)] * 2;
                this.playNote(melodyNote, now + 5 + Math.random() * 3, 2, 'sine', 0.045, reverb);
            }

            this.loopTimers.push(setTimeout(droneLoop, 9000));
        };
        droneLoop();
    }

    // MEDIUM: Synthwave/Neon - baixo pulsante e pads etéreos
    playMediumTheme() {
        let scale = this.scales.medium;
        let reverb = this.createReverb(3, 3);
        reverb.connect(this.masterGain);

        // Baixo pulsante
        let bassIdx = 0;
        let bassLoop = () => {
            if (!this.isPlaying || this.currentTheme !== 'medium') return;
            let now = this.ctx.currentTime;

            let bassNote = scale[bassIdx % 3] * 0.5;
            bassIdx++;

            // Pulso de baixo com sawtooth
            for (let i = 0; i < 4; i++) {
                let osc = this.ctx.createOscillator();
                let gain = this.ctx.createGain();
                let filter = this.ctx.createBiquadFilter();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(bassNote, now + i * 0.5);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(200, now + i * 0.5);
                filter.Q.value = 5;

                gain.gain.setValueAtTime(0, now + i * 0.5);
                gain.gain.linearRampToValueAtTime(0.06, now + i * 0.5 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.5 + 0.45);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterGain);

                osc.start(now + i * 0.5);
                osc.stop(now + i * 0.5 + 0.45);
                this.activeNodes.push(osc, gain, filter);
            }

            this.loopTimers.push(setTimeout(bassLoop, 2000));
        };

        // Pads de synthwave
        let padLoop = () => {
            if (!this.isPlaying || this.currentTheme !== 'medium') return;
            let now = this.ctx.currentTime;

            let root = scale[Math.floor(Math.random() * 4)];
            this.playPad(
                [root, root * 1.189, root * 1.498, root * 2],
                now, 6, 'sine', 0.03, reverb
            );

            // Arpejo neon aleatório
            if (Math.random() > 0.3) {
                for (let i = 0; i < 3; i++) {
                    let note = scale[Math.floor(Math.random() * scale.length)] * 2;
                    this.playNote(note, now + 2 + i * 0.8, 1.2, 'triangle', 0.04, reverb);
                }
            }

            this.loopTimers.push(setTimeout(padLoop, 5500));
        };

        bassLoop();
        setTimeout(() => padLoop(), 1000);
    }

    // HARD: Cyberpunk/Dark - sons industriais, tensão constante
    playHardTheme() {
        let scale = this.scales.hard;
        let reverb = this.createReverb(4, 4);
        reverb.connect(this.masterGain);

        // Drone dissonante de fundo
        let droneLoop = () => {
            if (!this.isPlaying || this.currentTheme !== 'hard') return;
            let now = this.ctx.currentTime;

            // Drone grave e ameaçador
            this.playNote(55, now, 12, 'sawtooth', 0.025, reverb);
            this.playNote(58.27, now, 12, 'sine', 0.02, reverb); // Semitom acima = tensão

            // Pad com filtro variante
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            let filter = this.ctx.createBiquadFilter();

            osc.type = 'square';
            osc.frequency.setValueAtTime(scale[0] * 0.5, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(100, now);
            filter.frequency.linearRampToValueAtTime(800, now + 6);
            filter.frequency.linearRampToValueAtTime(100, now + 12);
            filter.Q.value = 8;

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.02, now + 2);
            gain.gain.setValueAtTime(0.02, now + 10);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 12);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(reverb);

            osc.start(now);
            osc.stop(now + 12);
            this.activeNodes.push(osc, gain, filter);

            this.loopTimers.push(setTimeout(droneLoop, 11000));
        };

        // Efeitos percussivos/glitch aleatórios
        let glitchLoop = () => {
            if (!this.isPlaying || this.currentTheme !== 'hard') return;
            let now = this.ctx.currentTime;

            if (Math.random() > 0.4) {
                // "Blip" digital
                let freq = scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.5 ? 2 : 4);
                this.playNote(freq, now + Math.random() * 2, 0.1, 'square', 0.03, reverb);
            }

            if (Math.random() > 0.6) {
                // Ruído filtrado (impacto industrial)
                let bufferSize = this.ctx.sampleRate * 0.15;
                let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                let data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
                }

                let noise = this.ctx.createBufferSource();
                let noiseGain = this.ctx.createGain();
                let noiseFilter = this.ctx.createBiquadFilter();

                noise.buffer = buffer;
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = 200 + Math.random() * 1000;
                noiseFilter.Q.value = 3;

                noiseGain.gain.setValueAtTime(0.04, now + 1);

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(reverb);

                noise.start(now + 1 + Math.random() * 2);
                this.activeNodes.push(noise, noiseGain, noiseFilter);
            }

            // Nota melancólica ocasional
            if (Math.random() > 0.5) {
                let note = scale[Math.floor(Math.random() * scale.length)] * 2;
                this.playNote(note, now + 3 + Math.random() * 3, 3, 'sine', 0.035, reverb);
            }

            this.loopTimers.push(setTimeout(glitchLoop, 3000 + Math.random() * 2000));
        };

        droneLoop();
        setTimeout(() => glitchLoop(), 2000);
    }

    // ==================== CONTROLE ====================

    play(theme = 'menu') {
        this.init();

        // Se já está tocando o mesmo tema, não reinicia
        if (this.isPlaying && this.currentTheme === theme) return;

        // Para o tema anterior
        this.stop();

        this.currentTheme = theme;
        this.isPlaying = true;
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 1.5);

        switch (theme) {
            case 'menu':   this.playMenuTheme(); break;
            case 'easy':   this.playEasyTheme(); break;
            case 'medium': this.playMediumTheme(); break;
            case 'hard':   this.playHardTheme(); break;
            default:       this.playMenuTheme(); break;
        }
    }

    stop() {
        // Limpa todos os timers de loop
        this.loopTimers.forEach(t => clearTimeout(t));
        this.loopTimers = [];

        // Fade out suave antes de desconectar
        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
                this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
            } catch(e) { /* ignore */ }
        }

        // Desconecta nós após o fade out
        setTimeout(() => {
            this.activeNodes.forEach(node => {
                try { node.disconnect(); } catch(e) { /* já desconectado */ }
            });
            this.activeNodes = [];
        }, 600);

        this.isPlaying = false;
        this.currentTheme = null;
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
            return false;
        } else {
            this.play(this.currentTheme || 'menu');
            return true;
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.3);
        }
    }
}
