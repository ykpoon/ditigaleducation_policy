/**
 * 倉頡打字太空射擊遊戲 - 戰機重置美化版 (Complete Local Version)
 * 特色：
 * 1. 100% 純前端，排行榜使用 LocalStorage。
 * 2. 移除底部緩衝欄，改為緊跟在戰機下方的「霓虹浮動指示器」。
 * 3. 速度精細調校：第一關保持高速（1.95），【優化】第三關大幅調慢（1.5）讓玩家有足夠時間拆解 4-5 碼複雜字。
 * 4. 10字通關：每關擊破 10 個隕石立刻進入 Level Up 動態橫幅，並完美通關！
 * 5. 實體圓形護盾罩：滿狀態厚實，受損時護盾動態變薄（Thin）並由青轉紅。
 * 6. 【全新】立體背景流星雨： Canvas 背景偶爾跌落帶有等離子尾焰的半透明流星，增加刺激感且不影響視線！
 */

// --- 1. 三關字庫設定 (第三關已調慢，確保拆碼時間) ---
const LEVEL_DATA = {
    1: {
        title: "第一關：倉頡基本字根",
        description: "單一按鍵，熟記鍵盤與字根配對！",
        speed: 1.95, // 第一關極速挑戰
        spawnInterval: 1900, 
        words: [
            { char: "日", code: "A" }, { char: "月", code: "B" }, { char: "金", code: "C" },
            { char: "木", code: "D" }, { char: "水", code: "E" }, { char: "火", code: "F" },
            { char: "土", code: "G" }, { char: "竹", code: "H" }, { char: "戈", code: "I" },
            { char: "十", code: "J" }, { char: "大", code: "K" }, { char: "中", code: "L" },
            { char: "一", code: "M" }, { char: "弓", code: "N" }, { char: "人", code: "O" },
            { char: "心", code: "P" }, { char: "手", code: "Q" }, { char: "口", code: "R" },
            { char: "尸", code: "S" }, { char: "廿", code: "T" }, { char: "山", code: "U" },
            { char: "女", code: "V" }, { char: "田", code: "W" }, { char: "卜", code: "Y" }
        ]
    },
    2: {
        title: "第二關：常用合體字",
        description: "輸入 2 至 3 碼的常用合體連體字！",
        speed: 2.3, 
        spawnInterval: 2600,
        words: [
            { char: "明", code: "AB" },  // 日 + 月
            { char: "林", code: "DD" },  // 木 + 木
            { char: "因", code: "WK" },  // 田 + 大
            { char: "目", code: "BU" },  // 月 + 山
            { char: "天", code: "MK" },  // 一 + 大
            { char: "門", code: "AN" },  // 日 + 弓
            { char: "和", code: "HR" },  // 竹 + 口
            { char: "車", code: "JWJ" }, // 十 + 田 + 十
            { char: "早", code: "AM" },  // 日 + 一
            { char: "晶", code: "AAA" }, // 日 + 日 + 日
            { char: "森", code: "DDD" }, // 木 + 木 + 木
            { char: "里", code: "WG" },  // 田 + 土
            { char: "估", code: "OR" },  // 人 + 口
            { char: "休", code: "OD" },  // 人 + 木
            { char: "叭", code: "RC" },  // 口 + 金
            { char: "打", code: "QG" },  // 手 + 土
            { char: "江", code: "EQ" },  // 水 + 手
            { char: "炎", code: "FF" },  // 火 + 火
            { char: "卡", code: "YMY" }, // 卜 + 一 + 卜
            { char: "古", code: "JR" }   // 十 + 口
        ]
    },
    3: {
        title: "第三關：高難度手冊挑戰",
        description: "挑戰學習冊中 4 至 5 碼的複雜分體字！",
        speed: 1.5, // 【優化】第三關速度降低至 1.5（從 2.8 大幅調慢），給予充足時間思考拆碼！
        spawnInterval: 4200, // 生成間隔同步放寬，避免單字過度擁擠
        words: [
            { char: "你", code: "ONF" },    // 人 弓 火
            { char: "語", code: "YRMR" },   // 卜 口 一 口
            { char: "愛", code: "BPHE" },   // 月 心 竹 水
            { char: "謝", code: "YRHDI" },  // 卜 口 竹 木 戈
            { char: "熱", code: "GIGF" },   // 土 戈 土 火
            { char: "矮", code: "OKHDV" }   // 人 大 竹 木 女
        ]
    }
};

