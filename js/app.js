/**
 * Main Application Controller for Cellular Automata Simulation
 * Controlador principal de la interfaz y la simulación
 */

import { CellularAutomaton, STATES, STATE_NAMES, STATE_COLORS } from './cellular_automaton.js';
import { CanvasRenderer } from './renderer.js';
import { PopulationChart } from './charts.js';

class App {
    constructor() {
        this.gridSize = 100;
        this.automaton = new CellularAutomaton(this.gridSize, this.gridSize);
        
        // Elementos DOM principales
        this.canvas = document.getElementById('simulation-canvas');
        this.chartCanvas = document.getElementById('population-chart');
        
        this.renderer = new CanvasRenderer(this.canvas, this.automaton);
        this.chart = new PopulationChart(this.chartCanvas, this.automaton);

        // Estado de ejecución
        this.isRunning = false;
        this.fps = 20;
        this.lastFrameTime = 0;
        this.animationId = null;

        // Estado de herramientas de dibujo
        this.isDrawing = false;
        this.lastDrawCoords = null;
        this.currentTool = STATES.FIRE;
        this.brushRadius = 1;

        this.initUI();
        this.bindEvents();
        this.updateStatsUI();
        
        // Redimensionar e inicializar
        window.addEventListener('resize', () => this.handleResize());
        setTimeout(() => this.handleResize(), 100);
    }

    initUI() {
        // Establecer valores iniciales en los controles
        const windSpeedInput = document.getElementById('param-wind-speed');
        const humidityInput = document.getElementById('param-humidity');
        const regrowthInput = document.getElementById('param-regrowth');
        const lightningInput = document.getElementById('param-lightning');
        const fpsInput = document.getElementById('param-fps');

        if (windSpeedInput) windSpeedInput.value = this.automaton.params.windSpeed * 100;
        if (humidityInput) humidityInput.value = this.automaton.params.humidity * 100;
        if (regrowthInput) regrowthInput.value = this.automaton.params.pRegrowth * 1000;
        if (lightningInput) lightningInput.value = this.automaton.params.pLightning * 100000;
        if (fpsInput) fpsInput.value = this.fps;

        this.updateWindCompassUI();
    }

    handleResize() {
        this.renderer.resize();
        this.chart.resize();
        this.renderer.render();
        this.chart.render();
    }

