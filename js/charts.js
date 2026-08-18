/**
 * ========================================================================================
 * GRÁFICO DINÁMICO DE TENDENCIAS POBLACIONALES EN TIEMPO REAL
 * Archivo: js/charts.js
 * ========================================================================================
 * 
 * Este archivo se encarga de renderizar la gráfica de líneas en el canvas lateral.
 * Muestra el porcentaje de cada estado (Vegetación, Bosque, Fuego, Cenizas, Vacío)
 * a lo largo de las generaciones conforme avanza la simulación.
 */

// Importamos las constantes de estados y la paleta de colores oficiales
import { STATES, STATE_COLORS, STATE_NAMES } from './cellular_automaton.js';

export class PopulationChart {
    /**
     * Constructor del gráfico
     * @param {HTMLCanvasElement} canvas - El elemento canvas donde se dibujará la gráfica
     * @param {CellularAutomaton} automaton - Instancia del motor del autómata para leer su historial
     */
    constructor(canvas, automaton) {
        this.canvas = canvas;                       // Guardamos la referencia al elemento HTML canvas
        this.ctx = canvas.getContext('2d');         // Obtenemos el contexto de dibujo 2D
        this.automaton = automaton;                 // Guardamos la referencia al autómata para leer datos
        this.maxPoints = 200;                       // Ventana máxima de visualización (últimas 200 generaciones)
    }

    /**
     * Ajusta el tamaño físico y lógico del canvas respetando la resolución de pantalla (DPI/Retina)
     */
    resize() {
        // Obtenemos las dimensiones reales del contenedor padre en el navegador
        const rect = this.canvas.parentElement.getBoundingClientRect();
        // Detectamos si la pantalla es de alta densidad de píxeles (ej. Retina o 4K)
        const dpr = window.devicePixelRatio || 1;
        
        const width = rect.width || 300; // Ancho disponible (por defecto 300px)
        const height = 180;              // Altura fija de 180px para la gráfica
        
        // Asignamos la resolución interna del canvas multiplicada por el DPR (para nitidez)
        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);
        
