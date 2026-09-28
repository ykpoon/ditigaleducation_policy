/**
 * 倉頡打字太空射擊遊戲 - 純前端無資料庫版 (Local Version)
 * 使用 Web Audio API 合成音效 + LocalStorage 持久化排行榜
 */

// --- 1. 三關難度字庫設定 (嚴格遵循學習冊拆碼) ---
const LEVEL_DATA = {
    1: {
        title: "第一關：倉頡基本字根",
        description: "單一按鍵，熟記鍵盤與字根配對！",
        speed: 1.1,
        spawnInterval: 2600,
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
        description: "輸入 1 至 3 碼的常見合體連體字！",
        speed: 1.5,
        spawnInterval: 3000,
        words: [
            { char: "大", code: "K" },
            { char: "中", code: "L" },
            { char: "明", code: "AB" },  // 日 + 月
            { char: "林", code: "DD" },  // 木 + 木
            { char: "因", code: "WK" },  // 田 + 大
            { char: "目", code: "BU" },  // 月 + 山
            { char: "天", code: "MK" },  // 一 + 大
            { char: "門", code: "AN" },  // 日 + 弓
            { char: "和", code: "HR" },  // 竹 + 口
            { char: "車", code: "JWJ" }  // 十 + 田 + 十 (Page 6 課本範例)
        ]
    },
    3: {
        title: "第三關：高難度手冊挑战",
        description: "挑戰學習冊中 4 至 5 碼的複雜分體字！",
        speed: 1.9,
        spawnInterval: 3600,
        words: [
            { char: "你", code: "ONF" },    // 人 弓 火 (手冊 P.7)
            { char: "語", code: "YRMR" },   // 卜 口 一 口 (手冊 P.6)
            { char: "愛", code: "BPHE" },   // 月 心 竹 水 (手冊 P.7)
            { char: "謝", code: "YRHDI" },  // 卜 口 竹 木 戈 (手冊 P.8)
            { char: "熱", code: "GIGF" },   // 土 戈 土 火 (手冊 P.7)
            { char: "矮", code: "OKHDV" }   // 人 大 竹 木 女 (手冊 P.8 - 矢 + 委)
        ]
    }
};

// 倉頡英文字母與中文名稱對照表 (提示條與緩衝區渲染用)
const CANGJIE_ALPHABET = {
    'A': '日', 'B': '月', 'C': '金', 'D': '木', 'E': '水', 'F': '火', 'G': '土',
    'H': '竹', 'I': '戈', 'J': '十', 'K': '大', 'L': '中', 'M': '一', 'N': '弓',
    'O': '人', 'P': '心', 'Q': '手', 'R': '口', 'S': '尸', 'T': '廿', 'U': '山',
    'V': '女', 'W': '田', 'Y': '卜', 'X': '難', 'Z': '重'
};

// --- 2. AUDIO SYNTHESIZER (Web Audio API 原生即時合成音效) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 鐳射發射高音滑音
function playLaserSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

// 隕石爆炸震撼低頻噪音
function playExplosionSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 0.35; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // 白噪音
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.35);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseSource.start();
    noiseSource.stop(audioCtx.currentTime + 0.35);
}

// 拼碼打錯時的提示低音
function playErrorSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

// 關卡晉升大捷和弦音
function playLevelUpSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + idx * 0.08);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.08 + 0.3);
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 0.3);
    });
}

// --- 3. 遊戲核心狀態控管 ---
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
    hudShieldBar: document.getElementById('hud-shield-bar'),
    hudShieldPct: document.getElementById('hud-shield-pct'),
    hudLevel: document.getElementById('hud-level'),
    gameArea: document.getElementById('game-area'),
    playerShip: document.getElementById('player-ship'),
    laserCanvas: document.getElementById('laser-canvas'),
    inputBufferContainer: document.getElementById('input-buffer-container'),
    clearBufferBtn: document.getElementById('clear-buffer-btn'),
    endTitle: document.getElementById('end-title'),
    endScore: document.getElementById('end-score'),
    endAccuracy: document.getElementById('end-accuracy'),
    endLevel: document.getElementById('end-level'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    restartBtn: document.getElementById('restart-btn')
};