    bindEvents() {
        // Botones de control de simulación
        const btnPlay = document.getElementById('btn-play');
        const btnPause = document.getElementById('btn-pause');
        const btnStep = document.getElementById('btn-step');
        const btnReset = document.getElementById('btn-reset');
        const btnClear = document.getElementById('btn-clear');

        btnPlay.addEventListener('click', () => this.start());
        btnPause.addEventListener('click', () => this.stop());
        btnStep.addEventListener('click', () => {
            this.stop();
            this.step();
        });
        btnReset.addEventListener('click', () => {
            const preset = document.getElementById('preset-select').value;
            this.reset(preset);
        });
        btnClear.addEventListener('click', () => this.reset('empty'));

        // Selector de Presets
        const presetSelect = document.getElementById('preset-select');
        presetSelect.addEventListener('change', (e) => {
            this.reset(e.target.value);
        });

        // Selector de tamaño de rejilla
        const gridSizeSelect = document.getElementById('grid-size-select');
        gridSizeSelect.addEventListener('change', (e) => {
            const size = parseInt(e.target.value, 10);
            this.gridSize = size;
            const currentPreset = document.getElementById('preset-select').value;
            this.automaton.resize(size, size);
            this.automaton.resetGrid(currentPreset);
            this.renderer.resize();
            this.renderer.render();
            this.chart.resize();
            this.chart.render();
            this.updateStatsUI();
        });

        // Controles de Parámetros
        this.bindSlider('param-wind-speed', 'val-wind-speed', (v) => {
            this.automaton.params.windSpeed = v / 100;
            this.updateWindCompassUI();
            return `${v}%`;
        });

        this.bindSlider('param-humidity', 'val-humidity', (v) => {
            this.automaton.params.humidity = v / 100;
            return `${v}%`;
        });

        this.bindSlider('param-regrowth', 'val-regrowth', (v) => {
            this.automaton.params.pRegrowth = v / 1000;
            return `${(v / 10).toFixed(1)}%`;
        });

        this.bindSlider('param-lightning', 'val-lightning', (v) => {
            this.automaton.params.pLightning = v / 100000;
            return `${(v / 1000).toFixed(3)}%`;
        });

        this.bindSlider('param-fps', 'val-fps', (v) => {
            this.fps = parseInt(v, 10);
            return `${v} FPS`;
        });

        // Brújula de Dirección del Viento (8 direcciones + Calma)
        const compassButtons = document.querySelectorAll('.compass-btn');
        compassButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const angle = parseInt(btn.dataset.angle, 10);
                if (angle === -1) {
                    // Calma: sin viento
                    this.automaton.params.windSpeed = 0;
                    const speedSlider = document.getElementById('param-wind-speed');
                    const speedLabel = document.getElementById('val-wind-speed');
                    if (speedSlider) speedSlider.value = 0;
                    if (speedLabel) speedLabel.textContent = '0%';
                } else {
                    this.automaton.params.windAngle = angle;
                    if (this.automaton.params.windSpeed === 0) {
                        this.automaton.params.windSpeed = 0.50;
                        const speedSlider = document.getElementById('param-wind-speed');
                        const speedLabel = document.getElementById('val-wind-speed');
                        if (speedSlider) speedSlider.value = 50;
                        if (speedLabel) speedLabel.textContent = '50%';
                    }
                }
                this.updateWindCompassUI();
            });
        });

        // Herramientas de Dibujo (Pinceles de Estados)
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = parseInt(btn.dataset.state, 10);
                this.renderer.selectedState = this.currentTool;
                this.renderer.render();
            });
        });

        // Tamaño de pincel
        const brushButtons = document.querySelectorAll('.brush-size-btn');
        brushButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                brushButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.brushRadius = parseInt(btn.dataset.radius, 10);
                this.renderer.brushRadius = this.brushRadius;
                this.renderer.render();
            });
        });

        // Eventos del Mouse sobre el Canvas con dibujo continuo
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            const coords = this.renderer.getGridCoords(e);
            this.lastDrawCoords = coords;
            this.automaton.applyBrush(coords.x, coords.y, this.brushRadius, this.currentTool);
            this.renderer.render();
            this.updateStatsUI();
        });

        window.addEventListener('mouseup', () => {
            this.isDrawing = false;
            this.lastDrawCoords = null;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const coords = this.renderer.getGridCoords(e);
            this.renderer.hoverPos = coords;

            if (this.isDrawing) {
                if (this.lastDrawCoords) {
                    this.automaton.applyBrushLine(
                        this.lastDrawCoords.x, this.lastDrawCoords.y,
                        coords.x, coords.y,
                        this.brushRadius, this.currentTool
                    );
                } else {
                    this.automaton.applyBrush(coords.x, coords.y, this.brushRadius, this.currentTool);
                }
                this.lastDrawCoords = coords;
                this.renderer.render();
                this.updateStatsUI();
            } else {
                this.renderer.render();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.renderer.hoverPos = null;
            this.renderer.render();
        });

        // Soporte Touch continuo para móviles y tablets
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isDrawing = true;
            const coords = this.renderer.getGridCoords(e);
            this.lastDrawCoords = coords;
            this.automaton.applyBrush(coords.x, coords.y, this.brushRadius, this.currentTool);
            this.renderer.render();
            this.updateStatsUI();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isDrawing) {
                const coords = this.renderer.getGridCoords(e);
                if (this.lastDrawCoords) {
                    this.automaton.applyBrushLine(
                        this.lastDrawCoords.x, this.lastDrawCoords.y,
                        coords.x, coords.y,
                        this.brushRadius, this.currentTool
                    );
                } else {
                    this.automaton.applyBrush(coords.x, coords.y, this.brushRadius, this.currentTool);
                }
                this.lastDrawCoords = coords;
                this.renderer.render();
                this.updateStatsUI();
            }
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.isDrawing = false;
            this.lastDrawCoords = null;
        });

        // Botón de Captura de Pantalla (PNG)
        const btnSnapshot = document.getElementById('btn-snapshot');
        if (btnSnapshot) {
            btnSnapshot.addEventListener('click', () => this.takeSnapshot());
        }

        // Botón de Exportar Datos (CSV)
        const btnExportCSV = document.getElementById('btn-export-csv');
        if (btnExportCSV) {
            btnExportCSV.addEventListener('click', () => this.exportCSV());
        }

        // Modal de Información y Reglas
        const btnInfo = document.getElementById('btn-info');
        const modalInfo = document.getElementById('info-modal');
        const btnCloseModal = document.getElementById('btn-close-modal');

        if (btnInfo && modalInfo) {
            btnInfo.addEventListener('click', () => modalInfo.classList.remove('hidden'));
        }
        if (btnCloseModal && modalInfo) {
            btnCloseModal.addEventListener('click', () => modalInfo.classList.add('hidden'));
        }
    }

    bindSlider(id, labelId, transform) {
        const input = document.getElementById(id);
        const label = document.getElementById(labelId);
        if (!input || !label) return;

        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            label.textContent = transform(val);
        });
    }

    updateWindCompassUI() {
        const angle = this.automaton.params.windAngle;
        const speed = this.automaton.params.windSpeed;
        const isCalm = (speed === 0);

        const buttons = document.querySelectorAll('.compass-btn');
        buttons.forEach(btn => {
            const btnAngle = parseInt(btn.dataset.angle, 10);
            if (isCalm && btnAngle === -1) {
                btn.classList.add('active');
            } else if (!isCalm && btnAngle === angle) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const windAngleText = document.getElementById('val-wind-dir');
        if (windAngleText) {
            if (isCalm) {
                windAngleText.textContent = 'Calma (Sin Viento)';
            } else {
                const dirs = {
                    0: 'Este (→)',
                    45: 'Sureste (↘)',
                    90: 'Sur (↓)',
                    135: 'Suroeste (↙)',
                    180: 'Oeste (←)',
                    225: 'Noroeste (↖)',
                    270: 'Norte (↑)',
                    315: 'Noreste (↗)'
                };
                windAngleText.textContent = dirs[angle] || `${angle}°`;
            }
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            document.getElementById('btn-play').classList.add('active');
            document.getElementById('btn-pause').classList.remove('active');
            this.lastFrameTime = performance.now();
            this.loop();
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            document.getElementById('btn-play').classList.remove('active');
            document.getElementById('btn-pause').classList.add('active');
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }
    }

    step() {
        this.automaton.step();
        this.renderer.render();
        this.chart.render();
        this.updateStatsUI();
    }

    reset(pattern) {
        this.stop();
        this.automaton.resetGrid(pattern);
        this.renderer.render();
        this.chart.render();
        this.updateStatsUI();
    }

    loop(currentTime = 0) {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame((time) => this.loop(time));

        const interval = 1000 / this.fps;
        const elapsed = currentTime - this.lastFrameTime;

        if (elapsed > interval) {
            this.lastFrameTime = currentTime - (elapsed % interval);
            this.step();
        }
    }

    updateStatsUI() {
        const stats = this.automaton.getLatestStats();
        
        // Actualizar generación
        const genElem = document.getElementById('stat-generation');
        if (genElem) genElem.textContent = stats.generation;

        // Actualizar contadores y porcentajes de cada estado
        const statElements = {
            [STATES.EMPTY]: { count: 'stat-empty-count', pct: 'stat-empty-pct' },
            [STATES.GRASS]: { count: 'stat-grass-count', pct: 'stat-grass-pct' },
            [STATES.FOREST]: { count: 'stat-forest-count', pct: 'stat-forest-pct' },
            [STATES.FIRE]: { count: 'stat-fire-count', pct: 'stat-fire-pct' },
            [STATES.ASH]: { count: 'stat-ash-count', pct: 'stat-ash-pct' }
        };

        for (const [state, elIds] of Object.entries(statElements)) {
            const countEl = document.getElementById(elIds.count);
            const pctEl = document.getElementById(elIds.pct);
            if (countEl) countEl.textContent = stats.counts[state];
            if (pctEl) pctEl.textContent = `${stats.percentages[state].toFixed(1)}%`;
        }

        // Estado del fuego
        const fireStatusEl = document.getElementById('fire-status-badge');
        if (fireStatusEl) {
            if (stats.hasActiveFire) {
                fireStatusEl.className = 'status-badge active-fire';
                fireStatusEl.innerHTML = '<span class="pulse-dot"></span> Fuego Activo';
            } else {
                fireStatusEl.className = 'status-badge extinguished';
                fireStatusEl.innerHTML = 'Fuego Extinguido';
            }
        }
    }

    takeSnapshot() {
        const link = document.createElement('a');
        link.download = `automata_celular_gen_${this.automaton.generation}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    exportCSV() {
        const history = this.automaton.history;
        if (!history || history.length === 0) return;

        let csv = 'Generacion,Vacio,Vegetacion,Bosque,Fuego,Cenizas,Vacio_Pct,Vegetacion_Pct,Bosque_Pct,Fuego_Pct,Cenizas_Pct\n';
        
        history.forEach(item => {
            csv += `${item.generation},${item.counts[STATES.EMPTY]},${item.counts[STATES.GRASS]},${item.counts[STATES.FOREST]},${item.counts[STATES.FIRE]},${item.counts[STATES.ASH]},${item.percentages[STATES.EMPTY].toFixed(2)},${item.percentages[STATES.GRASS].toFixed(2)},${item.percentages[STATES.FOREST].toFixed(2)},${item.percentages[STATES.FIRE].toFixed(2)},${item.percentages[STATES.ASH].toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `datos_simulacion_ac_gen_${this.automaton.generation}.csv`);
        link.click();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
