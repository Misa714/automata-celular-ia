/**
 * Cellular Automaton Engine: Wildfire and Ecological Dynamics
 * Modelo de Autómata Celular: Propagación de Incendios Forestales y Regeneración
 * 
 * Estados Finitos:
 *  0: VACÍO / ROCA / CORTAFUEGOS (EMPTY)
 *  1: VEGETACIÓN / PASTIZAL (GRASS)
 *  2: BOSQUE DENSO / MADURO (FOREST)
 *  3: FUEGO / EN LLAMAS (FIRE)
 *  4: CENIZAS / TERRENO QUEMADO (ASH)
 */

export const STATES = {
    EMPTY: 0,
    GRASS: 1,
    FOREST: 2,
    FIRE: 3,
    ASH: 4
};

export const STATE_NAMES = {
    [STATES.EMPTY]: 'Vacío / Roca',
    [STATES.GRASS]: 'Vegetación',
    [STATES.FOREST]: 'Bosque Denso',
    [STATES.FIRE]: 'Fuego',
    [STATES.ASH]: 'Cenizas'
};

export const STATE_COLORS = {
    [STATES.EMPTY]: '#1e293b',   // Pizarra oscura
    [STATES.GRASS]: '#22c55e',   // Verde esmeralda vivo
    [STATES.FOREST]: '#15803d',  // Verde bosque profundo
    [STATES.FIRE]: '#ef4444',    // Rojo-naranja fuego
    [STATES.ASH]: '#64748b'      // Gris ceniza
};

export class CellularAutomaton {
    constructor(width = 100, height = 100) {
        this.width = width;
        this.height = height;
        
        // Matriz de estados principal y secundaria (Double Buffering)
        this.grid = new Uint8Array(width * height);
        this.nextGrid = new Uint8Array(width * height);
        
        // Matriz de contadores de tiempo para cuenta regresiva (Fuego y Cenizas)
        this.timers = new Uint8Array(width * height);
        this.nextTimers = new Uint8Array(width * height);
        
        this.generation = 0;
        this.history = [];
        
        // Parámetros físicos, ambientales y ecológicos
        this.params = {
            // Probabilidades de ignición base
            pIgnitionGrass: 0.58,
            pIgnitionForest: 0.42,
            
            // Factores ambientales
            humidity: 0.20,         // [0.0 - 1.0] Reduce probabilidad de ignición
            windSpeed: 0.50,        // [0.0 - 1.0] Intensidad del viento
            windAngle: 0,           // Grados: 0 = Este, 90 = Sur, 180 = Oeste, 270 = Norte
            
            // Dinámica de combustión y ciclo de vida (en generaciones)
            burnDurationGrass: 1,   // Generaciones de fuego para pastizal
            burnDurationForest: 2,  // Generaciones de fuego para bosque denso
            ashDuration: 4,         // Generaciones que permanecen las cenizas
            
            // Regeneración y evolución
            pRegrowth: 0.005,       // Probabilidad de rebrote en terreno vacío
            pForestMaturation: 0.01,// Probabilidad de que vegetación madure a bosque
            pLightning: 0.00005,    // Chispa espontánea (rayos / sequía extrema)
            
            // Modos de frontera
            toroidal: false         // Bordes continuos (toroide) o fijos (absorbentes)
        };
        
        // Inicializar con escenario por defecto
        this.resetGrid('mixed_forest');
    }

    /**
     * Obtiene el índice lineal para coordenadas (x, y)
     */
    getIndex(x, y) {
        return y * this.width + x;
    }

    /**
     * Obtiene el estado en una celda
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
     * Asigna un estado y configura su temporizador
     */
    setCell(x, y, state) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            const idx = this.getIndex(x, y);
            this.grid[idx] = state;
            
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
     * Aplica una herramienta en un radio determinado (Brush)
     */
    applyBrush(centerX, centerY, radius, state) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
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
     * Trazo continuo interpolado con algoritmo de Bresenham
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
     * Reinicia la matriz con un patrón determinado
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
                for (let i = 0; i < total; i++) {
                    this.grid[i] = Math.random() < 0.85 ? STATES.FOREST : STATES.GRASS;
                }
                this.setCell(Math.floor(this.width / 2), Math.floor(this.height / 2), STATES.FIRE);
                break;

            case 'mixed_forest':
                for (let i = 0; i < total; i++) {
                    const r = Math.random();
                    if (r < 0.50) this.grid[i] = STATES.GRASS;
                    else if (r < 0.85) this.grid[i] = STATES.FOREST;
                    else this.grid[i] = STATES.EMPTY;
                }
                this.setCell(Math.floor(this.width / 2), Math.floor(this.height / 2), STATES.FIRE);
                break;

