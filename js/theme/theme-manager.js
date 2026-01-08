/**
 * ChatGalaxy 主题管理器
 * 集中式主题切换和状态管理
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

import { COLOR_SCHEMES } from './color-schemes.js';
import { TransparencyEngine } from './transparency-engine.js';

/**
 * 主题管理器类
 * @class
 */
class ThemeManager {
    constructor() {
        // 当前状态
        this.currentTheme = 'dawn'; // 默认主题：晨曦
        this.currentTransparency = 0.95; // 默认透明度
        this.listeners = {
            themeChange: [],
            transparencyChange: []
        };

        // 透明度引擎
        this.transparencyEngine = new TransparencyEngine(this);

        // LocalStorage 键
        this.STORAGE_KEY = 'chatgalaxy_theme_settings';

        // 初始化
        this._initialized = false;
    }

    /**
     * 初始化主题系统
     * @async
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this._initialized) {
            console.warn('⚠️ [ThemeManager] Already initialized');
            return;
        }

        console.log('🎨 [ThemeManager] Initializing...');

        try {
            // 加载保存的设置
            this.loadSettings();

            // 应用主题
            this.applyTheme();

            // 监听 storage 事件（跨标签页同步）
            window.addEventListener('storage', (e) => {
                if (e.key === this.STORAGE_KEY) {
                    this.loadSettings();
                    this.applyTheme();
                }
            });

            this._initialized = true;
            console.log('✅ [ThemeManager] Initialized successfully');
            console.log(`   Current theme: ${this.currentTheme}`);
            console.log(`   Transparency: ${this.currentTransparency}`);

        } catch (error) {
            console.error('❌ [ThemeManager] Initialization failed:', error);
            // 使用默认设置
            this.currentTheme = 'dawn';
            this.currentTransparency = 0.95;
            this.applyTheme();
        }
    }

    /**
     * 切换主题
     * @param {string} themeId - 主题ID (dawn/forest/ocean/stardust)
     * @fires ThemeManager#theme-change
     */
    setTheme(themeId) {
        // 验证主题ID
        if (!COLOR_SCHEMES[themeId]) {
            console.error(`❌ [ThemeManager] Invalid theme ID: ${themeId}`);
            console.error(`   Available themes: ${Object.keys(COLOR_SCHEMES).join(', ')}`);
            return;
        }

        const oldTheme = this.currentTheme;
        this.currentTheme = themeId;


        // 应用新主题
        this.applyTheme();

        // 保存设置
        this.saveSettings();

        // 触发事件
        this._emit('themeChange', {
            oldTheme,
            newTheme: themeId,
            themeConfig: COLOR_SCHEMES[themeId]
        });
    }

    /**
     * 设置透明度
     * @param {number} value - 透明度值 (0.0 - 1.0)
     * @fires ThemeManager#transparency-change
     */
    setTransparency(value) {
        // 验证范围
        if (typeof value !== 'number' || value < 0 || value > 1) {
            console.error(`❌ [ThemeManager] Invalid transparency value: ${value}`);
            return;
        }

        const oldValue = this.currentTransparency;
        this.currentTransparency = Math.round(value * 100) / 100; // 保留两位小数


        // 重新应用主题（使用新的透明度）
        this.applyTheme();

        // 保存设置
        this.saveSettings();

        // 触发事件
        this._emit('transparencyChange', {
            oldValue,
            newValue: this.currentTransparency
        });
    }

    /**
     * 应用主题到 DOM
     * @private
     */
    applyTheme() {
        const themeConfig = COLOR_SCHEMES[this.currentTheme];
        if (!themeConfig) {
            console.error(`❌ [ThemeManager] Theme config not found: ${this.currentTheme}`);
            return;
        }


        const root = document.documentElement;

        // 1. 应用基础颜色变量（不含透明度）
        for (const [key, value] of Object.entries(themeConfig.colors)) {
            // 跳过需要透明度计算的颜色
            if (key.includes('Bg') && value.includes('rgba')) {
                continue;
            }
            root.style.setProperty(`--${this._camelToKebab(key)}`, value);
        }

        // 2. 使用透明度引擎计算带透明度的变量
        const transparencyVars = this.transparencyEngine.generateTransparencyVars(
            themeConfig.colors,
            this.currentTransparency
        );

        for (const [key, value] of Object.entries(transparencyVars)) {
            root.style.setProperty(key, value);
        }

        console.log('✅ [ThemeManager] Applied transparency vars to DOM');
        console.log('   Current CSS vars on root:');
        console.log('   --sidebar-bg:', getComputedStyle(root).getPropertyValue('--sidebar-bg'));
        console.log('   --card-bg:', getComputedStyle(root).getPropertyValue('--card-bg'));

        // 3. 更新 body 类名（用于旧版兼容）
        document.body.classList.remove('theme-dawn', 'theme-forest', 'theme-ocean', 'theme-stardust');
        document.body.classList.add(`theme-${this.currentTheme}`);

    }

    /**
     * 获取当前主题配置
     * @returns {Object} 主题配置对象
     */
    getCurrentThemeConfig() {
        return COLOR_SCHEMES[this.currentTheme] || null;
    }

    /**
     * 获取所有可用主题
     * @returns {Object} 主题配置集合
     */
    getAllThemes() {
        return COLOR_SCHEMES;
    }

