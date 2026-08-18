/**
 * ========================================================================================
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN WEB (Application Controller)
 * Archivo: js/app.js
 * ========================================================================================
 * 
 * Este archivo actúa como el "director de orquesta":
 * 1. Inicializa el motor del autómata, el renderizador y el gráfico.
 * 2. Conecta todos los botones, sliders, brújula de viento y eventos de ratón/touch.
 * 3. Ejecuta el bucle de animación a través de requestAnimationFrame y delta time.
 * 4. Gestiona las exportaciones a PNG y CSV.
 */

// Importamos las clases y constantes de los otros módulos
import { CellularAutomaton, STATES, STATE_NAMES, STATE_COLORS } from './cellular_automaton.js';
import { CanvasRenderer } from './renderer.js';
import { PopulationChart } from './charts.js';

class App {
    /**
     * Constructor principal de la aplicación
     */
    constructor() {
        this.gridSize = 100;                                   // Tamaño inicial de la rejilla (100x100 = 10,000 celdas)
        // Instanciamos el motor matemático del autómata celular
        this.automaton = new CellularAutomaton(this.gridSize, this.gridSize);
        
        // Obtenemos los elementos canvas del HTML mediante sus IDs
        this.canvas = document.getElementById('simulation-canvas');
        this.chartCanvas = document.getElementById('population-chart');
        
        // Instanciamos el renderizador de la cuadrícula y el gráfico de tendencias
        this.renderer = new CanvasRenderer(this.canvas, this.automaton);
        this.chart = new PopulationChart(this.chartCanvas, this.automaton);

        // Control del estado del bucle de simulación
        this.isRunning = false;                                // Indica si la simulación está corriendo o en pausa
        this.fps = 20;                                         // Velocidad objetivo (20 generaciones por segundo)
        this.lastFrameTime = 0;                                // Marca de tiempo del último fotograma dibujado
        this.animationId = null;                               // ID de requestAnimationFrame para poder cancelarlo

        // Control de las herramientas de dibujo con el ratón
        this.isDrawing = false;                                // Indica si el usuario está manteniendo presionado el clic
        this.lastDrawCoords = null;                            // Coordenadas anteriores para interpolación continua
        this.currentTool = STATES.FIRE;                        // Estado a pintar (inicia con Fuego activo)
        this.brushRadius = 1;                                  // Radio del pincel (1 = 3x3 celdas)

        // Inicializamos los valores en la interfaz gráfica
        this.initUI();
        // Conectamos todos los eventos (clics, teclado, sliders, mousemove)
        this.bindEvents();
        // Actualizamos las tarjetas numéricas de estadísticas
        this.updateStatsUI();
        
        // Listener para redimensionar el canvas automáticamente si el usuario cambia el tamaño de la ventana
        window.addEventListener('resize', () => this.handleResize());
        // Ajuste inicial tras cargar el DOM
        setTimeout(() => this.handleResize(), 100);
    }

    /**
     * Sincroniza los valores iniciales del autómata con los controles visuales (Sliders)
     */
    initUI() {
        const windSpeedInput = document.getElementById('param-wind-speed');
        const humidityInput = document.getElementById('param-humidity');
        const regrowthInput = document.getElementById('param-regrowth');
        const lightningInput = document.getElementById('param-lightning');
        const fpsInput = document.getElementById('param-fps');

        // Asignamos los valores porcentuales a cada input range
        if (windSpeedInput) windSpeedInput.value = this.automaton.params.windSpeed * 100;
        if (humidityInput) humidityInput.value = this.automaton.params.humidity * 100;
        if (regrowthInput) regrowthInput.value = this.automaton.params.pRegrowth * 1000;
        if (lightningInput) lightningInput.value = this.automaton.params.pLightning * 100000;
        if (fpsInput) fpsInput.value = this.fps;

        // Actualizamos el botón activo en la brújula de viento
        this.updateWindCompassUI();
    }