const CANGJIE_ALPHABET = {
    'A': '日', 'B': '月', 'C': '金', 'D': '木', 'E': '水', 'F': '火', 'G': '土',
    'H': '竹', 'I': '戈', 'J': '十', 'K': '大', 'L': '中', 'M': '一', 'N': '弓',
    'O': '人', 'P': '心', 'Q': '手', 'R': '口', 'S': '尸', 'T': '廿', 'U': '山',
    'V': '女', 'W': '田', 'Y': '卜'
};

// --- 2. AUDIO SYNTHESIZER (Web Audio API 原生即時合成) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playLaserSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function playExplosionSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 0.3; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; 
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseSource.start();
    noiseSource.stop(audioCtx.currentTime + 0.3);
}

function playErrorSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
}

function playLevelUpSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + idx * 0.08);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.08 + 0.25);
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 0.25);
    });
}

// --- 3. 遊戲狀態控制 ---
const state = {
    playerName: "",
    className: "",
    score: 0,
    combo: 0,
    shield: 100,
    currentLevel: 1,
    activeEnemies: [],
    inputBuffer: [],
    keystrokesCount: 0,
    correctKeystrokesCount: 0,
    wordsDestroyedInLevel: 0, 
    particles: [],            // 爆炸粒子
    bgAsteroids: [],          // 【全新】背景純裝飾流星陣列
    gameLoopId: null,
    spawnIntervalId: null,
    isPlaying: false
};

const dom = {
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    endScreen: document.getElementById('end-screen'),
    startForm: document.getElementById('start-form'),
    playerName: document.getElementById('player-name'),
    className: document.getElementById('class-name'),
    startLevel: document.getElementById('start-level'),
    hudPlayer: document.getElementById('hud-player'),
    hudScore: document.getElementById('hud-score'),
    hudCombo: document.getElementById('hud-combo'),
    hudShieldPct: document.getElementById('hud-shield-pct'),
    hudLevel: document.getElementById('hud-level'),
    gameArea: document.getElementById('game-area'),
    playerShip: document.getElementById('player-ship'),
    shipShield: document.getElementById('ship-shield'),
    floatingBadge: document.getElementById('floating-input-badge'),
    laserCanvas: document.getElementById('laser-canvas'),
    endTitle: document.getElementById('end-title'),
    endScore: document.getElementById('end-score'),
    endAccuracy: document.getElementById('end-accuracy'),
    endLevel: document.getElementById('end-level'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    restartBtn: document.getElementById('restart-btn')
};

const ctx = dom.laserCanvas.getContext('2d');
function resizeCanvas() {
    dom.laserCanvas.width = dom.gameArea.clientWidth;
    dom.laserCanvas.height = dom.gameArea.clientHeight;
}
window.addEventListener('resize', resizeCanvas);


// --- 4. 鍵盤輸入事件與動態匹配 ---
dom.startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.playerName = dom.playerName.value.trim();
    state.className = dom.className.value.trim().toUpperCase();
    state.currentLevel = parseInt(dom.startLevel.value);
    
    dom.startScreen.classList.add('opacity-0');
    setTimeout(() => {
        dom.startScreen.classList.add('hidden');
        dom.gameScreen.classList.remove('hidden');
        resizeCanvas();
        startGame();
    }, 500);
});

dom.restartBtn.addEventListener('click', () => {
    dom.endScreen.classList.add('hidden');
    dom.startScreen.classList.remove('hidden');
    dom.startScreen.classList.remove('opacity-0');
    resetGameState();
});

window.addEventListener('keydown', (e) => {
    if (!state.isPlaying) return;
    
    const key = e.key.toUpperCase();
    
    if (e.key === 'Backspace') {
        state.inputBuffer.pop();
        updateFloatingInputUI();
        reEvaluateMatching();
        return;
    }
    
    if (key.length !== 1 || key < 'A' || key > 'Z') return;

    state.keystrokesCount++;
    state.inputBuffer.push(key);
    
    reEvaluateMatching();
});