    /**
     * 事件监听
     * @param {string} event - 事件名称 ('themeChange' | 'transparencyChange')
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            console.error(`❌ [ThemeManager] Unknown event: ${event}`);
            return;
        }

        if (typeof callback !== 'function') {
            console.error(`❌ [ThemeManager] Callback must be a function`);
            return;
        }

        this.listeners[event].push(callback);
        console.log(`📝 [ThemeManager] Registered listener for: ${event}`);
    }

    /**
     * 移除事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (!this.listeners[event]) {
            return;
        }

        const index = this.listeners[event].indexOf(callback);
        if (index > -1) {
            this.listeners[event].splice(index, 1);
            console.log(`📝 [ThemeManager] Removed listener for: ${event}`);
        }
    }

    /**
     * 保存设置到 LocalStorage
     * @private
     */
    saveSettings() {
        const settings = {
            theme: this.currentTheme,
            transparency: this.currentTransparency,
            version: '1.0.0',
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
            console.log('💾 [ThemeManager] Settings saved');
        } catch (error) {
            console.error('❌ [ThemeManager] Failed to save settings:', error);
        }
    }

    /**
     * 从 LocalStorage 加载设置
     * @private
     */
    loadSettings() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) {
                console.log('📝 [ThemeManager] No saved settings, using defaults');
                return;
            }

            const settings = JSON.parse(data);

            // 验证主题ID
            if (settings.theme && COLOR_SCHEMES[settings.theme]) {
                this.currentTheme = settings.theme;
            }

            // 验证透明度值
            if (typeof settings.transparency === 'number' &&
                settings.transparency >= 0 && settings.transparency <= 1) {
                this.currentTransparency = settings.transparency;
            }

            console.log('💾 [ThemeManager] Settings loaded');
            console.log(`   Theme: ${this.currentTheme}`);
            console.log(`   Transparency: ${this.currentTransparency}`);

        } catch (error) {
            console.error('❌ [ThemeManager] Failed to load settings:', error);
            // 使用默认值
        }
    }

    /**
     * 重置为默认设置
     */
    resetToDefaults() {
        console.log('🔄 [ThemeManager] Resetting to defaults');
        this.currentTheme = 'dawn';
        this.currentTransparency = 0.95;
        this.applyTheme();
        this.saveSettings();
    }

    /**
     * 触发事件
     * @private
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    _emit(event, data) {
        if (!this.listeners[event]) {
            return;
        }

        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ [ThemeManager] Error in ${event} listener:`, error);
            }
        });

        console.log(`📢 [ThemeManager] Event emitted: ${event}`, data);
    }

    /**
     * 驼峰命名转短横线命名
     * @private
     * @param {string} str - 驼峰字符串
     * @returns {string} 短横线字符串
     */
    _camelToKebab(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    /**
     * 获取主题预览色块（用于UI展示）
     * @param {string} themeId - 主题ID
     * @returns {Object} 预览色块对象
     */
    getThemePreview(themeId) {
        const theme = COLOR_SCHEMES[themeId];
        if (!theme) {
            return null;
        }

        return {
            id: themeId,
            name: theme.name,
            description: theme.description,
            primaryColor: theme.colors.primary,
            secondaryColor: theme.colors.secondary,
            accentColor: theme.colors.accent,
            bgGradient: `linear-gradient(135deg, ${theme.colors.bgStart} 0%, ${theme.colors.bgEnd} 100%)`
        };
    }
}

// ==================== 数据迁移逻辑 ====================

/**
 * 从旧版本迁移设置
 * @returns {Object|null} 迁移后的设置，如果没有旧数据则返回 null
 */
function migrateOldSettings() {
    try {
        // 读取旧版本 LocalStorage
        const oldSettingsStr = localStorage.getItem('chatgalaxy_settings');
        if (!oldSettingsStr) {
            return null;
        }

        const oldSettings = JSON.parse(oldSettingsStr);

        // 映射旧主题到新主题
        const themeMapping = {
            'romantic': 'dawn',      // 浪漫粉 → 晨曦
            'deepspace': 'ocean',    // 深空蓝 → 海洋
            'nebula': 'stardust',    // 星云紫 → 星尘
            'midnight': 'forest'     // 午夜黑 → 森林（新增）
        };

        const newTheme = themeMapping[oldSettings.colorScheme] || 'dawn';
        const newTransparency = oldSettings.uiTransparency !== undefined
            ? oldSettings.uiTransparency
            : 0.95;

        console.log('🔄 [ThemeManager] Migrated old settings:');
        console.log(`   Old theme: ${oldSettings.colorScheme} → New theme: ${newTheme}`);
        console.log(`   Transparency: ${newTransparency}`);

        return {
            theme: newTheme,
            transparency: newTransparency
        };

    } catch (error) {
        console.error('❌ [ThemeManager] Migration failed:', error);
        return null;
    }
}

// ==================== 全局单例导出 ====================

// 创建全局单例
const themeManager = new ThemeManager();

// 自动初始化（在 DOM 加载后）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager.initialize();
    });
} else {
    // DOM 已经加载完成
    themeManager.initialize();
}

// 导出到全局
window.ThemeManager = themeManager;

// ES6 模块导出
export default themeManager;
export { ThemeManager, migrateOldSettings };