            case 'firebreak_demo':
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const idx = this.getIndex(x, y);
                        const mid = Math.floor(this.width / 2);
                        if (x >= mid - 2 && x <= mid + 2) {
                            this.grid[idx] = STATES.EMPTY; // Barrera mineral cortafuegos
                        } else {
                            this.grid[idx] = Math.random() < 0.60 ? STATES.GRASS : STATES.FOREST;
                        }
                    }
                }
                const midY = Math.floor(this.height / 2);
                for (let dy = -3; dy <= 3; dy++) {
                    this.setCell(Math.floor(this.width / 6), midY + dy, STATES.FIRE);
                }
                break;

            case 'sparse_plains':
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
     * Calcula el vector de viento normalizado
     */
    getWindVector() {
        const rad = (this.params.windAngle * Math.PI) / 180;
        return {
            x: Math.cos(rad) * this.params.windSpeed,
            y: Math.sin(rad) * this.params.windSpeed
        };
    }

    /**
     * Avanza una generación aplicando las reglas de transición síncronas
     */
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

        // Vecindad de Moore (8 vecinos)
        const neighbors = [
            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy:  0 },                    { dx: 1, dy:  0 },
            { dx: -1, dy:  1 }, { dx: 0, dy:  1 }, { dx: 1, dy:  1 }
        ];

        const w = this.width;
        const h = this.height;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = this.getIndex(x, y);
                const currentState = this.grid[idx];
                const timer = this.timers[idx];

                let nextState = currentState;
                let nextTimer = timer;

                switch (currentState) {
                    case STATES.FIRE: {
                        // Cuenta regresiva de combustión
                        if (timer > 1) {
                            nextState = STATES.FIRE;
                            nextTimer = timer - 1;
                        } else {
                            nextState = STATES.ASH;
                            nextTimer = ashDuration;
                        }
                        break;
                    }

                    case STATES.ASH: {
                        // Cuenta regresiva de enfriamiento y degradación de cenizas
                        if (timer > 1) {
                            nextState = STATES.ASH;
                            nextTimer = timer - 1;
                        } else {
                            nextState = STATES.EMPTY;
                            nextTimer = 0;
                        }
                        break;
                    }

                    case STATES.EMPTY: {
                        // Terreno vacío: posibilidad de rebrote vegetal influenciado por biomasa vecina
                        let seedNeighbors = 0;
                        for (let n of neighbors) {
                            const nx = x + n.dx;
                            const ny = y + n.dy;
                            const neighborState = this.getCell(nx, ny);
                            if (neighborState === STATES.GRASS || neighborState === STATES.FOREST) {
                                seedNeighbors++;
                            }
                        }

                        const effectiveRegrowth = pRegrowth + (seedNeighbors * 0.002);
                        if (Math.random() < effectiveRegrowth) {
                            nextState = STATES.GRASS;
                            nextTimer = 0;
                        }
                        break;
                    }

                    case STATES.GRASS:
                    case STATES.FOREST: {
                        const isForest = (currentState === STATES.FOREST);
                        const baseProb = isForest ? pIgnitionForest : pIgnitionGrass;

                        let fireNeighbors = 0;
                        let windFactorSum = 0;

                        for (let n of neighbors) {
                            const nx = x + n.dx;
                            const ny = y + n.dy;
                            const neighborState = this.getCell(nx, ny);

                            if (neighborState === STATES.FIRE) {
                                fireNeighbors++;

                                // Vector de propagación de calor: desde el vecino hacia la celda evaluada
                                const propX = -n.dx;
                                const propY = -n.dy;
                                const norm = Math.hypot(propX, propY);

                                // Producto escalar con el vector de viento
                                const dot = (propX / norm) * wind.x + (propY / norm) * wind.y;
                                
                                // Ponderación de viento acotada
                                const windMultiplier = Math.max(0.1, 1.0 + dot * 1.5);
                                windFactorSum += windMultiplier;
                            }
                        }

                        let ignites = false;

                        if (fireNeighbors > 0) {
                            const avgWindFactor = windFactorSum / fireNeighbors;
                            
                            // Probabilidad de ignición por vecino ajustada con humedad
                            const pPerNeighbor = Math.min(0.98, Math.max(0.01, 
                                baseProb * avgWindFactor * (1.0 - humidity * 0.75)
                            ));

                            // Probabilidad acumulada: P = 1 - (1 - p)^k
                            const pCatchFire = 1.0 - Math.pow(1.0 - pPerNeighbor, fireNeighbors);

                            if (Math.random() < pCatchFire) {
                                ignites = true;
                            }
                        }

                        // Chispa espontánea (rayo o sequía severa)
                        if (!ignites && pLightning > 0) {
                            const effectiveLightning = pLightning * (1.0 - humidity * 0.9);
                            if (Math.random() < effectiveLightning) {
                                ignites = true;
                            }
                        }

                        if (ignites) {
                            nextState = STATES.FIRE;
                            // El bosque denso arde por más generaciones que el pastizal
                            nextTimer = isForest ? burnDurationForest : burnDurationGrass;
                        } else {
                            // Maduración de vegetación a bosque maduro
                            if (!isForest && Math.random() < pForestMaturation) {
                                nextState = STATES.FOREST;
                                nextTimer = 0;
                            }
                        }
                        break;
                    }
                }

                this.nextGrid[idx] = nextState;
                this.nextTimers[idx] = nextTimer;
            }
        }

        // Intercambio de buffers (Double Buffering)
        const tempGrid = this.grid;
        this.grid = this.nextGrid;
        this.nextGrid = tempGrid;

        const tempTimers = this.timers;
        this.timers = this.nextTimers;
        this.nextTimers = tempTimers;

        this.generation++;
        this.recordStats();
    }

    /**
     * Registra las estadísticas de la generación actual
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
            this.history.shift();
        }

        return stats;
    }

    /**
     * Obtiene las estadísticas más recientes
     */
    getLatestStats() {
        if (this.history.length === 0) {
            return this.recordStats();
        }
        return this.history[this.history.length - 1];
    }

    /**
     * Redimensiona la cuadrícula
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
