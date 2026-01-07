// ========== 本地日志包装器 ==========
// 防止 Log 未定义时出错（IIFE 在 log-wrapper.js 加载前执行）
if (!window.Log) {
    window.Log = {
        info: (tag, ...msg) => console.log(`[INFO] [${tag}]`, ...msg),
        warn: (tag, ...msg) => console.warn(`[WARN] [${tag}]`, ...msg),
        error: (tag, ...msg) => console.error(`[ERROR] [${tag}]`, ...msg),
        debug: (tag, ...msg) => console.log(`[DEBUG] [${tag}]`, ...msg)
    };
}
var Log = window.Log;

// Global State
let allMessages = []; // Raw data array
let filteredMessages = []; // Currently visible messages
let graphData = null;
let metaData = null;
let Graph = null; // Global graph instance

// Time Travel State
let timeRange = { start: 0, end: 0 };
let isPlaying = false;
let playInterval = null;

// Coalesce State
let isCoalesced = false;
let originalForceConfig = null; // 🔧 改为 null，用于判断是否已保存

// Audio State
let audioCtx = null;
let isMuted = false; // 默认开启氛围音效
let ambientGain = null;
let ambientNodes = [];
let melodyTimer = null;

// Romantic Palette
const COLORS = [
    '#ff9a9e', // Pink
    '#fad0c4', // Soft Pink
    '#a18cd1', // Purple
    '#fbc2eb', // Rose
    '#8fd3f4', // Light Blue
    '#84fab0'  // Mint (for variety)
];

const FORCE_BASE = {
    charge: -600,
    radialStrength: 0.05,
    radialRadius: 300
};

// --- Interaction State ---
const highlightNodes = new Set();
const highlightLinks = new Set();
let hoverLink = null;
let lastClickedNode = null;
let highlightTimer = null;

function handleNodeClick(node) {
    if (!node) return;

    // If coalesced, any click triggers bloom
    if (isCoalesced) {
        uncoalesceNodes();
        return;
    }

    // Update last clicked node
    lastClickedNode = node;

    // 1. Highlight Logic
    highlightNodes.clear();
    highlightLinks.clear();
    
    highlightNodes.add(node);
    
    // Find neighbors
    const { nodes, links } = Graph.graphData();
    links.forEach(link => {
        if (link.source.id === node.id || link.target.id === node.id) {
            highlightLinks.add(link);
            highlightNodes.add(link.source.id === node.id ? link.target : link.source);
        }
    });
    
    // Trigger update for visual changes
    updateGraphVisuals();
    
    // Handle Highlight Duration
    if (highlightTimer) clearTimeout(highlightTimer);
    if (appSettings.highlightDuration > 0) {
        highlightTimer = setTimeout(() => {
            highlightNodes.clear();
            highlightLinks.clear();
            lastClickedNode = null; // Optional: clear selection state too? Maybe keep it for link labels?
            // Let's keep lastClickedNode for link labels context, but clear visual highlights
            updateGraphVisuals();
        }, appSettings.highlightDuration * 1000);
    }
         
    // 2. Travel Logic (Fly to node)
    const distance = 150;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
    
    const newPos = {
        x: node.x * distRatio,
        y: node.y * distRatio,
        z: node.z * distRatio
    };

    Graph.cameraPosition(
        newPos, // new position
        node, // lookAt
        2000  // ms transition duration
    );
    
    // 3. Show Info / Filter Messages
    playClickSound();
    focusOnNode(node.name);
    showToast(`已抵达: ${node.name}`, 'success');
}

function updateGraphVisuals() {
    if (!Graph) return;
    Graph
        .linkWidth(getLinkWidth)
        .linkColor(getLinkColor)
        .linkOpacity(getLinkOpacity)
        .nodeColor(Graph.nodeColor())
        .linkLabel(Graph.linkLabel());
}

function highlightLink(link) {
    hoverLink = link || null;
    // We could add hover highlight logic here if needed, 
    // but for now we just rely on click persistence.
    // If we want hover effects, we need to trigger update similar to click.
}

function getLinkWidth(link) {
    const base = appSettings.defaultLinkWidth !== undefined ? appSettings.defaultLinkWidth : 0.2;
    return highlightLinks.has(link) ? base * 3 : base;
}

function getLinkOpacity(link) {
    const base = appSettings.defaultLinkOpacity !== undefined ? appSettings.defaultLinkOpacity : 0.05;
    return highlightLinks.has(link) ? Math.min(1, base * 3) : base;
}

function getLinkColor(link) {
    return highlightLinks.has(link) ? '#ffffff' : '#ffffff';
}

// Virtual Scrolling State
const PAGE_SIZE = 50;
let currentPage = 1;

// App Settings
let appSettings = {
    bgmVolume: 50,
    sfxVolume: 50,
    pageTitle: 'ChatGalaxy', // 🔧 通用标题
    pageIcon: '🌌',
    sidebarTitle: 'ChatGalaxy', // 🔧 通用侧边栏标题
    sidebarIcon: '💬', // 🔧 改为聊天图标
    sfxEnabled: true,
    showSubtitles: true,
    subtitleLoop: false,
    subtitleDuration: 8,
    subtitleFadeIn: 1.0,
    subtitleFadeOut: 1.0,
    roamSpeed: 12,
    rotateSpeed: 0.4,
    idleTime: 10,
    idleSpeed: 0.2,
    idleRotationEnabled: true,
    uiTransparency: 0.95,
    hoverHighlight: false,
    highlightDuration: 5,
    defaultLinkOpacity: 0.05,
    defaultLinkWidth: 0.2
};

// Experience overlays
let introOverlay = null;
let outroOverlay = null;
let isRevisitMode = false;
let revisitTimer = null;

// DOM Elements
const chatListContainer = document.getElementById('chat-list-container');
const chatListContent = document.getElementById('chat-list-content');
const loadingEl = document.getElementById('loading');
let subtitleEl = null; // Will be initialized in initApp

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    subtitleEl = document.getElementById('subtitle-overlay');

    // 等待数据加载完成（最多等待5秒）
    waitForData().then((data) => {
        if (data) {
            Log.info('Data', 'Using data from:', window.USE_INDEXEDDB_DATA ? 'IndexedDB' : 'data.js');
            initApp(data);
        } else {
            loadingEl.innerHTML = '<p>数据未加载，请先在数据管理器中导入或创建数据集</p>';
            loadingEl.innerHTML += '<br><a href="data-manager.html" style="color: #4facfe;">前往数据管理器</a>';
        }
    }).catch((error) => {
        console.error('Failed to load data:', error);
        loadingEl.innerHTML = '<p>数据加载失败: ' + error.message + '</p>';
        loadingEl.innerHTML += '<br><a href="data-manager.html" style="color: #4facfe;">前往数据管理器</a>';
    });
});

/**
 * 等待数据加载完成
 */
function waitForData(timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const checkData = () => {
            if (window.CHAT_DATA) {
                resolve(window.CHAT_DATA);
            } else if (Date.now() - startTime > timeout) {
                resolve(null);
            } else {
                setTimeout(checkData, 100);
            }
        };

        checkData();
    });
}

function initApp(data) {
    // Decompress data
    metaData = data.meta;
    graphData = data.graph;
    
    // Transform compact messages back to objects for easier handling (or handle on fly)
    // [id, sender_id, timestamp, text, sentiment, keywords]
    // To save memory, we keep them as arrays and use helper to access
    allMessages = data.messages;
    filteredMessages = allMessages; // Start with all
    
    // Init Time Range
    if (allMessages.length > 0) {
        timeRange.start = allMessages[0][2];
        timeRange.end = allMessages[allMessages.length - 1][2];
    }
    
    // Init UI
    updateStats();
    initGraph(graphData);
    renderChatList(true); // Initial render
    renderKeywordRanking(); // Render ranking
    initTimeTravel(); // Init Time Travel
    initCoalesceControls(); // Init Coalesce & Audio
    initRoamAndPolaroid(); // Init Roam & Polaroid
    initSettings(false); // Init Settings (不显示模态框)
    initIdleRotation(); // Init Idle Rotation
    initLayoutControls(); // Init Layout Controls
    initExperienceOverlays(); // Intro/Outro overlays
    initTopControlExtras(); // Revisit mode & toolbar toggle
    
    // Setup infinite scroll
    chatListContainer.addEventListener('scroll', handleScroll);
    
    // Initialize Sidebar Controls
    initSidebarControls();

    loadingEl.style.display = 'none';

    // Start at the beginning (First Day)
    const slider = document.getElementById('time-slider');
    if (slider) {
        slider.value = 0;
        // Trigger input event manually to update graph
        slider.dispatchEvent(new Event('input'));
    }

    // 自动初始化音效（在用户首次交互时）
    if (!isMuted) {
        const initAudioOnInteraction = () => {
            initAudio();
            console.log('🔊 氛围音效已自动初始化');
            // 移除监听器（只需初始化一次）
            document.removeEventListener('click', initAudioOnInteraction);
            document.removeEventListener('touchstart', initAudioOnInteraction);
            document.removeEventListener('keydown', initAudioOnInteraction);
        };

        // 监听用户的首次交互
        document.addEventListener('click', initAudioOnInteraction, { once: true });
        document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
        document.addEventListener('keydown', initAudioOnInteraction, { once: true });
    }
}