// 雷射特效畫布初始化與動態調尺寸
const ctx = dom.laserCanvas.getContext('2d');
function resizeCanvas() {
    dom.laserCanvas.width = dom.gameArea.clientWidth;
    dom.laserCanvas.height = dom.gameArea.clientHeight;
}
window.addEventListener('resize', resizeCanvas);


// --- 4. 使用者互動事件 ---
dom.startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.playerName = dom.playerName.value.trim();
    state.className = dom.className.value.trim().toUpperCase();
    state.currentLevel = parseInt(dom.startLevel.value);
    
    // 淡出開始畫面，淡入遊戲戰場
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

dom.clearBufferBtn.addEventListener('click', () => {
    state.inputBuffer = [];
    updateInputBufferUI();
    // 重置所有隕石的高亮提示進度
    state.activeEnemies.forEach(e => { e.highlightedIdx = 0; updateEnemyUI(e); });
});

// 全域鍵盤敲擊監聽處理
window.addEventListener('keydown', (e) => {
    if (!state.isPlaying) return;
    
    // 只捕獲 A-Z 字母
    const key = e.key.toUpperCase();
    if (key.length !== 1 || key < 'A' || key > 'Z') {
        if (e.key === 'Backspace') {
            state.inputBuffer.pop();
            updateInputBufferUI();
            reEvaluateMatching();
        }
        return;
    }

    state.keystrokesCount++;
    state.inputBuffer.push(key);
    
    reEvaluateMatching();
});

// 比對輸入暫存與場上隕石
function reEvaluateMatching() {
    const typedStr = state.inputBuffer.join('');
    let matchFound = false;
    let completeMatch = null;

    for (let enemy of state.activeEnemies) {
        if (enemy.code.startsWith(typedStr)) {
            matchFound = true;
            enemy.highlightedIdx = typedStr.length; // 渲染藍色高亮
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
        // 匹配成功：擊落隕石！
        state.correctKeystrokesCount += completeMatch.code.length;
        shootLaserAt(completeMatch);
        destroyEnemy(completeMatch);
        state.inputBuffer = []; 
    } else if (matchFound) {
        // 部分匹配，提供鍵音回饋
        state.correctKeystrokesCount++;
        playLaserSound();
    } else {
        // 拼錯，清空並扣除 Combo 連擊
        playErrorSound();
        state.combo = 0;
        dom.hudCombo.textContent = state.combo;
        state.inputBuffer = [];
        state.activeEnemies.forEach(e => { e.highlightedIdx = 0; updateEnemyUI(e); });
    }
    
    updateInputBufferUI();
}


// --- 5. 遊戲運行機制與物理引擎 ---
function resetGameState() {
    state.score = 0;
    state.combo = 0;
    state.shield = 100;
    state.activeEnemies.forEach(e => e.el.remove());
    state.activeEnemies = [];
    state.inputBuffer = [];
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
    updateShieldBar();
    dom.hudLevel.textContent = LEVEL_DATA[state.currentLevel].title;
    
    playLevelUpSound();
    
    // 啟動主物理渲染循環
    state.gameLoopId = requestAnimationFrame(gameUpdate);
    // 啟動隕石產生器
    startEnemySpawner();
}

function startEnemySpawner() {
    if (state.spawnIntervalId) clearInterval(state.spawnIntervalId);
    
    const config = LEVEL_DATA[state.currentLevel];
    state.spawnIntervalId = setInterval(() => {
        if (!state.isPlaying) return;
        spawnEnemy();
    }, config.spawnInterval);
}

// 動態繪製新降臨的隕石
function spawnEnemy() {
    const config = LEVEL_DATA[state.currentLevel];
    const randomWord = config.words[Math.floor(Math.random() * config.words.length)];
    
    const enemyEl = document.createElement('div');
    enemyEl.className = 'absolute flex flex-col items-center z-10 select-none';
    
    // 限制在可見橫幅內生成，避免超出右邊界
    const spawnWidth = dom.gameArea.clientWidth - 100;
    const leftPos = Math.max(20, Math.random() * spawnWidth);
    enemyEl.style.left = `${leftPos}px`;
    enemyEl.style.top = `-80px`;
    
    // 圓形發光外殼
    const bubble = document.createElement('div');
    bubble.className = 'enemy-glowing w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-3xl font-bold border-2 border-cyan-500/80 text-white select-none shadow-lg cursor-default';
    bubble.textContent = randomWord.char;
    enemyEl.appendChild(bubble);
    
    // 倉頡字母拆碼拼音輔助面板
    const hintBar = document.createElement('div');
    hintBar.className = 'mt-1 bg-slate-950/80 border border-slate-800 rounded px-2 py-0.5 flex gap-1 justify-center min-w-[70px]';
    
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
        speed: config.speed + (Math.random() * 0.4 - 0.2), // 稍微震盪的速度更具挑戰性
        highlightedIdx: 0
    });
}

