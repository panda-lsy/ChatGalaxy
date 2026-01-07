/**
 * ChatGalaxy 透明度计算引擎
 * 动态透明度计算，消除硬编码
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

/**
 * 透明度引擎类
 * @class
 */
export class TransparencyEngine {
    /**
     * 构造函数
     * @param {ThemeManager} themeManager - 主题管理器实例
     */
    constructor(themeManager) {
        this.themeManager = themeManager;
        this.baseTransparency = 0.95; // 默认基准透明度
        this.componentOverrides = {}; // 组件级别透明度覆盖

        // 颜色解析缓存
        this.colorCache = new Map();

        console.log('🔍 [TransparencyEngine] Initialized');
    }

    /**
     * 计算带透明度的颜色值
     * @param {string} baseColor - 基础颜色 (hex/rgb/hsl 格式)
     * @param {number} transparency - 透明度 (0-1)
     * @returns {string} rgba 颜色值
     */
    calculateAlpha(baseColor, transparency) {
        // 验证输入
        if (typeof transparency !== 'number' || transparency < 0 || transparency > 1) {
            console.warn(`⚠️ [TransparencyEngine] Invalid transparency: ${transparency}`);
            transparency = this.baseTransparency;
        }

        // 解析颜色
        const rgb = this.parseColor(baseColor);

        // 应用透明度
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${transparency})`;
    }

    /**
     * 生成主题的所有透明度变量
     * @param {Object} themeColors - 主题颜色配置
     * @param {number} globalTransparency - 全局透明度设置
     * @returns {Object} CSS 变量映射
     */
    generateTransparencyVars(themeColors, globalTransparency) {
        const vars = {};

        // 1. 侧边栏透明度（全局透明度）
        vars['--sidebar-bg'] = this.calculateAlpha(
            themeColors.sidebarBg,
            globalTransparency
        );

        // 2. 卡片透明度（比侧边栏稍高，增强可读性）
        vars['--card-bg'] = this.calculateAlpha(
            themeColors.cardBg,
            Math.min(globalTransparency + 0.05, 1.0)
        );

        // 3. 悬停状态透明度（不透明或接近不透明）
        vars['--hover-bg'] = this.calculateAlpha(
            themeColors.sidebarHover,
            1.0
        );

        vars['--card-hover-bg'] = this.calculateAlpha(
            themeColors.cardHover,
            Math.min(globalTransparency + 0.1, 1.0)
        );

        // 4. 边框透明度（较低透明度）
        vars['--sidebar-border'] = this.calculateAlpha(
            themeColors.sidebarBorder,
            globalTransparency * 0.6
        );

        vars['--card-border'] = this.calculateAlpha(
            themeColors.cardBorder,
            globalTransparency * 0.5
        );

        // 5. 背景渐变透明度
        vars['--bg-start-alpha'] = this.calculateAlpha(
            themeColors.bgStart,
            globalTransparency
        );

        vars['--bg-end-alpha'] = this.calculateAlpha(
            themeColors.bgEnd,
            globalTransparency
        );

        // 6. 组件级别透明度覆盖
        for (const [componentId, transparency] of Object.entries(this.componentOverrides)) {
            const varName = `--${componentId}-bg`;
            const baseColor = themeColors.cardBg; // 默认使用卡片背景
            vars[varName] = this.calculateAlpha(baseColor, transparency);
        }

        console.log('🔍 [TransparencyEngine] Generated transparency vars:', Object.keys(vars).length);

        return vars;
    }

    /**
     * 解析颜色字符串
     * @param {string} colorStr - 颜色字符串
     * @returns {Object} RGB对象 {r, g, b}
     */
    parseColor(colorStr) {
        // 检查缓存
        if (this.colorCache.has(colorStr)) {
            return this.colorCache.get(colorStr);
        }

        let rgb;

        // 1. HEX 格式 (#RRGGBB 或 #RGB)
        if (colorStr.startsWith('#')) {
            rgb = this._parseHex(colorStr);
        }
        // 2. RGB/RGBA 格式
        else if (colorStr.startsWith('rgb')) {
            rgb = this._parseRgb(colorStr);
        }
        // 3. HSL/HSLA 格式
        else if (colorStr.startsWith('hsl')) {
            rgb = this._parseHsl(colorStr);
        }
        // 4. 颜色名称
        else {
            rgb = this._parseNamedColor(colorStr);
        }

        // 缓存结果
        if (rgb) {
            this.colorCache.set(colorStr, rgb);
        }

        return rgb;
    }

    /**
     * 解析 HEX 颜色
     * @private
     * @param {string} hex - HEX 颜色字符串
     * @returns {Object} RGB对象
     */
    _parseHex(hex) {
        // 移除 # 号
        hex = hex.replace('#', '');

        // 处理简写形式 (#RGB → #RRGGBB)
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        // 解析
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    /**
     * 解析 RGB/RGBA 颜色
     * @private
     * @param {string} rgbStr - RGB 颜色字符串
     * @returns {Object} RGB对象
     */
    _parseRgb(rgbStr) {
        // 匹配 rgba(r, g, b, a) 或 rgb(r, g, b)
        const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);

        if (!match) {
            console.warn(`⚠️ [TransparencyEngine] Invalid RGB format: ${rgbStr}`);
            return { r: 0, g: 0, b: 0 };
        }

        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        };
    }

    /**
     * 解析 HSL/HSLA 颜色
     * @private
     * @param {string} hslStr - HSL 颜色字符串
     * @returns {Object} RGB对象
     */
    _parseHsl(hslStr) {
        // 匹配 hsla(h, s%, l%, a) 或 hsl(h, s%, l%)
        const match = hslStr.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/);

        if (!match) {
            console.warn(`⚠️ [TransparencyEngine] Invalid HSL format: ${hslStr}`);
            return { r: 0, g: 0, b: 0 };
        }

        const h = parseInt(match[1]) / 360;
        const s = parseInt(match[2]) / 100;
        const l = parseInt(match[3]) / 100;

        return this._hslToRgb(h, s, l);
    }

    /**
     * HSL 转 RGB
     * @private
     * @param {number} h - 色相 (0-1)
     * @param {number} s - 饱和度 (0-1)
     * @param {number} l - 亮度 (0-1)
     * @returns {Object} RGB对象
     */
    _hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            // 灰度
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * 解析颜色名称
     * @private
     * @param {string} name - 颜色名称
     * @returns {Object} RGB对象
     */
    _parseNamedColor(name) {
        // 常见颜色名称映射
        const namedColors = {
            'white': { r: 255, g: 255, b: 255 },
            'black': { r: 0, g: 0, b: 0 },
            'red': { r: 255, g: 0, b: 0 },
            'green': { r: 0, g: 128, b: 0 },
            'blue': { r: 0, g: 0, b: 255 },
            'yellow': { r: 255, g: 255, b: 0 },
            'cyan': { r: 0, g: 255, b: 255 },
            'magenta': { r: 255, g: 0, b: 255 },
            'gray': { r: 128, g: 128, b: 128 },
            'grey': { r: 128, g: 128, b: 128 }
        };

        const color = namedColors[name.toLowerCase()];
        if (!color) {
            console.warn(`⚠️ [TransparencyEngine] Unknown color name: ${name}`);
            return { r: 0, g: 0, b: 0 };
        }

        return color;
    }

    /**
     * 设置组件透明度覆盖
     * @param {string} componentId - 组件ID
     * @param {number} transparency - 透明度 (0-1)
     */
    setComponentTransparency(componentId, transparency) {
        this.componentOverrides[componentId] = transparency;
        console.log(`🔍 [TransparencyEngine] Component transparency set: ${componentId} = ${transparency}`);
    }

    /**
     * 移除组件透明度覆盖
     * @param {string} componentId - 组件ID
     */
    removeComponentTransparency(componentId) {
        delete this.componentOverrides[componentId];
        console.log(`🔍 [TransparencyEngine] Component transparency removed: ${componentId}`);
    }

    /**
     * 清除所有组件透明度覆盖
     */
    clearComponentTransparency() {
        this.componentOverrides = {};
        console.log('🔍 [TransparencyEngine] All component transparency cleared');
    }

    /**
     * 计算对比度（用于可访问性验证）
     * @param {string} color1 - 颜色1
     * @param {string} color2 - 颜色2
     * @returns {number} 对比度比值
     */
    calculateContrast(color1, color2) {
        const rgb1 = this.parseColor(color1);
        const rgb2 = this.parseColor(color2);

        // 计算相对亮度
        const l1 = this._luminance(rgb1);
        const l2 = this._luminance(rgb2);

        // 返回对比度
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * 计算相对亮度
     * @private
     * @param {Object} rgb - RGB对象
     * @returns {number} 相对亮度
     */
    _luminance(rgb) {
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });

        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    /**
     * 清除颜色缓存
     */
    clearCache() {
        this.colorCache.clear();
        console.log('🔍 [TransparencyEngine] Color cache cleared');
    }
}

/**
 * 工具函数：快速计算透明度颜色
 * @param {string} color - 基础颜色
 * @param {number} alpha - 透明度
 * @returns {string} rgba颜色
 */
export function rgba(color, alpha) {
    const engine = new TransparencyEngine(null);
    return engine.calculateAlpha(color, alpha);
}

/**
 * 工具函数：验证颜色对比度
 * @param {string} color1 - 颜色1
 * @param {string} color2 - 颜色2
 * @param {number} threshold - 最小对比度阈值
 * @returns {boolean} 是否符合要求
 */
export function validateContrast(color1, color2, threshold = 4.5) {
    const engine = new TransparencyEngine(null);
    const contrast = engine.calculateContrast(color1, color2);
    return contrast >= threshold;
}

// 默认导出
export default TransparencyEngine;