// --- Settings Logic ---
function initSettings(showModal = false) {
    console.log('🔧 [DEBUG] initSettings called, showModal:', showModal);

    // Load from localStorage
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        try {
            appSettings = { ...appSettings, ...JSON.parse(saved) };
        } catch(e) { console.error('Failed to load settings', e); }
    }

    // Apply initial settings
    applySettings();

    // Bind UI
    const btn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('close-settings');

    if (!modal) {
        console.error('❌ [DEBUG] Settings modal not found!');
        return;
    }

    // 🔧 只有在用户主动点击时才显示模态框
    if (showModal) {
        } else {
        return; // 不显示模态框
    }

    // Sync UI with current state
    const bgmVol = document.getElementById('bgm-vol');
    const sfxVol = document.getElementById('sfx-vol');
    const pageTitleInput = document.getElementById('page-title-input');
    const pageIconInput = document.getElementById('page-icon-input');
    const sidebarTitleInput = document.getElementById('sidebar-title-input');
    const sidebarIconInput = document.getElementById('sidebar-icon-input');
    const sfxEnabled = document.getElementById('sfx-enabled');
    const uiTransparency = document.getElementById('ui-transparency');
    const showSubtitles = document.getElementById('show-subtitles');
    const loopSubtitles = document.getElementById('loop-subtitles');
    const subtitleDuration = document.getElementById('subtitle-duration');
    const subtitleFadeIn = document.getElementById('subtitle-fadein');
    const subtitleFadeOut = document.getElementById('subtitle-fadeout');
    const roamSpeed = document.getElementById('roam-speed');
    const rotateSpeed = document.getElementById('rotate-speed');
    const idleTime = document.getElementById('idle-time');
    const idleSpeed = document.getElementById('idle-speed');
    const idleRotationEnabled = document.getElementById('idle-rotation-enabled');
    const hoverHighlightEnabled = document.getElementById('hover-highlight-enabled');
    const highlightDuration = document.getElementById('highlight-duration');
    const linkOpacity = document.getElementById('link-opacity');
    const linkWidth = document.getElementById('link-width');

    if (bgmVol) bgmVol.value = appSettings.bgmVolume;
    const bgmVolVal = document.getElementById('bgm-vol-val');
    if (bgmVolVal) bgmVolVal.innerText = appSettings.bgmVolume + '%';

    if (sfxVol) sfxVol.value = appSettings.sfxVolume;
    const sfxVolVal = document.getElementById('sfx-vol-val');
    if (sfxVolVal) sfxVolVal.innerText = appSettings.sfxVolume + '%';

    if (pageTitleInput) pageTitleInput.value = appSettings.pageTitle;
    if (pageIconInput) pageIconInput.value = appSettings.pageIcon;
    if (sidebarTitleInput) sidebarTitleInput.value = appSettings.sidebarTitle;
    if (sidebarIconInput) sidebarIconInput.value = appSettings.sidebarIcon;
    if (sfxEnabled) sfxEnabled.checked = appSettings.sfxEnabled;
    if (uiTransparency) uiTransparency.value = appSettings.uiTransparency || 0.95;
    const uiTransparencyVal = document.getElementById('ui-transparency-val');
    if (uiTransparencyVal) uiTransparencyVal.innerText = appSettings.uiTransparency || 0.95;
    if (showSubtitles) showSubtitles.checked = appSettings.showSubtitles;
    if (loopSubtitles) loopSubtitles.checked = appSettings.subtitleLoop;
    if (subtitleDuration) subtitleDuration.value = appSettings.subtitleDuration;
    const subtitleDurationVal = document.getElementById('subtitle-duration-val');
    if (subtitleDurationVal) subtitleDurationVal.innerText = appSettings.subtitleDuration + 's';
    if (subtitleFadeIn) subtitleFadeIn.value = appSettings.subtitleFadeIn;
    const subtitleFadeInVal = document.getElementById('subtitle-fadein-val');
    if (subtitleFadeInVal) subtitleFadeInVal.innerText = appSettings.subtitleFadeIn + 's';
    if (subtitleFadeOut) subtitleFadeOut.value = appSettings.subtitleFadeOut;
    const subtitleFadeOutVal = document.getElementById('subtitle-fadeout-val');
    if (subtitleFadeOutVal) subtitleFadeOutVal.innerText = appSettings.subtitleFadeOut + 's';
    if (roamSpeed) roamSpeed.value = appSettings.roamSpeed;
    const roamSpeedVal = document.getElementById('roam-speed-val');
    if (roamSpeedVal) roamSpeedVal.innerText = appSettings.roamSpeed + 's';
    if (rotateSpeed) rotateSpeed.value = appSettings.rotateSpeed;
    const rotateSpeedVal = document.getElementById('rotate-speed-val');
    if (rotateSpeedVal) rotateSpeedVal.innerText = appSettings.rotateSpeed;
    if (idleTime) idleTime.value = appSettings.idleTime;
    const idleTimeVal = document.getElementById('idle-time-val');
    if (idleTimeVal) idleTimeVal.innerText = appSettings.idleTime + 's';
    if (idleSpeed) idleSpeed.value = appSettings.idleSpeed;
    const idleSpeedVal = document.getElementById('idle-speed-val');
    if (idleSpeedVal) idleSpeedVal.innerText = appSettings.idleSpeed;
    if (idleRotationEnabled) idleRotationEnabled.checked = appSettings.idleRotationEnabled;
    if (hoverHighlightEnabled) hoverHighlightEnabled.checked = appSettings.hoverHighlight || false;
    if (highlightDuration) highlightDuration.value = appSettings.highlightDuration !== undefined ? appSettings.highlightDuration : 5;
    const highlightDurationVal = document.getElementById('highlight-duration-val');
    if (highlightDurationVal) highlightDurationVal.innerText = (appSettings.highlightDuration !== undefined ? appSettings.highlightDuration : 5) + 's';
    if (linkOpacity) linkOpacity.value = appSettings.defaultLinkOpacity !== undefined ? appSettings.defaultLinkOpacity : 0.05;
    const linkOpacityVal = document.getElementById('link-opacity-val');
    if (linkOpacityVal) linkOpacityVal.innerText = appSettings.defaultLinkOpacity !== undefined ? appSettings.defaultLinkOpacity : 0.05;
    if (linkWidth) linkWidth.value = appSettings.defaultLinkWidth !== undefined ? appSettings.defaultLinkWidth : 0.2;
    const linkWidthVal = document.getElementById('link-width-val');
    if (linkWidthVal) linkWidthVal.innerText = appSettings.defaultLinkWidth !== undefined ? appSettings.defaultLinkWidth : 0.2;

    // 🔧 强制显示模态框（使用高 z-index 确保可见）
    modal.style.display = 'flex';
    modal.style.zIndex = '10000';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0, 0, 0, 0.7)';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';

    // 🔧 始终绑定关闭按钮和模态框点击事件（不依赖 settings-btn）
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            }
    });

    // 🔧 始终绑定表情选择器按钮
    document.querySelectorAll('.emoji-btn').forEach(emojiBtn => {
        emojiBtn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.target;
            const input = document.getElementById(targetId);
            showEmojiPicker(e.target, input);
        });
    });

    // 🔧 始终绑定所有输入框的事件监听器
    document.getElementById('bgm-vol').addEventListener('input', (e) => {
        appSettings.bgmVolume = parseInt(e.target.value);
        document.getElementById('bgm-vol-val').innerText = appSettings.bgmVolume + '%';
        applySettings();
    });

    document.getElementById('sfx-vol').addEventListener('input', (e) => {
        appSettings.sfxVolume = parseInt(e.target.value);
        document.getElementById('sfx-vol-val').innerText = appSettings.sfxVolume + '%';
        applySettings();
    });

    document.getElementById('sfx-enabled').addEventListener('change', (e) => {
        appSettings.sfxEnabled = e.target.checked;
        applySettings();
    });

    document.getElementById('page-title-input').addEventListener('input', (e) => {
        appSettings.pageTitle = e.target.value;
        applySettings();
    });

    document.getElementById('page-icon-input').addEventListener('input', (e) => {
        appSettings.pageIcon = e.target.value;
        applySettings();
    });

    document.getElementById('sidebar-title-input').addEventListener('input', (e) => {
        appSettings.sidebarTitle = e.target.value;
        applySettings();
    });

    document.getElementById('sidebar-icon-input').addEventListener('input', (e) => {
        appSettings.sidebarIcon = e.target.value;
        applySettings();
    });

    document.getElementById('ui-transparency').addEventListener('input', (e) => {
        appSettings.uiTransparency = parseFloat(e.target.value);
        document.getElementById('ui-transparency-val').innerText = appSettings.uiTransparency;
        applySettings();
    });

    document.getElementById('show-subtitles').addEventListener('change', (e) => {
        appSettings.showSubtitles = e.target.checked;
        applySettings();
    });

    document.getElementById('loop-subtitles').addEventListener('change', (e) => {
        appSettings.subtitleLoop = e.target.checked;
        applySettings();
    });

    document.getElementById('subtitle-duration').addEventListener('input', (e) => {
        appSettings.subtitleDuration = parseInt(e.target.value);
        document.getElementById('subtitle-duration-val').innerText = appSettings.subtitleDuration + 's';
        applySettings();
    });

    document.getElementById('subtitle-fadein').addEventListener('input', (e) => {
        appSettings.subtitleFadeIn = parseFloat(e.target.value);
        document.getElementById('subtitle-fadein-val').innerText = appSettings.subtitleFadeIn + 's';
        applySettings();
    });

    document.getElementById('subtitle-fadeout').addEventListener('input', (e) => {
        appSettings.subtitleFadeOut = parseFloat(e.target.value);
        document.getElementById('subtitle-fadeout-val').innerText = appSettings.subtitleFadeOut + 's';
        applySettings();
    });

    document.getElementById('roam-speed').addEventListener('input', (e) => {
        appSettings.roamSpeed = parseInt(e.target.value);
        document.getElementById('roam-speed-val').innerText = appSettings.roamSpeed + 's';
        applySettings();
    });

    document.getElementById('rotate-speed').addEventListener('input', (e) => {
        appSettings.rotateSpeed = parseFloat(e.target.value);
        document.getElementById('rotate-speed-val').innerText = appSettings.rotateSpeed;
        applySettings();
    });

    document.getElementById('idle-time').addEventListener('input', (e) => {
        appSettings.idleTime = parseInt(e.target.value);
        document.getElementById('idle-time-val').innerText = appSettings.idleTime + 's';
        resetIdleTimer();
        applySettings();
    });

    document.getElementById('idle-speed').addEventListener('input', (e) => {
        appSettings.idleSpeed = parseFloat(e.target.value);
        document.getElementById('idle-speed-val').innerText = appSettings.idleSpeed;
        applySettings();
    });

    document.getElementById('idle-rotation-enabled').addEventListener('change', (e) => {
        appSettings.idleRotationEnabled = e.target.checked;
        resetIdleTimer();
        applySettings();
    });

    document.getElementById('hover-highlight-enabled').addEventListener('change', (e) => {
        appSettings.hoverHighlight = e.target.checked;
        applySettings();
    });

    document.getElementById('highlight-duration').addEventListener('input', (e) => {
        appSettings.highlightDuration = parseInt(e.target.value);
        document.getElementById('highlight-duration-val').innerText = appSettings.highlightDuration + 's';
        applySettings();
    });

    document.getElementById('link-opacity').addEventListener('input', (e) => {
        appSettings.defaultLinkOpacity = parseFloat(e.target.value);
        document.getElementById('link-opacity-val').innerText = appSettings.defaultLinkOpacity;
        applySettings();
    });

    document.getElementById('link-width').addEventListener('input', (e) => {
        appSettings.defaultLinkWidth = parseFloat(e.target.value);
        document.getElementById('link-width-val').innerText = appSettings.defaultLinkWidth;
        applySettings();
    });

    // 如果有 settings-btn 元素，为其添加点击事件（向后兼容）
    if (btn) {
        btn.addEventListener('click', () => {
            // Sync UI with current state (重复同步，确保数据一致)
            document.getElementById('bgm-vol').value = appSettings.bgmVolume;
            document.getElementById('bgm-vol-val').innerText = appSettings.bgmVolume + '%';
            document.getElementById('sfx-vol').value = appSettings.sfxVolume;
            document.getElementById('sfx-vol-val').innerText = appSettings.sfxVolume + '%';
            document.getElementById('page-title-input').value = appSettings.pageTitle;
            document.getElementById('page-icon-input').value = appSettings.pageIcon;
            document.getElementById('sidebar-title-input').value = appSettings.sidebarTitle;
            document.getElementById('sidebar-icon-input').value = appSettings.sidebarIcon;
            document.getElementById('sfx-enabled').checked = appSettings.sfxEnabled;
            document.getElementById('ui-transparency').value = appSettings.uiTransparency || 0.95;
            document.getElementById('ui-transparency-val').innerText = appSettings.uiTransparency || 0.95;
            document.getElementById('show-subtitles').checked = appSettings.showSubtitles;
            document.getElementById('loop-subtitles').checked = appSettings.subtitleLoop;
            document.getElementById('subtitle-duration').value = appSettings.subtitleDuration;
            document.getElementById('subtitle-duration-val').innerText = appSettings.subtitleDuration + 's';
            document.getElementById('subtitle-fadein').value = appSettings.subtitleFadeIn;
            document.getElementById('subtitle-fadein-val').innerText = appSettings.subtitleFadeIn + 's';
            document.getElementById('subtitle-fadeout').value = appSettings.subtitleFadeOut;
            document.getElementById('subtitle-fadeout-val').innerText = appSettings.subtitleFadeOut + 's';
            document.getElementById('roam-speed').value = appSettings.roamSpeed;
            document.getElementById('roam-speed-val').innerText = appSettings.roamSpeed + 's';
            document.getElementById('rotate-speed').value = appSettings.rotateSpeed;
            document.getElementById('rotate-speed-val').innerText = appSettings.rotateSpeed;
            document.getElementById('idle-time').value = appSettings.idleTime;
            document.getElementById('idle-time-val').innerText = appSettings.idleTime + 's';
            document.getElementById('idle-speed').value = appSettings.idleSpeed;
            document.getElementById('idle-speed-val').innerText = appSettings.idleSpeed;
            document.getElementById('idle-rotation-enabled').checked = appSettings.idleRotationEnabled;
            document.getElementById('hover-highlight-enabled').checked = appSettings.hoverHighlight || false;
            document.getElementById('highlight-duration').value = appSettings.highlightDuration !== undefined ? appSettings.highlightDuration : 5;
            document.getElementById('highlight-duration-val').innerText = (appSettings.highlightDuration !== undefined ? appSettings.highlightDuration : 5) + 's';
            document.getElementById('link-opacity').value = appSettings.defaultLinkOpacity !== undefined ? appSettings.defaultLinkOpacity : 0.05;
            document.getElementById('link-opacity-val').innerText = appSettings.defaultLinkOpacity !== undefined ? appSettings.defaultLinkOpacity : 0.05;
            document.getElementById('link-width').value = appSettings.defaultLinkWidth !== undefined ? appSettings.defaultLinkWidth : 0.2;
            document.getElementById('link-width-val').innerText = appSettings.defaultLinkWidth !== undefined ? appSettings.defaultLinkWidth : 0.2;

            // Show modal with forced styles
            modal.style.display = 'flex';
            modal.style.zIndex = '10000';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0, 0, 0, 0.7)';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            });
    } else {
        console.log('📋 [DEBUG] No settings-btn element found (using direct call)');
    }
}

