/**
 * ChatGalaxy 启动页面 - 星空粒子系统
 * 创建旋转的3D星球形状，点击后凝聚-扩散-消失
 * 增强版：星云背景、流星、闪烁效果、鼠标交互、音效系统
 */

// ========== 音效管理类 ==========

class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🔊 音效系统已初始化');
        } catch (e) {
            console.warn('⚠️ Web Audio API 不支持');
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        console.log('🔊 音效状态:', this.enabled ? '开启' : '关闭');
        return this.enabled;
    }

    // 清理音效系统（跳转到主页面时调用）
    destroy() {
        if (this.audioContext && this.initialized) {
            try {
                this.audioContext.close();
                console.log('🔊 音效系统已关闭');
            } catch (e) {
                console.warn('⚠️ 关闭音效系统失败:', e);
            }
            this.audioContext = null;
            this.initialized = false;
        }
    }

    // 播放合成音效（无需外部文件）
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.initialized) return;

        try {
            const ctx = this.audioContext;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('⚠️ 播放音效失败:', e);
        }
    }

    // 点击按钮音效（清脆的"叮"声）
    playClick() {
        this.init();
        this.playTone(800, 0.15, 'sine', 0.2);
        setTimeout(() => this.playTone(1200, 0.1, 'sine', 0.15), 50);
    }

    // 聚合完成音效（低沉的"嗡"声）
    playConverge() {
        this.init();
        this.playTone(200, 0.5, 'triangle', 0.3);
        setTimeout(() => this.playTone(150, 0.4, 'sine', 0.2), 100);
    }

    // 扩散音效（上升的"咻"声）
    playExpand() {
        this.init();
        if (!this.enabled || !this.initialized) return;

        try {
            const ctx = this.audioContext;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.setValueAtTime(200, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.8);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.8);
        } catch (e) {
            console.warn('⚠️ 播放音效失败:', e);
        }
    }
}

// 全局音效管理器
const soundManager = new SoundManager();

// ========== 背景星星类 ==========