        // Asignamos el tamaño visual en CSS
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        // Escalamos el contexto para que las coordenadas de dibujo coincidan con los píxeles visuales
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Redibujamos la gráfica con las nuevas dimensiones
        this.render();
    }

    /**
     * Dibuja todas las líneas y elementos de la gráfica
     */
    render() {
        const history = this.automaton.history;                 // Obtenemos la lista con el historial de generaciones
        const width = this.canvas.clientWidth || 300;           // Ancho visual actual
        const height = this.canvas.clientHeight || 180;         // Altura visual actual
        const ctx = this.ctx;                                   // Contexto de dibujo

        // Limpiamos todo el canvas antes de volver a dibujar
        ctx.clearRect(0, 0, width, height);

        // Creamos un degradado suave de fondo (azul oscuro a azul noche)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');   // Color superior semi-transparente
        bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');  // Color inferior más oscuro
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);                 // Pintamos el fondo

        // Si todavía no hay al menos 2 generaciones simuladas, mostramos un mensaje de espera
        if (!history || history.length < 2) {
            ctx.fillStyle = '#94a3b8';                         // Color de texto gris claro
            ctx.font = '12px Inter, sans-serif';               // Tipografía
            ctx.textAlign = 'center';                          // Centrado horizontal
            ctx.fillText('Inicie la simulación para registrar tendencias...', width / 2, height / 2);
            return;                                            // Salimos de la función
        }

        // Márgenes internos para dejar espacio a los números de los ejes
        const padding = { top: 20, right: 25, bottom: 25, left: 38 };
        const plotW = width - padding.left - padding.right;    // Ancho real del área de trazado
        const plotH = height - padding.top - padding.bottom;   // Altura real del área de trazado

        // Tomamos los datos más recientes según la ventana máxima (hasta 200 puntos)
        const data = history.slice(-this.maxPoints);
        const dataLength = data.length;                        // Cantidad de puntos a dibujar

        // --------------------------------------------------------------------------------
        // DIBUJO DE LÍNEAS GUÍA HORIZONTALES (0%, 25%, 50%, 75%, 100%)
        // --------------------------------------------------------------------------------
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';         // Línea gris tenue
        ctx.lineWidth = 1;                                     // Grosor de 1 píxel
        ctx.fillStyle = '#64748b';                             // Color para las etiquetas numéricas
        ctx.font = '10px Inter, monospace';                    // Fuente monoespaciada pequeña
        ctx.textAlign = 'right';                               // Alineado a la derecha

        for (let pct = 0; pct <= 100; pct += 25) {
            // Calculamos la posición vertical Y (100% arriba, 0% abajo)
            const y = padding.top + plotH * (1 - pct / 100);
            
            ctx.beginPath();
            ctx.moveTo(padding.left, y);                       // Inicio de la línea guía
            ctx.lineTo(width - padding.right, y);              // Fin de la línea guía
            ctx.stroke();                                      // Dibujamos la línea
            
            // Escribimos el texto del porcentaje (ej. "50%")
            ctx.fillText(`${pct}%`, padding.left - 5, y + 3);
        }

        // --------------------------------------------------------------------------------
        // CONFIGURACIÓN DE CADA SERIE / LÍNEA DE COLOR
        // --------------------------------------------------------------------------------
        const series = [
            { state: STATES.GRASS, color: STATE_COLORS[STATES.GRASS], width: 2 },        // Línea verde claro (Vegetación)
            { state: STATES.FOREST, color: STATE_COLORS[STATES.FOREST], width: 2 },      // Línea verde oscuro (Bosque)
            { state: STATES.FIRE, color: '#ef4444', width: 2.5 },                        // Línea roja más gruesa (Fuego)
            { state: STATES.ASH, color: STATE_COLORS[STATES.ASH], width: 1.5 },          // Línea gris (Cenizas)
            { state: STATES.EMPTY, color: '#94a3b8', width: 1, dashed: true }            // Línea punteada (Suelo vacío)
        ];

        // --------------------------------------------------------------------------------
        // TRAZADO DE CADA CURVA DE POBLACIÓN
        // --------------------------------------------------------------------------------
        series.forEach(({ state, color, width: lw, dashed }) => {
            ctx.strokeStyle = color;                           // Asignamos el color de la serie
            ctx.lineWidth = lw;                                // Asignamos el grosor de la línea
            ctx.beginPath();                                   // Iniciamos un nuevo trazo

            // Si es la línea punteada de suelo vacío, aplicamos el patrón discontinuo
            if (dashed) {
                ctx.setLineDash([4, 4]);                       // 4 píxeles pintados, 4 vacíos
            } else {
                ctx.setLineDash([]);                           // Línea sólida continua
            }

            // Recorremos los puntos temporales en el historial
            for (let i = 0; i < dataLength; i++) {
                const pt = data[i];                            // Registro de la generación i
                const pct = pt.percentages[state] || 0;        // Porcentaje que tenía este estado
                
                // Mapeamos el índice temporal al eje X
                const x = padding.left + (i / (dataLength - 1)) * plotW;
                // Mapeamos el porcentaje (0 a 100) al eje Y
                const y = padding.top + plotH * (1 - pct / 100);

                // Si es el primer punto iniciamos la línea, si no, conectamos con el anterior
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();                                      // Pintamos la curva completa
        });

        // Restauramos la línea sólida por defecto
        ctx.setLineDash([]);

        // --------------------------------------------------------------------------------
        // ETIQUETAS DE GENERACIÓN EN EL EJE X (Inferior)
        // --------------------------------------------------------------------------------
        ctx.fillStyle = '#94a3b8';                             // Color gris claro
        ctx.font = '10px Inter, monospace';
        
        // Escribimos la generación inicial del rango mostrado (a la izquierda)
        ctx.textAlign = 'left';
        ctx.fillText(`Gen: ${data[0].generation}`, padding.left, height - 8);
        
        // Escribimos la generación final actual (a la derecha)
        ctx.textAlign = 'right';
        ctx.fillText(`Gen: ${data[dataLength - 1].generation}`, width - padding.right, height - 8);
    }
}
