/**
 * ChatGalaxy 主题选择器组件
 * 可视化主题切换UI
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

import { ThemeManager } from '../theme/theme-manager.js';

/**
 * 主题选择器类
 */
export class ThemeSelector {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     * @param {string} config.containerId - 容器ID
     * @param {boolean} config.showPreview - 是否显示预览色块
     */
    constructor(config = {}) {
        this.containerId = config.containerId || 'theme-selector';
        this.showPreview = config.showPreview !== undefined ? config.showPreview : true;
        this.currentTheme = null;

        // 初始化
        this._init();
    }

    /**
     * 初始化
     * @private
     */
    _init() {
        // 等待DOM加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.render());
        } else {
            this.render();
        }
    }

    /**
     * 渲染主题选择器
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn(`⚠️ [ThemeSelector] Container not found: ${this.containerId}`);
            return;
        }

        // 清空容器
        container.innerHTML = '';

        // 获取所有主题
        const themes = this._getAllThemes();

        // 渲染主题选项
        const fragment = document.createDocumentFragment();

        themes.forEach(theme => {
            const button = this._createThemeButton(theme);
            fragment.appendChild(button);
        });

        container.appendChild(fragment);

        console.log('✅ [ThemeSelector] Rendered');
    }

    /**
     * 创建主题按钮
     * @private
     * @param {Object} theme - 主题对象
     * @returns {HTMLElement}
     */
    _createThemeButton(theme) {
        const button = document.createElement('button');
        button.className = 'theme-option';
        button.dataset.themeId = theme.id;
        button.title = theme.description;

        // 创建预览色块
        const preview = this.showPreview
            ? `<div class="theme-preview" style="background: ${theme.bgGradient}"></div>`
            : '';

        // 创建主题信息
        const info = `
            <div class="theme-info">
                <div class="theme-name">${theme.name}</div>
                ${this.showPreview ? `<div class="theme-desc">${theme.description}</div>` : ''}
            </div>
        `;

        button.innerHTML = preview + info;

        // 点击事件
        button.addEventListener('click', () => {
            this.selectTheme(theme.id);
        });

        // 标记当前主题
        if (window.ThemeManager && theme.id === window.ThemeManager.currentTheme) {
            button.classList.add('active');
        }

        return button;
    }

    /**
     * 获取所有主题
     * @private
     * @returns {Array}
     */
    _getAllThemes() {
        if (!window.ThemeManager) {
            console.warn('⚠️ [ThemeSelector] ThemeManager not available');
            return [];
        }

        const themes = window.ThemeManager.getAllThemes();
        const result = [];

        Object.entries(themes).forEach(([id, theme]) => {
            result.push({
                id,
                name: theme.name,
                description: theme.description,
                primaryColor: theme.colors.primary,
                secondaryColor: theme.colors.secondary,
                bgGradient: `linear-gradient(135deg, ${theme.colors.bgStart} 0%, ${theme.colors.bgEnd} 100%)`
            });
        });

        return result;
    }

    /**
     * 选择主题
     * @param {string} themeId - 主题ID
     */
    selectTheme(themeId) {
        if (!window.ThemeManager) {
            console.error('❌ [ThemeSelector] ThemeManager not available');
            return;
        }

        // 切换主题
        window.ThemeManager.setTheme(themeId);

        // 更新UI
        this._updateActiveState(themeId);

        console.log(`🎨 [ThemeSelector] Selected: ${themeId}`);
    }

    /**
     * 更新激活状态
     * @private
     * @param {string} themeId - 主题ID
     */
    _updateActiveState(themeId) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const buttons = container.querySelectorAll('.theme-option');
        buttons.forEach(btn => {
            const isActive = btn.dataset.themeId === themeId;
            btn.classList.toggle('active', isActive);
        });
    }

    /**
     * 监听主题变更
     */
    onThemeChange() {
        if (!window.ThemeManager) return;

        window.ThemeManager.on('themeChange', (data) => {
            this._updateActiveState(data.newTheme);
        });
    }
}

/**
 * 创建主题选择器实例
 * @param {Object} config - 配置对象
 * @returns {ThemeSelector}
 */
export function createThemeSelector(config) {
    const selector = new ThemeSelector(config);
    selector.onThemeChange();
    return selector;
}

// 全局导出
window.ThemeSelector = { ThemeSelector, createThemeSelector };

// 默认导出
export default ThemeSelector;
