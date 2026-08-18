/**
 * Real-time Chart Renderer for Cellular Automaton
 * Gráfico dinámico en tiempo real para análisis de tendencias poblacionales
 */

import { STATES, STATE_COLORS, STATE_NAMES } from './cellular_automaton.js';

export class PopulationChart {
    constructor(canvas, automaton) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.automaton = automaton;
        this.maxPoints = 200; // Ventana de visualización
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 300;
        const height = 180;
        
        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.render();
    }

    render() {
        const history = this.automaton.history;
        const width = this.canvas.clientWidth || 300;
        const height = this.canvas.clientHeight || 180;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Fondo con gradiente sutil
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
        bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Si no hay suficiente historial, mostrar mensaje
        if (!history || history.length < 2) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Inicie la simulación para registrar tendencias...', width / 2, height / 2);
            return;
        }

        const padding = { top: 20, right: 25, bottom: 25, left: 38 };
        const plotW = width - padding.left - padding.right;
        const plotH = height - padding.top - padding.bottom;

        // Extraer ventana de datos
        const data = history.slice(-this.maxPoints);
        const dataLength = data.length;

        // Líneas guía horizontales (0%, 25%, 50%, 75%, 100%)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, monospace';
        ctx.textAlign = 'right';

        for (let pct = 0; pct <= 100; pct += 25) {
            const y = padding.top + plotH * (1 - pct / 100);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillText(`${pct}%`, padding.left - 5, y + 3);
        }

        // Trazado de cada serie
        const series = [
            { state: STATES.GRASS, color: STATE_COLORS[STATES.GRASS], width: 2 },
            { state: STATES.FOREST, color: STATE_COLORS[STATES.FOREST], width: 2 },
            { state: STATES.FIRE, color: '#ef4444', width: 2.5 },
            { state: STATES.ASH, color: STATE_COLORS[STATES.ASH], width: 1.5 },
            { state: STATES.EMPTY, color: '#94a3b8', width: 1, dashed: true }
        ];

        const lastPoint = data[dataLength - 1];

        series.forEach(({ state, color, width: lw, dashed }) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.beginPath();

            if (dashed) {
                ctx.setLineDash([4, 4]);
            } else {
                ctx.setLineDash([]);
            }

            for (let i = 0; i < dataLength; i++) {
                const pt = data[i];
                const pct = pt.percentages[state] || 0;
                const x = padding.left + (i / (dataLength - 1)) * plotW;
                const y = padding.top + plotH * (1 - pct / 100);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });

        ctx.setLineDash([]);

        // Eje X: Generación inicial y final mostradas
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Gen: ${data[0].generation}`, padding.left, height - 8);
        ctx.textAlign = 'right';
        ctx.fillText(`Gen: ${data[dataLength - 1].generation}`, width - padding.right, height - 8);
    }
}
