/**
 * ChatGalaxy 通用侧边栏基类
 * 统一左侧边栏和右侧边栏的核心功能
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

import { ThemeManager } from '../theme/theme-manager.js';

/**
 * 侧边栏基类
 * @abstract
 * @class
 */
export class SidebarBase {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     * @param {string} config.id - 侧边栏 DOM ID
     * @param {string} config.position - 位置 ('left' | 'right')
     * @param {number} config.width - 宽度（像素）
     * @param {boolean} config.collapsible - 是否可折叠
     */
    constructor(config) {
        // 配置
        this.id = config.id;
        this.position = config.position || 'right';
        this.width = config.width || 280;
        this.collapsible = config.collapsible !== undefined ? config.collapsible : true;

        // 状态
        this.visible = false;
        this.collapsed = false;
        this.content = null;

        // DOM 元素
        this.element = null;
        this.toggleButton = null;
        this.headerElement = null;
        this.contentElement = null;

        // 初始化
        this._initialize();
    }

    /**
     * 初始化侧边栏
     * @private
     */
    _initialize() {
        // 查找 DOM 元素
        this.element = document.getElementById(this.id);
        if (!this.element) {
            console.error(`❌ [SidebarBase] Element not found: ${this.id}`);
            return;
        }

        // 查找子元素
        this.headerElement = this.element.querySelector('.sidebar-header') ||
                           this.element.querySelector(`#${this.id}-header`);
        this.contentElement = this.element.querySelector('.sidebar-content') ||
                            this.element.querySelector(`#${this.id}-content`);

        // 查找或创建切换按钮
        this._initToggleButton();

        // 绑定事件
        this._bindEvents();

        // 应用初始状态
        this._applyInitialState();

        console.log(`✅ [SidebarBase] Initialized: ${this.id} (${this.position})`);
    }

