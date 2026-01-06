/**
 * ChatGalaxy 边缘函数配置管理器 v1.0
 * 管理边缘函数的URL、状态和调用
 *
 * @version 1.0.0
 * @updated 2026-01-07
 */

// ========== 本地日志包装器 ==========
if (!window.Log) {
    window.Log = {
        info: (tag, ...msg) => console.log(`[INFO] [${tag}]`, ...msg),
        warn: (tag, ...msg) => console.warn(`[WARN] [${tag}]`, ...msg),
        error: (tag, ...msg) => console.error(`[ERROR] [${tag}]`, ...msg),
        debug: (tag, ...msg) => console.log(`[DEBUG] [${tag}]`, ...msg)
    };
}

// ========== 边缘函数配置管理器 ==========

class EdgeFunctionConfig {
    constructor() {
        // 边缘函数URL配置
        this.functionUrls = {
            processChat: '',      // 聊天数据处理函数
            exportDataset: '',    // 数据集导出函数（可选）
            importShare: ''       // 分享数据集导入函数（可选）
        };

        // 从配置文件或环境变量加载URL
        this.loadConfig();
    }

    /**
     * 加载配置
     */
    loadConfig() {
        // 优先从全局配置对象读取
        if (window.ChatGalaxyConfig && window.ChatGalaxyConfig.EDGE_FUNCTIONS) {
            this.functionUrls = {
                ...this.functionUrls,
                ...window.ChatGalaxyConfig.EDGE_FUNCTIONS
            };
            Log.info('EdgeFunctionConfig', 'Loaded from ChatGalaxyConfig');
        }

        // 其次从LocalStorage读取
        else {
            const stored = localStorage.getItem('chatgalaxy_edge_functions');
            if (stored) {
                try {
                    const config = JSON.parse(stored);
                    this.functionUrls = { ...this.functionUrls, ...config };
                    Log.info('EdgeFunctionConfig', 'Loaded from localStorage');
                } catch (e) {
                    Log.error('EdgeFunctionConfig', 'Failed to parse stored config:', e);
                }
            }
        }
    }

    /**
     * 保存配置到LocalStorage
     */
    saveConfig() {
        localStorage.setItem('chatgalaxy_edge_functions', JSON.stringify(this.functionUrls));
        Log.info('EdgeFunctionConfig', 'Config saved to localStorage');
    }

    /**
     * 检查边缘函数是否可用
     * @param {string} functionName - 函数名称
     * @returns {boolean}
     */
    isAvailable(functionName = 'processChat') {
        const url = this.functionUrls[functionName];
        return !!url && url.length > 0;
    }

    /**
     * 获取函数URL
     * @param {string} functionName - 函数名称
     * @returns {string}
     */
    getUrl(functionName = 'processChat') {
        return this.functionUrls[functionName] || '';
    }

    /**
     * 设置函数URL
     * @param {string} functionName - 函数名称
     * @param {string} url - 函数URL
     */
    setUrl(functionName, url) {
        this.functionUrls[functionName] = url;
        this.saveConfig();
        Log.info('EdgeFunctionConfig', `Set ${functionName} URL: ${url}`);
    }

    /**
     * 批量设置URL
     * @param {Object} urls - URL映射对象
     */
    setUrls(urls) {
        this.functionUrls = { ...this.functionUrls, ...urls };
        this.saveConfig();
        Log.info('EdgeFunctionConfig', 'Updated URLs:', urls);
    }

    /**
     * 清除所有URL配置
     */
    clearUrls() {
        this.functionUrls = {
            processChat: '',
            exportDataset: '',
            importShare: ''
        };
        this.saveConfig();
        Log.info('EdgeFunctionConfig', 'All URLs cleared');
    }

    /**
     * 获取所有配置
     * @returns {Object}
     */
    getAllConfig() {
        return { ...this.functionUrls };
    }

    /**
     * 测试边缘函数连接
     * @param {string} functionName - 函数名称
     * @returns {Promise<Object>}
     */
    async testConnection(functionName = 'processChat') {
        const url = this.getUrl(functionName);

        if (!url) {
            return {
                success: false,
                error: 'URL未配置'
            };
        }

        try {
            Log.info('EdgeFunctionConfig', `Testing connection to ${functionName}...`);

            // 发送测试请求
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            id: 'test_msg',
                            senderName: '测试用户',
                            text: '这是一条测试消息',
                            timestamp: Math.floor(Date.now() / 1000)
                        }
                    ]
                })
            });

            const result = await response.json();

            if (result.success) {
                Log.info('EdgeFunctionConfig', `✅ ${functionName} 连接成功`);
                return {
                    success: true,
                    responseTime: Date.now(),
                    result: result
                };
            } else {
                Log.error('EdgeFunctionConfig', `❌ ${functionName} 返回错误:`, result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            Log.error('EdgeFunctionConfig', `❌ ${functionName} 连接失败:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 调用边缘函数
     * @param {string} functionName - 函数名称
     * @param {Object} data - 请求数据
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>}
     */
    async invoke(functionName, data, options = {}) {
        const url = this.getUrl(functionName);

        if (!url) {
            throw new Error(`边缘函数 ${functionName} 未配置URL`);
        }

        const {
            timeout = 30000,  // 默认30秒超时
            retries = 1       // 默认重试1次
        } = options;

        Log.info('EdgeFunctionConfig', `Invoking ${functionName}...`);

        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    Log.info('EdgeFunctionConfig', `✅ ${functionName} 调用成功`);
                    return result;
                } else {
                    throw new Error(result.error || '未知错误');
                }

            } catch (error) {
                lastError = error;
                Log.warn('EdgeFunctionConfig', `Attempt ${attempt + 1} failed:`, error.message);

                if (attempt < retries) {
                    // 等待1秒后重试
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        Log.error('EdgeFunctionConfig', `❌ ${functionName} 调用失败:`, lastError);
        throw lastError;
    }
}

// ========== 导出单例 ==========

window.EdgeFunctionConfig = new EdgeFunctionConfig();

Log.info('EdgeFunctionConfig', 'v1.0 initialized');

// ========== 开发者工具 ==========

/**
 * 在控制台提供便捷的配置方法
 * 使用方法：
 * 1. 打开浏览器控制台
 * 2. 输入：EdgeFunctionConfig.setUrl('processChat', 'https://your-function-url')
 * 3. 测试：EdgeFunctionConfig.testConnection('processChat')
 */