function showEmojiPicker(btn, input) {
    // Remove existing
    const existing = document.querySelector('.emoji-picker-popover');
    if (existing) existing.remove();
    
    const picker = document.createElement('div');
    picker.className = 'emoji-picker-popover';
    
    const emojis = ['🌌', '✨', '🌟', '🌙', '🪐', '💫', '🚀', '🛸', '💬', '📱', '💭', '🎨', '🎮', '📷', '🎵']; // 🔧 改为通用emoji，去除情侣相关
    
    emojis.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'emoji-item';
        item.innerText = emoji;
        item.onclick = () => {
            input.value = emoji;
            input.dispatchEvent(new Event('input')); // Trigger change
            picker.remove();
        };
        picker.appendChild(item);
    });
    
    // Position
    const rect = btn.getBoundingClientRect();
    picker.style.position = 'fixed'; // 🔧 显式设置为fixed定位
    picker.style.top = (rect.bottom + 5) + 'px';
    picker.style.left = rect.left + 'px';
    picker.style.zIndex = '99999'; // 🔧 确保在所有元素之上（包括侧边栏和modal）

    document.body.appendChild(picker);
    
    // Close on click outside
    const closeHandler = (e) => {
        if (!picker.contains(e.target) && e.target !== btn) {
            picker.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function applySettings() {
    // Save
    localStorage.setItem('appSettings', JSON.stringify(appSettings));

    // Transparency 保留变量供其他地方使用
    const opacity = appSettings.uiTransparency !== undefined ? appSettings.uiTransparency : 0.95;
    document.documentElement.style.setProperty('--glass-opacity', opacity);

    // 🔧 透明度太高或太低时，调整文字颜色确保可读性
    if (opacity > 0.7) {
        // 透明度高 → 背景浅 → 文字用深色
        document.body.classList.remove('transparent-ui');
        document.documentElement.style.setProperty('--text-main', '#2c2c2c');
        document.documentElement.style.setProperty('--text-secondary', '#666666');
        document.documentElement.style.setProperty('--sidebar-text', '#1a1a1a'); // 🔧 侧边栏文字也用深色
    } else if (opacity < 0.3) {
        // 透明度低 → 背景深 → 文字用浅色
        document.body.classList.add('transparent-ui');
        document.documentElement.style.setProperty('--text-main', '#f0f0f0');
        document.documentElement.style.setProperty('--text-secondary', '#cccccc');
        document.documentElement.style.setProperty('--sidebar-text', '#f0f0f0'); // 🔧 侧边栏文字也用浅色
    } else {
        // 中等透明度 → 使用配色方案的默认文字颜色
        document.body.classList.remove('transparent-ui');
        // 主题系统已由 ThemeManager 接管
    }

    // 1. Audio
    if (ambientGain) {
        // 🔧 更新基础音量（从0.3降到0.2，避免削波）
        const base = 0.2;
        ambientGain.gain.setTargetAtTime(base * (appSettings.bgmVolume / 100), audioCtx.currentTime, 0.1);
    }

    // 2. Appearance
    document.title = appSettings.pageTitle;
    setFavicon(appSettings.pageIcon);
    
    const sidebarHeader = document.querySelector('#sidebar h2');
    if (sidebarHeader) {
        // Check if icon span exists
        let iconSpan = sidebarHeader.querySelector('.header-icon');
        if (!iconSpan) {
            iconSpan = document.createElement('span');
            iconSpan.className = 'header-icon';
            iconSpan.style.marginRight = '10px';
            sidebarHeader.prepend(iconSpan);
        }
        iconSpan.innerText = appSettings.sidebarIcon;
        // Update text node (last child usually)
        if (sidebarHeader.childNodes.length > 1) {
             sidebarHeader.childNodes[sidebarHeader.childNodes.length - 1].textContent = ' ' + appSettings.sidebarTitle;
        } else {
             sidebarHeader.innerText = appSettings.sidebarIcon + ' ' + appSettings.sidebarTitle;
        }
    }
    
    // 3. Animation
    if (Graph) {
        // Update link opacity and other visuals
        updateGraphVisuals();

        // If idle rotation is active, don't overwrite it with base speed
        if (!isIdleRotating) {
            const shouldRotate = appSettings.rotateSpeed > 0;
            Graph.controls().autoRotate = shouldRotate;
            Graph.controls().autoRotateSpeed = appSettings.rotateSpeed;
        }
    }
}

// --- Experience Overlays ---
function initExperienceOverlays() {
    introOverlay = document.getElementById('intro-overlay');
    outroOverlay = document.getElementById('outro-overlay');
    const startBtn = document.getElementById('start-experience-btn');
    const endingBtn = document.getElementById('ending-btn');
    const stayBtn = document.getElementById('stay-btn');
    const returnBtn = document.getElementById('return-btn');

    const showOverlay = (overlay) => {
        if (!overlay) return;
        overlay.classList.remove('hidden', 'fade-out');
        // Small delay to allow CSS transition
        requestAnimationFrame(() => overlay.classList.add('visible'));
    };

    const hideOverlay = (overlay) => {
        if (!overlay) return;
        overlay.classList.remove('visible');
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.classList.add('hidden'), 600);
    };

    if (introOverlay && startBtn) {
        // Show intro after data ready
        // 🚫 禁用自动显示覆盖层以避免遮挡UI
        // setTimeout(() => showOverlay(introOverlay), 200);
        Log.info('UI', 'Intro overlay auto-show disabled');
        startBtn.addEventListener('click', () => hideOverlay(introOverlay));
    }

    if (endingBtn && outroOverlay) {
        endingBtn.addEventListener('click', () => showOverlay(outroOverlay));
    }

    if (stayBtn && outroOverlay) {
        // Keep outro open; give light feedback but don't close
        stayBtn.addEventListener('click', () => {
            showToast('再停留一会儿吧，这片星海会等你。', 'info');
        });
    }

    if (returnBtn && outroOverlay) {
        returnBtn.addEventListener('click', () => hideOverlay(outroOverlay));
    }
}

// --- Idle Rotation Logic ---
let idleTimer = null;
let isIdleRotating = false;

function getBaseForceConfig() {
    return {
        charge: FORCE_BASE.charge,
        radialStrength: FORCE_BASE.radialStrength,
        radialRadius: metaData?.layout?.layout_radius || FORCE_BASE.radialRadius
    };
}

// ==================== Bloom/Coalesce Helpers ====================

/**
 * 保存当前的力场配置
 * 在修改力场之前调用，确保可以恢复到修改前的状态
 */
function saveOriginalForceConfig() {
    if (!Graph) {
        console.warn('[saveOriginalForceConfig] Graph not initialized');
        return;
    }

    const chargeForce = Graph.d3Force('charge');
    const radialForce = Graph.d3Force('radial');

    // 获取当前实际的力场值（而非基础配置值）
    originalForceConfig = {
        charge: chargeForce && typeof chargeForce.strength === 'function'
            ? chargeForce.strength()
            : getBaseForceConfig().charge,
        radialStrength: radialForce && typeof radialForce.strength === 'function'
            ? radialForce.strength()
            : getBaseForceConfig().radialStrength,
        radialRadius: radialForce && typeof radialForce.radius === 'function'
            ? radialForce.radius()
            : getBaseForceConfig().radialRadius
    };

    console.log('[saveOriginalForceConfig] Saved config:', originalForceConfig);
}

/**
 * 执行凝聚操作
 * 节点向中心聚集，形成紧密的星系团
 */
function performCoalesce() {
    if (!Graph) {
        showToast('3D图形未加载', 'error');
        return;
    }

    // 1. 保存原始配置
    saveOriginalForceConfig();

    // 2. 释放所有节点的固定位置
    const nodes = Graph.graphData().nodes;
    nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
        node.fz = null;
    });

    // 3. 修改力场参数：减少排斥力，增强向心力
    const chargeForce = Graph.d3Force('charge');
    if (chargeForce && typeof chargeForce.strength === 'function') {
        // 🔧 使用绝对值而非乘数，参考 refactor 分支
        chargeForce.strength(-50); // 显著降低排斥力（从 -500 降至 -50）
    }

    const radialForce = Graph.d3Force('radial');
    if (radialForce && typeof radialForce.strength === 'function') {
        radialForce.strength(0.15); // 增强向心力（从 0.02 增至 0.15）
    }
    if (radialForce && typeof radialForce.radius === 'function') {
        radialForce.radius(200); // 缩小凝聚半径
    }

    // 4. 更新状态
    isCoalesced = true;
    updateCoalesceButton(true);

    // 5. 重新启动模拟，使节点移动到新平衡位置
    restartSimulation();

    // 6. 视觉和音效反馈
    showToast('✨ 星系已凝聚！点击按钮可扩散', 'info');
    playToggleSound();

    console.log('[performCoalesce] Nodes coalesced');
}

/**
 * 执行扩散操作
 * 节点恢复到原始的分散状态，形成完整的星系
 */
function uncoalesceNodes() {
    if (!Graph || !originalForceConfig) {
        console.warn('[uncoalesceNodes] Cannot uncoalesce: Graph not ready or no saved config');
        return;
    }

    // 1. 恢复原始力场配置
    const chargeForce = Graph.d3Force('charge');
    if (chargeForce && typeof chargeForce.strength === 'function') {
        chargeForce.strength(originalForceConfig.charge);
    }

    const radialForce = Graph.d3Force('radial');
    if (radialForce && typeof radialForce.strength === 'function') {
        radialForce.strength(originalForceConfig.radialStrength);
    }
    if (radialForce && typeof radialForce.radius === 'function') {
        radialForce.radius(originalForceConfig.radialRadius);
    }

    // 2. 更新状态
    isCoalesced = false;
    updateCoalesceButton(false);

    // 3. 重新启动模拟，使节点扩散到新平衡位置
    restartSimulation();

    // 4. 视觉和音效反馈
    playToggleSound();
    showToast('🌌 星系已扩散！点击按钮可凝聚', 'info');

    console.log('[uncoalesceNodes] Nodes uncoalesced');
}

/**
 * 更新凝聚按钮的视觉状态
 * @param {boolean} isCoalescedState - 当前是否处于凝聚状态
 */
function updateCoalesceButton(isCoalescedState) {
    const btn = document.getElementById('coalesce-btn');
    if (!btn) {
        console.warn('[updateCoalesceButton] coalesce-btn not found');
        return;
    }

    if (isCoalescedState) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="ri-expand-left-line"></i><span>扩散</span>';
        btn.title = '点击扩散星系';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="ri-contract-left-line"></i><span>凝聚</span>';
        btn.title = '凝聚回忆';
    }
}

// ==================== End Bloom/Coalesce Helpers ====================

/**
 * 重新启动物理模拟
 * 🔧 通过重新设置相同的数据来触发模拟重启
 * 避免使用 d3AlphaTarget()，兼容性更好
 */
function restartSimulation() {
    if (!Graph) return;

    // 通过重新设置相同的数据来触发模拟重启
    const currentData = Graph.graphData();
    Graph.graphData(currentData);
}

/**
 * 重新加热模拟（备用方法，保留向后兼容）
 * @deprecated 使用 restartSimulation() 代替
 */
function reheatSimulation(_alphaTarget = 0.4, _coolDelay = 2500) {
    // 使用 restartSimulation 替代 d3AlphaTarget，避免兼容性问题
    restartSimulation();
}

function initIdleRotation() {
    // 防抖处理 - 避免频繁重置
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 100; // 100ms防抖延迟

    const reset = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            resetIdleTimer();
        }, DEBOUNCE_DELAY);
    };

    // 监听用户活动事件
    window.addEventListener('mousemove', reset);
    window.addEventListener('mousedown', reset);
    window.addEventListener('touchstart', reset);
    window.addEventListener('keydown', reset);
    window.addEventListener('wheel', reset);

    // 初始化闲置检测
    resetIdleTimer();
}

function resetIdleTimer() {
    // 闲置模式下，允许退出（即使正在漫游）
    // 只有用户手动开启的漫游（非闲置模式）才不干扰
    if (isRoaming && !isIdleRotating) return;

    // 清除之前的定时器
    if (idleTimer) clearTimeout(idleTimer);

    // 如果当前处于闲置旋转状态，需要退出
    if (isIdleRotating) {
        exitIdleRotation();
    }

    // 只在启用时启动闲置检测
    if (appSettings.idleRotationEnabled) {
        idleTimer = setTimeout(() => {
            if (!isRoaming && Graph) {
                enterIdleRotation();
            }
        }, appSettings.idleTime * 1000);
    }
}

