/**
 * 3D 粒子特效系统（基于 Three.js）
 * 在3D空间中添加炫酷的粒子效果
 * ChatGalaxy - 深山有密林团队
 */

class ParticleSystem3D {
    constructor(graph) {
        this.graph = graph;
        this.scene = graph.scene();
        this.particles = [];
        this.particleSystems = {};
        this.mouse = new THREE.Vector2();
        this.mouse3D = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        this.isActive = false;
        this.clock = new THREE.Clock();

        // 配置
        this.config = {
            enabled: true,
            maxParticles: 500,
            mouseTrailLength: 20,
            starfieldCount: 2000,
            fireflyCount: 100
        };

        this.init();
    }

    init() {
        // 监听鼠标移动
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // 创建星空粒子
        this.createStarfield();

        // 创建萤火虫粒子
        this.createFireflies();

        // 创建鼠标轨迹系统
        this.createMouseTrail();

        // 开始动画循环
        this.start();
    }

    onMouseMove(event) {
        // 更新鼠标2D坐标
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 将2D坐标转换为3D坐标
        this.raycaster.setFromCamera(this.mouse, this.graph.camera());

        // 在z=0平面上找到鼠标位置
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(planeZ, target);

        if (target) {
            this.mouse3D.copy(target);
            this.addMouseTrailParticle(target);
        }
    }

    // ========== 星空粒子 ==========

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const count = this.config.starfieldCount;

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const phases = new Float32Array(count); // 闪烁相位

        for (let i = 0; i < count; i++) {
            // 在大范围内随机分布
            positions[i * 3] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;

            // 白色星星
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;

            // 大小
            sizes[i] = Math.random() * 2 + 1;

            // 闪烁相位
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        // 创建着色器材质
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute float phase;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float time;
                uniform float pixelRatio;

                void main() {
                    vColor = color;

                    // 闪烁效果
                    float twinkle = sin(time * 2.0 + phase) * 0.5 + 0.5;
                    vAlpha = 0.3 + twinkle * 0.7;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    // 圆形粒子
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    if (dist > 0.5) discard;

                    // 边缘柔化
                    float alpha = smoothstep(0.5, 0.3, dist) * vAlpha;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        this.particleSystems.starfield = points;
    }

    // ========== 萤火虫粒子 ==========

    createFireflies() {
        const geometry = new THREE.BufferGeometry();
        const count = this.config.fireflyCount;

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const phases = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // 在场景中心附近随机分布
            positions[i * 3] = (Math.random() - 0.5) * 400;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

            // 黄绿色调
            const hue = 0.15 + Math.random() * 0.1; // 50-80度
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            // 速度
            velocities[i * 3] = (Math.random() - 0.5) * 0.5;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

            // 闪烁相位
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute vec3 velocity;
                attribute vec3 color;
                attribute float phase;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float time;
                uniform float pixelRatio;

                void main() {
                    vColor = color;

                    // 闪烁效果
                    float twinkle = sin(time * 3.0 + phase) * 0.5 + 0.5;
                    vAlpha = 0.2 + twinkle * 0.8;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 8.0 * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    // 圆形粒子，带光晕
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);

                    // 中心亮，边缘淡
                    float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        this.particleSystems.fireflies = points;
    }

    // ========== 鼠标轨迹粒子 ==========

    createMouseTrail() {
        this.mouseTrailPositions = [];
        this.mouseTrailTimestamps = [];

        const geometry = new THREE.BufferGeometry();
        const count = this.config.mouseTrailLength;

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);

        // 初始化所有粒子在原点
        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.6;
            colors[i * 3 + 2] = 1.0;

            sizes[i] = 5.0 - (i / count) * 4.0; // 从大到小
            alphas[i] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute vec3 color;
                attribute float size;
                attribute float alpha;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float pixelRatio;

                void main() {
                    vColor = color;
                    vAlpha = alpha;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    // 圆形粒子，带光晕
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);

                    // 中心亮，边缘淡
                    float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        this.particleSystems.mouseTrail = points;
        this.mouseTrailGeometry = geometry;
    }

    addMouseTrailParticle(position) {
        if (!this.mouseTrailPositions) return;

        // 添加新位置
        this.mouseTrailPositions.push(position.clone());
        this.mouseTrailTimestamps.push(Date.now());

        // 保持固定长度
        while (this.mouseTrailPositions.length > this.config.mouseTrailLength) {
            this.mouseTrailPositions.shift();
            this.mouseTrailTimestamps.shift();
        }
    }

