/**
 * 3D 鼠标轨迹粒子系统（基于 Three.js）
 * 在3D空间中添加鼠标移动轨迹效果
 * ChatGalaxy - 深山有密林团队
 */

class ParticleSystem3D {
    constructor(graph) {
        this.graph = graph;
        this.scene = graph.scene();
        this.mouse = new THREE.Vector2();
        this.mouse3D = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        this.isActive = false;
        this.clock = new THREE.Clock();

        // 配置
        this.config = {
            enabled: true,
            mouseTrailLength: 20
        };

        this.init();
    }

    init() {
        // 监听鼠标移动
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

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

                    // 🔧 固定粒子大小，不随距离缩放
                    gl_PointSize = size * pixelRatio;

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
        this.particleSystems = { mouseTrail: points };
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

    // ========== 动画更新 ==========

    update() {
        if (!this.isActive) return;

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // 更新鼠标轨迹
        this.updateMouseTrail();
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
        // 清除鼠标轨迹
        if (this.mouseTrailPositions) {
            this.mouseTrailPositions = [];
            this.mouseTrailTimestamps = [];
        }
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