class BackgroundStar {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.2;
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.twinklePhase = Math.random() * Math.PI * 2;
    }

    draw(ctx, time) {
        const twinkle = this.alpha * (1 + Math.sin(time * this.twinkleSpeed + this.twinklePhase) * 0.4);

        ctx.save();
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ========== 流星类 ==========

class ShootingStar {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }

    reset() {
        // 从画布边缘随机位置开始
        const side = Math.floor(Math.random() * 4); // 0:上, 1:右, 2:下, 3:左

        switch(side) {
            case 0: // 上边
                this.x = Math.random() * this.canvas.width;
                this.y = -100;
                break;
            case 1: // 右边
                this.x = this.canvas.width + 100;
                this.y = Math.random() * this.canvas.height;
                break;
            case 2: // 下边
                this.x = Math.random() * this.canvas.width;
                this.y = this.canvas.height + 100;
                break;
            case 3: // 左边
                this.x = -100;
                this.y = Math.random() * this.canvas.height;
                break;
        }

        // 流星轨迹朝向画布中心附近
        const targetX = this.canvas.width / 2 + (Math.random() - 0.5) * 400;
        const targetY = this.canvas.height / 2 + (Math.random() - 0.5) * 300;

        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        // 减速：从 15+10 降到 5+3
        const speed = Math.random() * 5 + 3;

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.length = Math.random() * 80 + 50;
        this.alpha = 1;
        this.active = false;
    }

    activate() {
        this.active = true;
        this.reset();
    }

    update() {
        if (!this.active) return false;

        this.x += this.vx;
        this.y += this.vy;
        // 减速淡出：从 0.015 降到 0.008
        this.alpha -= 0.008;

        // 检查是否超出边界或淡出
        if (this.alpha <= 0 ||
            this.x < -200 || this.x > this.canvas.width + 200 ||
            this.y < -200 || this.y > this.canvas.height + 200) {
            this.active = false;
            return false;
        }

        return true;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        // 创建流星渐变尾迹
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x - this.vx * 3, this.y - this.vy * 3
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.alpha})`);
        gradient.addColorStop(0.4, `rgba(147, 197, 253, ${this.alpha * 0.6})`);
        gradient.addColorStop(1, 'rgba(147, 197, 253, 0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
        ctx.stroke();

        // 流星头部光晕
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ========== 星云类 ==========

class Nebula {
    constructor(canvas) {
        this.canvas = canvas;
        this.clouds = [];
        this.createClouds();
    }

    createClouds() {
        // 创建多个星云云团
        const cloudCount = 5;
        for (let i = 0; i < cloudCount; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 300 + 200,
                // 紫色、蓝色、粉色渐变
                hue: Math.random() * 60 + 240, // 240-300 (蓝到紫)
                alpha: Math.random() * 0.03 + 0.01,
                pulseSpeed: Math.random() * 0.002 + 0.001,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    update(time) {
        this.clouds.forEach(cloud => {
            // 脉动效果
            cloud.currentAlpha = cloud.alpha * (1 + Math.sin(time * cloud.pulseSpeed + cloud.pulsePhase) * 0.3);
        });
    }

    draw(ctx) {
        this.clouds.forEach(cloud => {
            const gradient = ctx.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.radius
            );

            gradient.addColorStop(0, `hsla(${cloud.hue}, 70%, 50%, ${cloud.currentAlpha})`);
            gradient.addColorStop(0.5, `hsla(${cloud.hue}, 60%, 40%, ${cloud.currentAlpha * 0.5})`);
            gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// ========== 星星粒子类 ==========

class Star {
    constructor(canvas, centerX, centerY, radius, theta, phi, size, speed) {
        this.canvas = canvas;
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius; // 3D球体半径
        this.theta = theta; // 水平角度（经度）
        this.phi = phi; // 垂直角度（纬度）
        this.size = size;
        this.speed = speed;
        this.brightness = Math.random() * 0.5 + 0.5;

        // 闪烁效果
        this.twinkleSpeed = Math.random() * 0.03 + 0.01;
        this.twinklePhase = Math.random() * Math.PI * 2;

        // 3D坐标
        this.x3d = 0;
        this.y3d = 0;
        this.z3d = 0;

        // 2D投影坐标
        this.x = 0;
        this.y = 0;
        this.scale = 1;

        // 动画状态
        this.state = 'idle'; // idle | converging | expanding | fading
        this.targetX = 0;
        this.targetY = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.alpha = 1;

        this.update3DPosition();
    }

    update3DPosition() {
        // 球面坐标转笛卡尔坐标
        this.x3d = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
        this.y3d = this.radius * Math.cos(this.phi);
        this.z3d = this.radius * Math.sin(this.phi) * Math.sin(this.theta);

        // 透视投影
        this.project();
    }

    project() {
        // 透视投影参数
        const fov = 500; // 视场深度
        const viewDistance = 400; // 观察距离

        // 3D到2D投影
        const scale = fov / (fov + this.z3d + viewDistance);
        this.scale = scale;

        this.x = this.centerX + this.x3d * scale;
        this.y = this.centerY + this.y3d * scale;
    }

    rotate() {
        if (this.state === 'idle') {
            // 绕Y轴旋转
            this.theta += this.speed;
            this.update3DPosition();
        }
    }

    converge(targetX, targetY) {
        this.state = 'converging';
        this.targetX = targetX;
        this.targetY = targetY;

        // 向目标点移动（减速：从 0.03 降到 0.02）
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        this.x += dx * 0.02;
        this.y += dy * 0.02;

        // 聚合时停止旋转，避免 x/y 持续变化导致无限循环
        // 不再更新 theta 和 update3DPosition()

        // 放宽判定条件（从 2 放宽到 15），避免无限等待
        return Math.abs(dx) < 15 && Math.abs(dy) < 15;
    }

    expand() {
        this.state = 'expanding';

        // 从中心向外3D爆炸
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        // 减速：从 15+5 降到 6+3
        const speed = Math.random() * 6 + 3;
        const distance = Math.random() * 600 + 300;

        const x3d = distance * Math.sin(phi) * Math.cos(theta);
        const y3d = distance * Math.cos(phi);
        const z3d = distance * Math.sin(phi) * Math.sin(theta);

        // 投影到2D
        const fov = 500;
        const viewDistance = 400;
        const scale = fov / (fov + z3d + viewDistance);

        this.targetX = this.centerX + x3d * scale;
        this.targetY = this.centerY + y3d * scale;

        // 计算速度（减速：从 100帧 降到 150帧）
        this.velocityX = (this.targetX - this.x) / 150;
        this.velocityY = (this.targetY - this.y) / 150;
    }

    updateExpand() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.velocityX *= 0.98;
        this.velocityY *= 0.98;
        // 减速淡出：从 0.008 降到 0.005
        this.alpha -= 0.005;

        return this.alpha <= 0;
    }

    twinkle(time) {
        // 计算闪烁亮度
        return this.brightness * (1 + Math.sin(time * this.twinkleSpeed + this.twinklePhase) * 0.3);
    }

    draw(ctx, time) {
        const twinkleBrightness = this.twinkle(time);

        ctx.save();
        ctx.globalAlpha = this.alpha * twinkleBrightness;
        ctx.fillStyle = '#fff';

        // 根据深度调整大小和阴影
        const adjustedSize = this.size * this.scale;
        ctx.shadowBlur = adjustedSize * 2;
        ctx.shadowColor = 'rgba(102, 126, 234, 0.8)';

        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, adjustedSize), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ========== 主动画控制器 ==========

class StarfieldAnimation {
    constructor() {
        this.canvas = document.getElementById('starfield');
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.backgroundStars = [];
        this.shootingStars = [];
        this.nebula = null;
        this.animationId = null;
        this.phase = 'idle'; // idle | converge | expand | complete
        this.time = 0;

        // 鼠标交互
        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;
        this.targetMouseX = this.mouseX;
        this.targetMouseY = this.mouseY;

        this.resize();
        this.createStars();
        this.createBackgroundStars();
        this.createShootingStars();
        this.nebula = new Nebula(this.canvas);
        this.bindEvents();
        this.start();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;

        // 重新创建背景星星
        this.createBackgroundStars();

        // 重新创建星云
        if (this.nebula) {
            this.nebula = new Nebula(this.canvas);
        }
    }

    createStars() {
        this.stars = [];
        const starCount = 800;

        for (let i = 0; i < starCount; i++) {
            // 使用斐波那契球面分布算法
            const iNormalized = i / starCount;
            const phi = Math.acos(1 - 2 * iNormalized); // 纬度：0到π
            const theta = Math.PI * (1 + Math.sqrt(5)) * iNormalized; // 经度：黄金角度

            const radius = 220; // 3D球体半径
            const size = Math.random() * 2 + 1;
            const speed = 0.002 + Math.random() * 0.003;

            this.stars.push(new Star(
                this.canvas,
                this.centerX,
                this.centerY,
                radius,
                theta,
                phi,
                size,
                speed
            ));
        }
    }

    createBackgroundStars() {
        this.backgroundStars = [];
        const bgStarCount = 200;

        for (let i = 0; i < bgStarCount; i++) {
            this.backgroundStars.push(new BackgroundStar(this.canvas));
        }
    }

    createShootingStars() {
        // 创建3个流星对象池
        for (let i = 0; i < 3; i++) {
            this.shootingStars.push(new ShootingStar(this.canvas));
        }
    }

    bindEvents() {
        // 首次用户交互时初始化音效系统
        const initAudioOnInteraction = () => {
            if (!soundManager.initialized) {
                soundManager.init();
                console.log('🔊 音效系统已通过用户交互初始化');
            }
            // 移除监听器（只需初始化一次）
            document.removeEventListener('click', initAudioOnInteraction);
            document.removeEventListener('touchstart', initAudioOnInteraction);
            document.removeEventListener('keydown', initAudioOnInteraction);
        };

        // 监听多种用户交互事件来初始化音频
        document.addEventListener('click', initAudioOnInteraction, { once: true });
        document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
        document.addEventListener('keydown', initAudioOnInteraction, { once: true });

        // 窗口大小改变
        window.addEventListener('resize', () => {
            this.resize();
            // 重新定位所有星星
            this.stars.forEach(star => {
                star.centerX = this.centerX;
                star.centerY = this.centerY;
                star.update3DPosition();
            });
        });

        // 鼠标移动 - 视角微调
        window.addEventListener('mousemove', (e) => {
            if (this.phase === 'idle') {
                this.targetMouseX = e.clientX;
                this.targetMouseY = e.clientY;
            }
        });

        // 开始按钮
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                soundManager.playClick();
                this.triggerConverge();
            });
        }

        // 加载数据集按钮
        const loadDatasetBtn = document.getElementById('loadDatasetBtn');
        if (loadDatasetBtn) {
            loadDatasetBtn.addEventListener('click', () => {
                soundManager.playClick();
                this.triggerConverge('data-manager.html');
            });
        }

        // 🔧 运行 Demo 按钮
        const runDemoBtn = document.getElementById('runDemoBtn');
        if (runDemoBtn) {
            runDemoBtn.addEventListener('click', () => {
                soundManager.playClick();

                // 标记需要自动生成演示数据
                sessionStorage.setItem('chatgalaxy_auto_generate_demo', 'true');

                // 跳转到数据管理页面
                this.triggerConverge('data-manager.html');
            });
        }

        // 音效控制按钮
        const soundBtn = document.getElementById('soundToggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const enabled = soundManager.toggle();
                soundBtn.innerHTML = enabled ?
                    '<i class="ri-volume-up-line"></i>' :
                    '<i class="ri-volume-mute-line"></i>';
            });
        }
    }

    start() {
        const animate = () => {
            this.time++;
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    update() {
        // 平滑鼠标移动
        if (this.phase === 'idle') {
            this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
            this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
        }

        // 更新星云
        if (this.nebula) {
            this.nebula.update(this.time);
        }

        // 随机激活流星（增加概率：从 0.003 提升到 0.008）
        if (this.phase === 'idle' && Math.random() < 0.008) {
            const inactiveStar = this.shootingStars.find(s => !s.active);
            if (inactiveStar) {
                inactiveStar.activate();
            }
        }

        // 更新流星
        this.shootingStars.forEach(star => star.update());

        if (this.phase === 'idle') {
            // 旋转阶段
            this.stars.forEach(star => star.rotate());
        } else if (this.phase === 'converge') {
            // 凝聚阶段
            let allConverged = true;
            this.stars.forEach(star => {
                const converged = star.converge(this.centerX, this.centerY);
                if (!converged) allConverged = false;
            });

            if (allConverged) {
                soundManager.playConverge();
                this.phase = 'expand';
                this.stars.forEach(star => star.expand());
            }
        } else if (this.phase === 'expand') {
            // 扩散阶段
            let allFaded = true;
            this.stars.forEach(star => {
                const faded = star.updateExpand();
                if (!faded) allFaded = false;
            });

            if (allFaded) {
                soundManager.playExpand();
                this.phase = 'complete';
                this.onComplete();
            }
        }
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 应用鼠标视差
        this.ctx.save();
        if (this.phase === 'idle') {
            const offsetX = (this.mouseX - this.centerX) * 0.02;
            const offsetY = (this.mouseY - this.centerY) * 0.02;
            this.ctx.translate(offsetX, offsetY);
        }

        // 绘制背景星星（最底层）
        this.backgroundStars.forEach(star => star.draw(this.ctx, this.time));

        // 绘制星云
        if (this.nebula) {
            this.nebula.draw(this.ctx);
        }

        // 绘制所有星星（按深度排序）
        const sortedStars = [...this.stars].sort((a, b) => a.z3d - b.z3d);
        sortedStars.forEach(star => star.draw(this.ctx, this.time));

        // 绘制流星
        this.shootingStars.forEach(star => star.draw(this.ctx));

        this.ctx.restore();
    }

    triggerConverge(targetUrl = 'index.html') {
        if (this.phase !== 'idle') {
            return;
        }

        this.phase = 'converge';
        this.targetUrl = targetUrl;

        // 隐藏按钮
        const container = document.querySelector('.intro-content');
        if (container) {
            container.style.opacity = '0';
            container.style.pointerEvents = 'none';
        }
    }

    onComplete() {
        cancelAnimationFrame(this.animationId);

        // 标记已经看过 intro（避免 index.html 再次跳转回来）
        sessionStorage.setItem('chatgalaxy_intro_seen', 'true');

        // 清理音效系统（释放音频资源，避免与主页面冲突）
        soundManager.destroy();

        // 淡出容器
        const container = document.querySelector('.intro-container');
        if (container) {
            container.classList.add('fade-out');
        }

        // 延迟后跳转
        setTimeout(() => {
            window.location.href = this.targetUrl;
        }, 500);
    }

    // 重置动画状态（用于浏览器返回键时重新开始）
    reset() {
        // 取消当前动画循环
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // 重置状态
        this.phase = 'idle';
        this.time = 0;

        // 重新创建星星
        this.createStars();

        // 重新初始化音效系统（如果已被销毁）
        if (!soundManager.initialized) {
            soundManager.initialized = false;
            soundManager.audioContext = null;
        }

        // 显示按钮容器
        const container = document.querySelector('.intro-content');
        if (container) {
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';
        }

        // 移除 fade-out 类
        const mainContainer = document.querySelector('.intro-container');
        if (mainContainer) {
            mainContainer.classList.remove('fade-out');
        }

        // 重新开始动画
        this.start();
    }
}

// ========== 初始化 ==========

let starfieldAnimation = null;

document.addEventListener('DOMContentLoaded', () => {
    // 正常初始化动画（移除了所有重定向逻辑）
    try {
        starfieldAnimation = new StarfieldAnimation();
        console.log('🌌 ChatGalaxy Intro initialized');
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        // 降级方案：直接跳转到主页
        window.location.href = 'index.html';
    }
});

// 监听页面显示事件（浏览器返回键时触发）
window.addEventListener('pageshow', (event) => {
    // 如果页面是从缓存中恢复的（比如浏览器返回键）
    if (event.persisted || (window.performance && window.performance.getEntriesByType('navigation').length > 0)) {
        if (starfieldAnimation) {
            starfieldAnimation.reset();
        }
    }
});

// 监听页面可见性变化（用户切换标签页时）
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && starfieldAnimation) {
        // 页面重新可见时，如果动画已结束，则重置
        if (starfieldAnimation.phase === 'complete') {
            starfieldAnimation.reset();
        }
    }
});