/**
 * 进入闲置漫游模式
 */
function enterIdleRotation() {
    if (isIdleRotating) return; // 已经在闲置模式中

    isIdleRotating = true;

    // ========== 保存右侧功能侧边栏状态 ==========
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (sidebar) {
        // 检查侧边栏是否打开
        const wasOpen = sidebar.classList.contains('active');
        sessionStorage.setItem('idle_right_sidebar_was_open', wasOpen ? 'true' : 'false');

        // 隐藏右侧功能侧边栏（如果打开了）
        if (wasOpen) {
            sidebar.classList.remove('active');
            sidebar.style.right = '-280px';
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }

        // 隐藏侧边栏切换按钮
        if (sidebarToggle) {
            sidebarToggle.style.display = 'none';
        }
    }

    // ========== 保存左侧消息侧边栏状态（移动端重要） ==========
    const messageSidebar = document.getElementById('message-sidebar');
    if (messageSidebar) {
        const wasCollapsed = messageSidebar.classList.contains('collapsed');
        sessionStorage.setItem('idle_left_sidebar_was_collapsed', wasCollapsed ? 'true' : 'false');

        // 在闲置模式下，如果左侧边栏是展开的，则折叠它以提供更好的视觉体验
        if (!wasCollapsed) {
            messageSidebar.classList.add('collapsed');
            // 同时更新 body 的状态类
            document.body.classList.add('message-sidebar-collapsed');
        }
    }

    // 启用漫游模式（替代自动旋转，因为旋转效果不明显）
    if (Graph && !isRoaming) {
        startRoaming();
    }

    // 提示用户
    showToast(
        `💤 闲置检测：${appSettings.idleTime}秒无操作，已启用漫游模式（移动鼠标恢复）`,
        'info',
        4000 // 显示4秒
    );

    // 降低UI透明度，营造"睡眠"效果
    document.body.classList.add('idle-mode');
}

/**
 * 退出闲置漫游模式
 */
function exitIdleRotation() {
    if (!isIdleRotating) return; // 不在闲置模式中

    isIdleRotating = false;

    // 停止漫游模式
    if (Graph && isRoaming) {
        stopRoaming();
    }

    // 恢复基础旋转设置
    if (Graph) {
        const shouldRotate = appSettings.rotateSpeed > 0;
        Graph.controls().autoRotate = shouldRotate;
        Graph.controls().autoRotateSpeed = appSettings.rotateSpeed;
    }

    // ========== 恢复右侧功能侧边栏状态 ==========
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    // 显示侧边栏切换按钮
    if (sidebarToggle) {
        sidebarToggle.style.display = 'flex';
    }

    // 恢复侧边栏之前的状态
    const wasRightSidebarOpen = sessionStorage.getItem('idle_right_sidebar_was_open') === 'true';
    if (sidebar && wasRightSidebarOpen) {
        sidebar.classList.add('active');
        sidebar.style.right = '0';
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        isSidebarOpen = true;
    } else if (sidebar) {
        // 如果之前是关闭的，确保保持关闭状态
        sidebar.style.right = '-280px';
        isSidebarOpen = false;
    }

    // ========== 恢复左侧消息侧边栏状态（移动端重要） ==========
    const messageSidebar = document.getElementById('message-sidebar');
    if (messageSidebar) {
        const wasLeftSidebarCollapsed = sessionStorage.getItem('idle_left_sidebar_was_collapsed') === 'true';

        if (wasLeftSidebarCollapsed) {
            // 如果之前是折叠的，保持折叠状态
            messageSidebar.classList.add('collapsed');
            document.body.classList.add('message-sidebar-collapsed');
        } else {
            // 如果之前是展开的，恢复展开状态
            messageSidebar.classList.remove('collapsed');
            document.body.classList.remove('message-sidebar-collapsed');
        }

        // 清除 sessionStorage 中的状态
        sessionStorage.removeItem('idle_left_sidebar_was_collapsed');
    }

    // 清除右侧边栏的状态
    sessionStorage.removeItem('idle_right_sidebar_was_open');

    // 移除闲置模式样式
    document.body.classList.remove('idle-mode');

    // 可选：显示退出提示（为了避免打扰，可以注释掉）
    // showToast('✨ 已恢复正常模式', 'success', 2000);
}

// --- Audio System ---
async function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        // 🔧 确保音频上下文始终运行（解决卡顿问题）
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
            console.log('🔊 AudioContext resumed');
        }

        // 🔧 双重检查：确保上下文正在运行
        if (audioCtx.state === 'running') {
            isMuted = false;

            // 更新按钮状态（如果存在）
            const musicBtn = document.getElementById('music-btn');
            if (musicBtn) {
                musicBtn.innerHTML = '<i class="ri-volume-up-line"></i>';
                musicBtn.classList.add('active');
            }

            // 更新侧边栏开关状态
            const musicToggle = document.getElementById('music-toggle');
            if (musicToggle) {
                musicToggle.checked = true;
            }

            startAmbientMusic();
            showToast('已切换至：空灵呼吸·舒缓旋律', 'success');
        } else {
            console.warn('⚠️ AudioContext state:', audioCtx.state);
            showToast('音频启动失败，请点击页面重试', 'error');
        }
    } catch (error) {
        console.error('音频初始化失败:', error);
        showToast('音频初始化失败，请稍后重试', 'error');
    }
}

function startAmbientMusic() {
    if (isMuted || !audioCtx) return;

    // 🔧 确保AudioContext正在运行
    if (audioCtx.state !== 'running') {
        console.warn('⚠️ AudioContext not running, state:', audioCtx.state);
        audioCtx.resume().catch(console.error);
    }

    stopAmbientMusic();

    // Master Ambient Chain: Nodes -> Filter -> Gain -> Destination
    ambientGain = audioCtx.createGain();

    // 🔧 降低基础音量避免削波（从0.3降到0.2）
    const base = 0.2;
    ambientGain.gain.value = base * (appSettings.bgmVolume / 100);

    // Lowpass filter for "muffled/ethereal" sound
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600; // Reduced from 800 for softer tone

    ambientGain.connect(filter);
    filter.connect(audioCtx.destination);

    // 1. Breathing Pad (Background Chords)
    // Chord: Cmaj9 (C, E, G, B, D) spread out
    const padNotes = [130.81, 196.00, 246.94, 293.66]; // C3, G3, B3, D4
    padNotes.forEach((freq, i) => {
        createBreathingDrone(freq, filter, i * 500);
    });

    // 2. Ethereal Melody (Random notes)
    playEtherealMelody(filter);

    // 🔧 启动定期状态检查（每5秒检查一次）
    startAudioHealthCheck();
}

function createBreathingDrone(freq, destination, delay) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.value = 0;
    
    osc.connect(gain);
    gain.connect(destination);
    osc.start();
    
    const nodeRef = { osc, gain, stop: () => { 
        try { 
            // Ramp down to avoid click on stop
            const now = audioCtx.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.stop(now + 0.1); 
            setTimeout(() => { osc.disconnect(); gain.disconnect(); }, 150);
        } catch(e){} 
    }};
    ambientNodes.push(nodeRef);
    
    // Breathing loop
    const breathe = () => {
        if (!ambientGain) return; // Stopped
        const now = audioCtx.currentTime;
        const inhale = 4 + Math.random() * 4; // Slower breathing
        const exhale = 4 + Math.random() * 4;
        
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.08, now + inhale); // Reduced peak gain from 0.15
        gain.gain.linearRampToValueAtTime(0.01, now + inhale + exhale); // Breathe out
        
        nodeRef.timer = setTimeout(breathe, (inhale + exhale) * 1000);
    };
    
    setTimeout(breathe, delay);
}

function playEtherealMelody(destination) {
    // Pentatonic Scale C Major: C, D, E, G, A
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; 
    
    const playNext = () => {
        if (!ambientGain) return;
        
        const freq = scale[Math.floor(Math.random() * scale.length)];
        const now = audioCtx.currentTime;
        const duration = 4.0; // Longer duration
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine'; // Changed from triangle to sine for softer tone
        osc.frequency.value = freq;
        
        // Bell-like envelope but slower
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 1.0); // Slower attack, lower volume
        gain.gain.linearRampToValueAtTime(0, now + duration); // Linear ramp to 0 to avoid click
        
        osc.connect(gain);
        gain.connect(destination);
        
        osc.start();
        osc.stop(now + duration + 0.1);
        
        const nextTime = 3000 + Math.random() * 5000; // Sparse melody
        melodyTimer = setTimeout(playNext, nextTime);
    };
    
    playNext();
}

function stopAmbientMusic() {
    // 🔧 停止健康检查
    if (window.audioHealthCheckTimer) {
        clearInterval(window.audioHealthCheckTimer);
        window.audioHealthCheckTimer = null;
    }

    if (melodyTimer) clearTimeout(melodyTimer);
    ambientNodes.forEach(n => {
        if (n.timer) clearTimeout(n.timer);
        n.stop();
    });
    ambientNodes = [];
    if (ambientGain) {
        ambientGain.disconnect();
        ambientGain = null;
    }
}

// 🔧 新增：音频健康检查机制（每5秒检查一次AudioContext状态）
let audioHealthCheckTimer = null;
function startAudioHealthCheck() {
    // 清除旧的定时器
    if (window.audioHealthCheckTimer) {
        clearInterval(window.audioHealthCheckTimer);
    }

    window.audioHealthCheckTimer = setInterval(() => {
        if (audioCtx && !isMuted) {
            if (audioCtx.state === 'suspended') {
                console.warn('⚠️ AudioContext suspended, attempting resume...');
                audioCtx.resume().catch(err => {
                    console.error('❌ Failed to resume AudioContext:', err);
                });
            }
        }
    }, 5000); // 每5秒检查一次
}

function playTone(freq, type, duration, vol = 0.1) {
    if (!appSettings.sfxEnabled || isMuted) return;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 🔧 确保AudioContext运行（使用async方式）
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(err => console.warn('⚠️ Resume failed:', err));
    }

    // Apply SFX Volume Setting
    const sfxScale = appSettings.sfxVolume / 100;
    const finalVol = vol * sfxScale;

    if (finalVol <= 0.001) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(finalVol, audioCtx.currentTime);
    // Use linear ramp to 0 to avoid click at the end
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration + 0.1);
}

function playClickSound() {
    // High pitched "ding"
    playTone(800, 'sine', 0.3, 0.05);
    setTimeout(() => playTone(1200, 'sine', 0.4, 0.03), 50);
}

function playBloomSound() {
    // Swell sound
    if (!appSettings.sfxEnabled || isMuted || !audioCtx) return;
    
    // Apply SFX Volume
    const sfxScale = appSettings.sfxVolume / 100;
    if (sfxScale <= 0.001) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1.5);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1 * sfxScale, audioCtx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
}

function playToggleSound() {
    playTone(520, 'triangle', 0.15, 0.04);
}

function playRevisitSound() {
    playTone(660, 'sine', 0.25, 0.05);
    setTimeout(() => playTone(990, 'sine', 0.18, 0.04), 80);
}

// --- Coalesce Logic ---
function initCoalesceControls() {
    // 🔧 coalesce-btn 已经在 HTML 中通过 onclick="coalesceNodes()" 处理，这里不需要绑定
    const musicBtn = document.getElementById('music-btn');

    if (musicBtn) {
        musicBtn.addEventListener('click', () => {
            if (isMuted) {
                initAudio();
            } else {
                isMuted = true;
                stopAmbientMusic();
                musicBtn.innerHTML = '<i class="ri-volume-mute-line"></i>';
                musicBtn.classList.remove('active');
            }
        });
    }

    // 🔧 coalesce-btn 已经在 HTML 中通过 onclick="coalesceNodes()" 处理
    // 这里不再添加重复的事件监听器
}

