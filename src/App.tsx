import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, Square, Dices, StepForward } from 'lucide-react';

const NUM_ROWS = 40;
const NUM_COLS = 60;
const CELL_SIZE = 15;

const operations = [
  [0, 1], [0, -1], [1, -1], [-1, 1],
  [1, 1], [-1, -1], [1, 0], [-1, 0]
];

const generateEmptyGrid = () =>
  Array.from({ length: NUM_ROWS }, () => Array(NUM_COLS).fill(0));

const PRESETS = [
  {
    name: '滑翔机 (Glider)',
    desc: '小型移动模式',
    id: '01',
    data: [
      "010",
      "001",
      "111"
    ]
  },
  {
    name: '脉冲星 (Pulsar)',
    desc: '周期振荡器 (周期3)',
    id: '02',
    data: [
      "0011100011100",
      "0000000000000",
      "1000010100001",
      "1000010100001",
      "1000010100001",
      "0011100011100",
      "0000000000000",
      "0011100011100",
      "1000010100001",
      "1000010100001",
      "1000010100001",
      "0000000000000",
      "0011100011100"
    ]
  },
  {
    name: '高斯帕滑翔机枪',
    desc: '无限生命生成引擎',
    id: '03',
    data: [
      "000000000000000000000000100000000000",
      "000000000000000000000010100000000000",
      "000000000000110000001100000000000011",
      "000000000001000100001100000000000011",
      "110000000010000010001100000000000000",
      "110000000010001011000010100000000000",
      "000000000010000010000000100000000000",
      "000000000001000100000000000000000000",
      "000000000000110000000000000000000000"
    ]
  }
];