    /**
     * 初始化切换按钮
     * @private
     */
    _initToggleButton() {
        const toggleClass = this.position === 'left'
            ? '.sidebar-toggle-open'
            : '.sidebar-toggle';

        this.toggleButton = document.querySelector(toggleClass);

        // 如果没有切换按钮，创建一个
        if (!this.toggleButton && this.collapsible) {
            this._createToggleButton();
        }

        // 绑定切换事件
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggle());
        }
    }

    /**
     * 创建切换按钮
     * @private
     */
    _createToggleButton() {
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = `sidebar-toggle ${this.position}`;
        this.toggleButton.innerHTML = '<i class="ri-menu-line"></i>';
        this.toggleButton.setAttribute('aria-label', '切换侧边栏');
        this.toggleButton.setAttribute('type', 'button');

        document.body.appendChild(this.toggleButton);
        console.log(`📝 [SidebarBase] Created toggle button for: ${this.id}`);
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 关闭按钮
        const closeBtn = this.element.querySelector('.sidebar-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.visible) {
                this.hide();
            }
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (this.visible && !this.element.contains(e.target) && !this.toggleButton?.contains(e.target)) {
                this.hide();
            }
        });

        // 监听主题变更
        if (window.ThemeManager) {
            window.ThemeManager.on('themeChange', (data) => {
                this.onThemeChange(data);
            });
        }
    }

    /**
     * 应用初始状态
     * @private
     */
    _applyInitialState() {
        // 从 LocalStorage 恢复状态
        const savedState = this._loadState();

        if (savedState) {
            if (savedState.collapsed) {
                this.collapse(false); // false = 不保存
            }
            if (savedState.visible) {
                this.show(false);
            }
        }
    }

    /**
     * 显示侧边栏
     * @param {boolean} save - 是否保存状态
     */
    show(save = true) {
        this.element.classList.add('active');
        this.visible = true;

        // 隐藏切换按钮
        if (this.toggleButton) {
            this.toggleButton.style.display = 'none';
        }

        // 触发回调
        this.onShow();

        // 保存状态
        if (save) {
            this._saveState();
        }

        console.log(`📖 [${this.id}] Sidebar shown`);
    }

    /**
     * 隐藏侧边栏
     * @param {boolean} save - 是否保存状态
     */
    hide(save = true) {
        this.element.classList.remove('active');
        this.visible = false;

        // 显示切换按钮
        if (this.toggleButton) {
            this.toggleButton.style.display = '';
        }

        // 触发回调
        this.onHide();

        // 保存状态
        if (save) {
            this._saveState();
        }

        console.log(`📕 [${this.id}] Sidebar hidden`);
    }

    /**
     * 切换侧边栏显示/隐藏
     */
    toggle() {
        this.visible ? this.hide() : this.show();
    }

    /**
     * 展开侧边栏
     * @param {boolean} save - 是否保存状态
     */
    expand(save = true) {
        this.element.classList.remove('collapsed');
        this.collapsed = false;

        // 触发回调
        this.onExpand();

        // 保存状态
        if (save) {
            this._saveState();
        }

        console.log(`📂 [${this.id}] Sidebar expanded`);
    }

    /**
     * 折叠侧边栏
     * @param {boolean} save - 是否保存状态
     */
    collapse(save = true) {
        this.element.classList.add('collapsed');
        this.collapsed = true;

        // 触发回调
        this.onCollapse();

        // 保存状态
        if (save) {
            this._saveState();
        }

        console.log(`📁 [${this.id}] Sidebar collapsed`);
    }

    /**
     * 切换折叠状态
     */
    toggleCollapse() {
        this.collapsed ? this.expand() : this.collapse();
    }

    /**
     * 更新内容
     * @param {*} data - 内容数据
     * @abstract
     */
    updateContent(data) {
        // 子类实现
        console.warn(`⚠️ [${this.id}] updateContent() not implemented`);
    }

    /**
     * 清空内容
     */
    clearContent() {
        if (this.contentElement) {
            this.contentElement.innerHTML = '';
        }
    }

    /**
     * 应用主题
     * @param {Object} themeConfig - 主题配置
     */
    applyTheme(themeConfig) {
        // 更新CSS变量
        const root = document.documentElement;

        // 子类可以重写此方法以应用特定样式
        console.log(`🎨 [${this.id}] Theme applied: ${themeConfig.name}`);
    }

    /**
     * 生命周期钩子：显示时
     * @override
     */
    onShow() {
        // 子类可以重写
    }

    /**
     * 生命周期钩子：隐藏时
     * @override
     */
    onHide() {
        // 子类可以重写
    }

    /**
     * 生命周期钩子：展开时
     * @override
     */
    onExpand() {
        // 子类可以重写
    }

    /**
     * 生命周期钩子：折叠时
     * @override
     */
    onCollapse() {
        // 子类可以重写
    }

    /**
     * 生命周期钩子：主题变更时
     * @override
     * @param {Object} data - 主题数据
     */
    onThemeChange(data) {
        console.log(`🎨 [${this.id}] Theme changed: ${data.oldTheme} → ${data.newTheme}`);
        this.applyTheme(data.themeConfig);
    }

    /**
     * 保存状态到 LocalStorage
     * @private
     */
    _saveState() {
        const state = {
            visible: this.visible,
            collapsed: this.collapsed
        };

        const key = `chatgalaxy_${this.id}_state`;
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error(`❌ [${this.id}] Failed to save state:`, error);
        }
    }

    /**
     * 从 LocalStorage 加载状态
     * @private
     * @returns {Object|null} 状态对象
     */
    _loadState() {
        const key = `chatgalaxy_${this.id}_state`;
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`❌ [${this.id}] Failed to load state:`, error);
            return null;
        }
    }

    /**
     * 销毁侧边栏
     */
    destroy() {
        // 移除事件监听
        // 清理 DOM
        // 清空引用
        console.log(`🗑️ [${this.id}] Sidebar destroyed`);
    }
}

/**
 * 侧边栏管理器
 * 管理所有侧边栏实例
 */
class SidebarManager {
    constructor() {
        this.sidebars = new Map();
    }

    /**
     * 注册侧边栏
     * @param {string} id - 侧边栏ID
     * @param {SidebarBase} instance - 侧边栏实例
     */
    register(id, instance) {
        this.sidebars.set(id, instance);
        console.log(`📝 [SidebarManager] Registered: ${id}`);
    }

    /**
     * 获取侧边栏实例
     * @param {string} id - 侧边栏ID
     * @returns {SidebarBase|null}
     */
    get(id) {
        return this.sidebars.get(id) || null;
    }

    /**
     * 隐藏所有侧边栏
     */
    hideAll() {
        this.sidebars.forEach(sidebar => {
            if (sidebar.visible) {
                sidebar.hide();
            }
        });
    }

    /**
     * 获取所有可见的侧边栏
     * @returns {Array<SidebarBase>}
     */
    getVisible() {
        return Array.from(this.sidebars.values()).filter(s => s.visible);
    }
}

// 全局侧边栏管理器
const sidebarManager = new SidebarManager();

// 导出到全局
window.SidebarManager = sidebarManager;

// ES6 模块导出
export default SidebarBase;
export { SidebarManager };