function initTopControlExtras() {
    const toggleBtn = document.getElementById('controls-toggle-btn');
    const controlsBar = document.getElementById('top-controls');
    const revisitBtn = document.getElementById('revisit-btn');

    // 如果旧的top-controls不存在，说明已使用新的统一侧边栏系统
    if (!controlsBar) {
        console.log('Using new unified sidebar system - top controls not needed');
        // 仍然处理revisit按钮（如果存在）
        if (revisitBtn) {
            revisitBtn.addEventListener('click', () => {
                if (isRevisitMode) {
                    stopRevisitMode();
                    revisitBtn.classList.remove('active');
                    revisitBtn.innerHTML = '<i class="ri-history-line"></i>';
                    showToast('回访模式已暂停', 'info');
                } else {
                    startRevisitMode();
                    revisitBtn.classList.add('active');
                    revisitBtn.innerHTML = '<i class="ri-history-fill"></i>';
                    showToast('回访模式开启，每隔一段时间带你回到一颗星。', 'success');
                }
                playToggleSound();
            });
        }
        return;
    }

    if (toggleBtn && controlsBar) {
        toggleBtn.addEventListener('click', () => {
            controlsBar.classList.toggle('collapsed');
            playToggleSound();
        });
    }

    if (revisitBtn) {
        revisitBtn.addEventListener('click', () => {
            if (isRevisitMode) {
                stopRevisitMode();
                revisitBtn.classList.remove('active');
                revisitBtn.innerHTML = '<i class="ri-history-line"></i>';
                showToast('回访模式已暂停', 'info');
            } else {
                startRevisitMode();
                revisitBtn.classList.add('active');
                revisitBtn.innerHTML = '<i class="ri-history-fill"></i>';
                showToast('回访模式开启，每隔一段时间带你回到一颗星。', 'success');
            }
            playToggleSound();
        });
    }
}

function startRevisitMode() {
    if (revisitTimer) clearInterval(revisitTimer);
    isRevisitMode = true;
    runRevisitHop();
    revisitTimer = setInterval(runRevisitHop, 25000);
}

function stopRevisitMode() {
    isRevisitMode = false;
    if (revisitTimer) {
        clearInterval(revisitTimer);
        revisitTimer = null;
    }
}

function runRevisitHop() {
    if (!Graph || !graphData || !graphData.nodes.length) return;
    const nodes = Graph.graphData().nodes;
    if (!nodes || !nodes.length) return;
    const targetNode = nodes[Math.floor(Math.random() * nodes.length)];
    if (!targetNode) return;

    playRevisitSound();
    focusOnNode(targetNode.name);
    showToast(`回访：${targetNode.name}`, 'info');

    const distance = 120;
    const distRatio = 1 + distance / Math.hypot(targetNode.x, targetNode.y, targetNode.z);
    const newPos = {
        x: targetNode.x * distRatio,
        y: targetNode.y * distRatio,
        z: targetNode.z * distRatio
    };

    Graph.cameraPosition(newPos, targetNode, 2000);
}

function initTimeTravel() {
    const slider = document.getElementById('time-slider');
    const dateLabel = document.getElementById('current-date');
    const playBtn = document.getElementById('play-btn');
    
    // Optimization: Track last counts to avoid unnecessary updates
    let lastNodeCount = -1;
    let lastLinkCount = -1;
    
    // Set initial date label
    dateLabel.innerText = new Date(timeRange.end).toLocaleDateString();

    function updateTime(percent) {
        const currentTime = timeRange.start + (timeRange.end - timeRange.start) * (percent / 100);
        dateLabel.innerText = new Date(currentTime).toLocaleDateString();
        
        // Filter Graph Nodes
        if (Graph) {
            const { nodes, links } = graphData;
            
            // Filter nodes that appeared before currentTime
            const visibleNodes = nodes.filter(n => (n.first_seen || 0) <= currentTime);
            const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
            
            // Filter links where both source and target are visible AND link itself appeared
            const visibleLinks = links.filter(l => {
                const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                return visibleNodeIds.has(sourceId) && 
                       visibleNodeIds.has(targetId) && 
                       (l.first_seen || 0) <= currentTime;
            });
            
            // Only update graph if data changed
            if (visibleNodes.length !== lastNodeCount || visibleLinks.length !== lastLinkCount) {
                Graph.graphData({
                    nodes: visibleNodes,
                    links: visibleLinks
                });
                lastNodeCount = visibleNodes.length;
                lastLinkCount = visibleLinks.length;
            }
        }
    }
    
    slider.addEventListener('input', (e) => {
        updateTime(e.target.value);
    });
    
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            // Stop
            isPlaying = false;
            clearInterval(playInterval);
            playBtn.innerHTML = '<i class="ri-play-fill"></i>';
        } else {
            // Start
            isPlaying = true;
            playBtn.innerHTML = '<i class="ri-pause-fill"></i>';
            
            // If at end, restart
            if (parseFloat(slider.value) >= 100) {
                slider.value = 0;
            }
            
            playInterval = setInterval(() => {
                let val = parseFloat(slider.value);
                
                // Adaptive Speed Logic
                // 1. Get current visible node count
                const currentNodes = Graph.graphData().nodes.length;
                const totalNodes = graphData.nodes.length || 1;
                
                // 2. Calculate ratio (0.0 to 1.0)
                const ratio = currentNodes / totalNodes;
                
                // 3. Dynamic Step
                // Start fast (1.0), slow down as universe fills up (min 0.1)
                // Formula: Base * (1 - ratio * dampening)
                // Adjusted for 100ms interval (2x slower update rate, so 2x step size)
                let step = 1.0 * (1 - ratio * 0.9);
                
                // Ensure minimum speed so it doesn't stop
                if (step < 0.1) step = 0.1;

                val += step; 
                
                if (val >= 100) {
                    val = 100;
                    isPlaying = false;
                    clearInterval(playInterval);
                    playBtn.innerHTML = '<i class="ri-play-fill"></i>';
                }
                slider.value = val;
                updateTime(val);
            }, 100); // Increased interval to 100ms to reduce lag
        }
    });
}

function handleSearch(query) {
    query = query.trim().toLowerCase();
    
    if (!query) {
        filteredMessages = allMessages;
    } else {
        filteredMessages = allMessages.filter(m => {
            const text = m[3].toLowerCase(); // Message text
            return text.includes(query);
        });
    }
    
    // Reset to first page
    currentPage = 1;
    renderChatList(true);
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`tab-content-${tabName}`);
    activeContent.style.display = 'flex'; // Or block, but flex for layout
    activeContent.classList.add('active');
    
    // Show/Hide sentiment filters based on tab
    const filters = document.getElementById('sentiment-filters');
    if (tabName === 'messages') {
        filters.style.display = 'flex';
    } else {
        filters.style.display = 'none';
    }
}

function renderKeywordRanking() {
    const container = document.getElementById('keyword-ranking-list');
    container.innerHTML = '';
    
    const ranking = metaData.ranking || [];
    
    if (ranking.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">暂无关键词数据</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    ranking.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'keyword-item';
        div.innerHTML = `
            <span class="keyword-rank">${index + 1}</span>
            <span class="keyword-name">${item.name}</span>
            <span class="keyword-count">${item.count}</span>
        `;
        
        div.onclick = () => handleKeywordClick(item);
        fragment.appendChild(div);
    });
    
    container.appendChild(fragment);
}