function reEvaluateMatching() {
    const typedStr = state.inputBuffer.join('');
    let matchFound = false;
    let completeMatch = null;

    for (let enemy of state.activeEnemies) {
        if (enemy.code.startsWith(typedStr)) {
            matchFound = true;
            enemy.highlightedIdx = typedStr.length; 
            updateEnemyUI(enemy);
            
            if (enemy.code === typedStr) {
                completeMatch = enemy;
                break;
            }
        } else {
            enemy.highlightedIdx = 0;
            updateEnemyUI(enemy);
        }
    }

    if (completeMatch) {
        state.correctKeystrokesCount += completeMatch.code.length;
        shootLaserAt(completeMatch);
        destroyEnemy(completeMatch);
        state.inputBuffer = []; 
    } else if (matchFound) {
        state.correctKeystrokesCount++;
        playLaserSound();
    } else {
        playErrorSound();
        state.combo = 0;
        dom.hudCombo.textContent = state.combo;
        state.inputBuffer = [];
        state.activeEnemies.forEach(e => { e.highlightedIdx = 0; updateEnemyUI(e); });
    }
    
    updateFloatingInputUI();
}

function updateFloatingInputUI() {
    if (state.inputBuffer.length === 0) {
        dom.floatingBadge.textContent = "WAITING...";
        dom.floatingBadge.className = "mt-4 bg-slate-900/90 border border-slate-700 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-slate-400 shadow-none whitespace-nowrap min-w-[80px] text-center transition-all";
        return;
    }
    
    const chCodes = state.inputBuffer.map(k => CANGJIE_ALPHABET[k] || k).join(' ');
    const engCodes = state.inputBuffer.join('');
    
    dom.floatingBadge.textContent = `${chCodes} (${engCodes})`;
    dom.floatingBadge.className = "mt-4 bg-slate-900 border-2 border-cyan-400 px-3 py-1 rounded-full text-xs font-mono font-bold text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] scale-110 whitespace-nowrap min-w-[100px] text-center transition-all";
}


// --- 5. 遊戲主循環與過關判定 ---
function resetGameState() {
    state.score = 0;
    state.combo = 0;
    state.shield = 100;
    state.wordsDestroyedInLevel = 0; 
    state.activeEnemies.forEach(e => e.el.remove());
    state.activeEnemies = [];
    state.inputBuffer = [];
    state.particles = []; 
    state.bgAsteroids = []; // 清空背景流星
    state.keystrokesCount = 0;
    state.correctKeystrokesCount = 0;
    ctx.clearRect(0, 0, dom.laserCanvas.width, dom.laserCanvas.height);
}

function startGame() {
    resetGameState();
    state.isPlaying = true;
    
    dom.hudPlayer.textContent = `${state.className} - ${state.playerName}`;
    dom.hudScore.textContent = state.score;
    dom.hudCombo.textContent = state.combo;
    updateShieldVisuals();
    dom.hudLevel.textContent = LEVEL_DATA[state.currentLevel].title;
    
    playLevelUpSound();
    
    state.gameLoopId = requestAnimationFrame(gameUpdate);
    startEnemySpawner();
    updateFloatingInputUI();
}

function startEnemySpawner() {
    if (state.spawnIntervalId) clearInterval(state.spawnIntervalId);
    const config = LEVEL_DATA[state.currentLevel];
    state.spawnIntervalId = setInterval(() => {
        if (!state.isPlaying) return;
        spawnEnemy();
    }, config.spawnInterval);
}

function spawnEnemy() {
    const config = LEVEL_DATA[state.currentLevel];
    const randomWord = config.words[Math.floor(Math.random() * config.words.length)];
    
    const enemyEl = document.createElement('div');
    enemyEl.className = 'absolute flex flex-col items-center z-10 select-none';
    
    const spawnWidth = dom.gameArea.clientWidth - 100;
    const leftPos = Math.max(20, Math.random() * spawnWidth);
    enemyEl.style.left = `${leftPos}px`;
    enemyEl.style.top = `-80px`;
    
    const bubble = document.createElement('div');
    bubble.className = 'enemy-glowing w-16 h-16 rounded-full bg-slate-900/95 flex items-center justify-center text-3xl font-extrabold border-2 border-red-500/80 text-white select-none shadow-lg cursor-default';
    bubble.textContent = randomWord.char;
    enemyEl.appendChild(bubble);
    
    const hintBar = document.createElement('div');
    hintBar.className = 'mt-1 bg-slate-950/90 border border-slate-800 rounded-md px-2 py-0.5 flex gap-1 justify-center min-w-[70px] shadow-md';
    
    for (let i = 0; i < randomWord.code.length; i++) {
        const span = document.createElement('span');
        span.className = 'text-xs font-mono text-slate-500 transition-colors duration-150';
        span.textContent = `${CANGJIE_ALPHABET[randomWord.code[i]]}(${randomWord.code[i]})`;
        hintBar.appendChild(span);
    }
    enemyEl.appendChild(hintBar);
    dom.gameArea.appendChild(enemyEl);
    
    state.activeEnemies.push({
        el: enemyEl,
        hintBar: hintBar,
        char: randomWord.char,
        code: randomWord.code,
        x: leftPos + 32,
        y: -40,
        speed: config.speed + (Math.random() * 0.4 - 0.2), 
        highlightedIdx: 0
    });
}

