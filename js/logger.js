/**
 * ChatGalaxy 统一日志管理系统
 * 提供分级日志、性能监控、调试控制功能
 * @version 1.0.0
 * @updated 2026-01-06
 */

// ========== 日志级别定义 ==========

const LogLevel = {
    DEBUG: 0,    // 调试信息（开发用）
    INFO: 1,     // 一般信息
    WARN: 2,     // 警告
    ERROR: 3,    // 错误
    SILENT: 4    // 静默模式（无日志）
};

// ========== Logger 类 ==========

class Logger {
    constructor() {
        this.currentLevel = this._getInitialLevel();
        this.performanceMarks = new Map();
        this.enableColors = this._supportsColors();
    }

    /**
     * 获取初始日志级别
     * @private
     */
    _getInitialLevel() {
        // 检查配置文件
        if (window.ChatGalaxyConfig && window.ChatGalaxyConfig.LOG_LEVEL !== undefined) {
            return window.ChatGalaxyConfig.LOG_LEVEL;
        }

        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug')) {
            return LogLevel.DEBUG;
        }
        if (urlParams.has('silent')) {
            return LogLevel.SILENT;
        }

        // 默认：生产环境使用INFO，开发环境使用DEBUG
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:'
            ? LogLevel.DEBUG
            : LogLevel.INFO;
    }

    /**
     * 检查是否支持彩色输出
     * @private
     */
    _supportsColors() {
        // 现代浏览器都支持
        return true;
    }

    /**
     * 格式化时间戳
     * @private
     */
    _getTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${seconds}.${ms}`;
    }

    /**
     * 获取日志级别样式
     * @private
     */
    _getLevelStyle(level) {
        if (!this.enableColors) return {};

        const styles = {
            [LogLevel.DEBUG]: 'color: #888; font-style: italic;',
            [LogLevel.INFO]: 'color: #0277bd; font-weight: normal;',
            [LogLevel.WARN]: 'color: #f57c00; font-weight: bold;',
            [LogLevel.ERROR]: 'color: #c62828; font-weight: bold;'
        };
        return styles[level] || '';
    }

    /**
     * 核心日志方法
     * @private
     */
    _log(level, tag, messages, extras = {}) {
        if (level < this.currentLevel) return;

        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelEmojis = ['🔍', 'ℹ️', '⚠️', '❌'];
        const levelName = levelNames[level];
        const emoji = levelEmojis[level];

        // 格式化消息
        const timestamp = this._getTimestamp();
        const prefix = `${emoji} [${timestamp}] [${levelName}]`;

        // 组装完整消息
        const fullMessage = `${prefix} [${tag}]`;

        // 根据级别选择console方法
        const consoleMethod = level >= LogLevel.ERROR ? 'error' :
                            level === LogLevel.WARN ? 'warn' : 'log';

        // 输出日志
        if (extras.style) {
            console[consoleMethod](
                `%c${fullMessage}`,
                extras.style,
                ...messages
            );
        } else {
            console[consoleMethod](fullMessage, ...messages);
        }

        // 如果有额外对象，分开输出
        if (extras.data) {
            console[consoleMethod]('  Data:', extras.data);
        }
    }

    /**
     * DEBUG级别日志（开发调试）
     */
    debug(tag, ...messages) {
        this._log(LogLevel.DEBUG, tag, messages, { style: this._getLevelStyle(LogLevel.DEBUG) });
    }

    /**
     * INFO级别日志（一般信息）
     */
    info(tag, ...messages) {
        this._log(LogLevel.INFO, tag, messages, { style: this._getLevelStyle(LogLevel.INFO) });
    }

    /**
     * WARN级别日志（警告）
     */
    warn(tag, ...messages) {
        this._log(LogLevel.WARN, tag, messages, { style: this._getLevelStyle(LogLevel.WARN) });
    }

    /**
     * ERROR级别日志（错误）
     */
    error(tag, ...messages) {
        this._log(LogLevel.ERROR, tag, messages, { style: this._getLevelStyle(LogLevel.ERROR) });
    }

    /**
     * 性能监控开始
     */
    startPerformanceMark(label) {
        this.performanceMarks.set(label, performance.now());
        this.debug('Perf', `⏱️ Started: ${label}`);
    }

    /**
     * 性能监控结束
     */
    endPerformanceMark(label) {
        const startTime = this.performanceMarks.get(label);
        if (!startTime) {
            this.warn('Perf', `No start mark found for: ${label}`);
            return;
        }

        const duration = performance.now() - startTime;
        this.performanceMarks.delete(label);

        const durationMs = duration.toFixed(2);
        const level = duration > 1000 ? 'warn' : 'debug';

        this[level]('Perf', `⏱️ ${label}: ${durationMs}ms`);
    }

    /**
     * 测量函数执行时间
     */
    async measureAsync(label, fn) {
        this.startPerformanceMark(label);
        try {
            const result = await fn();
            this.endPerformanceMark(label);
            return result;
        } catch (error) {
            this.endPerformanceMark(label);
            throw error;
        }
    }

    /**
     * 设置日志级别
     */
    setLevel(level) {
        if (level >= LogLevel.DEBUG && level <= LogLevel.SILENT) {
            this.currentLevel = level;
            this.info('Logger', `Log level changed to ${level}`);
        }
    }

    /**
     * 获取当前日志级别
     */
    getLevel() {
        return this.currentLevel;
    }

    /**
     * 清空所有性能标记
     */
    clearPerformanceMarks() {
        this.performanceMarks.clear();
    }

    /**
     * 打印性能报告
     */
    printPerformanceReport() {
        if (this.performanceMarks.size === 0) {
            this.info('Perf', 'No active performance marks');
            return;
        }

        const now = performance.now();
        console.group('📊 Performance Report');

        for (const [label, startTime] of this.performanceMarks.entries()) {
            const elapsed = (now - startTime).toFixed(2);
            console.warn(`  ⏱️ ${label}: ${elapsed}ms (still running)`);
        }

        console.groupEnd();
    }
}

// ========== 全局单例 ==========

const logger = new Logger();

// ========== 便捷标签 ==========

const Tags = {
    INIT: 'Init',
    DATA: 'Data',
    DB: 'Database',
    IMPORT: 'Import',
    UI: 'UI',
    GRAPH: 'Graph',
    NETWORK: 'Network',
    PERF: 'Perf',
    ERROR: 'Error'
};

// ========== 全局导出 ==========

if (typeof window !== 'undefined') {
    window.Logger = logger;
    window.LogLevel = LogLevel;
    window.LogTags = Tags;
}

console.log('📝 Logger initialized (level:', logger.getLevel(), ')');