function updateEnemyUI(enemy) {
    const spans = enemy.hintBar.querySelectorAll('span');
    spans.forEach((span, idx) => {
        if (idx < enemy.highlightedIdx) {
            span.className = 'text-xs font-mono text-cyan-400 font-extrabold';
        } else {
            span.className = 'text-xs font-mono text-slate-500';
        }
    });
}

function updateInputBufferUI() {
    dom.inputBufferContainer.innerHTML = '';
    if (state.inputBuffer.length === 0) {
        dom.inputBufferContainer.innerHTML = '<span class="text-slate-500 text-sm italic">等待輸入...</span>';
        return;
    }
    
    state.inputBuffer.forEach(key => {
        const item = document.createElement('span');
        item.className = 'bg-cyan-500 text-slate-950 px-2 py-0.5 rounded font-bold font-mono text-sm';
        item.textContent = `${CANGJIE_ALPHABET[key]} (${key})`;
        dom.inputBufferContainer.appendChild(item);
    });
}

// 物理降落更新
function gameUpdate() {
    if (!state.isPlaying) return;
    
    const limitY = dom.gameArea.clientHeight - 80;
    
    for (let i = state.activeEnemies.length - 1; i >= 0; i--) {
        const enemy = state.activeEnemies[i];
        enemy.y += enemy.speed;
        enemy.el.style.top = `${enemy.y}px`;
        
        // 撞擊防線扣血
        if (enemy.y >= limitY) {
            triggerShieldDamage();
            enemy.el.remove();
            state.activeEnemies.splice(i, 1);
            state.combo = 0;
            dom.hudCombo.textContent = state.combo;
        }
    }
    
    drawLasers();
    state.gameLoopId = requestAnimationFrame(gameUpdate);
}

// 雷射軌跡動態繪製
let laserDrawing = null;
function shootLaserAt(enemy) {
    playLaserSound();
    
    const shipRect = dom.playerShip.getBoundingClientRect();
    const areaRect = dom.gameArea.getBoundingClientRect();
    
    const startX = shipRect.left - areaRect.left + 24; 
    const startY = shipRect.top - areaRect.top;
    const targetX = enemy.x;
    const targetY = enemy.y + 32;
    
    laserDrawing = { startX, startY, targetX, targetY, life: 1.0 };
}