function updateEnemyUI(enemy) {
    const spans = enemy.hintBar.querySelectorAll('span');
    spans.forEach((span, idx) => {
        if (idx < enemy.highlightedIdx) {
            span.className = 'text-xs font-mono text-cyan-400 font-black';
        } else {
            span.className = 'text-xs font-mono text-slate-500';
        }
    });
}

// 物理降落與畫面更新 (100% 統一 Canvas 渲染管線)
function gameUpdate() {
    if (!state.isPlaying) return;
    
    const limitY = dom.gameArea.clientHeight - 130; 
    
    // 1. 更新文字隕石位置
    for (let i = state.activeEnemies.length - 1; i >= 0; i--) {
        const enemy = state.activeEnemies[i];
        enemy.y += enemy.speed;
        enemy.el.style.top = `${enemy.y}px`;
        
        if (enemy.y >= limitY) {
            triggerShieldDamage();
            enemy.el.remove();
            state.activeEnemies.splice(i, 1);
            state.combo = 0;
            dom.hudCombo.textContent = state.combo;
        }
    }
    
    // 2. 【全新】以極低機率產生背景裝飾流星 (流星雨效果)
    if (Math.random() < 0.04) {
        spawnBgAsteroid();
    }
    
    // 3. 畫布清空
    ctx.clearRect(0, 0, dom.laserCanvas.width, dom.laserCanvas.height);

    // 4. 【全新】率先繪製背景流星 (確保其位於鐳射與爆炸的最底層)
    updateAndDrawBgAsteroids();

    // 5. 繪製雷射軌跡
    drawLasers();

    // 6. 繪製爆炸碎片粒子
    updateAndDrawParticles();
    
    state.gameLoopId = requestAnimationFrame(gameUpdate);
}

// --- 【全新功能】背景裝飾流星系統 ---
function spawnBgAsteroid() {
    state.bgAsteroids.push({
        x: Math.random() * dom.laserCanvas.width,
        y: -50,
        vy: Math.random() * 6 + 6,       // 下落速度極快，營造前進速度感 (6 ~ 12px)
        vx: (Math.random() - 0.3) * 1.5, // 帶有一點點斜飄角度
        size: Math.random() * 6 + 3,     // 大小 3 ~ 9px
        color: ['rgba(244, 63, 94, 0.25)', 'rgba(249, 115, 22, 0.25)', 'rgba(100, 116, 139, 0.2)'][Math.floor(Math.random() * 3)] // 半透明深空色
    });
}

function updateAndDrawBgAsteroids() {
    for (let i = state.bgAsteroids.length - 1; i >= 0; i--) {
        const ast = state.bgAsteroids[i];
        ast.x += ast.vx;
        ast.y += ast.vy;
        
        if (ast.y > dom.laserCanvas.height + 50) {
            state.bgAsteroids.splice(i, 1);
            continue;
        }
        
        // 繪製帶等離子高溫長尾跡的流星效果
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(ast.x, ast.y, ast.x - ast.vx * 3, ast.y - ast.vy * 3);
        gradient.addColorStop(0, ast.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = ast.size / 2;
        ctx.lineCap = 'round';
        ctx.moveTo(ast.x, ast.y);
        ctx.lineTo(ast.x - ast.vx * 3, ast.y - ast.vy * 3);
        ctx.stroke();
        
        // 繪製流星頭部的微弱發光核心
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.size / 3, 0, Math.PI * 2);
        ctx.fillStyle = ast.color;
        ctx.fill();
    }
}

let laserDrawing = null;
function shootLaserAt(enemy) {
    playLaserSound();
    const shipRect = dom.playerShip.getBoundingClientRect();
    const areaRect = dom.gameArea.getBoundingClientRect();
    
    const startX = shipRect.left - areaRect.left + 32; 
    const startY = shipRect.top - areaRect.top + 10;
    const targetX = enemy.x;
    const targetY = enemy.y + 32;
    
    laserDrawing = { startX, startY, targetX, targetY, life: 1.0 };
}

