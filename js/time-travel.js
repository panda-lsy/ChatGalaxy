/**
 * 时间轴回放功能
 * 让3D星系像视频一样播放聊天演化过程
 * ProjectZero - 深山有密林团队
 */

(function() {
    'use strict';

    // ========== 状态管理 ==========

    const state = {
        isPlaying: false,
        currentTime: null,
        startTime: null,
        endTime: null,
        playbackSpeed: 1.0,
        animationId: null,
        lastFrameTime: null,
        totalDuration: 0
    };

    // ========== 配置 ==========

    const config = {
        // 播放速度选项
        speeds: [0.5, 1.0, 2.0, 4.0],

        // 动画帧率
        fps: 60,

        // 进度更新间隔（毫秒）
        updateInterval: 16, // ~60fps

        // 节点浮现动画时长（毫秒）
        nodeAppearDuration: 500
    };

    // ========== DOM元素 ==========

    let elements = {
        panel: null,
        playBtn: null,
        pauseBtn: null,
        progressBar: null,
        progressFill: null,
        currentTimeDisplay: null,
        totalTimeDisplay: null,
        speedBtn: null,
        speedMenu: null
    };

    // ========== 初始化 ==========

    function init() {
        // 创建控制面板
        createControlPanel();

        // 绑定事件
        bindEvents();

        console.log('✅ 时间轴回放模块已加载');
        console.log('💡 使用方法：TimeTravel.play() 开始播放');
    }

    // ========== 创建控制面板 ==========

    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'time-travel-panel';
        panel.className = 'time-travel-panel';
        panel.innerHTML = `
            <div class="time-travel-header">
                <span class="time-travel-title">🎬 时间轴回放</span>
                <button class="time-travel-close" onclick="TimeTravel.hide()">✕</button>
            </div>

            <div class="time-travel-controls">
                <!-- 播放/暂停按钮 -->
                <div class="control-group">
                    <button id="tt-play" class="control-btn primary-btn">
                        <i class="icon">▶</i>
                    </button>
                    <button id="tt-pause" class="control-btn primary-btn" style="display: none;">
                        <i class="icon">⏸</i>
                    </button>
                </div>

                <!-- 时间显示 -->
                <div class="time-display">
                    <span id="tt-current-time">00:00:00</span>
                    <span class="time-separator">/</span>
                    <span id="tt-total-time">00:00:00</span>
                </div>

                <!-- 倍速控制 -->
                <div class="control-group">
                    <button id="tt-speed" class="control-btn">
                        <span id="tt-speed-text">1.0x</span>
                    </button>
                    <div class="speed-menu" id="tt-speed-menu" style="display: none;">
                        ${config.speeds.map(speed =>
                            `<div class="speed-option" data-speed="${speed}">${speed}x</div>`
                        ).join('')}
                    </div>
                </div>
            </div>

            <!-- 进度条 -->
            <div class="progress-container">
                <div class="progress-bar" id="tt-progress-bar">
                    <div class="progress-fill" id="tt-progress-fill"></div>
                    <div class="progress-thumb" id="tt-progress-thumb"></div>
                </div>
            </div>

            <!-- 统计信息 -->
            <div class="time-travel-stats">
                <div class="stat-item">
                    <span class="stat-label">节点数</span>
                    <span class="stat-value" id="tt-nodes-count">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">消息数</span>
                    <span class="stat-value" id="tt-msgs-count">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">进度</span>
                    <span class="stat-value" id="tt-progress-percent">0%</span>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 缓存DOM元素引用
        elements = {
            panel: panel,
            playBtn: document.getElementById('tt-play'),
            pauseBtn: document.getElementById('tt-pause'),
            progressBar: document.getElementById('tt-progress-bar'),
            progressFill: document.getElementById('tt-progress-fill'),
            progressThumb: document.getElementById('tt-progress-thumb'),
            currentTimeDisplay: document.getElementById('tt-current-time'),
            totalTimeDisplay: document.getElementById('tt-total-time'),
            speedBtn: document.getElementById('tt-speed'),
            speedText: document.getElementById('tt-speed-text'),
            speedMenu: document.getElementById('tt-speed-menu'),
            nodesCount: document.getElementById('tt-nodes-count'),
            msgsCount: document.getElementById('tt-msgs-count'),
            progressPercent: document.getElementById('tt-progress-percent')
        };
    }

    // ========== 绑定事件 ==========

    function bindEvents() {
        // 播放按钮
        elements.playBtn.addEventListener('click', play);

        // 暂停按钮
        elements.pauseBtn.addEventListener('click', pause);

        // 进度条点击
        elements.progressBar.addEventListener('click', handleProgressClick);

        // 进度条拖动
        elements.progressThumb.addEventListener('mousedown', startDrag);

        // 倍速按钮
        elements.speedBtn.addEventListener('click', toggleSpeedMenu);

        // 倍速选项
        elements.speedMenu.addEventListener('click', (e) => {
            if (e.target.classList.contains('speed-option')) {
                const speed = parseFloat(e.target.dataset.speed);
                setSpeed(speed);
                elements.speedMenu.style.display = 'none';
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                toggle();
            }
        });
    }

    // ========== 播放控制 ==========

    function play() {
        if (state.isPlaying) return;

        state.isPlaying = true;
        state.lastFrameTime = performance.now();

        // 更新UI
        elements.playBtn.style.display = 'none';
        elements.pauseBtn.style.display = 'block';

        // 开始动画循环
        animate();

        console.log('▶️ 开始播放');
    }

    function pause() {
        if (!state.isPlaying) return;

        state.isPlaying = false;

        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
        }

        // 更新UI
        elements.playBtn.style.display = 'block';
        elements.pauseBtn.style.display = 'none';

        console.log('⏸ 暂停播放');
    }

    function toggle() {
        if (state.isPlaying) {
            pause();
        } else {
            play();
        }
    }

    // ========== 动画循环 ==========

    function animate() {
        if (!state.isPlaying) return;

        const now = performance.now();
        const deltaTime = now - state.lastFrameTime;
        state.lastFrameTime = now;

        // 根据播放速度计算时间增量
        const timeIncrement = deltaTime * state.playbackSpeed;

        // 更新当前时间
        if (state.currentTime) {
            state.currentTime = new Date(state.currentTime.getTime() + timeIncrement);

            // 检查是否结束
            if (state.currentTime >= state.endTime) {
                state.currentTime = state.endTime;
                pause();
            }
        }

        // 更新显示
        updateDisplay();

        // 继续下一帧
        state.animationId = requestAnimationFrame(animate);
    }

    // ========== 更新显示 ==========

    function updateDisplay() {
        if (!state.currentTime || !state.startTime || !state.endTime) return;

        // 更新进度条
        const progress = (state.currentTime - state.startTime) / (state.endTime - state.startTime);
        const percent = progress * 100;

        elements.progressFill.style.width = `${percent}%`;
        elements.progressThumb.style.left = `${percent}%`;
        elements.progressPercent.textContent = `${Math.round(percent)}%`;

        // 更新时间显示
        elements.currentTimeDisplay.textContent = formatTime(state.currentTime);

        // 过滤节点（如果graph可用）
        if (window.Graph && window.graphData) {
            const filteredData = filterNodesByTime(state.currentTime);
            const nodeCount = filteredData.nodes.length;

            // 更新统计
            elements.nodesCount.textContent = nodeCount;
            elements.msgsCount.textContent = filteredData.messages || 0;

            // 更新3D图
            try {
                window.Graph.graphData(filteredData);
            } catch (e) {
                console.warn('更新3D图失败:', e);
            }
        }
    }

    // ========== 按时间过滤节点 ==========

    function filterNodesByTime(currentTime) {
        if (!window.graphData || !window.graphData.nodes) {
            return { nodes: [], links: [] };
        }

        const time = currentTime.getTime();

        // 过滤在当前时间之前出现的节点
        const visibleNodes = window.graphData.nodes.filter(node => {
            const nodeTime = new Date(node.firstSeen || 0).getTime();
            return nodeTime <= time;
        });

        // 过滤连线（只显示两端节点都可见的）
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleLinks = (window.graphData.links || []).filter(link => {
            return visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target);
        });

        // 估算消息数量（基于节点）
        const totalMessages = visibleNodes.reduce((sum, node) => sum + (node.val || 0), 0);

        return {
            nodes: visibleNodes,
            links: visibleLinks,
            messages: totalMessages
        };
    }

    // ========== 设置时间范围 ==========

    function setTimeRange(startTime, endTime) {
        state.startTime = startTime;
        state.endTime = endTime;
        state.currentTime = startTime;

        state.totalDuration = endTime - startTime;

        // 更新显示
        elements.totalTimeDisplay.textContent = formatTime(endTime);
        elements.currentTimeDisplay.textContent = formatTime(startTime);

        console.log(`⏰ 时间范围已设置: ${formatTime(startTime)} - ${formatTime(endTime)}`);
    }

    // ========== 设置播放速度 ==========

    function setSpeed(speed) {
        state.playbackSpeed = speed;
        elements.speedText.textContent = `${speed.toFixed(1)}x`;

        console.log(`⚡ 播放速度: ${speed}x`);
    }

    // ========== 切换倍速菜单 ==========

    function toggleSpeedMenu() {
        const isVisible = elements.speedMenu.style.display !== 'none';
        elements.speedMenu.style.display = isVisible ? 'none' : 'block';
    }

    // ========== 进度条点击 ==========

    function handleProgressClick(e) {
        const rect = elements.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;

        // 跳转到对应时间
        if (state.startTime && state.endTime) {
            const time = new Date(
                state.startTime.getTime() +
                (state.endTime - state.startTime) * percent
            );
            state.currentTime = time;
            updateDisplay();
        }
    }

    // ========== 拖动进度条 ==========

    let isDragging = false;

    function startDrag(e) {
        isDragging = true;
        e.preventDefault();

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    }

    function onDrag(e) {
        if (!isDragging) return;

        const rect = elements.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        if (state.startTime && state.endTime) {
            const time = new Date(
                state.startTime.getTime() +
                (state.endTime - state.startTime) * percent
            );
            state.currentTime = time;
            updateDisplay();
        }
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    // ========== 格式化时间 ==========

    function formatTime(date) {
        if (!date) return '00:00:00';

        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');

        return `${h}:${m}:${s}`;
    }

    // ========== 显示/隐藏面板 ==========

    function show() {
        elements.panel.style.display = 'block';
    }

    function hide() {
        pause();
        elements.panel.style.display = 'none';
    }

    // ========== 重置 ==========

    function reset() {
        pause();
        state.currentTime = state.startTime;
        updateDisplay();
    }

    // ========== 导出API ==========

    window.TimeTravel = {
        // 控制
        play,
        pause,
        toggle,
        reset,

        // 配置
        setTimeRange,
        setSpeed,

        // UI
        show,
        hide,

        // 状态
        getState: () => state,
        isPlaying: () => state.isPlaying,
        getCurrentTime: () => state.currentTime
    };

    // ========== 添加样式 ==========

    const style = document.createElement('style');
    style.textContent = `
        /* 时间轴回放面板 */
        .time-travel-panel {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 20, 30, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            z-index: 999;
            min-width: 400px;
            animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        .time-travel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .time-travel-title {
            font-size: 16px;
            font-weight: bold;
        }

        .time-travel-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.7);
            font-size: 18px;
            cursor: pointer;
            padding: 5px;
            line-height: 1;
        }

        .time-travel-close:hover {
            color: white;
        }

        .time-travel-controls {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }

        .control-group {
            display: flex;
            align-items: center;
            position: relative;
        }

        .control-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .control-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.1);
        }

        .primary-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
        }

        .time-display {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            opacity: 0.9;
        }

        .time-separator {
            opacity: 0.5;
        }

        /* 进度条 */
        .progress-container {
            margin-bottom: 15px;
        }

        .progress-bar {
            position: relative;
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            cursor: pointer;
            transition: height 0.2s;
        }

        .progress-bar:hover {
            height: 12px;
        }

        .progress-fill {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            transition: width 0.1s linear;
        }

        .progress-thumb {
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: grab;
            transition: transform 0.2s;
        }

        .progress-thumb:hover {
            transform: translate(-50%, -50%) scale(1.2);
        }

        .progress-thumb:active {
            cursor: grabbing;
        }

        /* 倍速菜单 */
        .speed-menu {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(30,30,40,0.98);
            border-radius: 8px;
            padding: 8px;
            margin-bottom: 10px;
            min-width: 80px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .speed-option {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            text-align: center;
            transition: background 0.2s;
        }

        .speed-option:hover {
            background: rgba(255,255,255,0.1);
        }

        /* 统计信息 */
        .time-travel-stats {
            display: flex;
            justify-content: space-around;
            padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }

        .stat-item {
            text-align: center;
        }

        .stat-label {
            display: block;
            font-size: 12px;
            opacity: 0.7;
            margin-bottom: 5px;
        }

        .stat-value {
            display: block;
            font-size: 18px;
            font-weight: bold;
        }

        /* 响应式 */
        @media (max-width: 768px) {
            .time-travel-panel {
                min-width: 90vw;
                bottom: 20px;
            }

            .time-travel-controls {
                gap: 10px;
            }

            .time-display {
                font-size: 12px;
            }

            .stat-value {
                font-size: 16px;
            }
        }
    `;

    document.head.appendChild(style);

    // ========== 自动初始化 ==========

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('🎬 时间轴回放模块已加载');

})();
