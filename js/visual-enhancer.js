/**
 * 视觉增强配置
 * ProjectZero - 深山有密林团队
 * 优化3D星系的视觉冲击力
 */

// ========== 高级配色方案 ==========

const ENHANCED_COLOR_SCHEMES = {
    // 🌌 星云主题（默认）- 紫粉色渐变
    nebula: {
        name: '🌌 星云',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        nodeColors: [
            '#ff6b9d', '#c44569', '#f8b500', '#ffb142',
            '#778ca3', '#6a89cc', '#4a69bd', '#1e3799'
        ],
        glowColor: 'rgba(255, 107, 157, 0.6)',
        linkColor: 'rgba(255, 255, 255, 0.15)',
        particleColor: 'rgba(255, 255, 255, 0.6)'
    },

    // 🌊 深海主题 - 蓝绿色系
    ocean: {
        name: '🌊 深海',
        background: 'linear-gradient(135deg, #0c0026 0%, #1a1a4e 50%, #0f3460 100%)',
        nodeColors: [
            '#00d2d3', '#01a3a4', '#6f42c1', '#e83e8c',
            '#20c997', '#17a2b8', '#6610f2', '#fd7e14'
        ],
        glowColor: 'rgba(0, 210, 211, 0.6)',
        linkColor: 'rgba(0, 210, 211, 0.2)',
        particleColor: 'rgba(0, 210, 211, 0.5)'
    },

    // 🔥 火焰主题 - 橙红色系
    fire: {
        name: '🔥 火焰',
        background: 'linear-gradient(135deg, #1a0b0b 0%, #2d1b1b 50%, #4a2c2c 100%)',
        nodeColors: [
            '#ff6b6b', '#ee5a6f', '#ff8787', '#fa5252',
            '#ff922b', '#ffc078', '#fcc419', '#fff3bf'
        ],
        glowColor: 'rgba(255, 107, 107, 0.6)',
        linkColor: 'rgba(255, 107, 107, 0.2)',
        particleColor: 'rgba(255, 200, 100, 0.6)'
    },

    // 🌲 森林主题 - 绿色系
    forest: {
        name: '🌲 森林',
        background: 'linear-gradient(135deg, #0a1f0a 0%, #1b3d1b 50%, #2d5a2d 100%)',
        nodeColors: [
            '#52b788', '#40916c', '#2d6a4f', '#1b4332',
            '#95d5b2', '#b7e4c7', '#d8f3dc', '#74c69d'
        ],
        glowColor: 'rgba(82, 183, 136, 0.6)',
        linkColor: 'rgba(82, 183, 136, 0.2)',
        particleColor: 'rgba(150, 255, 150, 0.5)'
    },

    // 🌙 极光主题 - 多彩渐变
    aurora: {
        name: '🌙 极光',
        background: 'linear-gradient(135deg, #0d0221 0%, #19082e 50%, #1a0b2e 100%)',
        nodeColors: [
            '#00ff87', '#60efff', '#ff6b6b', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'
        ],
        glowColor: 'rgba(0, 255, 135, 0.6)',
        linkColor: 'rgba(255, 255, 255, 0.2)',
        particleColor: 'rgba(96, 239, 255, 0.5)'
    }
};

// ========== 当前活动主题 ==========
let currentTheme = 'nebula';

// ========== 视觉增强配置 ==========

const VISUAL_CONFIG = {
    // 节点渲染增强
    nodes: {
        // 基础大小
        baseSize: 2,

        // 大小缩放因子
        sizeScale: 1.5,

        // 光晕效果
        glow: {
            enabled: true,
            size: 15,
            opacity: 0.3,
            blur: 8
        },

        // 脉冲动画
        pulse: {
            enabled: true,
            speed: 2000, // 毫秒
            minScale: 0.95,
            maxScale: 1.05
        }
    },

    // 连线渲染增强
    links: {
        // 基础宽度
        baseWidth: 0.5,

        // 宽度缩放
        widthScale: 1,

        // 透明度
        opacity: 0.2,

        // 曲线张力（0=直线，1=高度弯曲）
        curve: 0.3
    },

    // 粒子背景
    particles: {
        enabled: true,
        count: 100,
        size: 2,
        speed: 0.5,
        opacity: 0.6
    },

    // 相机控制
    camera: {
        // 初始距离
        distance: 1000,

        // 旋转速度
        autoRotateSpeed: 0.3,

        // 缩放范围
        minZoom: 200,
        maxZoom: 3000
    }
};

// ========== 应用主题函数 ==========

function applyTheme(themeName) {
    const theme = ENHANCED_COLOR_SCHEMES[themeName];
    if (!theme) {
        console.error(`主题 "${themeName}" 不存在`);
        return;
    }

    currentTheme = themeName;

    // 应用背景
    document.body.style.background = theme.background;

    // 更新节点颜色
    if (typeof window.updateNodeColors === 'function') {
        window.updateNodeColors(theme.nodeColors);
    }

    // 更新粒子颜色
    if (typeof window.updateParticleColor === 'function') {
        window.updateParticleColor(theme.particleColor);
    }

    console.log(`✅ 已切换到主题: ${theme.name}`);
}

