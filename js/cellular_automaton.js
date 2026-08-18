/**
 * ========================================================================================
 * MOTOR DE SIMULACIÓN DEL AUTÓMATA CELULAR (Cellular Automaton Engine)
 * Temática: Propagación de Incendios Forestales y Dinámica Ecológica
 * Asignatura: Inteligencia Artificial
 * ========================================================================================
 * 
 * Este archivo contiene la lógica matemática y matricial del autómata celular.
 * No maneja gráficos ni botones; solo calcula cómo cambian las celdas generación tras generación.
 */

// ========================================================================================
// 1. DEFINICIÓN DE LOS 5 ESTADOS FINITOS
// ========================================================================================
// Cada celda de la cuadrícula almacena un número entero del 0 al 4:
export const STATES = {
    EMPTY: 0,   // Terreno Vacío / Roca / Cortafuegos mineral (no combustible)
    GRASS: 1,   // Vegetación ligera / Pastizal (combustible rápido)
    FOREST: 2,  // Bosque Maduro / Denso (alta biomasa, tarda más en quemarse)
    FIRE: 3,    // Fuego Activo (en combustión, emite calor a sus 8 vecinos)
    ASH: 4      // Cenizas / Terreno Quemado (enfriándose antes de volver a ser suelo)
};

// Nombres descriptivos para la interfaz de usuario
export const STATE_NAMES = {
    [STATES.EMPTY]: 'Vacío / Roca',
    [STATES.GRASS]: 'Vegetación',
    [STATES.FOREST]: 'Bosque Denso',
    [STATES.FIRE]: 'Fuego',
    [STATES.ASH]: 'Cenizas'
};

// Códigos de color hexadecimal para la visualización
export const STATE_COLORS = {
    [STATES.EMPTY]: '#1e293b',   // Pizarra oscura (mineral inerte)
    [STATES.GRASS]: '#22c55e',   // Verde vivo (pasto/arbusto)
    [STATES.FOREST]: '#15803d',  // Verde bosque profundo (árboles maduros)
    [STATES.FIRE]: '#ef4444',    // Rojo-naranja fuego
    [STATES.ASH]: '#64748b'      // Gris ceniza
};

// ========================================================================================
// 2. CLASE PRINCIPAL: CellularAutomaton
// ========================================================================================
export class CellularAutomaton {
    constructor(width = 100, height = 100) {
        this.width = width;    // Número de columnas de la cuadrícula
        this.height = height;  // Número de filas de la cuadrícula
        
        // --------------------------------------------------------------------------------
        // ¿Por qué usamos Uint8Array? (Eficiencia de Memoria)
        // En lugar de matrices lentas de JavaScript, usamos arreglos tipados continuos.
        // Cada celda ocupa exactamente 1 byte (0 a 255) en memoria RAM.
        // Para acceder a la celda (x, y), convertimos las 2 coordenadas a 1 índice lineal:
        // índice = (y * ancho) + x
        // --------------------------------------------------------------------------------

        // TÉCNICA DE DOUBLE BUFFERING (Doble Búfer Matricial):
        // 1. this.grid: Matriz de LECTURA (Foto del presente - Generación t)
        // 2. this.nextGrid: Matriz de ESCRITURA (Calculando el futuro - Generación t + 1)
        this.grid = new Uint8Array(width * height);
        this.nextGrid = new Uint8Array(width * height);
        
        // Temporizadores para saber cuánto tiempo lleva una celda ardiendo o en cenizas
        this.timers = new Uint8Array(width * height);
        this.nextTimers = new Uint8Array(width * height);
        
        this.generation = 0; // Contador de pasos temporales
        this.history = [];    // Historial para las gráficas estadísticas
        
        // --------------------------------------------------------------------------------
        // PARÁMETROS FÍSICOS Y AMBIENTALES
        // --------------------------------------------------------------------------------
        this.params = {
            // Probabilidad base de que una celda prenda fuego si tiene un vecino ardiendo:
            pIgnitionGrass: 0.58,   // 58% para pasto (más fácil de encender)
            pIgnitionForest: 0.42,  // 42% para bosque (más resistente a la chispa inicial)
            
            // Factores climáticos:
            humidity: 0.20,         // Humedad [0.0 = Sequía total, 1.0 = Muy húmedo]
            windSpeed: 0.50,        // Intensidad del viento [0.0 = Calma, 1.0 = Huracán]
            windAngle: 0,           // Dirección en grados (0°=Este, 90°=Sur, 180°=Oeste, 270°=Norte)
            
            // Ciclo de vida y duración (en número de generaciones):
            burnDurationGrass: 1,   // El pasto se consume en 1 generación
            burnDurationForest: 2,  // El bosque denso arde durante 2 generaciones
            ashDuration: 4,         // La ceniza tarda 4 generaciones en enfriarse y desaparecer
            
            // Dinámica ecológica:
            pRegrowth: 0.005,       // Probabilidad de que nazca pasto en suelo vacío (0.5%)
            pForestMaturation: 0.01,// Probabilidad de que el pasto crezca a bosque maduro (1%)
            pLightning: 0.00005,    // Probabilidad de chispa espontánea (rayo o sequía)
            
            toroidal: false         // Bordes fijos (no atraviesa paredes)
        };
        
        // Iniciar con el bosque mixto por defecto
        this.resetGrid('mixed_forest');
    }

