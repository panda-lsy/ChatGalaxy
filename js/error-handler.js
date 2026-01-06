/**
 * ChatGalaxy 统一错误处理工具
 * 提供标准化的错误捕获、日志记录、用户通知功能
 * @version 1.0.0
 * @updated 2026-01-06
 */

// ========== 错误类型定义 ==========

/**
 * 自定义错误基类
 */
class ChatGalaxyError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * 数据验证错误
 */
class ValidationError extends ChatGalaxyError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
    }
}

/**
 * 数据加载错误
 */
class DataLoadError extends ChatGalaxyError {
    constructor(message, details) {
        super(message, 'DATA_LOAD_ERROR', details);
    }
}

/**
 * 数据存储错误
 */
class StorageError extends ChatGalaxyError {
    constructor(message, details) {
        super(message, 'STORAGE_ERROR', details);
    }
}

/**
 * 文件处理错误
 */
class FileProcessError extends ChatGalaxyError {
    constructor(message, details) {
        super(message, 'FILE_PROCESS_ERROR', details);
    }
}

/**
 * 网络请求错误
 */
class NetworkError extends ChatGalaxyError {
    constructor(message, details) {
        super(message, 'NETWORK_ERROR', details);
    }
}

// ========== 错误处理器 ==========

/**
 * 错误处理器类
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrorHistory = 100;
    }

    /**
     * 处理错误（主入口）
     * @param {Error} error - 错误对象
     * @param {Object} options - 处理选项
     * @returns {Object} - 错误信息对象
     */
    handle(error, options = {}) {
        const {
            showToast = true,
            logToConsole = true,
            showDialog = false,
            context = 'Unknown'
        } = options;

        // 标准化错误对象
        const standardError = this._standardizeError(error, context);

        // 记录到历史
        this._addToHistory(standardError);

        // 打印到控制台
        if (logToConsole) {
            this._logToConsole(standardError);
        }

        // 显示Toast通知
        if (showToast && typeof window !== 'undefined' && window.showToast) {
            this._showToast(standardError);
        }

        // 显示详细对话框（可选）
        if (showDialog && typeof window !== 'undefined') {
            this._showErrorDialog(standardError);
        }

        return standardError;
    }

    /**
     * 异步包装器 - 自动捕获并处理Promise错误
     * @param {Function} fn - 异步函数
     * @param {Object} options - 错误处理选项
     * @returns {Function} - 包装后的函数
     */
    asyncWrap(fn, options = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, options);
                throw error; // 重新抛出以便调用者处理
            }
        };
    }

    /**
     * 安全执行 - 捕获并处理错误但不重新抛出
     * @param {Function} fn - 要执行的函数
     * @param {*} defaultValue - 出错时的默认返回值
     * @param {Object} options - 错误处理选项
     * @returns {*} - 函数结果或默认值
     */
    safeExecute(fn, defaultValue = null, options = {}) {
        try {
            return fn();
        } catch (error) {
            this.handle(error, options);
            return defaultValue;
        }
    }

    /**
     * 标准化错误对象
     * @private
     */
    _standardizeError(error, context) {
        if (error instanceof ChatGalaxyError) {
            return {
                message: error.message,
                code: error.code,
                details: error.details,
                timestamp: error.timestamp,
                context,
                stack: error.stack
            };
        }

        if (error instanceof Error) {
            return {
                message: error.message,
                code: 'GENERIC_ERROR',
                details: {},
                timestamp: new Date().toISOString(),
                context,
                stack: error.stack
            };
        }

        // 字符串或其他类型
        return {
            message: String(error),
            code: 'UNKNOWN_ERROR',
            details: {},
            timestamp: new Date().toISOString(),
            context,
            stack: null
        };
    }

    /**
     * 记录到历史
     * @private
     */
    _addToHistory(error) {
        this.errors.push(error);
        if (this.errors.length > this.maxErrorHistory) {
            this.errors.shift();
        }
    }

    /**
     * 打印到控制台
     * @private
     */
    _logToConsole(error) {
        const emoji = this._getErrorEmoji(error.code);
        console.error(`${emoji} [${error.code}] ${error.message}`, {
            context: error.context,
            details: error.details,
            timestamp: error.timestamp
        });
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * 显示Toast通知
     * @private
     */
    _showToast(error) {
        const userMessage = this._getUserFriendlyMessage(error);
        window.showToast('error', userMessage);
    }

    /**
     * 显示错误对话框
     * @private
     */
    _showErrorDialog(error) {
        // TODO: 实现模态对话框显示错误详情
        console.log('Error dialog would show:', error);
    }

    /**
     * 获取用户友好的错误消息
     * @private
     */
    _getUserFriendlyMessage(error) {
        const messages = {
            'VALIDATION_ERROR': `数据验证失败: ${error.message}`,
            'DATA_LOAD_ERROR': `数据加载失败: ${error.message}`,
            'STORAGE_ERROR': `存储错误: ${error.message}`,
            'FILE_PROCESS_ERROR': `文件处理失败: ${error.message}`,
            'NETWORK_ERROR': `网络错误: ${error.message}`,
            'GENERIC_ERROR': error.message,
            'UNKNOWN_ERROR': '发生未知错误'
        };

        return messages[error.code] || error.message;
    }

    /**
     * 获取错误对应的表情符号
     * @private
     */
    _getErrorEmoji(code) {
        const emojis = {
            'VALIDATION_ERROR': '⚠️',
            'DATA_LOAD_ERROR': '📊',
            'STORAGE_ERROR': '💾',
            'FILE_PROCESS_ERROR': '📁',
            'NETWORK_ERROR': '🌐',
            'GENERIC_ERROR': '❌',
            'UNKNOWN_ERROR': '❓'
        };
        return emojis[code] || '❌';
    }

    /**
     * 获取错误历史
     * @param {number} limit - 限制数量
     * @returns {Array} - 错误列表
     */
    getErrorHistory(limit = 10) {
        return this.errors.slice(-limit);
    }

    /**
     * 清空错误历史
     */
    clearHistory() {
        this.errors = [];
    }

    /**
     * 导出错误报告
     * @returns {Object} - 错误报告
     */
    exportErrorReport() {
        return {
            exportTime: new Date().toISOString(),
            totalErrors: this.errors.length,
            errors: this.errors,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
        };
    }
}

// ========== 全局单例 ==========

const errorHandler = new ErrorHandler();

// ========== 全局导出 ==========

if (typeof window !== 'undefined') {
    window.ErrorHandler = errorHandler;
    window.ChatGalaxyError = ChatGalaxyError;
    window.ValidationError = ValidationError;
    window.DataLoadError = DataLoadError;
    window.StorageError = StorageError;
    window.FileProcessError = FileProcessError;
    window.NetworkError = NetworkError;
}

console.log('🛡️ Error Handler initialized');
