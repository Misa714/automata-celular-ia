/**
 * ========================================================================================
 * RENDERIZADOR GRÁFICO EN CANVAS (Canvas Renderer)
 * Archivo: js/renderer.js
 * ========================================================================================
 * 
 * Este archivo se encarga de dibujar la cuadrícula de celdas en el canvas principal,
 * pintar los colores de cada estado, aplicar efectos de resplandor al fuego
 * y mostrar la vista previa del pincel interactivo cuando el usuario mueve el ratón.
 */

// Importamos los estados numéricos y los colores del autómata
import { STATES, STATE_COLORS } from './cellular_automaton.js';

export class CanvasRenderer {
    /**
     * Constructor del renderizador
     * @param {HTMLCanvasElement} canvas - El elemento canvas principal de la simulación
     * @param {CellularAutomaton} automaton - Instancia del motor del autómata para leer su cuadrícula
     */
    constructor(canvas, automaton) {
        this.canvas = canvas;                                  // Guardamos la referencia al canvas del DOM
        // Obtenemos el contexto 2D desactivando el canal alpha para mayor velocidad de dibujado
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.automaton = automaton;                            // Guardamos referencia al motor del autómata
        
        this.showGridLines = true;                             // Bandera para dibujar líneas de rejilla tenues
        this.displaySize = 500;                                // Tamaño por defecto en píxeles
        
        // Puntero y configuración de la herramienta de dibujo interactiva (Pincel)
        this.hoverPos = null;                                  // Coordenadas (x, y) donde está el mouse actualmente
        this.brushRadius = 1;                                  // Radio del pincel (1 = 3x3 celdas)
        this.selectedState = STATES.FIRE;                      // Estado seleccionado para pintar (por defecto Fuego)

        // Tabla de colores optimizada en memoria para acceso rápido
        this.colorCache = {
            [STATES.EMPTY]: '#111827',                         // Slate muy oscuro (suelo inerte / vacío)
            [STATES.GRASS]: '#22c55e',                         // Verde esmeralda vivo (vegetación/pastizal)
            [STATES.FOREST]: '#15803d',                        // Verde bosque profundo (árboles maduros)
            [STATES.FIRE]: '#f97316',                          // Naranja brillante base de fuego
            [STATES.ASH]: '#475569'                            // Gris azulado (cenizas)
        };
        
        // Paleta de colores cálidos para el efecto de resplandor y calor de las llamas
        this.fireGlowColors = ['#ef4444', '#f97316', '#fbbf24', '#f59e0b'];
    }

    /**
     * Ajusta la resolución interna y el tamaño visual del canvas
     * Garantiza nitidez en pantallas de alta resolución (Retina / 4K / Dispositivos móviles)
     */
    resize() {
        // Obtenemos el tamaño del contenedor en pantalla
        const rect = this.canvas.parentElement.getBoundingClientRect();
        // Calculamos la menor dimensión disponible para mantener la cuadrícula cuadrada
        const minDim = Math.min(rect.width, rect.height > 100 ? rect.height : rect.width);
        
        // Asignamos un tamaño mínimo de 300px con un pequeño margen
        const size = Math.max(300, Math.floor(minDim - 20));
        // Detectamos la densidad de píxeles del monitor (ej. 2 para pantallas Retina)
        const dpr = window.devicePixelRatio || 1;
        
        // Ajustamos la resolución interna del búfer de píxeles
        this.canvas.width = Math.floor(size * dpr);
        this.canvas.height = Math.floor(size * dpr);
        // Ajustamos el tamaño visual en la página web mediante estilos CSS
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;

        // Aplicamos la transformación de escala fija para que las coordenadas coincidan
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.displaySize = size;                               // Guardamos el tamaño visual
        
        this.render();                                         // Redibujamos la cuadrícula
    }

    /**
     * Convierte la posición física del cursor del ratón o toque táctil a coordenadas de celda (x, y)
     * @param {MouseEvent|TouchEvent} event - Evento del navegador
     * @returns {{x: number, y: number}} - Coordenadas de la celda en la cuadrícula
     */
    getGridCoords(event) {
        // Obtenemos la posición y dimensiones del canvas en la ventana
        const rect = this.canvas.getBoundingClientRect();
        
        let clientX = event.clientX;
        let clientY = event.clientY;

        // Si el evento proviene de una pantalla táctil (smartphone o tablet)
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        }

        // Calculamos la posición normalizada dentro del canvas (de 0.0 a 1.0)
        const normX = (clientX - rect.left) / rect.width;
        const normY = (clientY - rect.top) / rect.height;

        // Multiplicamos por el número de celdas para obtener los índices (x, y)
        const cellX = Math.floor(normX * this.automaton.width);
        const cellY = Math.floor(normY * this.automaton.height);