interface ActionButtonProps {
  icon?: React.ElementType;
  label: string;
  onClick: () => void;
  primary?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, label, onClick, primary = false }) => (
  <button 
    onClick={onClick}
    className={`w-full py-3 flex items-center justify-center gap-2 uppercase text-xs transition-all active:scale-95 ${
      primary 
      ? 'bg-cyan-600 text-slate-950 font-bold tracking-tighter hover:bg-cyan-400' 
      : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
    }`}
    title={label}
  >
    {Icon && <Icon size={16} strokeWidth={2} />}
    <span>{label}</span>
  </button>
);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<number[][]>(generateEmptyGrid());
  const [running, setRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [speed, setSpeed] = useState(100);
  const [population, setPopulation] = useState(0);

  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const generationRef = useRef(generation);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const isDrawingRef = useRef(false);
  const drawValueRef = useRef(1);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { generationRef.current = generation; }, [generation]);

  const calculatePopulation = (grid: number[][]) => {
    let count = 0;
    for (let i = 0; i < NUM_ROWS; i++) {
        for (let j = 0; j < NUM_COLS; j++) {
            count += grid[i][j];
        }
    }
    return count;
  };

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellW = width / NUM_COLS;
    const cellH = height / NUM_ROWS;

    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#22d3ee'; // cyan-400
    for (let i = 0; i < NUM_ROWS; i++) {
      for (let j = 0; j < NUM_COLS; j++) {
        if (gridRef.current[i][j] === 1) {
          ctx.fillRect(j * cellW, i * cellH, cellW - 1, cellH - 1);
        }
      }
    }
  }, []);

  const handleRandomize = useCallback(() => {
    const newGrid = generateEmptyGrid();
    for (let i = 0; i < NUM_ROWS; i++) {
      for (let j = 0; j < NUM_COLS; j++) {
        newGrid[i][j] = Math.random() > 0.8 ? 1 : 0;
      }
    }
    gridRef.current = newGrid;
    setGeneration(0);
    setPopulation(calculatePopulation(newGrid));
    drawGrid();
  }, [drawGrid]);

  const loadPreset = useCallback((presetData: string[]) => {
    setRunning(false);
    const newGrid = generateEmptyGrid();
    const patternRows = presetData.length;
    const patternCols = presetData[0].length;
    
    // Calculate center offset
    const startRow = Math.floor((NUM_ROWS - patternRows) / 2);
    const startCol = Math.floor((NUM_COLS - patternCols) / 2);

    for (let i = 0; i < patternRows; i++) {
      for (let j = 0; j < patternCols; j++) {
        if (presetData[i][j] === '1') {
          const r = startRow + i;
          const c = startCol + j;
          if (r >= 0 && r < NUM_ROWS && c >= 0 && c < NUM_COLS) {
            newGrid[r][c] = 1;
          }
        }
      }
    }
    
    gridRef.current = newGrid;
    setGeneration(0);
    setPopulation(calculatePopulation(newGrid));
    drawGrid();
  }, [drawGrid]);

  useEffect(() => {
    handleRandomize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runNextGeneration = useCallback(() => {
    let g = gridRef.current;
    let nextG = generateEmptyGrid();
    let newPop = 0;

    for (let i = 0; i < NUM_ROWS; i++) {
      for (let j = 0; j < NUM_COLS; j++) {
        let neighbors = 0;
        for (let k = 0; k < operations.length; k++) {
          const wrapI = (i + operations[k][0] + NUM_ROWS) % NUM_ROWS;
          const wrapJ = (j + operations[k][1] + NUM_COLS) % NUM_COLS;
          neighbors += g[wrapI][wrapJ];
        }

        if (neighbors < 2 || neighbors > 3) {
          nextG[i][j] = 0;
        } else if (g[i][j] === 0 && neighbors === 3) {
          nextG[i][j] = 1;
        } else {
          nextG[i][j] = g[i][j];
        }
        
        newPop += nextG[i][j];
      }
    }

    gridRef.current = nextG;
    drawGrid();
    setGeneration(prev => prev + 1);
    setPopulation(newPop);
  }, [drawGrid]);

  const runSimulation = useCallback(() => {
    if (!runningRef.current) return;
    runNextGeneration();
    timeoutIdRef.current = setTimeout(runSimulation, speedRef.current);
  }, [runNextGeneration]);

  useEffect(() => {
    if (running) {
      if (!timeoutIdRef.current) {
        runSimulation();
      }
    } else {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [running, runSimulation]);

  const getCanvasCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const cellW = canvas.width / NUM_COLS;
    const cellH = canvas.height / NUM_ROWS;

    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    
    if (row >= 0 && row < NUM_ROWS && col >= 0 && col < NUM_COLS) {
        return { row, col };
    }
    return null;
  };

  const setCellValue = (row: number, col: number, value: number) => {
    if (gridRef.current[row][col] !== value) {
      gridRef.current[row][col] = value;
      setPopulation(calculatePopulation(gridRef.current));
      drawGrid();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    
    const isCurrentlyAlive = gridRef.current[coords.row][coords.col] === 1;
    drawValueRef.current = isCurrentlyAlive ? 0 : 1;
    
    setCellValue(coords.row, coords.col, drawValueRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setCellValue(coords.row, coords.col, drawValueRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDrawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleClear = () => {
    gridRef.current = generateEmptyGrid();
    setGeneration(0);
    setPopulation(0);
    setRunning(false);
    drawGrid();
  };

  return (
    <div className="min-h-screen xl:h-screen w-full bg-slate-950 text-slate-300 font-mono flex flex-col xl:overflow-hidden select-none border-8 border-slate-900">
      {/* Header Section */}
      <header className="h-20 shrink-0 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 bg-cyan-500"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-widest uppercase truncate max-w-[200px] sm:max-w-none">康威生命引擎</h1>
            <p className="text-[10px] text-cyan-500/70 tracking-[0.2em] hidden sm:block">细胞自动机模拟 v4.0.2</p>
          </div>
        </div>
        <div className="flex gap-4 sm:gap-12 text-[11px] items-center">
          <div className="flex flex-col">
            <span className="text-slate-500 uppercase">迭代世代</span>
            <span className="text-cyan-400 text-lg">{generation.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 uppercase">存活细胞</span>
            <span className="text-cyan-400 text-lg">{population.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
        {/* Sidebar Left: Controls */}
        <aside className="w-full xl:w-64 shrink-0 border-b xl:border-b-0 xl:border-r border-slate-800 flex flex-col p-4 sm:p-6 space-y-6 sm:space-y-8 bg-slate-950 xl:overflow-y-auto">
          <section>
            <h2 className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">模拟控制</h2>
            <div className="space-y-3">
              <ActionButton 
                icon={running ? Pause : Play} 
                label={running ? "暂停模拟" : "运行模拟"} 
                primary 
                onClick={() => setRunning(!running)} 
              />
              <ActionButton 
                icon={StepForward} 
                label="单步演化" 
                onClick={() => { setRunning(false); runNextGeneration(); }} 
              />
              <ActionButton 
                icon={Dices} 
                label="随机矩阵" 
                onClick={handleRandomize} 
              />
              <ActionButton 
                icon={Square} 
                label="清空矩阵" 
                onClick={handleClear} 
              />
            </div>
          </section>

          <section>
            <h2 className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">运行参数</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span>刷新频率</span>
                  <span className="text-cyan-400">{Math.round(1000 / speed)}Hz</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  step="10" 
                  value={510 - speed} 
                  onChange={(e) => setSpeed(510 - parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 appearance-none accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </section>

          <section className="mt-auto hidden sm:block">
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-sm">
              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                “世界就像是一台计算机。而物理法则就是它的软件。”
              </p>
            </div>
          </section>
        </aside>

        {/* Central Grid Area */}
        <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center p-4 min-h-[300px] xl:min-h-0 xl:overflow-hidden">
          {/* Grid Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#22d3ee 0.5px, transparent 0.5px)', backgroundSize: '16px 16px' }}></div>
          
          <div className="relative border border-cyan-900/50 bg-slate-950 max-w-full overflow-hidden flex shadow-[0_0_20px_rgba(34,211,238,0.1)] mx-auto w-full max-h-full items-center justify-center">
            <canvas
              ref={canvasRef}
              width={NUM_COLS * CELL_SIZE}
              height={NUM_ROWS * CELL_SIZE}
              style={{
                width: '100%',
                maxWidth: NUM_COLS * CELL_SIZE,
                height: 'auto',
                aspectRatio: `${NUM_COLS} / ${NUM_ROWS}`,
                objectFit: 'contain'
              }}
              className="cursor-crosshair touch-none relative z-10 block"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>
          
          {/* Viewport Label */}
          <div className="absolute top-4 left-4 sm:top-8 sm:left-8 text-[10px] text-slate-600 hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span>实时监控 // SECTOR_G4</span>
          </div>
        </div>

        {/* Sidebar Right: Object Library */}
        <aside className="w-full xl:w-64 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-800 flex flex-col p-4 sm:p-6 bg-slate-950 xl:overflow-y-auto">
          <h2 className="text-[10px] text-slate-500 uppercase tracking-widest mb-6">初始状态库</h2>
          <div className="space-y-4">
            {PRESETS.map((preset) => (
              <div 
                key={preset.id}
                onClick={() => loadPreset(preset.data)}
                className="group p-3 border border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-white group-hover:text-cyan-400 transition-colors">{preset.name}</span>
                  <span className="text-[9px] bg-slate-800 px-1 text-slate-400">#{preset.id}</span>
                </div>
                <p className="text-[9px] text-slate-500 italic mb-2">{preset.desc}</p>
                {/* Miniature Preview of the pattern using pure CSS squares, limiting size */}
                <div className="flex flex-col gap-px w-max bg-cyan-900/20 p-1 border border-slate-800 group-hover:border-cyan-500/50">
                  {preset.data.slice(0, Math.min(preset.data.length, 5)).map((row, i) => (
                    <div key={i} className="flex gap-px">
                      {row.split('').slice(0, 10).map((cell, j) => (
                         <div key={j} className={`w-[3px] h-[3px] sm:w-1 sm:h-1 ${cell === '1' ? 'bg-cyan-400' : 'bg-transparent'}`} />
                      ))}
                      {row.length > 10 && <div className="w-[3px] h-[3px] sm:w-1 sm:h-1 bg-transparent" title="..."/>}
                    </div>
                  ))}
                  {preset.data.length > 5 && <div className="text-[8px] text-cyan-500/50 mt-1 leading-none text-center">...</div>}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 sm:h-10 shrink-0 border-t border-slate-800 px-4 sm:px-6 flex items-center justify-between text-[10px] text-slate-500 bg-slate-900">
        <div className="flex gap-4 sm:gap-6 items-center">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> 核心运转正常</span>
          <span className="hidden sm:inline">矩阵坐标: {NUM_ROWS}.{NUM_COLS}.9</span>
        </div>
        <div className="flex gap-4 sm:gap-6 uppercase tracking-widest">
          <span className="hidden sm:inline">会话标识: 49AF-772L</span>
          <span className="text-cyan-500">自动保存：开启</span>
        </div>
      </footer>
    </div>
  );
}