    /**
     * Redimensiona tanto la cuadrícula como el gráfico cuando cambia la ventana
     */
    handleResize() {
        this.renderer.resize();                                // Redimensiona canvas de cuadrícula
        this.chart.resize();                                   // Redimensiona canvas de gráfica
        this.renderer.render();                                // Redibuja cuadrícula
        this.chart.render();                                   // Redibuja gráfica
    }

    /**
     * Enlaza todos los botones y controles de la interfaz a sus funciones correspondientes
     */
    bindEvents() {
        // ----------------------------------------------------------------------------
        // 1. BOTONES DE REPRODUCCIÓN (PLAY, PAUSA, PASO, REINICIAR, LIMPIAR)
        // ----------------------------------------------------------------------------
        const btnPlay = document.getElementById('btn-play');
        const btnPause = document.getElementById('btn-pause');
        const btnStep = document.getElementById('btn-step');
        const btnReset = document.getElementById('btn-reset');
        const btnClear = document.getElementById('btn-clear');

        btnPlay.addEventListener('click', () => this.start()); // Iniciar simulación
        btnPause.addEventListener('click', () => this.stop()); // Pausar simulación
        btnStep.addEventListener('click', () => {              // Avanzar exactamente 1 paso
            this.stop();
            this.step();
        });
        btnReset.addEventListener('click', () => {             // Reiniciar con el escenario actual
            const preset = document.getElementById('preset-select').value;
            this.reset(preset);
        });
        btnClear.addEventListener('click', () => this.reset('empty')); // Vaciar todo el mapa

        // ----------------------------------------------------------------------------
        // 2. SELECTOR DE ESCENARIOS PRECONFIGURADOS (PRESETS)
        // ----------------------------------------------------------------------------
        const presetSelect = document.getElementById('preset-select');
        presetSelect.addEventListener('change', (e) => {
            this.reset(e.target.value);                        // Carga el nuevo escenario seleccionado
        });

        // ----------------------------------------------------------------------------
        // 3. SELECTOR DE RESOLUCIÓN DE CUADRÍCULA (50x50, 100x100, 150x150, 200x200)
        // ----------------------------------------------------------------------------
        const gridSizeSelect = document.getElementById('grid-size-select');
        gridSizeSelect.addEventListener('change', (e) => {
            const size = parseInt(e.target.value, 10);
            this.gridSize = size;
            const currentPreset = document.getElementById('preset-select').value;
            this.automaton.resize(size, size);                 // Redimensiona matrices
            this.automaton.resetGrid(currentPreset);           // Regenera el escenario
            this.renderer.resize();                            // Ajusta vista
            this.renderer.render();
            this.chart.resize();
            this.chart.render();
            this.updateStatsUI();                              // Actualiza contadores
        });

        // ----------------------------------------------------------------------------
        // 4. VINCULACIÓN DE SLIDERS DE PARÁMETROS AMBIENTALES
        // ----------------------------------------------------------------------------
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

        // ----------------------------------------------------------------------------
        // 5. BRÚJULA DE VIENTO INTERACTIVA (8 Direcciones + Botón de Calma)
        // ----------------------------------------------------------------------------
        const compassButtons = document.querySelectorAll('.compass-btn');
        compassButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const angle = parseInt(btn.dataset.angle, 10);
                if (angle === -1) {
                    // Si hizo clic en el punto central: Viento en calma (0%)
                    this.automaton.params.windSpeed = 0;
                    const speedSlider = document.getElementById('param-wind-speed');
                    const speedLabel = document.getElementById('val-wind-speed');
                    if (speedSlider) speedSlider.value = 0;
                    if (speedLabel) speedLabel.textContent = '0%';
                } else {
                    // Si hizo clic en una flecha cardinal: fija el ángulo
                    this.automaton.params.windAngle = angle;
                    // Si el viento estaba en 0, lo reactiva al 50%
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

        // ----------------------------------------------------------------------------
        // 6. SELECCIÓN DE ESTADO DEL PINCEL (Fuego, Vegetación, Bosque, Cortafuego, Cenizas)
        // ----------------------------------------------------------------------------
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');                   // Marca el botón activo
                this.currentTool = parseInt(btn.dataset.state, 10);
                this.renderer.selectedState = this.currentTool;// Informa al renderizador
                this.renderer.render();
            });
        });

        // ----------------------------------------------------------------------------
        // 7. SELECCIÓN DE TAMAÑO DE PINCEL (1x1, 3x3, 5x5, 9x9)
        // ----------------------------------------------------------------------------
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

        // ----------------------------------------------------------------------------
        // 8. EVENTOS DE RATÓN: DIBUJO CONTINUO SOBRE EL CANVAS
        // ----------------------------------------------------------------------------
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;                             // Activamos modo dibujando
            const coords = this.renderer.getGridCoords(e);     // Obtenemos celda bajo el cursor
            this.lastDrawCoords = coords;                      // Guardamos inicio de trazo
            this.automaton.applyBrush(coords.x, coords.y, this.brushRadius, this.currentTool);
            this.renderer.render();                            // Redibujamos
            this.updateStatsUI();                              // Actualizamos números
        });

        window.addEventListener('mouseup', () => {
            this.isDrawing = false;                            // Al soltar el clic, termina el trazo
            this.lastDrawCoords = null;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const coords = this.renderer.getGridCoords(e);
            this.renderer.hoverPos = coords;                   // Actualizamos preview del pincel

            if (this.isDrawing) {
                // Si estamos arrastrando, interpolamos con Bresenham para trazo continuo
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
            this.renderer.hoverPos = null;                     // Oculta el preview al salir del canvas
            this.renderer.render();
        });

        // ----------------------------------------------------------------------------
        // 9. EVENTOS TOUCH (Para tablets y móviles)
        // ----------------------------------------------------------------------------
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();                                // Evita scroll de página
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

        // ----------------------------------------------------------------------------
        // 10. BOTONES DE EXPORTACIÓN Y MODAL DE REGLAS
        // ----------------------------------------------------------------------------
        const btnSnapshot = document.getElementById('btn-snapshot');
        if (btnSnapshot) {
            btnSnapshot.addEventListener('click', () => this.takeSnapshot()); // Descargar PNG
        }

        const btnExportCSV = document.getElementById('btn-export-csv');
        if (btnExportCSV) {
            btnExportCSV.addEventListener('click', () => this.exportCSV());   // Descargar CSV
        }

        const btnInfo = document.getElementById('btn-info');
        const modalInfo = document.getElementById('info-modal');
        const btnCloseModal = document.getElementById('btn-close-modal');

        if (btnInfo && modalInfo) {
            btnInfo.addEventListener('click', () => modalInfo.classList.remove('hidden')); // Abrir modal
        }
        if (btnCloseModal && modalInfo) {
            btnCloseModal.addEventListener('click', () => modalInfo.classList.add('hidden')); // Cerrar modal
        }
    }

    /**
     * Función auxiliar para enlazar un slider con su etiqueta de texto
     */
    bindSlider(id, labelId, transform) {
        const input = document.getElementById(id);
        const label = document.getElementById(labelId);
        if (!input || !label) return;

        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            label.textContent = transform(val);               // Transforma valor (ej. 0.5 -> "50%")
        });
    }

    /**
     * Actualiza visualmente la brújula de viento marcando la dirección activa
     */
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

    /**
     * Inicia la reproducción continua de la simulación
     */
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            document.getElementById('btn-play').classList.add('active');
            document.getElementById('btn-pause').classList.remove('active');
            this.lastFrameTime = performance.now();           // Marca de tiempo inicial
            this.loop();                                      // Lanza el bucle
        }
    }

    /**
     * Pausa la simulación
     */
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            document.getElementById('btn-play').classList.remove('active');
            document.getElementById('btn-pause').classList.add('active');
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);       // Cancela el bucle
                this.animationId = null;
            }
        }
    }

    /**
     * Avanza exactamente 1 generación síncrona y refresca la pantalla
     */
    step() {
        this.automaton.step();                                // Calcula nuevo estado
        this.renderer.render();                               // Dibuja cuadrícula
        this.chart.render();                                  // Dibuja gráfico
        this.updateStatsUI();                                 // Actualiza números
    }

    /**
     * Reinicia la simulación con un patrón determinado
     */
    reset(pattern) {
        this.stop();                                          // Pausa primero
        this.automaton.resetGrid(pattern);                    // Reinicia la matriz
        this.renderer.render();
        this.chart.render();
        this.updateStatsUI();
    }

    /**
     * Bucle de animación optimizado con requestAnimationFrame y Delta Time
     */
    loop(currentTime = 0) {
        if (!this.isRunning) return;

        // Solicitamos el siguiente fotograma al navegador
        this.animationId = requestAnimationFrame((time) => this.loop(time));

        const interval = 1000 / this.fps;                     // Intervalo deseado en milisegundos (ej. 50ms para 20 FPS)
        const elapsed = currentTime - this.lastFrameTime;     // Tiempo transcurrido desde el último frame

        // Si ya pasó el tiempo necesario según los FPS configurados:
        if (elapsed > interval) {
            this.lastFrameTime = currentTime - (elapsed % interval);
            this.step();                                      // Avanzamos una generación
        }
    }

    /**
     * Actualiza los elementos numéricos y tarjetas de estado en la barra lateral derecha
     */
    updateStatsUI() {
        const stats = this.automaton.getLatestStats();
        
        // Actualizamos el número de generación
        const genElem = document.getElementById('stat-generation');
        if (genElem) genElem.textContent = stats.generation;

        // Mapeo de elementos DOM para cada estado
        const statElements = {
            [STATES.EMPTY]: { count: 'stat-empty-count', pct: 'stat-empty-pct' },
            [STATES.GRASS]: { count: 'stat-grass-count', pct: 'stat-grass-pct' },
            [STATES.FOREST]: { count: 'stat-forest-count', pct: 'stat-forest-pct' },
            [STATES.FIRE]: { count: 'stat-fire-count', pct: 'stat-fire-pct' },
            [STATES.ASH]: { count: 'stat-ash-count', pct: 'stat-ash-pct' }
        };

        // Asignamos cantidad exacta y porcentaje formateado con 1 decimal
        for (const [state, elIds] of Object.entries(statElements)) {
            const countEl = document.getElementById(elIds.count);
            const pctEl = document.getElementById(elIds.pct);
            if (countEl) countEl.textContent = stats.counts[state];
            if (pctEl) pctEl.textContent = `${stats.percentages[state].toFixed(1)}%`;
        }

        // Indicador luminoso de Fuego Activo vs Extinguido
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

    /**
     * Descarga una imagen PNG de alta resolución de la cuadrícula
     */
    takeSnapshot() {
        const link = document.createElement('a');
        link.download = `automata_celular_gen_${this.automaton.generation}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    /**
     * Exporta todas las métricas generacionales registradas a un archivo CSV
     */
    exportCSV() {
        const history = this.automaton.history;
        if (!history || history.length === 0) return;

        // Encabezados de columnas
        let csv = 'Generacion,Vacio,Vegetacion,Bosque,Fuego,Cenizas,Vacio_Pct,Vegetacion_Pct,Bosque_Pct,Fuego_Pct,Cenizas_Pct\n';
        
        // Filas de datos
        history.forEach(item => {
            csv += `${item.generation},${item.counts[STATES.EMPTY]},${item.counts[STATES.GRASS]},${item.counts[STATES.FOREST]},${item.counts[STATES.FIRE]},${item.counts[STATES.ASH]},${item.percentages[STATES.EMPTY].toFixed(2)},${item.percentages[STATES.GRASS].toFixed(2)},${item.percentages[STATES.FOREST].toFixed(2)},${item.percentages[STATES.FIRE].toFixed(2)},${item.percentages[STATES.ASH].toFixed(2)}\n`;
        });

        // Crear enlace de descarga automática
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `datos_simulacion_ac_gen_${this.automaton.generation}.csv`);
        link.click();
    }
}

// Inicializar la aplicación cuando el DOM termine de cargar
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