/**
 * 显示Toast提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型 'info' | 'success' | 'error'
 * @param {number} duration - 显示时长（毫秒），默认3000ms
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ri-information-line';
    if (type === 'success') icon = 'ri-checkbox-circle-line';
    if (type === 'error') icon = 'ri-error-warning-line';

    toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;

    container.appendChild(toast);

    // 在指定时间后移除
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, duration);
}

function handleKeywordClick(item) {
    // If coalesced, any click triggers bloom
    if (isCoalesced) {
        uncoalesceNodes();
        return;
    }

    console.log('Clicked keyword:', item);
    playClickSound(); // Sound effect
    const keyword = item.name;
    
    if (!Graph) {
        console.error('Graph not initialized');
        showToast('图表未初始化', 'error');
        return;
    }

    // 1. Check if node exists
    let node = Graph.graphData().nodes.find(n => n.name === keyword);
    
    // 2. If not, create it
    if (!node) {
        console.log('Node not found, creating new node for:', keyword);
        // Calculate random position on the sphere surface
        const radius = metaData.layout?.layout_radius || 300;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        node = {
            id: keyword,
            name: keyword,
            value: item.count, // Use actual count
            x: x, y: y, z: z,
            vx: 0, vy: 0, vz: 0
            // Color will be handled by nodeThreeObject
        };
        
        // Add to graph
        const { nodes, links } = Graph.graphData();
        // IMPORTANT: Create new array references to trigger update
        Graph.graphData({
            nodes: [...nodes, node],
            links: [...links]
        });
        
        showToast(`发现新星: ${keyword}`, 'success');
    } else {
        console.log('Node found:', node);
    }
    
    // 3. Fly to node
    // Wait a bit longer for graph update and physics tick
    setTimeout(() => {
        // Re-find node object (reference might change after graphData update)
        const targetNode = Graph.graphData().nodes.find(n => n.name === keyword);
        
        if (targetNode) {
            console.log('Flying to node:', targetNode);
            // Calculate camera position
            const distance = 100;
            const distRatio = 1 + distance/Math.hypot(targetNode.x, targetNode.y, targetNode.z);
            
            const newPos = {
                x: targetNode.x * distRatio,
                y: targetNode.y * distRatio,
                z: targetNode.z * distRatio
            };

            Graph.cameraPosition(
                newPos, // new position
                targetNode, // lookAt
                3000  // ms transition duration
            );
            
            // Also filter messages
            focusOnNode(keyword);
        } else {
            console.error('Target node still not found after creation!');
            showToast('定位星体失败', 'error');
        }
    }, 100);
}

function updateStats() {
    // Calculate basic stats
    const total = allMessages.length;
    const users = metaData.senders.length;

    // Calculate days from first message to today
    let days = 0;
    if (total > 0) {
        const first = getMsgObj(allMessages[0]).timestamp;
        const now = Date.now(); // 当前时间戳（毫秒）

        // 🔧 修复：时间戳统一为毫秒级（data-loader.js已转换）
        // 计算从第一条消息到今天的天数
        const diff = now - first;
        days = Math.ceil(diff / (24 * 3600 * 1000)) || 1;
    }

    document.getElementById('stat-total').innerText = total.toLocaleString();
    document.getElementById('stat-users').innerText = users;
    document.getElementById('stat-days').innerText = days;
}

function getMsgObj(msgArr) {
    const senderObj = metaData.senders[msgArr[1]];
    return {
        id: msgArr[0],
        sender: senderObj ? senderObj.name : 'Unknown',
        timestamp: msgArr[2],
        text: msgArr[3],
        sentiment: msgArr[4], // 0: neutral, 1: happy, 2: question, 3: sad
        keywords: msgArr[5]
    };
}

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
}

function getInitials(name) {
    return name.substring(0, 1).toUpperCase();
}

function getSentimentClass(code) {
    const map = { 1: 'happy', 2: 'question', 3: 'sad' };
    return map[code] || '';
}

function initGraph(graphData) {
    // Clear container
    const container = document.getElementById('graph-container');
    container.innerHTML = '';

    // Initialize 3D Force Graph
    Graph = ForceGraph3D()
        (container)
        .graphData(graphData)
        .backgroundColor('#00000000') // Transparent, handled by CSS
        .showNavInfo(false)
        
        // Physics Configuration for Softer Animation
        .d3VelocityDecay(0.6) // Higher friction (0.4 -> 0.6) for smoother, less jittery movement
        .d3AlphaDecay(0.01) // Slower cooling (default ~0.0228) for gentler settling
        
        // Physics - Spherical Distribution
        // IMPORTANT: Do NOT replace 'charge' with d3.forceManyBody() as it is 2D only!
        // Instead, we configure the existing 3D forces or add our custom 3D radial force.
        .d3Force('center', null) // Disable center force to allow radial to work better
        // Reduce radial strength to allow repulsion to work (0.1 -> 0.05)
        .d3Force('radial', forceRadial3D(metaData.layout?.layout_radius || 300, 0, 0, 0, 0.05))
        
        // Node Styling (Nebula Sprites)
        .nodeLabel('name')
        .nodeThreeObject(node => {
            // Calculate size based on relative value
            // Use max_node_value from meta if available, else fallback
            const maxVal = metaData.layout?.max_node_value || 100;
            
            // Normalize value between 0 and 1 (log scale)
            // We use log scale because word frequencies follow Zipf's law
            const minLog = Math.log(1);
            const maxLog = Math.log(maxVal + 1);
            const valLog = Math.log(node.value + 1);
            
            const normalized = (valLog - minLog) / (maxLog - minLog || 1);
            
            // Map to visual size range: Min 15, Max 60
            const size = 15 + (normalized * 45); 
            
            // Pick a color based on category or random consistent hash
            const color = getNodeColor(node);
            
            return createNebulaSprite(size, color, node.name);
        })
        .nodeThreeObjectExtend(true) // Keep default interaction
        
        // Interaction: Highlight & Travel
        .onNodeClick(node => {
            handleNodeClick(node);
        })
        .onNodeHover(node => {
            if (!appSettings.hoverHighlight) return;
            
            if (node) {
                // Temporary highlight on hover
                // We don't want to clear the clicked selection, just add to it or overlay?
                // Simpler: Just highlight this node and neighbors temporarily
                // But that might conflict with click selection.
                // Let's assume hover overrides click selection visually while hovering?
                // Or maybe we just use the same sets?
                
                // Strategy: If hovering, show hover state. If not, show click state.
                // This requires separate sets or saving state.
                // For simplicity, let's just trigger handleNodeClick logic but without travel/sound?
                // No, that's too heavy.
                
                // Let's just use the same highlight logic but don't set lastClickedNode or travel
                highlightNodes.clear();
                highlightLinks.clear();
                highlightNodes.add(node);
                const { nodes, links } = Graph.graphData();
                links.forEach(link => {
                    if (link.source.id === node.id || link.target.id === node.id) {
                        highlightLinks.add(link);
                        highlightNodes.add(link.source.id === node.id ? link.target : link.source);
                    }
                });
                updateGraphVisuals();
            } else {
                // Restore click selection if exists
                if (lastClickedNode) {
                    // Re-apply click logic without travel
                    highlightNodes.clear();
                    highlightLinks.clear();
                    highlightNodes.add(lastClickedNode);
                    const { nodes, links } = Graph.graphData();
                    links.forEach(link => {
                        if (link.source.id === lastClickedNode.id || link.target.id === lastClickedNode.id) {
                            highlightLinks.add(link);
                            highlightNodes.add(link.source.id === lastClickedNode.id ? link.target : link.source);
                        }
                    });
                    updateGraphVisuals();
                } else {
                    // Clear all
                    highlightNodes.clear();
                    highlightLinks.clear();
                    updateGraphVisuals();
                }

            }
        })
        .onLinkHover(link => {
            highlightLink(link);
        })
        .onLinkClick(link => {
            if (link) {
                // Determine target node: Go to the one that isn't the current one
                let targetNode = link.target;
                if (lastClickedNode) {
                    if (link.source.id === lastClickedNode.id) {
                        targetNode = link.target;
                    } else if (link.target.id === lastClickedNode.id) {
                        targetNode = link.source;
                    }
                }
                handleNodeClick(targetNode);
            }
        })
        
        // Link Styling (Constellation lines)
        .linkWidth(getLinkWidth)
        .linkColor(getLinkColor)
        .linkOpacity(getLinkOpacity)
        .linkLabel(link => {
            // Show target node name on hover based on last clicked node
            if (lastClickedNode) {
                if (link.source.id === lastClickedNode.id) {
                    return `To: ${link.target.name}`;
                } else if (link.target.id === lastClickedNode.id) {
                    return `To: ${link.source.name}`;
                }
            }
            // Fallback if no node selected or link not connected to selected
            if (link.target && link.target.name && link.source && link.source.name) {
                 return `${link.source.name} - ${link.target.name}`;
            }
            return '';
        })
        .nodeColor(node => highlightNodes.has(node) ? '#ffffff' : getNodeColor(node)); // Fallback if not using sprites
        
    // Configure existing 3D forces
    // Significantly increase repulsion to prevent clumping (-100 -> -600)
    // Add distanceMax to improve performance
    Graph.d3Force('charge')
        .strength(-600)
        .distanceMax(1000); 
        
    // Increase link distance and reduce strength to let nodes breathe
    Graph.d3Force('link')
        .distance(120) // 50 -> 120
        .strength(0.1); // Weaker pull
        
    // Auto-rotate
    Graph.controls().autoRotate = true;
    Graph.controls().autoRotateSpeed = 0.4; // Slower rotation
    
    // Add Ambient Particles (Starfield)
    addStarField();
    
    // Handle resize
    window.addEventListener('resize', () => {
        Graph.width(container.clientWidth);
        Graph.height(container.clientHeight);
    });
}

// Custom 3D Radial Force
function forceRadial3D(radius, x, y, z, strength) {
    let nodes;
    
    function force(alpha) {
        const k = alpha * strength;
        for (const node of nodes) {
            const dx = node.x - x || 1e-6;
            const dy = node.y - y || 1e-6;
            const dz = node.z - z || 1e-6;
            const r = Math.sqrt(dx*dx + dy*dy + dz*dz);
            const delta = (radius - r) * k / r;
            node.vx += dx * delta;
            node.vy += dy * delta;
            node.vz += dz * delta;
        }
    }
    
    force.initialize = n => nodes = n;
    
    // Add chainable methods to allow dynamic updates
    force.strength = function(_) {
        return arguments.length ? (strength = +_, force) : strength;
    };
    
    force.radius = function(_) {
        return arguments.length ? (radius = +_, force) : radius;
    };
    
    return force;
}

function getNodeColor(node) {
    // Consistent color based on name
    let hash = 0;
    for (let i = 0; i < node.name.length; i++) {
        hash = node.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
}

function createNebulaSprite(size, color, text) {
    const group = new THREE.Group();
    
    // 1. The Nebula Glow (Sprite) - Layer 1 (Core)
    const canvas1 = document.createElement('canvas');
    canvas1.width = 64; canvas1.height = 64;
    const ctx1 = canvas1.getContext('2d');
    const grad1 = ctx1.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad1.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad1.addColorStop(0.2, color);
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx1.fillStyle = grad1;
    ctx1.fillRect(0, 0, 64, 64);
    
    const mat1 = new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(canvas1), 
        transparent: true, 
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sprite1 = new THREE.Sprite(mat1);
    sprite1.scale.set(size, size, 1);
    sprite1.raycast = () => {}; // Disable raycast on visual core to improve link selection precision
    group.add(sprite1);

    // Layer 2 (Outer Glow / Halo)
    const canvas2 = document.createElement('canvas');
    canvas2.width = 64; canvas2.height = 64;
    const ctx2 = canvas2.getContext('2d');
    const grad2 = ctx2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad2.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad2.addColorStop(0.3, color);
    grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx2.fillStyle = grad2;
    ctx2.fillRect(0, 0, 64, 64);
    
    const mat2 = new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(canvas2), 
        transparent: true, 
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.5
    });
    const sprite2 = new THREE.Sprite(mat2);
    sprite2.scale.set(size * 1.5, size * 1.5, 1); // Larger halo
    
    // Disable raycasting for the glow to prevent it from blocking clicks
    sprite2.raycast = () => {}; 
    
    group.add(sprite2);

    // Layer 3 (Interaction Hitbox)
    // Smaller invisible sprite for precise interaction
    const mat3 = new THREE.SpriteMaterial({ 
        visible: false // Raycaster usually ignores invisible, but we can check params or use opacity 0
    });
    // Force raycast even if invisible? No, standard raycaster skips invisible.
    // Use opacity 0 instead.
    const matHitbox = new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
    });
    const spriteHitbox = new THREE.Sprite(matHitbox);
    spriteHitbox.scale.set(size * 0.4, size * 0.4, 1); // 40% size for interaction
    group.add(spriteHitbox);

    // 2. Text Label (Only for larger nodes)
    if (size > 15) {
        const textSprite = createTextSprite(text, color);
        if (textSprite) {
            textSprite.position.y = size / 2 + 2; // Position above the nebula
            group.add(textSprite);
        }
    }
    
    return group;
}

function createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const fontSize = 32;
    const context = canvas.getContext('2d');
    context.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    
    canvas.width = textWidth + 20;
    canvas.height = fontSize + 20;
    
    // Re-set font after resize
    context.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
    
    // Text Glow
    context.shadowColor = color;
    context.shadowBlur = 10;
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillText(text, 10, fontSize);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(textWidth / 5, (fontSize + 20) / 5, 1);
    
    return sprite;
}

function addStarField() {
    // Add background stars using Three.js scene
    if (!Graph) return;
    const scene = Graph.scene();
    
    const geometry = new THREE.BufferGeometry();
    const count = 5000; // More stars
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Get dynamic radius from meta or use defaults
    const minR = metaData.layout?.star_min || 350;
    const maxR = metaData.layout?.star_max || 950;
    const rangeR = maxR - minR;

    for(let i = 0; i < count; i++) {
        // Distribute stars in a larger sphere around the graph
        // Match dispersion with the graph (radius ~300)
        const r = minR + Math.random() * rangeR; // Radius closer to the graph
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        positions[i*3] = x;
        positions[i*3+1] = y;
        positions[i*3+2] = z;
        
        // Random star colors (White, Blueish, Pinkish)
        const colorType = Math.random();
        let color;
        if (colorType > 0.9) color = new THREE.Color(0xff9a9e); // Pink
        else if (colorType > 0.8) color = new THREE.Color(0x8fd3f4); // Blue
        else color = new THREE.Color(0xffffff); // White
        
        colors[i*3] = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;
        
        sizes[i] = Math.random() * 3; // Varied sizes, slightly larger
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Use PointsMaterial but with size attenuation
    // Note: standard PointsMaterial doesn't support per-vertex size in WebGL1 easily without shader, 
    // but Three.js PointsMaterial 'size' is global. 
    // To have variable size, we need ShaderMaterial or just accept uniform size.
    // Let's stick to uniform size for simplicity but make them slightly bigger and transparent.
    // Or use a texture for stars.
    
    const material = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
}

function renderChatList(reset = false) {
    if (reset) {
        chatListContent.innerHTML = '';
        currentPage = 1;
    }
    
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = currentPage * PAGE_SIZE;
    const slice = filteredMessages.slice(start, end);
    
    if (slice.length === 0 && currentPage === 1) {
        chatListContent.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">没有找到相关消息</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    slice.forEach(msgArr => {
        const msg = getMsgObj(msgArr);
        const div = document.createElement('div');
        div.className = `message-item ${getSentimentClass(msg.sentiment)}`;
        div.dataset.id = msg.id;
        
        // Highlight keywords
        let text = msg.text;
        if (msg.keywords && msg.keywords.length > 0) {
            msg.keywords.forEach(kw => {
                try {
                    text = text.replace(new RegExp(kw, 'g'), `<span class="keyword-tag">${kw}</span>`);
                } catch(e) {}
            });
        }

        const avatarColor = getAvatarColor(msg.sender);
        const initials = getInitials(msg.sender);

        div.innerHTML = `
            <div class="avatar" style="background-color: ${avatarColor}">${initials}</div>
            <div class="msg-body">
                <div class="msg-header">
                    <span class="sender-name">${msg.sender}</span>
                    <span>${new Date(msg.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="msg-bubble">${text}</div>
            </div>
        `;
        
        div.onclick = (e) => {
            // Check if clicked element is a keyword tag
            if (e.target.classList.contains('keyword-tag')) {
                e.stopPropagation();
                const keyword = e.target.innerText;
                
                // Find keyword object in ranking to get count, or create dummy
                let item = metaData.ranking ? metaData.ranking.find(k => k.name === keyword) : null;
                if (!item) {
                    item = { name: keyword, count: 1 };
                }
                
                handleKeywordClick(item);
                return;
            }

            // Default behavior: focus on first keyword if available
            if (msg.keywords && msg.keywords.length > 0) {
                focusOnNode(msg.keywords[0]);
            }
        };
        
        fragment.appendChild(div);
    });
    
    chatListContent.appendChild(fragment);
}

function handleScroll() {
    const { scrollTop, scrollHeight, clientHeight } = chatListContainer;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
        if (currentPage * PAGE_SIZE < filteredMessages.length) {
            currentPage++;
            renderChatList(false);
        }
    }
}

function filterSentiment(type) {
    // Update UI
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const btnClass = type === 'all' ? 'filter-btn' : `filter-btn.${type}`;
    // Simple selector might fail if multiple classes, but here structure is simple
    if (type === 'all') {
        document.querySelector('#controls button:first-child').classList.add('active');
    } else {
        document.querySelector(`.filter-btn.${type}`).classList.add('active');
    }

    // Filter Data
    if (type === 'all') {
        filteredMessages = allMessages;
    } else {
        const codeMap = { 'happy': 1, 'question': 2, 'sad': 3 };
        const code = codeMap[type];
        filteredMessages = allMessages.filter(m => m[4] === code);
    }
    
    renderChatList(true);
}

function focusOnNode(keyword) {
    // 1. Filter List
    // Need to check if keyword is in the msg keywords list (index 5)
    filteredMessages = allMessages.filter(m => m[5] && m[5].includes(keyword));
    renderChatList(true);
    
    // 2. Overlay
    const overlay = document.getElementById('info-overlay');
    overlay.style.display = 'block';
    overlay.querySelector('h3').innerText = `关键词: ${keyword}`;
    overlay.querySelector('p').innerText = `相关消息: ${filteredMessages.length} 条`;
    
    setTimeout(() => {
         overlay.style.display = 'none';
    }, 3000);

    // 3. Fly to Node in Graph
    if (Graph && graphData) {
        const node = graphData.nodes.find(n => n.name === keyword);
        if (node) {
            const distance = 40;
            const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
            
            Graph.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                node, // lookAt ({ x, y, z })
                3000  // ms transition duration
            );
        }
    }
}

function initSidebarControls() {
    const sidebar = document.getElementById('message-sidebar');
    const container = document.getElementById('graph-container');
    const toggleClose = document.getElementById('sidebar-toggle-close');
    const toggleOpen = document.getElementById('sidebar-toggle-open');

    // 如果旧的切换按钮不存在，说明已使用新的统一侧边栏系统
    if (!toggleClose || !toggleOpen) {
        console.log('Using new unified sidebar system');
        return;
    }

    // --- Toggle Logic ---
    function toggleSidebar(collapsed) {
        if (collapsed) {
            sidebar.classList.add('collapsed');
            toggleOpen.style.display = 'flex';
            // When collapsed, graph takes full width
            setTimeout(() => {
                if (Graph) {
                    Graph.width(window.innerWidth);
                    Graph.height(window.innerHeight);
                }
            }, 300); // Wait for transition
        } else {
            sidebar.classList.remove('collapsed');
            toggleOpen.style.display = 'none';
            // When expanded, graph takes remaining width
            setTimeout(() => {
                if (Graph) {
                    Graph.width(container.clientWidth);
                    Graph.height(container.clientHeight);
                }
            }, 300);
        }
    }

    toggleClose.addEventListener('click', () => toggleSidebar(true));
    toggleOpen.addEventListener('click', () => toggleSidebar(false));

    // Ensure sidebar starts expanded
    toggleSidebar(false);

    // --- Window Resize Logic ---
    window.addEventListener('resize', () => {
        if (Graph) {
            // Check if sidebar is collapsed
            const isCollapsed = sidebar.classList.contains('collapsed');
            if (isCollapsed) {
                Graph.width(window.innerWidth);
                Graph.height(window.innerHeight);
            } else {
                // Recalculate container size
                // We need to wait a tiny bit for layout to settle if flexbox is involved,
                // but usually clientWidth is up to date on resize event
                Graph.width(container.clientWidth);
                Graph.height(container.clientHeight);
            }
        }
    });
}

// --- Roam & Polaroid Logic ---
let isRoaming = false;
let roamTimer = null;

function initRoamAndPolaroid() {
    const roamBtn = document.getElementById('roam-btn');
    const polaroidBtn = document.getElementById('polaroid-btn');
    
    // Create Subtitle Element
    if (!document.getElementById('roam-subtitle')) {
        const sub = document.createElement('div');
        sub.id = 'roam-subtitle';
        document.body.appendChild(sub);
    }
    
    // Roam Logic
    if (roamBtn) {
        roamBtn.addEventListener('click', () => {
            if (isRoaming) {
                stopRoaming();
                roamBtn.classList.remove('active');
                roamBtn.innerHTML = '<i class="ri-flight-takeoff-line"></i>';
                showToast('漫游结束', 'info');
            } else {
                startRoaming();
                roamBtn.classList.add('active');
                roamBtn.innerHTML = '<i class="ri-flight-land-line"></i>';
                showToast('开始第一人称漫游...', 'success');
            }
        });
    }
    
    // Polaroid Logic
    if (polaroidBtn) {
        polaroidBtn.addEventListener('click', () => {
            takePolaroid();
        });
    }
}

function startRoaming() {
    if (!Graph) return;

    // 🔧 修复：支持切换功能，如果正在漫游则停止
    if (isRoaming) {
        stopRoaming();
        return;
    }

    isRoaming = true;

    // Hide UI for immersion
    const sidebar = document.getElementById('message-sidebar');
    if (sidebar) {
        sidebar.classList.add('collapsed');
    }

    // Hide old toggle button if exists
    const toggleOpen = document.getElementById('sidebar-toggle-open');
    if (toggleOpen) {
        toggleOpen.style.display = 'none';
    }

    const timeTravel = document.getElementById('time-travel-container');
    if (timeTravel) {
        timeTravel.style.opacity = '0';
    }

    // Fullscreen graph
    Graph.width(window.innerWidth);
    Graph.height(window.innerHeight);

    // Start hopping
    roamStep();
}

function stopRoaming() {
    isRoaming = false;
    if (roamTimer) clearTimeout(roamTimer);
    stopSubtitleSequence(); // Stop subtitles
    
    // Restore UI
    const sidebar = document.getElementById('message-sidebar');
    if (sidebar) sidebar.classList.remove('collapsed');
    document.getElementById('time-travel-container').style.opacity = '1';
    
    // Reset graph size
    const container = document.getElementById('graph-container');
    Graph.width(container.clientWidth);
    Graph.height(container.clientHeight);
    
    // Reset Camera to overview
    Graph.cameraPosition(
        { x: 0, y: 0, z: 600 }, // Overview pos
        { x: 0, y: 0, z: 0 },   // Look at center
        2000
    );
}

function roamStep() {
    if (!isRoaming || !Graph) return;
    
    const { nodes } = Graph.graphData();
    if (!nodes.length) return;
    
    // Get current camera position
    const currentPos = Graph.cameraPosition();
    
    // Find nearest neighbors (excluding current target if possible)
    // We calculate distance from current camera position to all nodes
    // Sort by distance
    const sortedNodes = nodes
        .map(n => ({
            node: n,
            dist: Math.hypot(n.x - currentPos.x, n.y - currentPos.y, n.z - currentPos.z)
        }))
        .sort((a, b) => a.dist - b.dist);
        
    // Pick a node that is "close but not too close" to ensure movement
    // Skip the very first one (closest) as it might be the one we are at
    // Pick randomly from index 1 to 5 (nearest neighbors)
    // If we are far away (start), just pick random
    let targetNode;
    if (sortedNodes[0].dist > 500) {
        targetNode = nodes[Math.floor(Math.random() * nodes.length)];
    } else {
        const candidates = sortedNodes.slice(1, 6); // Next 5 closest
        const choice = candidates[Math.floor(Math.random() * candidates.length)] || candidates[0];
        targetNode = choice ? choice.node : nodes[0];
    }
    
    if (!targetNode) targetNode = nodes[0];

    // Fly NEAR it, not AT it (Third person / Flyby view)
    // Increase offset significantly to avoid "close-up"
    const offset = 150; 
    
    // Calculate a position that maintains some forward momentum or smooth curve?
    // Simple approach: Random point on sphere around target
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    const newPos = {
        x: targetNode.x + offset * Math.sin(phi) * Math.cos(theta),
        y: targetNode.y + offset * Math.sin(phi) * Math.sin(theta),
        z: targetNode.z + offset * Math.cos(phi)
    };
    
    // Smooth flight
    // Look at the target node to keep it in view, but from a distance
    const duration = appSettings.roamSpeed * 1000;
    Graph.cameraPosition(
        newPos,
        targetNode, // Look at target
        duration
    );
    
    // No focusOnNode (no UI highlight/filtering)
    
    // Show Subtitle
    if (appSettings.showSubtitles) {
        startSubtitleSequence(targetNode, duration);
    }

    // Schedule next hop
    roamTimer = setTimeout(roamStep, duration); // Continuous movement
}

let subtitleHideTimer = null;
let subtitleSequenceTimer = null;

function stopSubtitleSequence() {
    if (subtitleSequenceTimer) {
        clearTimeout(subtitleSequenceTimer);
        subtitleSequenceTimer = null;
    }
    if (subtitleHideTimer) {
        clearTimeout(subtitleHideTimer);
        subtitleHideTimer = null;
    }
    const subtitleEl = document.getElementById('roam-subtitle');
    if (subtitleEl) subtitleEl.style.opacity = '0';
}

function startSubtitleSequence(node, flightDuration) {
    stopSubtitleSequence();
    
    const showNext = () => {
        if (!isRoaming) return;
        showRoamSubtitleForNode(node);
    };
    
    // Show first immediately
    showNext();
    
    // If loop is enabled, schedule next ones
    if (appSettings.subtitleLoop) {
        const interval = appSettings.subtitleDuration * 1000;
        
        // Only loop if we have enough time for at least one more full duration
        // Or just keep showing until flight ends?
        // Let's just set interval. The stopSubtitleSequence called at start of next roamStep will kill it.
        // But we should stop if we exceed flight duration to avoid overlap logic issues (though roamStep handles it)
        
        // Simple interval is fine because roamStep calls stopSubtitleSequence first thing.
        subtitleSequenceTimer = setInterval(showNext, interval);
    }
}

function showRoamSubtitleForNode(node) {
    const subtitleEl = document.getElementById('roam-subtitle');
    if (!subtitleEl) return;
    
    // Clear previous hide timer (but NOT the sequence timer)
    if (subtitleHideTimer) {
        clearTimeout(subtitleHideTimer);
        subtitleHideTimer = null;
    }
    
    const keyword = node.name;
    
    // Find a message containing this keyword
    const startIdx = Math.floor(Math.random() * allMessages.length);
    let foundMsg = null;
    
    for (let i = 0; i < allMessages.length; i++) {
        const idx = (startIdx + i) % allMessages.length;
        const msg = allMessages[idx];
        if (msg[5] && msg[5].includes(keyword)) {
            foundMsg = msg;
            break;
        }
    }
    
    if (foundMsg) {
        let text = foundMsg[3]; // Text content
        if (text.length > 40) {
            text = text.substring(0, 40) + '...';
        }
        
        subtitleEl.innerText = `"${text}"`;
        
        // Apply dynamic transition for fade in
        subtitleEl.style.transition = `opacity ${appSettings.subtitleFadeIn}s ease-in-out`;
        // Force reflow to ensure transition applies if it changed
        void subtitleEl.offsetWidth; 
        
        subtitleEl.style.opacity = '1';
        
        // Calculate when to start fading out
        // Total duration is appSettings.subtitleDuration (seconds)
        // We want to start fading out at: duration - fadeOutTime
        const durationMs = appSettings.subtitleDuration * 1000;
        const fadeOutMs = appSettings.subtitleFadeOut * 1000;
        
        // Ensure we show it for at least some time
        const showTime = Math.max(500, durationMs - fadeOutMs);
        
        subtitleHideTimer = setTimeout(() => {
            // Apply dynamic transition for fade out
            subtitleEl.style.transition = `opacity ${appSettings.subtitleFadeOut}s ease-in-out`;
            subtitleEl.style.opacity = '0';
        }, showTime);
    } else {
        subtitleEl.style.opacity = '0';
    }
}
        setTimeout(() => {
            subtitleEl.style.opacity = '0';
        }, 6000);

function takePolaroid() {
    if (!Graph) return;
    
    playClickSound();
    
    // Flash effect
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = 0; flash.style.left = 0;
    flash.style.width = '100%'; flash.style.height = '100%';
    flash.style.background = 'white';
    flash.style.opacity = '0.8';
    flash.style.zIndex = '9999';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.5s';
    document.body.appendChild(flash);
    
    setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 500);
    }, 50);
    
    // High-Res Capture
    const renderer = Graph.renderer();
    const originalPixelRatio = renderer.getPixelRatio();
    
    // Temporarily boost resolution (3x)
    renderer.setPixelRatio(3); 
    renderer.render(Graph.scene(), Graph.camera());
    
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    // Restore
    renderer.setPixelRatio(originalPixelRatio);
    renderer.render(Graph.scene(), Graph.camera()); // Re-render normal
    
    // Composite Image
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        const scale = canvas.width / window.innerWidth; // Scale factor based on resolution
        
        // 1. Draw Background (Match CSS: linear-gradient(135deg, #2b1055 0%, #7597de 100%))
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#2b1055');
        gradient.addColorStop(1, '#7597de');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 2. Draw 3D Scene
        ctx.drawImage(img, 0, 0);
        
        // 3. Draw Overlays (Title & Date)
        ctx.font = `bold ${32 * scale}px "Segoe UI", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetY = 2 * scale;
        
        // Title (Top Left) - 🔧 使用动态标题
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(appSettings.pageTitle || 'ChatGalaxy', 40 * scale, 40 * scale);
        
        // Date (Top Right)
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            ctx.textAlign = 'right';
            ctx.fillText(dateEl.innerText, canvas.width - (40 * scale), 40 * scale);
        }
        
        // 4. Draw Subtitle (Bottom Center) - If exists
        const subtitleEl = document.getElementById('roam-subtitle');
        const style = window.getComputedStyle(subtitleEl);
        const subtitleText = (subtitleEl && style.opacity !== '0' && subtitleEl.innerText.trim()) ? subtitleEl.innerText : null;

        if (subtitleText) {
            const fontSize = 24 * scale;
            ctx.font = `300 ${fontSize}px "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const text = subtitleText;
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const paddingX = 30 * scale;
            const paddingY = 15 * scale;
            const boxWidth = textWidth + paddingX * 2;
            const boxHeight = fontSize + paddingY * 2;
            
            const x = canvas.width / 2;
            const y = canvas.height - (100 * scale);
            
            // Box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            const r = 30 * scale;
            const bx = x - boxWidth/2;
            const by = y - boxHeight/2;
            
            ctx.beginPath();
            ctx.moveTo(bx + r, by);
            ctx.arcTo(bx + boxWidth, by, bx + boxWidth, by + boxHeight, r);
            ctx.arcTo(bx + boxWidth, by + boxHeight, bx, by + boxHeight, r);
            ctx.arcTo(bx, by + boxHeight, bx, by, r);
            ctx.arcTo(bx, by, bx + boxWidth, by, r);
            ctx.closePath();
            ctx.fill();
            
            // Text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(text, x, y);
        }
        
        downloadImage(canvas.toDataURL('image/png'));
    };
    img.src = dataURL;
}

function downloadImage(url) {
    const link = document.createElement('a');
    link.download = `Universe_Memory_${new Date().getTime()}.png`;
    link.href = url;
    link.click();
    showToast('高清回忆已定格', 'success');
}

function setFavicon(emoji) {
    const canvas = document.createElement('canvas');
    canvas.height = 64;
    canvas.width = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '48px serif';
    ctx.fillText(emoji, 0, 48);
    
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = canvas.toDataURL();
}

// --- Layout & Distribution Logic ---

function initLayoutControls() {
    const sphereBtn = document.getElementById('layout-sphere-btn');
    if (sphereBtn) sphereBtn.addEventListener('click', applySphereLayout);
    
    const flowerBtn = document.getElementById('layout-flower-btn');
    if (flowerBtn) flowerBtn.addEventListener('click', applyFlowerLayout);
    
    const helixBtn = document.getElementById('layout-helix-btn');
    if (helixBtn) helixBtn.addEventListener('click', applyHelixLayout);
    
    const gridBtn = document.getElementById('layout-grid-btn');
    if (gridBtn) gridBtn.addEventListener('click', applyGridLayout);
    
    const torusBtn = document.getElementById('layout-torus-btn');
    if (torusBtn) torusBtn.addEventListener('click', applyTorusLayout);
    
    const resetBtn = document.getElementById('layout-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetPhysicsLayout);
    
    const exportBtn = document.getElementById('layout-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportLayout);
    
    const importBtn = document.getElementById('layout-import-btn');
    if (importBtn) importBtn.addEventListener('click', () => {
        document.getElementById('layout-file-input').click();
    });
    
    const fileInput = document.getElementById('layout-file-input');
    if (fileInput) fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importLayout(file);
    });
}

function applySphereLayout() {
    if (!Graph) return;
    const nodes = Graph.graphData().nodes;
    const N = nodes.length;
    const radius = 800; // Spread out

    // Fibonacci Sphere
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    nodes.forEach((node, i) => {
        const y = 1 - (i / (N - 1)) * 2; // y goes from 1 to -1
        const r = Math.sqrt(1 - y * y); // radius at y
        const theta = phi * i; // golden angle increment

        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        // Set fixed positions
        node.fx = x * radius;
        node.fy = y * radius;
        node.fz = z * radius;
    });
    
    // Reheat to apply changes visually
    Graph.d3ReheatSimulation();
    showToast('已应用球体分布', 'success');
}

function applyFlowerLayout() {
    if (!Graph) return;
    const nodes = Graph.graphData().nodes;
    const N = nodes.length;
    const radius = 800;
    
    // 3D Flower shape
    const k = 5; // 5 petals
    
    nodes.forEach((node, i) => {
        // Distribute t along the curve
        const t = (i / N) * Math.PI * 2; 
        
        const r = Math.sin(k * t) * radius;
        const x = r * Math.cos(t);
        const z = r * Math.sin(t);
        const y = (Math.random() - 0.5) * 300; // Random height
        
        node.fx = x;
        node.fy = y;
        node.fz = z;
    });
    
    Graph.d3ReheatSimulation();
    showToast('已应用花朵分布', 'success');
}

function applyHelixLayout() {
    if (!Graph) return;
    const nodes = Graph.graphData().nodes;
    const N = nodes.length;
    const radius = 300;
    const turns = 6;
    const height = 1800;
    
    // DNA Double Helix
    nodes.forEach((node, i) => {
        // Split into two strands
        const isStrandA = i % 2 === 0;
        
        // Normalized position along the helix (0 to 1)
        const t = i / N;
        
        // Angle: t * total_turns * 2PI
        let angle = t * turns * Math.PI * 2;
        
        // If Strand B, offset by PI (180 degrees)
        if (!isStrandA) {
            angle += Math.PI;
        }
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (t - 0.5) * height;
        
        node.fx = x;
        node.fy = y;
        node.fz = z;
    });
    
    Graph.d3ReheatSimulation();
    showToast('已应用DNA双螺旋分布', 'success');
}

function applyGridLayout() {
    if (!Graph) return;
    const nodes = Graph.graphData().nodes;
    const N = nodes.length;
    const size = Math.ceil(Math.pow(N, 1/3));
    const spacing = 200;
    const offset = (size * spacing) / 2;
    
    nodes.forEach((node, i) => {
        const x = (i % size) * spacing - offset;
        const y = (Math.floor(i / size) % size) * spacing - offset;
        const z = Math.floor(i / (size * size)) * spacing - offset;
        
        node.fx = x;
        node.fy = y;
        node.fz = z;
    });
    
    Graph.d3ReheatSimulation();
    showToast('已应用立方分布', 'success');
}

function applyTorusLayout() {
    if (!Graph) return;
    const nodes = Graph.graphData().nodes;
    const N = nodes.length;
    const R = 600; // Major radius
    const r = 200; // Minor radius
    
    nodes.forEach((node, i) => {
        const u = (i / N) * Math.PI * 2 * 10; // Wraps around tube
        const v = (i / N) * Math.PI * 2; // Wraps around ring
        
        const x = (R + r * Math.cos(u)) * Math.cos(v);
        const z = (R + r * Math.cos(u)) * Math.sin(v);
        const y = r * Math.sin(u);
        
        node.fx = x;
        node.fy = y;
        node.fz = z;
    });
    
    Graph.d3ReheatSimulation();
    showToast('已应用环面分布', 'success');
}

function resetPhysicsLayout() {
    if (!Graph) return;
    const nodes = Graph.graphData().nodes;
    nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
        node.fz = null;
    });
    // 使用 d3ReheatSimulation 重新激活物理引擎
    Graph.d3ReheatSimulation();
    showToast('物理引擎已重置', 'success');
}

function exportLayout() {
    if (!Graph) return;
    const nodes = Graph.graphData().nodes;
    const layout = nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        z: n.z,
        fx: n.fx,
        fy: n.fy,
        fz: n.fz
    }));
    
    const blob = new Blob([JSON.stringify(layout)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `universe_layout_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('布局已导出', 'success');
}

function importLayout(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const layout = JSON.parse(e.target.result);
            if (!Graph) return;
            const nodes = Graph.graphData().nodes;
            const nodeMap = new Map(nodes.map(n => [n.id, n]));
            
            let matchCount = 0;
            layout.forEach(item => {
                const node = nodeMap.get(item.id);
                if (node) {
                    if (item.fx !== undefined && item.fx !== null) {
                        node.fx = item.fx;
                        node.fy = item.fy;
                        node.fz = item.fz;
                    } else {
                        // If imported data doesn't have fixed pos, fix it to the imported x,y,z
                        node.fx = item.x;
                        node.fy = item.y;
                        node.fz = item.z;
                    }
                    matchCount++;
                }
            });
            Graph.d3ReheatSimulation();
            showToast(`成功导入布局 (匹配 ${matchCount} 个节点)`, 'success');
        } catch (err) {
            alert('导入失败: ' + err);
        }
    };
    reader.readAsText(file);
}

// ==================== Sidebar Functions ====================
// 为侧边栏按钮提供直接调用的函数

/**
 * 凝聚回忆 - 切换节点凝聚状态
 * 🔧 重写版本：使用模块化辅助函数
 * 由侧边栏按钮直接调用
 */