function drawLasers() {
    ctx.clearRect(0, 0, dom.laserCanvas.width, dom.laserCanvas.height);
    if (!laserDrawing) return;
    
    // 外層光暈
    ctx.beginPath();
    ctx.moveTo(laserDrawing.startX, laserDrawing.startY);
    ctx.lineTo(laserDrawing.targetX, laserDrawing.targetY);
    ctx.strokeStyle = `rgba(34, 211, 238, ${laserDrawing.life})`;
    ctx.lineWidth = 4 * laserDrawing.life;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#06b6d4';
    ctx.stroke();
    
    // 內核白光
    ctx.beginPath();
    ctx.moveTo(laserDrawing.startX, laserDrawing.startY);
    ctx.lineTo(laserDrawing.targetX, laserDrawing.targetY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${laserDrawing.life})`;
    ctx.lineWidth = 1.5 * laserDrawing.life;
    ctx.shadowBlur = 0;
    ctx.stroke();
    
    laserDrawing.life -= 0.12;
    if (laserDrawing.life <= 0) laserDrawing = null;
}

// 隕石爆炸與分數累算
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
    
    // 分數累加每 150 分，自動解鎖下一關
    if (state.score > 0 && state.score % 150 === 0 && state.currentLevel < 3) {
        state.currentLevel++;
        dom.hudLevel.textContent = LEVEL_DATA[state.currentLevel].title;
        playLevelUpSound();
        startEnemySpawner();
    }
}

// 原生 Canvas 碎片粒子系統
let particles = [];
function createParticles(x, y) {
    const particleCount = 15;
    const colors = ['#06b6d4', '#22d3ee', '#38bdf8', '#f43f5e', '#ffffff'];
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0,
            decay: Math.random() * 0.05 + 0.02
        });
    }
    
    function animateParticles() {
        if (particles.length === 0) return;
        ctx.save();
        particles.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fill();
            
            if (p.alpha <= 0) particles.splice(idx, 1);
        });
        ctx.restore();
        
        if (particles.length > 0 && state.isPlaying) {
            requestAnimationFrame(animateParticles);
        }
    }
    animateParticles();
}

function triggerShieldDamage() {
    state.shield = Math.max(0, state.shield - 15);
    updateShieldBar();
    
    // 受傷畫面劇烈搖晃
    dom.gameScreen.classList.add('shake-screen');
    setTimeout(() => { dom.gameScreen.classList.remove('shake-screen'); }, 400);
    
    playErrorSound();
    if (state.shield <= 0) endGame();
}

function updateShieldBar() {
    dom.hudShieldBar.style.width = `${state.shield}%`;
    dom.hudShieldPct.textContent = `${state.shield}%`;
    if (state.shield > 50) {
        dom.hudShieldBar.className = "bg-gradient-to-r from-emerald-500 to-green-400 h-full w-full transition-all duration-300";
    } else if (state.shield > 20) {
        dom.hudShieldBar.className = "bg-gradient-to-r from-yellow-500 to-amber-400 h-full w-full transition-all duration-300";
    } else {
        dom.hudShieldBar.className = "bg-gradient-to-r from-red-600 to-red-500 h-full w-full transition-all duration-300";
    }
}

// 結束遊戲及本地排行榜存取
function endGame() {
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
    
    saveAndShowLeaderboard(accuracy);
}

// 儲存至瀏覽器 localStorage
function saveAndShowLeaderboard(accuracy) {
    const newRecord = {
        player_name: state.playerName,
        class_name: state.className,
        score: state.score,
        accuracy: parseFloat(accuracy)
    };
    
    // 讀取舊有數據
    let localLeaderboard = JSON.parse(localStorage.getItem('typing_leaderboard') || '[]');
    
    // 壓入新紀錄
    localLeaderboard.push(newRecord);
    
    // 排行榜排序：由高至低，取前 10 名
    localLeaderboard.sort((a, b) => b.score - a.score);
    localLeaderboard = localLeaderboard.slice(0, 10);
    
    // 寫回
    localStorage.setItem('typing_leaderboard', JSON.stringify(localLeaderboard));
    
    // 渲染 UI
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
