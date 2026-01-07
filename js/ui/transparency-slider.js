/**
 * ChatGalaxy 透明度滑块组件
 * 动态透明度调节UI
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

import { ThemeManager } from '../theme/theme-manager.js';

/**
 * 透明度滑块类
 */
export class TransparencySlider {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     * @param {string} config.containerId - 容器ID
     * @param {number} config.min - 最小值 (0-100)
     * @param {number} config.max - 最大值 (0-100)
     * @param {number} config.step - 步长 (1-10)
     * @param {boolean} config.showValue - 是否显示当前值
     */
    constructor(config = {}) {
        this.containerId = config.containerId || 'transparency-slider';
        this.min = config.min ?? 0;
        this.max = config.max ?? 100;
        this.step = config.step ?? 5;
        this.showValue = config.showValue !== undefined ? config.showValue : true;

        this.currentValue = 95;
        this.debounceTimer = null;

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
     * 渲染滑块
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn(`⚠️ [TransparencySlider] Container not found: ${this.containerId}`);
            return;
        }

        // 清空容器
        container.innerHTML = '';

        // 创建滑块包装器
        const wrapper = document.createElement('div');
        wrapper.className = 'transparency-wrapper';

        // 创建标签
        const label = document.createElement('label');
        label.className = 'transparency-label';
        label.innerHTML = '<i class="ri-contrast-line"></i> <span>透明度</span>';
        label.setAttribute('for', 'slider-input');

        // 创建滑块容器
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';

        // 创建滑块
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = 'slider-input';
        slider.className = 'transparency-slider';
        slider.min = this.min;
        slider.max = this.max;
        slider.step = this.step;
        slider.value = this.currentValue;

        // 绑定事件
        slider.addEventListener('input', (e) => this._onInput(e.target.value));
        slider.addEventListener('change', (e) => this._onChange(e.target.value));

        // 创建值显示
        const valueDisplay = this.showValue ? this._createValueDisplay() : null;

        // 组装DOM
        if (valueDisplay) {
            sliderContainer.appendChild(slider);
            sliderContainer.appendChild(valueDisplay);
        } else {
            sliderContainer.appendChild(slider);
        }

        wrapper.appendChild(label);
        wrapper.appendChild(sliderContainer);
        container.appendChild(wrapper);

        // 加载当前透明度
        this._loadCurrentValue();

        console.log('✅ [TransparencySlider] Rendered');
    }

    /**
     * 创建值显示元素
     * @private
     * @returns {HTMLElement}
     */
    _createValueDisplay() {
        const display = document.createElement('span');
        display.className = 'transparency-value';
        display.id = 'transparency-value-display';
        display.textContent = `${this.currentValue}%`;
        return display;
    }

    /**
     * 加载当前透明度
     * @private
     */
    _loadCurrentValue() {
        if (!window.ThemeManager) {
            console.warn('⚠️ [TransparencySlider] ThemeManager not found');
            return;
        }

        // 等待 ThemeManager 初始化完成
        if (!window.ThemeManager._initialized) {
            console.log('⏳ [TransparencySlider] Waiting for ThemeManager initialization...');
            // 延迟加载，等待初始化完成
            setTimeout(() => this._loadCurrentValue(), 100);
            return;
        }

        const transparency = window.ThemeManager.currentTransparency;
        this.currentValue = Math.round(transparency * 100);

        // 更新滑块
        const slider = document.getElementById('slider-input');
        if (slider) {
            slider.value = this.currentValue;
        }

        // 更新显示值
        this._updateValueDisplay();

        console.log(`✅ [TransparencySlider] Loaded current value: ${this.currentValue}%`);
    }

    /**
     * 输入事件处理（实时）
     * @private
     * @param {number} value - 滑块值
     */
    _onInput(value) {
        this.currentValue = parseInt(value);

        // 更新显示值
        this._updateValueDisplay();

        // 实时预览（防抖）
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this._applyTransparency();
        }, 50);
    }

    /**
     * 变更事件处理（最终）
     * @private
     * @param {number} value - 滑块值
     */
    _onChange(value) {
        this.currentValue = parseInt(value);
        this._applyTransparency();
    }

    /**
     * 应用透明度
     * @private
     */
    _applyTransparency() {
        if (!window.ThemeManager) return;

        const transparency = this.currentValue / 100;
        window.ThemeManager.setTransparency(transparency);

        console.log(`🔍 [TransparencySlider] Applied: ${this.currentValue}%`);
    }

    /**
     * 更新值显示
     * @private
     */
    _updateValueDisplay() {
        const display = document.getElementById('transparency-value-display');
        if (display) {
            display.textContent = `${this.currentValue}%`;
        }
    }

    /**
     * 设置透明度
     * @param {number} value - 透明度值 (0-100)
     */
    setValue(value) {
        if (value < this.min || value > this.max) {
            console.warn(`⚠️ [TransparencySlider] Invalid value: ${value}`);
            return;
        }

        this.currentValue = value;

        // 更新滑块
        const slider = document.getElementById('slider-input');
        if (slider) {
            slider.value = value;
        }

        // 更新显示
        this._updateValueDisplay();

        // 应用
        this._applyTransparency();
    }

    /**
     * 监听透明度变更
     */
    onTransparencyChange() {
        if (!window.ThemeManager) return;

        window.ThemeManager.on('transparencyChange', (data) => {
            const newValue = Math.round(data.newValue * 100);
            this.currentValue = newValue;

            // 更新UI
            const slider = document.getElementById('slider-input');
            if (slider) {
                slider.value = newValue;
            }

            this._updateValueDisplay();
        });
    }
}

/**
 * 创建透明度滑块实例
 * @param {Object} config - 配置对象
 * @returns {TransparencySlider}
 */
export function createTransparencySlider(config) {
    const slider = new TransparencySlider(config);
    slider.onTransparencyChange();
    return slider;
}

// 全局导出
window.TransparencySlider = { TransparencySlider, createTransparencySlider };

// 默认导出
export default TransparencySlider;