function coalesceNodes() {
    if (!Graph) {
        showToast('3D图形未加载', 'error');
        return;
    }

    if (!isCoalesced) {
        // 凝聚节点
        performCoalesce();
    } else {
        // 扩散节点
        uncoalesceNodes();
    }
}

/**
 * 切换氛围音乐
 * 由侧边栏按钮直接调用
 */
function toggleMusic() {
    if (isMuted) {
        // 开启音乐
        isMuted = false;
        initAudio();

        // 更新按钮状态（如果存在）
        const musicBtn = document.getElementById('music-btn');
        if (musicBtn) {
            musicBtn.innerHTML = '<i class="ri-music-2-line"></i>';
            musicBtn.classList.add('active');
        }

        // 更新侧边栏开关状态
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.checked = true;
        }

        showToast('音乐已开启', 'success');
    } else {
        // 关闭音乐
        isMuted = true;
        stopAmbientMusic();

        // 更新按钮状态（如果存在）
        const musicBtn = document.getElementById('music-btn');
        if (musicBtn) {
            musicBtn.innerHTML = '<i class="ri-volume-mute-line"></i>';
            musicBtn.classList.remove('active');
        }

        // 更新侧边栏开关状态
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.checked = false;
        }

        showToast('音乐已静音', 'info');
    }
}