    updateMouseTrail() {
        if (!this.mouseTrailGeometry || !this.mouseTrailPositions) return;

        const positions = this.mouseTrailGeometry.attributes.position.array;
        const alphas = this.mouseTrailGeometry.attributes.alpha.array;

        const now = Date.now();
        const maxAge = 1000; // 1秒后消失

        // 更新所有轨迹粒子
        for (let i = 0; i < this.config.mouseTrailLength; i++) {
            const index = this.mouseTrailPositions.length - 1 - i;

            if (index >= 0 && index < this.mouseTrailPositions.length) {
                const pos = this.mouseTrailPositions[index];
                const timestamp = this.mouseTrailTimestamps[index];
                const age = now - timestamp;

                // 位置
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;

                // 透明度（随时间淡出）
                alphas[i] = 1.0 - Math.min(age / maxAge, 1.0);
            } else {
                // 隐藏未使用的粒子
                alphas[i] = 0;
            }
        }

        this.mouseTrailGeometry.attributes.position.needsUpdate = true;
        this.mouseTrailGeometry.attributes.alpha.needsUpdate = true;
    }

    // ========== 爆炸粒子 ==========

    explode(position, count = 50, color = 0xff6b6b) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const colorObj = new THREE.Color(color);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            // 爆炸方向
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = Math.random() * 5 + 2;

            velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
            velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
            velocities[i * 3 + 2] = Math.cos(phi) * speed;

            colors[i * 3] = colorObj.r;
            colors[i * 3 + 1] = colorObj.g;
            colors[i * 3 + 2] = colorObj.b;

            sizes[i] = Math.random() * 4 + 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        // 添加到粒子列表用于更新
        this.particles.push({
            type: 'explosion',
            mesh: points,
            velocities: velocities,
            age: 0,
            maxAge: 120, // 2秒 (60fps)
            gravity: -0.1
        });
    }

    // ========== 动画更新 ==========

    update() {
        if (!this.isActive) return;

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // 更新星空
        if (this.particleSystems.starfield) {
            this.particleSystems.starfield.material.uniforms.time.value = time;
        }

        // 更新萤火虫
        if (this.particleSystems.fireflies) {
            this.updateFireflies(delta);
            this.particleSystems.fireflies.material.uniforms.time.value = time;
        }

        // 更新鼠标轨迹
        this.updateMouseTrail();

        // 更新爆炸粒子
        this.updateExplosions(delta);
    }

    updateFireflies(delta) {
        const positions = this.particleSystems.fireflies.geometry.attributes.position.array;
        const velocities = this.particleSystems.fireflies.geometry.attributes.velocity.array;

        // 吸引到鼠标
        for (let i = 0; i < this.config.fireflyCount; i++) {
            const i3 = i * 3;

            // 向鼠标移动
            const dx = this.mouse3D.x - positions[i3];
            const dy = this.mouse3D.y - positions[i3 + 1];
            const dz = this.mouse3D.z - positions[i3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 300 && dist > 10) {
                const force = 0.5 / dist;
                velocities[i3] += dx * force;
                velocities[i3 + 1] += dy * force;
                velocities[i3 + 2] += dz * force;
            }

            // 更新位置
            positions[i3] += velocities[i3] * delta * 60;
            positions[i3 + 1] += velocities[i3 + 1] * delta * 60;
            positions[i3 + 2] += velocities[i3 + 2] * delta * 60;

            // 阻尼
            velocities[i3] *= 0.98;
            velocities[i3 + 1] *= 0.98;
            velocities[i3 + 2] *= 0.98;
        }

        this.particleSystems.fireflies.geometry.attributes.position.needsUpdate = true;
    }

    updateExplosions(delta) {
        // 更新所有爆炸粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'explosion') {
                p.age++;

                const positions = p.mesh.geometry.attributes.position.array;

                for (let j = 0; j < p.velocities.length / 3; j++) {
                    const j3 = j * 3;

                    // 重力
                    p.velocities[j3 + 1] += p.gravity;

                    // 更新位置
                    positions[j3] += p.velocities[j3] * delta * 60;
                    positions[j3 + 1] += p.velocities[j3 + 1] * delta * 60;
                    positions[j3 + 2] += p.velocities[j3 + 2] * delta * 60;
                }

                p.mesh.geometry.attributes.position.needsUpdate = true;

                // 淡出
                p.mesh.material.opacity = 1 - (p.age / p.maxAge);

                // 移除过期粒子
                if (p.age >= p.maxAge) {
                    this.scene.remove(p.mesh);
                    p.mesh.geometry.dispose();
                    p.mesh.material.dispose();
                    this.particles.splice(i, 1);
                }
            }
        }
    }

    // ========== 控制方法 ==========

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.clock.start();
    }

    stop() {
        this.isActive = false;
        this.clock.stop();
    }

    clear() {
        // 清除所有爆炸粒子
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        }
        this.particles = [];
    }

    setConfig(key, value) {
        this.config[key] = value;
    }

    getConfig(key) {
        return this.config[key];
    }
}

// ========== 导出 ==========

window.ParticleSystem3D = ParticleSystem3D;
