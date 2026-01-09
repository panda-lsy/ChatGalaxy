/**
 * 超级粒子特效系统
 * 为3D星系添加炫酷的粒子效果
 * ProjectZero - 深山有密林团队
 */

class SuperParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.particleTypes = [];
        this.mouse = { x: 0, y: 0 };
        this.isActive = false;
        this.animationId = null;

        // 配置
        this.config = {
            enabled: true,
            maxParticles: 300,
            spawnRate: 2,  // 每帧生成的粒子数
            gravity: 0.05,
            friction: 0.99
        };

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 鼠标追踪
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // ========== 粒子类型 ==========

    addParticleType(type) {
        this.particleTypes.push(type);
    }

    // ========== 星空粒子 ==========

    createStarfieldParticle() {
        return {
            type: 'starfield',
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            twinkleSpeed: Math.random() * 0.02 + 0.01,
            twinklePhase: Math.random() * Math.PI * 2,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2
        };
    }

    // ========== 萤火虫粒子 ==========

    createFireflyParticle(x, y) {
        return {
            type: 'firefly',
            x: x || Math.random() * this.canvas.width,
            y: y || Math.random() * this.canvas.height,
            size: Math.random() * 3 + 1,
            opacity: 0,
            maxOpacity: Math.random() * 0.8 + 0.2,
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1,
            life: 0,
            maxLife: 200 + Math.random() * 100,
            color: `hsl(${50 + Math.random() * 30}, 100%, 50%)`
        };
    }

    // ========== 爆炸粒子 ==========

    createExplosionParticle(x, y, color = '#ff6b6b') {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;

        return {
            type: 'explosion',
            x: x,
            y: y,
            size: Math.random() * 4 + 2,
            opacity: 1,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.2,
            friction: 0.98,
            life: 0,
            maxLife: 60 + Math.random() * 30,
            color: color
        };
    }

    // ========== 尾迹粒子 ==========

    createTrailParticle(x, y, color) {
        return {
            type: 'trail',
            x: x,
            y: y,
            size: Math.random() * 3 + 1,
            opacity: 1,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 0,
            maxLife: 30,
            color: color || 'rgba(255, 255, 255, 0.5)'
        };
    }

    // ========== 连线粒子 ==========

    createConnectionParticle(x1, y1, x2, y2, progress = 0) {
        return {
            type: 'connection',
            x: x1,
            y: y1,
            targetX: x2,
            targetY: y2,
            progress: progress,
            speed: 0.02,
            opacity: 0.6,
            size: 2,
            color: 'rgba(255, 255, 255, 0.3)'
        };
    }

    // ========== 鼠标吸引粒子 ==========

    createAttractorParticle() {
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch(side) {
            case 0: x = 0; y = Math.random() * this.canvas.height; break;
            case 1: x = this.canvas.width; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = 0; break;
            case 3: x = Math.random() * this.canvas.width; y = this.canvas.height; break;
        }

        return {
            type: 'attractor',
            x: x,
            y: y,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.3,
            speed: Math.random() * 1 + 0.5,
            color: `hsl(${200 + Math.random() * 60}, 80%, 60%)`
        };
    }

    // ========== 更新和绘制 ==========

    update() {
        // 生成新粒子
        if (this.particles.length < this.config.maxParticles) {
            for (let i = 0; i < this.config.spawnRate; i++) {
                // 随机选择粒子类型
                const types = ['starfield', 'firefly', 'attractor'];
                const type = types[Math.floor(Math.random() * types.length)];

                let particle;
                switch(type) {
                    case 'starfield':
                        particle = this.createStarfieldParticle();
                        break;
                    case 'firefly':
                        particle = this.createFireflyParticle();
                        break;
                    case 'attractor':
                        particle = this.createAttractorParticle();
                        break;
                }

                if (particle) {
                    this.particles.push(particle);
                }
            }
        }

        // 更新所有粒子
        this.particles = this.particles.filter(p => this.updateParticle(p));
    }

    updateParticle(p) {
        switch(p.type) {
            case 'starfield':
                this.updateStarfield(p);
                break;
            case 'firefly':
                this.updateFirefly(p);
                break;
            case 'explosion':
                this.updateExplosion(p);
                break;
            case 'trail':
                this.updateTrail(p);
                break;
            case 'connection':
                this.updateConnection(p);
                break;
            case 'attractor':
                this.updateAttractor(p);
                break;
        }

        // 移除死亡粒子
        return p.life < p.maxLife || p.opacity > 0;
    }

    updateStarfield(p) {
        // 闪烁效果
        p.twinklePhase += p.twinkleSpeed;
        p.opacity = 0.3 + Math.sin(p.twinklePhase) * 0.3;

        // 缓慢移动
        p.x += p.vx;
        p.y += p.vy;

        // 边界检查
        if (p.x < 0) p.x = this.canvas.width;
        if (p.x > this.canvas.width) p.x = 0;
        if (p.y < 0) p.y = this.canvas.height;
        if (p.y > this.canvas.height) p.y = 0;

        p.life = 0;  // 星空粒子永不死亡
        p.maxLife = Infinity;
    }

    updateFirefly(p) {
        // 移动
        p.x += p.vx;
        p.y += p.vy;

        // 生命周期
        p.life++;

        // 淡入淡出
        if (p.life < 50) {
            p.opacity = (p.life / 50) * p.maxOpacity;
        } else if (p.life > p.maxLife - 50) {
            p.opacity = ((p.maxLife - p.life) / 50) * p.maxOpacity;
        } else {
            p.opacity = p.maxOpacity;
        }

        // 鼠标吸引
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
            p.vx += (dx / dist) * 0.1;
            p.vy += (dy / dist) * 0.1;
        }
    }

    updateExplosion(p) {
        // 移动
        p.x += p.vx;
        p.y += p.vy;

        // 重力和摩擦
        p.vy += p.gravity;
        p.vx *= p.friction;
        p.vy *= p.friction;

        // 生命周期
        p.life++;

        // 淡出
        p.opacity = 1 - (p.life / p.maxLife);
    }

    updateTrail(p) {
        // 缓慢扩散
        p.x += p.vx;
        p.y += p.vy;

        p.life++;
        p.opacity = 1 - (p.life / p.maxLife);
    }

    updateConnection(p) {
        // 向目标移动
        p.progress += p.speed;

        p.x = p.x + (p.targetX - p.x) * p.speed;
        p.y = p.y + (p.targetY - p.y) * p.speed;

        p.life++;
        p.opacity = 1 - (p.life / p.maxLife);

        return p.progress < 1;
    }

    updateAttractor(p) {
        // 向鼠标移动
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) {
            p.vx += (dx / dist) * 0.05;
            p.vy += (dy / dist) * 0.05;
        }

        p.x += p.vx;
        p.y += p.vy;

        // 摩擦
        p.vx *= 0.95;
        p.vy *= 0.95;

        p.life = 0;
        p.maxLife = Infinity;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const p of this.particles) {
            this.drawParticle(p);
        }
    }

    drawParticle(p) {
        this.ctx.save();

        switch (p.type) {
            case 'starfield':
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                this.ctx.fill();
                break;

            case 'firefly':
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color.replace(')', `, ${p.opacity})`).replace('hsl', 'hsla');
                this.ctx.fill();

                // 光晕
                const gradient = this.ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, p.size * 3
                );
                gradient.addColorStop(0, p.color.replace(')', `, ${p.opacity * 0.5})`).replace('hsl', 'hsla'));
                gradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'explosion':
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color.replace(')', `, ${p.opacity})`).replace('rgb', 'rgba');
                this.ctx.fill();
                break;

            case 'trail':
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
                break;

            case 'connection':
                // 绘制连线
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.targetX, p.targetY);
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = p.size / 2;
                this.ctx.stroke();
                break;

            case 'attractor':
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
                break;
        }

        this.ctx.restore();
    }

    // ========== 特效方法 ==========

    // 触发爆炸效果
    explode(x, y, count = 20, color = '#ff6b6b') {
        for (let i = 0; i < count; i++) {
            const particle = this.createExplosionParticle(x, y, color);
            this.particles.push(particle);
        }
    }

    // 创建尾迹
    createTrail(points, color) {
        for (let i = 0; i < points.length - 1; i++) {
            setTimeout(() => {
                const particle = this.createTrailParticle(
                    points[i].x,
                    points[i].y,
                    color
                );
                this.particles.push(particle);
            }, i * 10);
        }
    }

    // 创建节点连线
    connectNodes(node1, node2) {
        const particle = this.createConnectionParticle(
            node1.x || this.canvas.width / 2,
            node1.y || this.canvas.height / 2,
            node2.x || this.canvas.width / 2,
            node2.y || this.canvas.height / 2
        );
        this.particles.push(particle);
    }

    // 清除所有粒子
    clear() {
        this.particles = [];
    }

    // 清除特定类型粒子
    clearType(type) {
        this.particles = this.particles.filter(p => p.type !== type);
    }

    // ========== 动画循环 ==========

    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.animate();

        // Particle system started
    }

    stop() {
        this.isActive = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Particle system stopped
    }

    animate() {
        if (!this.isActive) return;

        this.update();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // ========== 配置方法 ==========

    setConfig(key, value) {
        this.config[key] = value;
        // Config updated
    }

    getConfig(key) {
        return this.config[key];
    }
}

// ========== 导出 ==========

window.SuperParticleSystem = SuperParticleSystem;

// ========== 自动初始化 ==========

let particleSystem = null;

window.addEventListener('load', () => {
    // 查找或创建Canvas
    let canvas = document.getElementById('particle-canvas');

    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'particle-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        document.body.appendChild(canvas);
    }

    // 创建粒子系统
    particleSystem = new SuperParticleSystem(canvas);

    // 自动启动
    particleSystem.start();
});

// ========== 全局访问 ==========

window.particleSystem = () => particleSystem;