/**
 * 切换时间旅行播放
 * 由侧边栏按钮直接调用
 */
function toggleTimeTravelPlay() {
    const playBtn = document.getElementById('play-btn');
    if (!playBtn) return;

    // 模拟点击播放按钮
    if (isPlaying) {
        // Stop
        isPlaying = false;
        clearInterval(playInterval);
        playBtn.innerHTML = '<i class="ri-play-fill"></i>';
    } else {
        // Start
        const slider = document.getElementById('time-slider');
        if (!slider) return;

        isPlaying = true;
        playBtn.innerHTML = '<i class="ri-pause-fill"></i>';

        // If at end, restart
        if (parseFloat(slider.value) >= 100) {
            slider.value = 0;
        }

        playInterval = setInterval(() => {
            let val = parseFloat(slider.value);

            // Adaptive Speed Logic
            const currentNodes = Graph.graphData().nodes.length;
            const totalNodes = graphData.nodes.length || 1;
            const ratio = currentNodes / totalNodes;
            let step = 1.0 * (1 - ratio * 0.9);

            if (step < 0.1) step = 0.1;

            val += step;

            if (val >= 100) {
                val = 100;
                isPlaying = false;
                clearInterval(playInterval);
                playBtn.innerHTML = '<i class="ri-play-fill"></i>';
            }
            slider.value = val;

            // Trigger update event
            slider.dispatchEvent(new Event('input'));
        }, 100);
    }
}

// ==================== Global Scope Exposure ====================
// 将函数暴露到全局作用域，供侧边栏按钮调用
// 必须在侧边栏按钮加载前执行

window.startRoaming = startRoaming;
window.takePolaroid = takePolaroid;
window.startRevisitMode = startRevisitMode;
window.stopRevisitMode = stopRevisitMode;
window.coalesceNodes = coalesceNodes;
window.toggleMusic = toggleMusic;
window.toggleTimeTravelPlay = toggleTimeTravelPlay;
window.initSettings = initSettings;
window.applySettings = applySettings;

Log.info('Init', 'Sidebar functions exposed to global scope');