// ========== 切换主题函数 ==========

function cycleTheme() {
    const themes = Object.keys(ENHANCED_COLOR_SCHEMES);
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    applyTheme(themes[nextIndex]);
}

// ========== 节点渲染增强 ==========

function enhanceNodeRendering(node) {
    const config = VISUAL_CONFIG.nodes;

    // 增强节点大小
    node.val = node.val || 1;
    node.size = config.baseSize + (node.val * config.sizeScale);

    // 添加光晕效果（通过Canvas渲染）
    if (config.glow.enabled) {
        node.glowSize = node.size + config.glow.size;
        node.glowOpacity = config.glow.opacity;
    }

    // 添加脉冲动画数据
    if (config.pulse.enabled) {
        node.pulsePhase = Math.random() * Math.PI * 2;
        node.pulseSpeed = config.pulse.speed;
    }

    return node;
}

// ========== 创建粒子背景 ==========

function createParticleBackground() {
    const config = VISUAL_CONFIG.particles;
    if (!config.enabled) return;

    const container = document.getElementById('graph-container');
    if (!container) return;

    // 移除旧粒子
    const oldParticles = document.getElementById('particle-canvas');
    if (oldParticles) oldParticles.remove();

    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
    `;

    container.insertBefore(canvas, container.firstChild);

    const ctx = canvas.getContext('2d');
    let particles = [];

    // 调整画布大小
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 创建粒子
    for (let i = 0; i < config.count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * config.speed,
            vy: (Math.random() - 0.5) * config.speed,
            size: Math.random() * config.size,
            opacity: Math.random() * config.opacity
        });
    }

    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const theme = ENHANCED_COLOR_SCHEMES[currentTheme];

        particles.forEach(p => {
            // 更新位置
            p.x += p.vx;
            p.y += p.vy;

            // 边界检查
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // 绘制粒子
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = theme.particleColor.replace(')', `, ${p.opacity})`).replace('rgb', 'rgba');
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    animate();
    console.log('✅ 粒子背景已创建');
}

// ========== 增强力导向图配置 ==========

function getEnhancedGraphConfig() {
    const theme = ENHANCED_COLOR_SCHEMES[currentTheme];

    return {
        // 节点配置
        nodeResolution: 8,
        nodeRelSize: 6,

        // 颜色
        nodeColor: (node) => {
            const index = node.id ? node.id.charCodeAt(0) % theme.nodeColors.length : 0;
            return theme.nodeColors[index];
        },

        // 节点标签
        nodeLabel: 'id',

        // 标签颜色
        nodeLabelColor: '#ffffff',

        // 标签大小
        nodeLabelSize: 12,

        // 标签分辨率
        nodeLabelResolution: 6,

        // 连线颜色
        linkColor: theme.linkColor,

        // 连线宽度
        linkWidth: (link) => link.value || 0.5,

        // 连线透明度
        linkOpacity: VISUAL_CONFIG.links.opacity,

        // 连线曲线
        linkCurve: VISUAL_CONFIG.links.curve,

        // 力导向配置
        dagMode: null,
        dagLevelDistance: 0,

        // 节点斥力
        d3AlphaDecay: 0.05,
        d3VelocityDecay: 0.3,

        // 相机
        cameraDistance: VISUAL_CONFIG.camera.distance,

        // 自动旋转
        autoRotateSpeed: VISUAL_CONFIG.camera.autoRotateSpeed,

        // 后处理效果
        bloomEnabled: true,
        bloomStrength: 0.3,
        bloomRadius: 0.25,
        bloomThreshold: 0.1
    };
}

// ========== 节点点击特效 ==========

function createClickEffect(node, x, y) {
    const theme = ENHANCED_COLOR_SCHEMES[currentTheme];

    // 创建涟漪效果
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: radial-gradient(circle, ${theme.glowColor} 0%, transparent 70%);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 1000;
        animation: ripple-effect 0.6s ease-out forwards;
    `;

    document.body.appendChild(ripple);

    // 添加动画样式（如果还没添加）
    if (!document.getElementById('ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple-effect {
                0% {
                    width: 0;
                    height: 0;
                    opacity: 1;
                }
                100% {
                    width: 200px;
                    height: 200px;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 自动移除
    setTimeout(() => ripple.remove(), 600);
}

// ========== 导出配置 ==========

window.VisualEnhancer = {
    // 配置
    VISUAL_CONFIG,
    ENHANCED_COLOR_SCHEMES,

    // 函数
    applyTheme,
    cycleTheme,
    enhanceNodeRendering,
    createParticleBackground,
    getEnhancedGraphConfig,
    createClickEffect,

    // 当前状态
    getCurrentTheme: () => currentTheme
};

// ========== 自动初始化 ==========

// 页面加载后自动应用增强
window.addEventListener('load', () => {
    console.log('🎨 视觉增强模块已加载');
    console.log('📌 可用主题:', Object.keys(ENHANCED_COLOR_SCHEMES).map(k => ENHANCED_COLOR_SCHEMES[k].name).join(', '));
    console.log('💡 切换主题: VisualEnhancer.cycleTheme()');
});
