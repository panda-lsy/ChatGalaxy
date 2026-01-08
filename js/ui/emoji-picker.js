/**
 * ChatGalaxy Emoji Picker 组件
 * 单一职责：管理 emoji 选择器的创建、定位和交互
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

/**
 * Emoji Picker 类
 * @class
 */
class EmojiPicker {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     * @param {string[]} config.emojis - emoji 列表（默认提供通用表情）
     * @param {number} config.columns - 列数（默认 6）
     * @param {number} config.width - 宽度（默认 300px）
     * @param {number} config.gap - 间距（默认 6px）
     * @param {string} config.zIndex - z-index（默认 10001）
     */
    constructor(config = {}) {
        // 配置
        this.emojis = config.emojis || [
            '🌌', '✨', '🌟', '🌙', '🪐', '💫',
            '🚀', '🛸', '💬', '📱', '💭', '🎨',
            '🎮', '📷', '🎵', '🎬', '📚', '🔬',
            '💡', '🔥', '⭐', '🌈', '☀️', '🌸',
            '🍀', '🎁', '🏆', '💎', '🔮', '🎯'
        ];
        this.columns = config.columns || 6;
        this.width = config.width || 300;
        this.gap = config.gap || 6;
        this.zIndex = config.zIndex || 10001;

        // 当前实例
        this.picker = null;
        this.targetInput = null;
    }

    /**
     * 显示 emoji 选择器（模态框样式）
     * @param {HTMLElement} triggerButton - 触发按钮
     * @param {HTMLInputElement} targetInput - 目标输入框
     */
    show(triggerButton, targetInput) {
        // 移除已存在的选择器
        this.hide();

        this.targetInput = targetInput;

        // 创建遮罩层
        this.overlay = this._createOverlay();

        // 创建弹窗容器
        this.picker = this._createPicker();

        // 添加到 body
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.picker);

        // 显示动画
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
            this.picker.style.opacity = '1';
            this.picker.style.transform = 'scale(1)';
        });

        // 绑定关闭事件
        this._bindCloseEvents();
    }

    /**
     * 隐藏并销毁选择器
     */
    hide() {
        if (this.picker) {
            this.picker.style.opacity = '0';
            this.picker.style.transform = 'scale(0.9)';
        }

        if (this.overlay) {
            this.overlay.style.opacity = '0';
        }

        // 等待动画完成后移除 DOM
        setTimeout(() => {
            if (this.picker) {
                this.picker.remove();
                this.picker = null;
            }
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
        }, 200);
    }

    /**
     * 创建遮罩层
     * @private
     * @returns {HTMLElement}
     */
    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'emoji-picker-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: ${this.zIndex - 1};
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        return overlay;
    }

    /**
     * 创建选择器 DOM（模态框样式）
     * @private
     * @returns {HTMLElement}
     */
    _createPicker() {
        const picker = document.createElement('div');
        picker.className = 'emoji-picker-modal';

        // 设置样式
        picker.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: ${this.width}px;
            max-width: 90vw;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            box-shadow: var(--shadow-lg);
            padding: 20px;
            z-index: ${this.zIndex};
            opacity: 0;
            transition: all 0.2s ease;
        `;

        // 标题栏
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--card-border);
        `;

        const title = document.createElement('h3');
        title.textContent = '选择 Emoji';
        title.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-main);
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="ri-close-line"></i>';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 20px;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'var(--card-hover-bg)';
            closeBtn.style.color = 'var(--text-main)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = 'var(--text-muted)';
        });
        closeBtn.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);

        // 创建 emoji 网格
        const grid = document.createElement('div');
        grid.className = 'emoji-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.columns}, 1fr);
            gap: ${this.gap}px;
            max-height: 60vh;
            overflow-y: auto;
            padding-right: 8px;
        `;

        // 添加 emoji
        this.emojis.forEach(emoji => {
            const item = this._createEmojiItem(emoji);
            grid.appendChild(item);
        });

        picker.appendChild(header);
        picker.appendChild(grid);

        return picker;
    }

    /**
     * 创建 emoji 选项
     * @private
     * @param {string} emoji - emoji 字符
     * @returns {HTMLElement}
     */
    _createEmojiItem(emoji) {
        const item = document.createElement('div');
        item.className = 'emoji-item';
        item.textContent = emoji;
        item.style.cursor = 'pointer';
        item.style.textAlign = 'center';
        item.style.padding = '8px';
        item.style.borderRadius = '6px';
        item.style.transition = 'background var(--transition-fast)';
        item.style.fontSize = '24px';

        // 悬停效果
        item.addEventListener('mouseenter', () => {
            item.style.background = 'var(--card-hover-bg)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });

        // 点击事件
        item.addEventListener('click', () => {
            this._selectEmoji(emoji);
        });

        return item;
    }

    /**
     * 选择 emoji
     * @private
     * @param {string} emoji - emoji 字符
     */
    _selectEmoji(emoji) {
        if (this.targetInput) {
            this.targetInput.value = emoji;
            this.targetInput.dispatchEvent(new Event('input'));
            this.targetInput.dispatchEvent(new Event('change'));
        }
        this.hide();
    }

    /**
     * 绑定关闭事件
     * @private
     */
    _bindCloseEvents() {
        // 点击遮罩层关闭
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.hide());
        }

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.hide();
    }
}

/**
 * 创建 emoji 选择器实例（单例模式）
 * @param {Object} config - 配置对象
 * @returns {EmojiPicker}
 */
function createEmojiPicker(config) {
    return new EmojiPicker(config);
}

// 全局导出
window.EmojiPicker = {
    EmojiPicker,
    createEmojiPicker
};