        // Limitamos los valores para que nunca se salgan de los bordes del arreglo
        return {
            x: Math.max(0, Math.min(this.automaton.width - 1, cellX)),
            y: Math.max(0, Math.min(this.automaton.height - 1, cellY))
        };
    }

    /**
     * Dibuja toda la cuadrícula del autómata celular en la pantalla
     */
    render() {
        const ctx = this.ctx;                                  // Contexto de dibujo 2D
        const width = this.automaton.width;                    // Columnas del autómata
        const height = this.automaton.height;                  // Filas del autómata
        const displaySize = this.displaySize || this.canvas.clientWidth || 500;
        
        // Calculamos el ancho y alto de cada celda individual en píxeles
        const cellW = displaySize / width;
        const cellH = displaySize / height;

        // Pintamos el fondo completo en color negro/azulado profundo
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, displaySize, displaySize);

        const grid = this.automaton.grid;                      // Matriz de estados actual
        const timers = this.automaton.timers;                  // Matriz de temporizadores

        // --------------------------------------------------------------------------------
        // BUCLE DE DIBUJO: Recorremos cada fila (y) y columna (x)
        // --------------------------------------------------------------------------------
        for (let y = 0; y < height; y++) {
            const rowOffset = y * width;                       // Desplazamiento de fila para índice lineal
            for (let x = 0; x < width; x++) {
                const state = grid[rowOffset + x];             // Estado de la celda actual (0 al 4)
                const px = x * cellW;                          // Posición X en píxeles
                const py = y * cellH;                          // Posición Y en píxeles

                // Evaluamos el estado para aplicar el color y estilo correspondiente:
                switch (state) {
                    // ESTADO 0: Suelo vacío / roca / cortafuegos
                    case STATES.EMPTY:
                        ctx.fillStyle = this.colorCache[STATES.EMPTY];
                        ctx.fillRect(px, py, cellW, cellH);
                        break;

                    // ESTADO 1: Vegetación / Pastizal
                    case STATES.GRASS:
                        ctx.fillStyle = this.colorCache[STATES.GRASS];
                        ctx.fillRect(px, py, cellW, cellH);
                        break;

                    // ESTADO 2: Bosque Maduro / Denso
                    case STATES.FOREST:
                        ctx.fillStyle = this.colorCache[STATES.FOREST];
                        ctx.fillRect(px, py, cellW, cellH);
                        
                        // Si las celdas son lo bastante grandes, dibujamos un detalle de copa de árbol
                        if (cellW > 10) {
                            ctx.fillStyle = '#166534';         // Verde más oscuro en el centro
                            ctx.fillRect(px + cellW * 0.2, py + cellH * 0.2, cellW * 0.6, cellH * 0.6);
                        }
                        break;

                    // ESTADO 3: Fuego Activo
                    case STATES.FIRE: {
                        const t = timers[rowOffset + x];       // Tiempo de combustión
                        // Variación dinámica de tono de llama para efecto de resplandor
                        const colorIdx = (x + y + t + Math.floor(Math.random() * 2)) % this.fireGlowColors.length;
                        ctx.fillStyle = this.fireGlowColors[colorIdx];
                        ctx.fillRect(px, py, cellW, cellH);

                        // Dibujamos un núcleo incandescente amarillo en el centro del fuego
                        if (cellW > 4) {
                            ctx.fillStyle = '#fef08a';         // Amarillo brillante
                            ctx.fillRect(px + cellW * 0.25, py + cellH * 0.25, cellW * 0.5, cellH * 0.5);
                        }
                        break;
                    }

                    // ESTADO 4: Cenizas / Terreno Quemado
                    case STATES.ASH: {
                        ctx.fillStyle = this.colorCache[STATES.ASH];
                        ctx.fillRect(px, py, cellW, cellH);
                        
                        // Detalle de textura de ceniza si la celda es visible
                        if (cellW > 6) {
                            ctx.fillStyle = '#334155';
                            ctx.fillRect(px + cellW * 0.3, py + cellH * 0.3, cellW * 0.4, cellH * 0.4);
                        }
                        break;
                    }
                }
            }
        }

        // --------------------------------------------------------------------------------
        // DIBUJO DE LÍNEAS DE REJILLA SUTILES (Si las celdas miden al menos 6 píxeles)
        // --------------------------------------------------------------------------------
        if (this.showGridLines && cellW >= 6) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';     // Blanco ultra-transparente
            ctx.lineWidth = 0.5;                               // Línea muy fina
            ctx.beginPath();
            
            // Líneas verticales
            for (let x = 0; x <= width; x++) {
                ctx.moveTo(x * cellW, 0);
                ctx.lineTo(x * cellW, displaySize);
            }
            // Líneas horizontales
            for (let y = 0; y <= height; y++) {
                ctx.moveTo(0, y * cellH);
                ctx.lineTo(displaySize, y * cellH);
            }
            ctx.stroke();                                      // Pintamos las líneas
        }

        // --------------------------------------------------------------------------------
        // VISTA PREVIA DEL PINCEL (Brush Hover Preview)
        // Muestra un recuadro translúcido alrededor del cursor indicando el tamaño y color
        // --------------------------------------------------------------------------------
        if (this.hoverPos) {
            const { x, y } = this.hoverPos;                    // Posición de la celda donde está el cursor
            const r = this.brushRadius;                        // Radio de la brocha
            
            // Asignamos el color del estado que está activo actualmente
            ctx.strokeStyle = STATE_COLORS[this.selectedState] || '#38bdf8';
            ctx.lineWidth = 2;                                 // Borde nítido
            ctx.fillStyle = (STATE_COLORS[this.selectedState] || '#38bdf8') + '33'; // 20% de opacidad

            // Calculamos las coordenadas y tamaño del recuadro del pincel
            const boxX = (x - r) * cellW;
            const boxY = (y - r) * cellH;
            const boxSize = (r * 2 + 1) * cellW;

            ctx.strokeRect(boxX, boxY, boxSize, boxSize);      // Borde del pincel
            ctx.fillRect(boxX, boxY, boxSize, boxSize);        // Relleno semi-transparente
        }
    }
}