    /**
     * Convierte coordenadas 2D (x, y) a un índice lineal 1D para el arreglo Uint8Array
     * Ejemplo: en una cuadrícula de 10x10, la celda (x=3, y=2) está en el índice (2 * 10) + 3 = 23
     */
    getIndex(x, y) {
        return y * this.width + x;
    }

    /**
     * Consulta segura del estado de una celda.
     * Si las coordenadas se salen del mapa, devuelve VACÍO (0) para evitar errores.
     */
    getCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            if (this.params.toroidal) {
                x = ((x % this.width) + this.width) % this.width;
                y = ((y % this.height) + this.height) % this.height;
            } else {
                return STATES.EMPTY;
            }
        }
        return this.grid[this.getIndex(x, y)];
    }

    /**
     * Asigna un estado a una celda y reinicia su temporizador
     */
    setCell(x, y, state) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            const idx = this.getIndex(x, y);
            this.grid[idx] = state;
            
            // Asignar el tiempo de vida correspondiente al estado
            if (state === STATES.FIRE) {
                this.timers[idx] = this.params.burnDurationGrass;
            } else if (state === STATES.ASH) {
                this.timers[idx] = this.params.ashDuration;
            } else {
                this.timers[idx] = 0;
            }
        }
    }

    /**
     * Aplica el pincel circular con el mouse (para pintar fuego, árboles o cortafuegos)
     */
    applyBrush(centerX, centerY, radius, state) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Fórmula del círculo: dx^2 + dy^2 <= r^2
                if (dx * dx + dy * dy <= radius * radius) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        this.setCell(x, y, state);
                    }
                }
            }
        }
    }

    /**
     * Algoritmo de Líneas de Bresenham:
     * Si el usuario mueve el ratón muy rápido, une los puntos intermedios
     * para que las líneas de cortafuegos queden continuas y sin huecos.
     */
    applyBrushLine(x0, y0, x1, y1, radius, state) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        let currX = x0;
        let currY = y0;

        while (true) {
            this.applyBrush(currX, currY, radius, state);
            if (currX === x1 && currY === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currX += sx;
            }
            if (e2 < dx) {
                err += dx;
                currY += sy;
            }
        }
    }

    /**
     * Inicializa la cuadrícula con un escenario preconfigurado (Preset)
     */
    resetGrid(pattern = 'mixed_forest') {
        this.generation = 0;
        this.history = [];
        this.grid.fill(STATES.EMPTY);
        this.nextGrid.fill(STATES.EMPTY);
        this.timers.fill(0);
        this.nextTimers.fill(0);

        const total = this.width * this.height;

        switch (pattern) {
            case 'dense_forest':
                // 85% Bosque maduro, 15% Pasto
                for (let i = 0; i < total; i++) {
                    this.grid[i] = Math.random() < 0.85 ? STATES.FOREST : STATES.GRASS;
                }
                // Foco de fuego inicial en el centro
                this.setCell(Math.floor(this.width / 2), Math.floor(this.height / 2), STATES.FIRE);
                break;

            case 'mixed_forest':
                // 50% Pasto, 35% Bosque, 15% Vacío
                for (let i = 0; i < total; i++) {
                    const r = Math.random();
                    if (r < 0.50) this.grid[i] = STATES.GRASS;
                    else if (r < 0.85) this.grid[i] = STATES.FOREST;
                    else this.grid[i] = STATES.EMPTY;
                }
                // Foco de fuego inicial en el centro
                this.setCell(Math.floor(this.width / 2), Math.floor(this.height / 2), STATES.FIRE);
                break;

            case 'firebreak_demo':
                // Bosque con una franja cortafuegos vertical en el centro (x = width/2)
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const idx = this.getIndex(x, y);
                        const mid = Math.floor(this.width / 2);
                        if (x >= mid - 2 && x <= mid + 2) {
                            this.grid[idx] = STATES.EMPTY; // Barrera mineral (cortafuegos)
                        } else {
                            this.grid[idx] = Math.random() < 0.60 ? STATES.GRASS : STATES.FOREST;
                        }
                    }
                }
                // Fuego iniciado en el flanco izquierdo
                const midY = Math.floor(this.height / 2);
                for (let dy = -3; dy <= 3; dy++) {
                    this.setCell(Math.floor(this.width / 6), midY + dy, STATES.FIRE);
                }
                break;

            case 'sparse_plains':
                // Pradera dispersa
                for (let i = 0; i < total; i++) {
                    const r = Math.random();
                    if (r < 0.40) this.grid[i] = STATES.GRASS;
                    else if (r < 0.50) this.grid[i] = STATES.FOREST;
                    else this.grid[i] = STATES.EMPTY;
                }
                this.setCell(Math.floor(this.width / 2), Math.floor(this.height / 2), STATES.FIRE);
                break;

            case 'empty':
            default:
                this.grid.fill(STATES.EMPTY);
                break;
        }

        this.recordStats();
    }

    /**
     * Calcula el vector de viento (dx, dy) usando trigonometría a partir del ángulo y velocidad
     */
    getWindVector() {
        const rad = (this.params.windAngle * Math.PI) / 180;
        return {
            x: Math.cos(rad) * this.params.windSpeed,
            y: Math.sin(rad) * this.params.windSpeed
        };
    }

    // ====================================================================================
    // 3. EL CORAZÓN DEL AUTÓMATA: MÉTODO step()
    // Aplica las reglas locales de transición simultáneamente a todas las celdas
    // ====================================================================================
    step() {
        const wind = this.getWindVector();
        const {
            pIgnitionGrass,
            pIgnitionForest,
            humidity,
            burnDurationGrass,
            burnDurationForest,
            ashDuration,
            pRegrowth,
            pForestMaturation,
            pLightning
        } = this.params;

        // VECINDAD DE MOORE (Las 8 celdas adyacentes: horizontales, verticales y diagonales)
        const neighbors = [
            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy:  0 },                    { dx: 1, dy:  0 },
            { dx: -1, dy:  1 }, { dx: 0, dy:  1 }, { dx: 1, dy:  1 }
        ];

        const w = this.width;
        const h = this.height;

        // Recorremos la cuadrícula celda por celda:
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = this.getIndex(x, y);
                const currentState = this.grid[idx]; // Estado actual en generación t
                const timer = this.timers[idx];

                let nextState = currentState;
                let nextTimer = timer;

                switch (currentState) {

                    // --------------------------------------------------------------------
                    // CASO A: LA CELDA ESTÁ ARDIENDO (ESTADO 3: FIRE)
                    // --------------------------------------------------------------------
                    case STATES.FIRE: {
                        // Si aún le queda tiempo de combustión, sigue ardiendo
                        if (timer > 1) {
                            nextState = STATES.FIRE;
                            nextTimer = timer - 1;
                        } else {
                            // Cuando se le acaba el combustible, se convierte en CENIZAS
                            nextState = STATES.ASH;
                            nextTimer = ashDuration; // Comienza cuenta regresiva de enfriamiento
                        }
                        break;
                    }

                    // --------------------------------------------------------------------
                    // CASO B: LA CELDA ES CENIZA (ESTADO 4: ASH)
                    // --------------------------------------------------------------------
                    case STATES.ASH: {
                        // Las cenizas se van enfriando poco a poco
                        if (timer > 1) {
                            nextState = STATES.ASH;
                            nextTimer = timer - 1;
                        } else {
                            // Cuando se enfrían por completo, el suelo queda VACÍO y fértil
                            nextState = STATES.EMPTY;
                            nextTimer = 0;
                        }
                        break;
                    }

                    // --------------------------------------------------------------------
                    // CASO C: TERRENO VACÍO (ESTADO 0: EMPTY)
                    // --------------------------------------------------------------------
                    case STATES.EMPTY: {
                        // Contamos cuántas plantas o árboles hay alrededor para simular semillas
                        let seedNeighbors = 0;
                        for (let n of neighbors) {
                            const nx = x + n.dx;
                            const ny = y + n.dy;
                            const neighborState = this.getCell(nx, ny);
                            if (neighborState === STATES.GRASS || neighborState === STATES.FOREST) {
                                seedNeighbors++;
                            }
                        }

                        // Probabilidad de que rebrote vegetación:
                        // P_rebrote_efectivo = P_base + (vecinos_con_vegetacion * bono_semilla)
                        const effectiveRegrowth = pRegrowth + (seedNeighbors * 0.002);
                        if (Math.random() < effectiveRegrowth) {
                            nextState = STATES.GRASS; // Nace pasto nuevo
                            nextTimer = 0;
                        }
                        break;
                    }

                    // --------------------------------------------------------------------
                    // CASO D: CELDA VIVA (ESTADO 1: GRASS ó ESTADO 2: FOREST)
                    // --------------------------------------------------------------------
                    case STATES.GRASS:
                    case STATES.FOREST: {
                        const isForest = (currentState === STATES.FOREST);
                        const baseProb = isForest ? pIgnitionForest : pIgnitionGrass;

                        let fireNeighbors = 0;
                        let windFactorSum = 0;

                        // Revisamos los 8 vecinos de Moore para ver si alguno está en fuego:
                        for (let n of neighbors) {
                            const nx = x + n.dx;
                            const ny = y + n.dy;
                            const neighborState = this.getCell(nx, ny);

                            if (neighborState === STATES.FIRE) {
                                fireNeighbors++;

                                // Vector de dirección: desde el vecino ardiendo hacia mi celda
                                const propX = -n.dx;
                                const propY = -n.dy;
                                const norm = Math.hypot(propX, propY);

                                // PRODUCTO PUNTO (Álgebra vectorial con el viento):
                                // dot = (dirección_calor) • (dirección_viento)
                                const dot = (propX / norm) * wind.x + (propY / norm) * wind.y;
                                
                                // Si el viento empuja el fuego hacia mí: multiplicador > 1.0 (se acelera)
                                // Si el viento aleja el fuego: multiplicador < 1.0 (se frena)
                                const windMultiplier = Math.max(0.1, 1.0 + dot * 1.5);
                                windFactorSum += windMultiplier;
                            }
                        }

                        let ignites = false;

                        // Si hay vecinos ardiendo, calculamos la probabilidad acumulada:
                        if (fireNeighbors > 0) {
                            const avgWindFactor = windFactorSum / fireNeighbors;
                            
                            // Probabilidad por vecino ajustada con el viento y amortiguada por la humedad:
                            const pPerNeighbor = Math.min(0.98, Math.max(0.01, 
                                baseProb * avgWindFactor * (1.0 - humidity * 0.75)
                            ));

                            // FÓRMULA DE PROBABILIDAD ACUMULADA:
                            // P_total = 1 - (1 - p)^k (probabilidad de que al menos 1 vecino me prenda fuego)
                            const pCatchFire = 1.0 - Math.pow(1.0 - pPerNeighbor, fireNeighbors);

                            if (Math.random() < pCatchFire) {
                                ignites = true;
                            }
                        }

                        // Chispa espontánea (rayo o sequía severa, independiente de vecinos)
                        if (!ignites && pLightning > 0) {
                            const effectiveLightning = pLightning * (1.0 - humidity * 0.9);
                            if (Math.random() < effectiveLightning) {
                                ignites = true;
                            }
                        }

                        if (ignites) {
                            // ¡LA CELDA SE PRENDE FUEGO!
                            nextState = STATES.FIRE;
                            // El bosque denso arde por más generaciones (2) que el pastizal (1)
                            nextTimer = isForest ? burnDurationForest : burnDurationGrass;
                        } else {
                            // Si no se quema y es pasto, tiene una pequeña probabilidad de madurar a bosque denso:
                            if (!isForest && Math.random() < pForestMaturation) {
                                nextState = STATES.FOREST;
                                nextTimer = 0;
                            }
                        }
                        break;
                    }
                }

                // Guardamos el nuevo estado en la matriz del futuro (nextGrid)
                this.nextGrid[idx] = nextState;
                this.nextTimers[idx] = nextTimer;
            }
        }

        // --------------------------------------------------------------------------------
        // PASO FINAL: INTERCAMBIO DE BÚFERES (DOUBLE BUFFERING)
        // El futuro calculado pasa a ser el presente de la siguiente generación.
        // Tiempo de ejecución: O(1) instantáneo (solo se cambian los punteros de memoria).
        // --------------------------------------------------------------------------------
        const tempGrid = this.grid;
        this.grid = this.nextGrid;
        this.nextGrid = tempGrid;

        const tempTimers = this.timers;
        this.timers = this.nextTimers;
        this.nextTimers = tempTimers;

        this.generation++; // Avanzamos 1 generación
        this.recordStats(); // Actualizamos las estadísticas
    }

    /**
     * Cuenta cuántas celdas hay de cada estado para actualizar los contadores y las gráficas
     */
    recordStats() {
        const counts = {
            [STATES.EMPTY]: 0,
            [STATES.GRASS]: 0,
            [STATES.FOREST]: 0,
            [STATES.FIRE]: 0,
            [STATES.ASH]: 0
        };

        const total = this.width * this.height;
        for (let i = 0; i < total; i++) {
            counts[this.grid[i]]++;
        }

        const stats = {
            generation: this.generation,
            counts: counts,
            percentages: {
                [STATES.EMPTY]: (counts[STATES.EMPTY] / total) * 100,
                [STATES.GRASS]: (counts[STATES.GRASS] / total) * 100,
                [STATES.FOREST]: (counts[STATES.FOREST] / total) * 100,
                [STATES.FIRE]: (counts[STATES.FIRE] / total) * 100,
                [STATES.ASH]: (counts[STATES.ASH] / total) * 100
            },
            totalBiomass: counts[STATES.GRASS] + counts[STATES.FOREST],
            hasActiveFire: counts[STATES.FIRE] > 0
        };

        this.history.push(stats);
        if (this.history.length > 500) {
            this.history.shift(); // Mantener un máximo de 500 puntos para no saturar memoria
        }

        return stats;
    }

    /**
     * Obtiene el último registro de estadísticas
     */
    getLatestStats() {
        if (this.history.length === 0) {
            return this.recordStats();
        }
        return this.history[this.history.length - 1];
    }

    /**
     * Redimensiona la cuadrícula de forma segura
     */
    resize(newWidth, newHeight) {
        this.width = newWidth;
        this.height = newHeight;
        this.grid = new Uint8Array(newWidth * newHeight);
        this.nextGrid = new Uint8Array(newWidth * newHeight);
        this.timers = new Uint8Array(newWidth * newHeight);
        this.nextTimers = new Uint8Array(newWidth * newHeight);
        this.resetGrid('mixed_forest');
    }
}
