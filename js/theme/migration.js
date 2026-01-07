/**
 * ChatGalaxy 主题迁移适配器
 * 帮助平滑从旧系统迁移到新系统
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

import { ThemeManager } from './theme-manager.js';
import { COLOR_SCHEMES } from './color-schemes.js';

/**
 * 旧主题到新主题的映射表
 */
const THEME_MAPPING = {
    'romantic': 'dawn',      // 浪漫粉 → 晨曦
    'deepspace': 'ocean',    // 深空蓝 → 海洋
    'nebula': 'stardust',    // 星云紫 → 星尘
    'midnight': 'forest'     // 午夜黑 → 森林
};

/**
 * 迁移旧版设置
 * @returns {Object} 迁移后的设置
 */
export function migrateOldSettings() {
    try {
        // 读取旧版本 LocalStorage
        const oldSettingsStr = localStorage.getItem('chatgalaxy_settings');
        if (!oldSettingsStr) {
            console.log('📝 [Migration] No old settings found');
            return null;
        }

        const oldSettings = JSON.parse(oldSettingsStr);

        // 映射主题
        const newTheme = THEME_MAPPING[oldSettings.colorScheme] || 'dawn';

        // 透明度设置
        const newTransparency = oldSettings.uiTransparency !== undefined
            ? oldSettings.uiTransparency
            : 0.95;

        console.log('🔄 [Migration] Old settings migrated:');
        console.log(`   Theme: ${oldSettings.colorScheme} → ${newTheme}`);
        console.log(`   Transparency: ${newTransparency}`);

        const migratedSettings = {
            theme: newTheme,
            transparency: newTransparency,
            migratedFrom: oldSettings.colorScheme
        };

        // 备份旧设置
        localStorage.setItem('chatgalaxy_settings_backup', oldSettingsStr);

        return migratedSettings;

    } catch (error) {
        console.error('❌ [Migration] Failed to migrate old settings:', error);
        return null;
    }
}

/**
 * 创建app.js兼容层
 * 使旧版COLOR_SCHEMES能使用新系统
 */
export function createAppCompatLayer() {
    // 防止重复定义
    if (window.COLOR_SCHEMES_COMPAT) {
        return;
    }

    // 创建兼容的COLOR_SCHEMES对象
    window.COLOR_SCHEMES_COMPAT = {
        dawn: COLOR_SCHEMES.dawn.colors,
        forest: COLOR_SCHEMES.forest.colors,
        ocean: COLOR_SCHEMES.ocean.colors,
        stardust: COLOR_SCHEMES.stardust.colors,

        // 旧主题名称映射（向后兼容）
        romantic: COLOR_SCHEMES.dawn.colors,
        deepspace: COLOR_SCHEMES.ocean.colors,
        nebula: COLOR_SCHEMES.stardust.colors,
        midnight: COLOR_SCHEMES.forest.colors
    };

    console.log('✅ [Migration] App compatibility layer created');
}

/**
 * 注入到app.js中的applyColorScheme函数
 * @deprecated 建议直接使用ThemeManager
 */
export function injectCompatApplyColorScheme() {
    // 如果ThemeManager已存在，使用它
    if (window.ThemeManager) {
        window.applyColorSchemeCompat = function() {
            const scheme = window.appSettings?.colorScheme || 'dawn';
            const mappedScheme = THEME_MAPPING[scheme] || scheme;
            window.ThemeManager.setTheme(mappedScheme);

            const transparency = window.appSettings?.uiTransparency ?? 0.95;
            window.ThemeManager.setTransparency(transparency);
        };

        console.log('✅ [Migration] Compat applyColorScheme injected');
    }
}

/**
 * 自动迁移并应用
 */
export function autoMigrateAndApply() {
    console.log('🔄 [Migration] Starting auto-migration...');

    // 1. 尝试迁移旧设置
    const migrated = migrateOldSettings();

    // 2. 初始化ThemeManager
    if (window.ThemeManager && !window.ThemeManager._initialized) {
        window.ThemeManager.initialize().then(() => {
            // 3. 应用迁移后的设置
            if (migrated) {
                window.ThemeManager.setTheme(migrated.theme);
                window.ThemeManager.setTransparency(migrated.transparency);
            }

            console.log('✅ [Migration] Auto-migration completed');
        });
    }
}

/**
 * 清理旧数据（可选）
 * @param {boolean} backup - 是否先备份
 */
export function cleanupOldData(backup = true) {
    if (backup) {
        const oldSettings = localStorage.getItem('chatgalaxy_settings');
        if (oldSettings) {
            localStorage.setItem('chatgalaxy_settings_backup', oldSettings);
        }
    }

    // 删除旧设置
    localStorage.removeItem('chatgalaxy_settings');

    console.log('🗑️ [Migration] Old data cleaned up');
}

/**
 * 回滚到旧系统
 */
export function rollbackToOldSystem() {
    const backup = localStorage.getItem('chatgalaxy_settings_backup');
    if (backup) {
        localStorage.setItem('chatgalaxy_settings', backup);
        console.log('⏪ [Migration] Rolled back to old system');
        return true;
    }

    console.warn('⚠️ [Migration] No backup found, cannot rollback');
    return false;
}

/**
 * 导出迁移状态
 */
export function getMigrationStatus() {
    const hasOldSettings = !!localStorage.getItem('chatgalaxy_settings');
    const hasNewSettings = !!localStorage.getItem('chatgalaxy_theme_settings');
    const hasBackup = !!localStorage.getItem('chatgalaxy_settings_backup');

    return {
        oldSettingsExists: hasOldSettings,
        newSettingsExists: hasNewSettings,
        backupExists: hasBackup,
        needsMigration: hasOldSettings && !hasNewSettings,
        canRollback: hasBackup
    };
}

// 默认导出
export default {
    migrateOldSettings,
    createAppCompatLayer,
    injectCompatApplyColorScheme,
    autoMigrateAndApply,
    cleanupOldData,
    rollbackToOldSystem,
    getMigrationStatus
};