function drawLasers() {
    if (!laserDrawing) return;
    
    ctx.beginPath();
    ctx.moveTo(laserDrawing.startX, laserDrawing.startY);
    ctx.lineTo(laserDrawing.targetX, laserDrawing.targetY);
    ctx.strokeStyle = `rgba(34, 211, 238, ${laserDrawing.life})`;
    ctx.lineWidth = 5 * laserDrawing.life;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#22d3ee';
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(laserDrawing.startX, laserDrawing.startY);
    ctx.lineTo(laserDrawing.targetX, laserDrawing.targetY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${laserDrawing.life})`;
    ctx.lineWidth = 2 * laserDrawing.life;
    ctx.shadowBlur = 0;
    ctx.stroke();
    
    laserDrawing.life -= 0.14;
    if (laserDrawing.life <= 0) laserDrawing = null;
}

// 擊破文字隕石
function destroyEnemy(enemy) {
    playExplosionSound();
    createParticles(enemy.x, enemy.y + 32);
    
    enemy.el.remove();
    state.activeEnemies = state.activeEnemies.filter(e => e !== enemy);
    
    state.combo++;
    const comboBonus = Math.floor(state.combo / 5) * 5; 
    const baseScore = 10 * state.currentLevel;
    state.score += baseScore + comboBonus;
    
    dom.hudScore.textContent = state.score;
    dom.hudCombo.textContent = state.combo;
    
    // 當前關卡擊破數增加
    state.wordsDestroyedInLevel++;
    
    // 成功擊落 10 個字，立刻晉升或通關
    if (state.wordsDestroyedInLevel >= 10) {
        if (state.currentLevel < 3) {
            state.currentLevel++;
            state.wordsDestroyedInLevel = 0; 
            dom.hudLevel.textContent = LEVEL_DATA[state.currentLevel].title;
            
            playLevelUpSound();
            showLevelUpBanner(); 
            startEnemySpawner();
        } else {
            endGame(true); 
        }
    }
}

function showLevelUpBanner() {
    const banner = document.createElement('div');
    banner.className = "absolute inset-0 flex flex-col items-center justify-center z-40 bg-slate-950/70 backdrop-blur-md pointer-events-none transition-all duration-500";
    banner.innerHTML = `
        <div class="text-center scale-75 animate-bounce">
            <h2 class="text-5xl font-black text-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] tracking-widest">
                LEVEL UP!
            </h2>
            <p class="text-xl font-bold text-white mt-3 tracking-wider">
                解鎖任務：${LEVEL_DATA[state.currentLevel].title}
            </p>
            <p class="text-sm text-slate-400 mt-2 italic">
                ${LEVEL_DATA[state.currentLevel].description}
            </p>
        </div>
    `;
    
    dom.gameArea.appendChild(banner);
    
    state.activeEnemies.forEach(e => {
        createParticles(e.x, e.y + 32);
        e.el.remove();
    });
    state.activeEnemies = [];
    
    setTimeout(() => {
        banner.classList.add('opacity-0', 'scale-95');
        setTimeout(() => banner.remove(), 500);
    }, 1800);
}

// 擊中爆炸碎片推入
function createParticles(x, y) {
    const particleCount = 20;
    const colors = ['#22d3ee', '#ec4899', '#f43f5e', '#f59e0b', '#ffffff'];
    for (let i = 0; i < particleCount; i++) {
        state.particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 9,
            vy: (Math.random() - 0.5) * 9,
            radius: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0,
            decay: Math.random() * 0.06 + 0.03
        });
    }
}

function updateAndDrawParticles() {
    ctx.save();
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) {
            state.particles.splice(i, 1);
            continue;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
    }
    ctx.restore();
}

// --- 6. 能量護盾受擊與美化控制 ---
function triggerShieldDamage() {
    state.shield = Math.max(0, state.shield - 20); 
    updateShieldVisuals();
    
    dom.shipShield.classList.remove('shield-hit');
    void dom.shipShield.offsetWidth; 
    dom.shipShield.classList.add('shield-hit');
    
    dom.gameScreen.classList.add('shake-screen');
    setTimeout(() => { dom.gameScreen.classList.remove('shake-screen'); }, 300);
    
    playErrorSound();
    
    if (state.shield <= 0) {
        endGame(false);
    }
}

function updateShieldVisuals() {
    dom.hudShieldPct.textContent = `${state.shield}%`;
    
    const borderWidth = Math.max(1, (state.shield / 100) * 6);
    dom.shipShield.style.borderWidth = `${borderWidth}px`;
    
    if (state.shield > 60) {
        dom.shipShield.style.borderColor = `rgba(34, 211, 238, ${state.shield / 100})`;
        dom.shipShield.style.boxShadow = `0 0 ${12 + (state.shield / 100) * 15}px rgba(34, 211, 238, 0.7)`;
        dom.hudShieldPct.className = "font-mono text-sm font-bold text-cyan-400";
    } else if (state.shield > 25) {
        dom.shipShield.style.borderColor = `rgba(245, 158, 11, ${state.shield / 100})`;
        dom.shipShield.style.boxShadow = `0 0 ${8 + (state.shield / 100) * 12}px rgba(245, 158, 11, 0.5)`;
        dom.hudShieldPct.className = "font-mono text-sm font-bold text-amber-500";
    } else {
        dom.shipShield.style.borderColor = `rgba(239, 68, 68, ${Math.max(0.3, state.shield / 100)})`;
        dom.shipShield.style.boxShadow = `0 0 8px rgba(239, 68, 68, 0.4)`;
        dom.hudShieldPct.className = "font-mono text-sm font-bold text-red-500 animate-pulse";
    }
}

// --- 7. 排行榜本地儲存 (LocalStorage) ---
function endGame(isVictory = false) {
    state.isPlaying = false;
    cancelAnimationFrame(state.gameLoopId);
    clearInterval(state.spawnIntervalId);
    
    dom.gameScreen.classList.add('hidden');
    dom.endScreen.classList.remove('hidden');
    
    const accuracy = state.keystrokesCount > 0 
        ? ((state.correctKeystrokesCount / state.keystrokesCount) * 100).toFixed(1) 
        : 100;
        
    dom.endScore.textContent = state.score;
    dom.endAccuracy.textContent = `${accuracy}%`;
    dom.endLevel.textContent = state.currentLevel;
    
    const endBox = dom.endScreen.querySelector('.bg-slate-900\\/95');
    if (isVictory) {
        dom.endTitle.textContent = "🏆 完美通關！拯救星系！";
        dom.endTitle.className = "text-4xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.7)] tracking-widest";
        endBox.style.borderColor = "rgba(234, 179, 8, 0.7)"; 
        playLevelUpSound(); 
    } else {
        dom.endTitle.textContent = "💥 戰機墜毀！任務失敗";
        dom.endTitle.className = "text-4xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] tracking-widest";
        endBox.style.borderColor = "rgba(239, 68, 68, 0.5)"; 
    }
    
    saveAndShowLeaderboard(accuracy);
}

function saveAndShowLeaderboard(accuracy) {
    const newRecord = {
        player_name: state.playerName,
        class_name: state.className,
        score: state.score,
        accuracy: parseFloat(accuracy)
    };
    
    let localLeaderboard = JSON.parse(localStorage.getItem('typing_leaderboard') || '[]');
    localLeaderboard.push(newRecord);
    localLeaderboard.sort((a, b) => b.score - a.score);
    localLeaderboard = localLeaderboard.slice(0, 10);
    
    localStorage.setItem('typing_leaderboard', JSON.stringify(localLeaderboard));
    
    dom.leaderboardBody.innerHTML = '';
    localLeaderboard.forEach((record, idx) => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-slate-900/60 transition hover:bg-slate-900/40 ${idx === 0 ? 'text-yellow-400 font-bold' : ''}`;
        
        let rankBadge = idx + 1;
        if (idx === 0) rankBadge = '🥇';
        if (idx === 1) rankBadge = '🥈';
        if (idx === 2) rankBadge = '🥉';
        
        tr.innerHTML = `
            <td class="py-2.5 px-4 font-semibold">${rankBadge}</td>
            <td class="py-2.5 px-4 font-mono text-slate-300">${record.class_name}</td>
            <td class="py-2.5 px-4">${record.player_name}</td>
            <td class="py-2.5 px-4 text-right font-mono text-yellow-400 font-semibold">${record.score}</td>
        `;
        dom.leaderboardBody.appendChild(tr);
    });
}
