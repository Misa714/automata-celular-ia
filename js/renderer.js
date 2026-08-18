/**
 * Canvas Renderer for Cellular Automaton
 * Renderizador de alto rendimiento para el Autómata Celular
 */

import { STATES, STATE_COLORS } from './cellular_automaton.js';

export class CanvasRenderer {
    constructor(canvas, automaton) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.automaton = automaton;
        
        this.showGridLines = true;
        this.displaySize = 500;
        
        // Puntero del ratón para vista previa de pincel
        this.hoverPos = null;
        this.brushRadius = 1;
        this.selectedState = STATES.FIRE;

        // Caché de colores RGB para rendimiento
        this.colorCache = {
            [STATES.EMPTY]: '#111827',   // Slate muy oscuro
            [STATES.GRASS]: '#22c55e',   // Verde esmeralda vivo
            [STATES.FOREST]: '#15803d',  // Verde bosque denso
            [STATES.FIRE]: '#f97316',    // Naranja-Rojo fuego brillante
            [STATES.ASH]: '#475569'      // Ceniza azulada
        };
        
        this.fireGlowColors = ['#ef4444', '#f97316', '#fbbf24', '#f59e0b'];
    }

    /**
     * Ajusta el tamaño real del canvas para mantener resolución nítida y proporción cuadrada
     */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const minDim = Math.min(rect.width, rect.height > 100 ? rect.height : rect.width);
        
        const size = Math.max(300, Math.floor(minDim - 20));
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = Math.floor(size * dpr);
        this.canvas.height = Math.floor(size * dpr);
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;

        // Transformación absoluta para evitar acumulación de escala en resize
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.displaySize = size;
        
        this.render();
    }

    /**
     * Convierte coordenadas de evento (Mouse/Touch) a índices de celda (x, y)
     */
    getGridCoords(event) {
        const rect = this.canvas.getBoundingClientRect();
        
        let clientX = event.clientX;
        let clientY = event.clientY;

        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        }

        const normX = (clientX - rect.left) / rect.width;
        const normY = (clientY - rect.top) / rect.height;

        const cellX = Math.floor(normX * this.automaton.width);
        const cellY = Math.floor(normY * this.automaton.height);

        return {
            x: Math.max(0, Math.min(this.automaton.width - 1, cellX)),
            y: Math.max(0, Math.min(this.automaton.height - 1, cellY))
        };
    }

    /**
     * Dibuja el autómata celular completo
     */
    render() {
        const ctx = this.ctx;
        const width = this.automaton.width;
        const height = this.automaton.height;
        const displaySize = this.displaySize || this.canvas.clientWidth || 500;
        
        const cellW = displaySize / width;
        const cellH = displaySize / height;

        // Fondo oscuro
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, displaySize, displaySize);

        const grid = this.automaton.grid;
        const timers = this.automaton.timers;

        // Renderizado de celdas
        for (let y = 0; y < height; y++) {
            const rowOffset = y * width;
            for (let x = 0; x < width; x++) {
                const state = grid[rowOffset + x];
                const px = x * cellW;
                const py = y * cellH;

                switch (state) {
                    case STATES.EMPTY:
                        ctx.fillStyle = this.colorCache[STATES.EMPTY];
                        ctx.fillRect(px, py, cellW, cellH);
                        break;

                    case STATES.GRASS:
                        ctx.fillStyle = this.colorCache[STATES.GRASS];
                        ctx.fillRect(px, py, cellW, cellH);
                        break;

                    case STATES.FOREST:
                        ctx.fillStyle = this.colorCache[STATES.FOREST];
                        ctx.fillRect(px, py, cellW, cellH);
                        if (cellW > 10) {
                            ctx.fillStyle = '#166534';
                            ctx.fillRect(px + cellW * 0.2, py + cellH * 0.2, cellW * 0.6, cellH * 0.6);
                        }
                        break;

                    case STATES.FIRE: {
                        const t = timers[rowOffset + x];
                        const colorIdx = (x + y + t + Math.floor(Math.random() * 2)) % this.fireGlowColors.length;
                        ctx.fillStyle = this.fireGlowColors[colorIdx];
                        ctx.fillRect(px, py, cellW, cellH);

                        // Núcleo incandescente
                        if (cellW > 4) {
                            ctx.fillStyle = '#fef08a';
                            ctx.fillRect(px + cellW * 0.25, py + cellH * 0.25, cellW * 0.5, cellH * 0.5);
                        }
                        break;
                    }

                    case STATES.ASH: {
                        ctx.fillStyle = this.colorCache[STATES.ASH];
                        ctx.fillRect(px, py, cellW, cellH);
                        if (cellW > 6) {
                            ctx.fillStyle = '#334155';
                            ctx.fillRect(px + cellW * 0.3, py + cellH * 0.3, cellW * 0.4, cellH * 0.4);
                        }
                        break;
                    }
                }
            }
        }

        // Líneas de rejilla sutiles si las celdas son visibles
        if (this.showGridLines && cellW >= 6) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let x = 0; x <= width; x++) {
                ctx.moveTo(x * cellW, 0);
                ctx.lineTo(x * cellW, displaySize);
            }
            for (let y = 0; y <= height; y++) {
                ctx.moveTo(0, y * cellH);
                ctx.lineTo(displaySize, y * cellH);
            }
            ctx.stroke();
        }

        // Vista previa de pincel (Brush Hover Preview)
        if (this.hoverPos) {
            const { x, y } = this.hoverPos;
            const r = this.brushRadius;
            
            ctx.strokeStyle = STATE_COLORS[this.selectedState] || '#38bdf8';
            ctx.lineWidth = 2;
            ctx.fillStyle = (STATE_COLORS[this.selectedState] || '#38bdf8') + '33';

            const boxX = (x - r) * cellW;
            const boxY = (y - r) * cellH;
            const boxSize = (r * 2 + 1) * cellW;

            ctx.strokeRect(boxX, boxY, boxSize, boxSize);
            ctx.fillRect(boxX, boxY, boxSize, boxSize);
        }
    }
}
