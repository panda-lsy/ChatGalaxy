/**
 * ChatGalaxy 右侧边栏（设置侧边栏）
 * 提供主题切换、透明度调节等功能
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

import { SidebarBase } from './sidebar-base.js';

/**
 * 右侧边栏类
 * @class
 * @extends SidebarBase
 */
export class SettingsSidebar extends SidebarBase {
    /**
     * 构造函数
     */
    constructor() {
        super({
            id: 'sidebar',
            position: 'right',
            width: 280,
            collapsible: true
        });

        // UI 元素
        this.themeSelector = null;
        this.transparencySlider = null;
        this.transparencyValue = null;

        // 初始化
        this._initUI();
    }

    /**
     * 初始化 UI
     * @private
     */
    _initUI() {
        // 等待 DOM 加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._initControls());
        } else {
            this._initControls();
        }

        console.log('✅ [SettingsSidebar] UI initialized');
    }

    /**
     * 初始化控件
     * @private
     */
    _initControls() {
        // 初始化主题选择器
        // ⚠️ 主题选择器和透明度滑块已在 index.html 中静态定义
        // 不需要动态创建，避免重复
        // this._initThemeSelector();
        // this._initTransparencySlider();

        // 初始化功能按钮
        this._initFeatureButtons();
    }

    /** ⚠️ 已禁用 - 主题选择器已在 index.html 中静态定义 */
    /*
    _initThemeSelector() {
        // ... (代码已禁用)
    }
    */

    /**
     * 渲染主题选项
     * @private
     */
    _renderThemeOptions() {
        if (!this.themeSelector || !window.ThemeManager) {
            return;
        }

        const themes = window.ThemeManager.getAllThemes();
        const currentTheme = window.ThemeManager.currentTheme;

        // 清空现有选项
        this.themeSelector.innerHTML = '';

        // 渲染每个主题
        Object.entries(themes).forEach(([themeId, theme]) => {
            const btn = document.createElement('button');
            btn.className = 'sidebar-btn';
            btn.dataset.theme = themeId;

            // 主题预览色块
            const previewColor = theme.colors.primary;

            btn.innerHTML = `
                <div class="theme-preview" style="background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)"></div>
                <div class="theme-info">
                    <div class="theme-name">${theme.name}</div>
                    <div class="theme-desc">${theme.description}</div>
                </div>
                ${themeId === currentTheme ? '<i class="ri-check-line theme-active"></i>' : ''}
            `;

            // 点击事件
            btn.addEventListener('click', () => {
                this._selectTheme(themeId);
            });

            this.themeSelector.appendChild(btn);
        });
    }

    /**
     * 选择主题
     * @private
     * @param {string} themeId - 主题ID
     */
    _selectTheme(themeId) {
        if (!window.ThemeManager) return;

        // 切换主题
        window.ThemeManager.setTheme(themeId);

        // 更新UI
        this._updateThemeSelection(themeId);

        console.log(`🎨 [SettingsSidebar] Theme selected: ${themeId}`);
    }

    /**
     * 更新主题选择状态
     * @private
     * @param {string} themeId - 主题ID
     */
    _updateThemeSelection(themeId) {
        const buttons = this.themeSelector.querySelectorAll('.sidebar-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.theme === themeId;

            // 更新激活状态
            if (isActive) {
                btn.classList.add('active');
                if (!btn.querySelector('.theme-active')) {
                    btn.innerHTML += '<i class="ri-check-line theme-active"></i>';
                }
            } else {
                btn.classList.remove('active');
                const activeIcon = btn.querySelector('.theme-active');
                if (activeIcon) {
                    activeIcon.remove();
                }
            }
        });
    }

    /** ⚠️ 已禁用 - 透明度滑块已在 index.html 中静态定义 */
    /*
    _initTransparencySlider() {
        // ... (代码已禁用)
    }
    */

    /**
     * 加载当前透明度
     * @private
     */
    _loadTransparency() {
        if (!window.ThemeManager || !this.transparencySlider) return;

        const transparency = window.ThemeManager.currentTransparency;
        const percent = Math.round(transparency * 100);

        this.transparencySlider.value = percent;
        this.transparencyValue.textContent = `${percent}%`;
    }

    /**
     * 透明度变更处理
     * @private
     * @param {number} value - 透明度值 (0-100)
     */
    _onTransparencyChange(value) {
        const transparency = value / 100;

        // 更新显示值
        if (this.transparencyValue) {
            this.transparencyValue.textContent = `${value}%`;
        }

        // 设置透明度（防抖）
        if (this.transparencyDebounceTimer) {
            clearTimeout(this.transparencyDebounceTimer);
        }

        this.transparencyDebounceTimer = setTimeout(() => {
            if (window.ThemeManager) {
                window.ThemeManager.setTransparency(transparency);
            }
        }, 100);

        console.log(`🔍 [SettingsSidebar] Transparency: ${value}%`);
    }

    /**
     * 初始化功能按钮
     * @private
     */
    _initFeatureButtons() {
        // 绑定现有的功能按钮事件
        const buttons = this.element?.querySelectorAll('.sidebar-btn[data-action]');
        buttons.forEach(btn => {
            const action = btn.dataset.action;

            btn.addEventListener('click', () => {
                this._handleFeatureAction(action);
            });
        });

        // 初始化开关控件
        const switches = this.element?.querySelectorAll('.sidebar-switch input[type="checkbox"]');
        switches.forEach(sw => {
            sw.addEventListener('change', (e) => {
                this._handleSwitchChange(e.target);
            });
        });
    }

    /**
     * 处理功能按钮点击
     * @private
     * @param {string} action - 动作名称
     */
    _handleFeatureAction(action) {
        console.log(`⚡ [SettingsSidebar] Action: ${action}`);

        // 触发自定义事件
        const event = new CustomEvent('sidebarAction', {
            detail: { action }
        });
        document.dispatchEvent(event);
    }

    /**
     * 处理开关变更
     * @private
     * @param {HTMLElement} switchEl - 开关元素
     */
    _handleSwitchChange(switchEl) {
        const settingKey = switchEl.dataset.setting;
        const enabled = switchEl.checked;

        console.log(`🔘 [SettingsSidebar] Setting: ${settingKey} = ${enabled}`);

        // 触发自定义事件
        const event = new CustomEvent('settingChange', {
            detail: { settingKey, enabled }
        });
        document.dispatchEvent(event);
    }

    /**
     * 生命周期钩子：显示时
     * @override
     */
    onShow() {
        super.onShow();

        // 重新渲染主题选项（可能有更新）
        // ⚠️ 已禁用 - 控件在 index.html 中管理
        //         this._renderThemeOptions();

        // 重新加载透明度
        // ⚠️ 已禁用 - 控件在 index.html 中管理
        //         this._loadTransparency();
    }

    /**
     * 生命周期钩子：主题变更时
     * @override
     * @param {Object} data - 主题数据
     */
    onThemeChange(data) {
        super.onThemeChange(data);

        // 更新主题选择状态
        // ⚠️ 已禁用 - 控件在 index.html 中管理
        //         this._updateThemeSelection(data.newTheme);
    }
}

// 创建全局单例
let settingsSidebarInstance = null;

/**
 * 获取设置侧边栏实例
 * @returns {SettingsSidebar}
 */
export function getSettingsSidebar() {
    if (!settingsSidebarInstance) {
        settingsSidebarInstance = new SettingsSidebar();

        // 注册到侧边栏管理器
        if (window.SidebarManager) {
            window.SidebarManager.register('sidebar', settingsSidebarInstance);
        }
    }

    return settingsSidebarInstance;
}

// 导出到全局
window.SettingsSidebar = getSettingsSidebar;

// 默认导出
export default getSettingsSidebar;
