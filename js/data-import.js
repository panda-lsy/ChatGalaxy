/**
 * ChatGalaxy 数据导入模块 v3.0
 * 支持JSON文件上传、验证、解析
 * 集成 IndexedDB 存储
 * @version 3.0.0
 * @updated 2026-01-06
 */

// ========== 本地日志包装器 ==========
// 防止 Log 未定义时出错（IIFE 在 log-wrapper.js 加载前执行）
if (!window.Log) {
    window.Log = {
        info: (tag, ...msg) => console.log(`[INFO] [${tag}]`, ...msg),
        warn: (tag, ...msg) => console.warn(`[WARN] [${tag}]`, ...msg),
        error: (tag, ...msg) => console.error(`[ERROR] [${tag}]`, ...msg),
        debug: (tag, ...msg) => console.log(`[DEBUG] [${tag}]`, ...msg)
    };
}
var Log = window.Log;

// ========== 常量定义 ==========

/** IndexedDB 存储名称 */
const DATASETS_STORE = window.ChatGalaxyConfig.DATASETS_STORE;
const MESSAGES_STORE = window.ChatGalaxyConfig.MESSAGES_STORE;

/** Worker 文件路径 */
const WORKER_PATH = 'js/workers/import-worker.js';

// ========== Web Worker 管理 ==========

/**
 * 创建数据处理 Worker
 * @returns {Worker} Worker 实例
 */
function createProcessingWorker() {
    try {
        return new Worker(WORKER_PATH);
    } catch (error) {
        Log.error('Import', 'Failed to create worker:', error);
        return null;
    }
}

/**
 * 使用 Worker 处理消息数据
 * @param {Array} messages - 原始消息数组
 * @param {string} datasetId - 数据集ID
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} - 处理后的消息数组
 */
function processWithWorker(messages, datasetId, onProgress) {
    return new Promise((resolve, reject) => {
        const worker = createProcessingWorker();
        if (!worker) {
            reject(new Error('Worker 创建失败'));
            return;
        }

        let processedMessages = [];

        // 监听 Worker 消息
        worker.onmessage = (e) => {
            const { type, data } = e.data;

            switch (type) {
                case 'progress':
                    // 进度更新
                    if (onProgress) {
                        onProgress(data);
                    }
                    break;

                case 'success':
                    // 处理完成
                    processedMessages = data.messages;
                    worker.terminate();
                    resolve(processedMessages);
                    break;

                case 'error':
                    // 处理失败
                    worker.terminate();
                    reject(new Error(data.error?.message || 'Worker 处理失败'));
                    break;

                default:
                    // 其他消息忽略（如 'ready'）
                    break;
            }
        };

        // 错误处理
        worker.onerror = (error) => {
            worker.terminate();
            reject(new Error(`Worker 错误: ${error.message}`));
        };

        // 发送处理请求
        worker.postMessage({
            type: 'process',
            data: {
                messages: messages,
                datasetId: datasetId
            }
        });
    });
}

/**
 * 使用边缘函数处理消息（精确模式）
 * @param {Array} messages - 原始消息数组
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} - 处理后的消息数组
 */
async function processWithEdgeFunction(messages, onProgress) {
    try {
        Log.info('Import', `Invoking Edge Function for ${messages.length} messages...`);

        // 调用边缘函数
        const response = await window.EdgeFunctionConfig.invoke('processChat', {
            messages: messages
        });

        if (!response.success) {
            throw new Error(response.error || '边缘函数处理失败');
        }

        const processedMessages = response.results;

        // 触发进度更新（100%）
        if (onProgress) {
            onProgress({
                current: processedMessages.length,
                total: processedMessages.length,
                percent: 100
            });
        }

        Log.info('Import', `✅ Edge Function processed ${processedMessages.length} messages successfully`);

        // 返回统计信息
        if (response.stats) {
            Log.info('Import', `Stats: ${JSON.stringify(response.stats)}`);
        }

        return processedMessages;

    } catch (error) {
        Log.error('Import', 'Edge Function processing failed:', error);
        throw error; // 重新抛出错误，让调用者决定是否降级
    }
}

// ========== JSON格式验证 ==========

/**
 * 验证JSON数据结构
 * @param {Object} data - JSON数据
 * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
 */
function validateJSON(data) {
    const errors = [];
    const warnings = [];

    // 检查消息字段
    if (!Array.isArray(data.messages)) {
        errors.push('缺少 messages 字段或格式不正确（应为数组）');
    } else if (data.messages.length === 0) {
        errors.push('messages 数组为空');
    }

    // 检查消息格式
    if (Array.isArray(data.messages) && data.messages.length > 0) {
        const sample = data.messages[0];

        // 检查必需字段
        if (!sample.senderId && !sample.sender && !sample.role) {
            warnings.push('消息缺少发送者标识字段 (senderId/sender/role)');
        }

        if (!sample.text && !sample.content) {
            warnings.push('消息缺少文本内容字段 (text/content)');
        }

        if (!sample.timestamp && !sample.time && !sample.createdAt) {
            warnings.push('消息缺少时间戳字段 (timestamp/time/createdAt)');
        }

        // 检查消息数量
        if (data.messages.length > window.ChatGalaxyConfig.MAX_MESSAGES_FAST) {
            warnings.push(`消息数量 (${data.messages.length}) 超过快速模式限制 (${window.ChatGalaxyConfig.MAX_MESSAGES_FAST})，建议使用精确模式`);
        }
    }

    // 检查文件大小（如果知道）
    const estimatedSize = JSON.stringify(data).length;
    if (estimatedSize > window.ChatGalaxyConfig.MAX_FILE_SIZE) {
        errors.push(`数据大小超过限制 (${(window.ChatGalaxyConfig.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB)`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

// ========== 时间戳解析 ==========

/**
 * 解析各种时间戳格式
 * @param {string|number|Date} ts - 时间戳
 * @returns {number} - Unix时间戳（毫秒）
 */
function parseTimestamp(ts) {
    if (!ts) return Date.now();

    // 数字时间戳（秒或毫秒）
    if (typeof ts === 'number') {
        // 判断是秒还是毫秒
        return ts < 10000000000 ? ts * 1000 : ts;
    }

    // 字符串时间戳
    if (typeof ts === 'string') {
        // ISO格式
        if (ts.includes('T') || ts.includes('-')) {
            return new Date(ts).getTime();
        }

        // 纯数字字符串
        if (/^\d+$/.test(ts)) {
            const num = parseInt(ts);
            return num < 10000000000 ? num * 1000 : num;
        }

        // 中文日期格式
        const chineseDate = ts.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (chineseDate) {
            return new Date(chineseDate[1], chineseDate[2] - 1, chineseDate[3]).getTime();
        }
    }

    // Date对象
    if (ts instanceof Date) {
        return ts.getTime();
    }

    return Date.now();
}

// ========== 消息数据解析 ==========

/**
 * 从 QQChatExporter V5 格式中提取发送者ID
 * @param {string|Object} senderId - 原始senderId
 * @returns {string} - 提取的ID字符串
 */
function extractSenderId(senderId) {
    if (typeof senderId === 'string') {
        return senderId;
    }
    if (typeof senderId === 'object' && senderId !== null) {
        // QQChatExporter V5 格式: {uid, uin, name}
        return senderId.uid || senderId.uin || senderId.name || 'unknown';
    }
    return 'unknown';
}

/**
 * 从 QQChatExporter V5 格式中提取发送者名称
 * @param {string|Object} senderName - 原始senderName
 * @returns {string} - 提取的名称字符串
 */
function extractSenderName(senderName) {
    if (typeof senderName === 'string') {
        return senderName;
    }
    if (typeof senderName === 'object' && senderName !== null) {
        // QQChatExporter V5 格式: {uid, uin, name}
        return senderName.name || senderName.uid || senderName.uin || 'Unknown';
    }
    return 'Unknown';
}

/**
 * 从 QQChatExporter V5 格式中提取消息文本
 * @param {string|Object} text - 原始text
 * @returns {string} - 提取的文本字符串
 */
function extractText(text) {
    if (typeof text === 'string') {
        return text;
    }
    if (typeof text === 'object' && text !== null) {
        // QQChatExporter V5 格式: {text, html, elements...}
        return text.text || text.content || '';
    }
    return '';
}

/**
 * 解析消息数据，统一格式
 * @param {Object} data - 原始JSON数据
 * @returns {Object} - { messages: Message[], senders: Map<string, Sender> }
 */
function parseMessageData(data) {
    const rawMessages = data.messages || [];
    const messages = [];
    const senders = new Map();
    let senderIdCounter = 0;

    rawMessages.forEach((rawMsg, index) => {
        // 🔧 支持多种格式：简单字符串格式和 QQChatExporter V5 对象格式
        let senderId = rawMsg.senderId || rawMsg.sender || rawMsg.userId || rawMsg.role || 'unknown';
        let senderName = rawMsg.senderName || rawMsg.sender || rawMsg.userName || rawMsg.role || senderId;

        // 提取发送者ID（处理QQChatExporter V5对象格式）
        senderId = extractSenderId(senderId);

        // 提取发送者名称（处理QQChatExporter V5对象格式）
        senderName = extractSenderName(senderName);

        // 如果发送者ID未知，生成一个
        if (senderId === 'unknown' || senderId === null || senderId === undefined) {
            senderId = `sender_${senderIdCounter++}`;
            senderName = `用户${senderIdCounter}`;
        }

        // 记录发送者
        if (!senders.has(senderId)) {
            senders.set(senderId, {
                id: senderId,
                name: senderName,
                count: 0
            });
        }
        senders.get(senderId).count++;

        // 提取消息文本（处理QQChatExporter V5对象格式）
        const rawText = rawMsg.text || rawMsg.content || '';
        const text = extractText(rawText);

        // 解析消息
        const message = {
            id: rawMsg.id || `msg_${Date.now()}_${index}`,
            datasetId: null, // 稍后填充
            senderId: senderId,
            senderName: senderName,
            timestamp: parseTimestamp(rawMsg.timestamp || rawMsg.time || rawMsg.createdAt),
            text: text,
            sentiment: rawMsg.sentiment || 1, // 默认中性
            keywords: rawMsg.keywords || []
        };

        messages.push(message);
    });

    return { messages, senders };
}

// ========== 文件读取 ==========

/**
 * 读取JSON文件
 * @param {File} file - 文件对象
 * @returns {Promise<Object>} - 解析后的JSON数据
 */
function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (error) {
                reject(new Error(`JSON解析失败: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };

        reader.readAsText(file);
    });
}

// ========== 图数据生成 ==========

/**
 * 从消息数据构建图结构（基于关键词共现）
 * @param {Array} messages - 消息数组
 * @returns {Object} - { nodes: Array, links: Array }
 */
function buildGraphFromMessages(messages) {
    const totalMsgs = messages.length;

    // 动态计算图参数
    const MAX_NODES = Math.min(
        window.ChatGalaxyConfig.BASE_MAX_NODES,
        Math.floor(Math.pow(totalMsgs, 0.5))
    );
    const MIN_LINK_WEIGHT = Math.max(
        window.ChatGalaxyConfig.BASE_MIN_LINK_WEIGHT,
        Math.floor(Math.log(totalMsgs + 1) * window.ChatGalaxyConfig.MIN_LINK_WEIGHT_COEFFICIENT)
    );

    console.log(`📊 Building import graph: ${totalMsgs} msgs -> MaxNodes:${MAX_NODES}, MinLink:${MIN_LINK_WEIGHT}`);

    // 1. 统计关键词频率
    const keywordCounts = new Map();
    messages.forEach(msg => {
        if (msg.keywords && Array.isArray(msg.keywords)) {
            msg.keywords.forEach(kw => {
                if (kw && kw.trim()) {
                    keywordCounts.set(kw.trim(), (keywordCounts.get(kw.trim()) || 0) + 1);
                }
            });
        }
    });

    // 2. 选择热门关键词作为节点
    const sortedKeywords = Array.from(keywordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_NODES);

    const nodes = sortedKeywords.map(([keyword, count], index) => ({
        id: index.toString(),
        name: keyword,
        count: count,
        val: Math.max(5, Math.min(20, Math.log(count + 1) * 3)) // 节点大小
    }));

    // 3. 构建共现关系（关键词在相邻或同一消息中出现）
    const linkCounts = new Map();
    const keywordToIndex = new Map(nodes.map((n, i) => [n.name, i]));

    messages.forEach(msg => {
        if (msg.keywords && Array.isArray(msg.keywords) && msg.keywords.length >= 2) {
            const validKeywords = msg.keywords
                .filter(kw => kw && kw.trim() && keywordToIndex.has(kw.trim()))
                .map(kw => kw.trim())
                .slice(0, 10); // 每条消息最多取10个关键词

            // 生成关键词对（共现关系）
            for (let i = 0; i < validKeywords.length; i++) {
                for (let j = i + 1; j < validKeywords.length; j++) {
                    const idx1 = keywordToIndex.get(validKeywords[i]);
                    const idx2 = keywordToIndex.get(validKeywords[j]);
                    const linkKey = `${idx1}-${idx2}`;

                    linkCounts.set(linkKey, (linkCounts.get(linkKey) || 0) + 1);
                }
            }
        }
    });

    // 4. 生成边（只保留权重足够大的边）
    const links = [];
    linkCounts.forEach((count, linkKey) => {
        if (count >= MIN_LINK_WEIGHT) {
            const [source, target] = linkKey.split('-').map(Number);
            links.push({
                source: source,
                target: target,
                value: count, // 边的粗细
                count: count
            });
        }
    });

    // 5. 限制边的数量，避免过于复杂
    links.sort((a, b) => b.value - a.value);
    const maxLinks = Math.min(links.length, nodes.length * 3); // 每个节点平均最多3条边

    return {
        nodes: nodes,
        links: links.slice(0, maxLinks)
    };
}

// ========== 主导入函数 ==========

/**
 * 导入JSON数据并创建数据集
 * @param {File} file - JSON文件
 * @param {Object} options - 导入选项
 * @returns {Promise<Object>} - { dataset: Dataset, stats: Object }
 */
async function importJSON(file, options = {}) {
    const {
        name,
        description = '',
        tags = [],
        color = '#3498db',
        mode = 'fast', // 'fast' | 'precise'
        onProgress
    } = options;

    let dataset = null; // 跟踪创建的数据集，用于失败时清理

    try {
        // 1. 文件大小检查
        if (file.size > window.ChatGalaxyConfig.MAX_FILE_SIZE) {
            throw new Error(`文件过大，超过限制 ${(window.ChatGalaxyConfig.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`);
        }

        // 2. 读取并验证JSON
        const data = await readJSONFile(file);
        const validation = validateJSON(data);

        if (!validation.valid) {
            throw new Error(`JSON格式错误:\n${validation.errors.join('\n')}`);
        }

        // 显示警告
        if (validation.warnings.length > 0) {
            console.warn('导入警告:', validation.warnings);
        }

        // 3. 解析消息数据
        const { messages, senders } = parseMessageData(data);

        // 4. 创建数据集
        dataset = await window.DatasetManagerV3.createDataset({
            name: name || file.name.replace('.json', ''),
            description,
            tags,
            color
        });

        // 5. 处理消息（根据模式选择处理方式）
        let processedMessages;
        const messageCount = messages.length;

        Log.info('Import', `Processing ${messageCount} messages in ${mode} mode`);

        // 🆕 边缘函数精确模式
        if (mode === 'precise' && window.EdgeFunctionConfig && window.EdgeFunctionConfig.isAvailable('processChat')) {
            try {
                Log.info('Import', 'Using Edge Function for precise processing...');
                processedMessages = await processWithEdgeFunction(messages, onProgress);
            } catch (edgeError) {
                Log.warn('Import', 'Edge Function failed, falling back to Worker:', edgeError);
                // 降级到Worker模式
                const useWorker = messageCount > 500;
                if (useWorker) {
                    processedMessages = await processWithWorker(messages, dataset.id, onProgress);
                } else {
                    processedMessages = await window.TextProcessor.processMessages(messages, onProgress);
                }
            }
        }
        // 快速模式：使用 Worker 或同步处理
        else {
            const useWorker = messageCount > 500; // 超过500条使用Worker
            Log.info('Import', `Using ${useWorker ? 'Worker' : 'sync'} processing`);

            if (useWorker) {
                // 使用 Worker 异步处理
                try {
                    processedMessages = await processWithWorker(messages, dataset.id, onProgress);
                } catch (workerError) {
                    Log.warn('Import', 'Worker processing failed, falling back to sync:', workerError);
                    // 降级到同步处理：使用 TextProcessor 分词
                    if (window.TextProcessor && typeof window.TextProcessor.processMessages === 'function') {
                        Log.info('Import', 'Processing messages with TextProcessor (sync mode)...');
                        processedMessages = await window.TextProcessor.processMessages(messages, onProgress);
                    } else {
                        // 如果 TextProcessor 不可用，使用原始消息（无分词）
                        Log.warn('Import', 'TextProcessor not available, using raw messages without segmentation');
                        processedMessages = messages;
                    }
                }
            } else {
                // 同步处理（小数据量）：使用 TextProcessor 分词
                if (window.TextProcessor && typeof window.TextProcessor.processMessages === 'function') {
                    Log.info('Import', 'Processing messages with TextProcessor (sync mode)...');
                    processedMessages = await window.TextProcessor.processMessages(messages, onProgress);
                } else {
                    // 如果 TextProcessor 不可用，使用原始消息（无分词）
                    Log.warn('Import', 'TextProcessor not available, using raw messages without segmentation');
                    processedMessages = messages;
                }
            }
        }

        // 6. 保存消息到IndexedDB
        await window.DatasetManagerV3.saveMessages(dataset.id, processedMessages, onProgress);

        // 7. 生成图数据（基于关键词共现）
        const graph = buildGraphFromMessages(processedMessages);

        // 8. 更新数据集统计（使用标准方法确保缓存同步）
        const updatedDataset = await window.DatasetManagerV3.getDataset(dataset.id);
        updatedDataset.messageCount = processedMessages.length;
        updatedDataset.participantCount = senders.size;
        updatedDataset.graph = graph; // 保存图数据
        updatedDataset.updatedAt = new Date().toISOString();
        const dbHelper = await window.DatasetManagerV3.initDatabase();
        await dbHelper.put(DATASETS_STORE, updatedDataset);

        // 9. 更新LocalStorage缓存以保持同步
        const { cacheDatasetList } = window.DatasetManagerV3;
        if (typeof cacheDatasetList === 'function') {
            await cacheDatasetList();
        }

        // 10. 生成统计数据
        const stats = {
            totalMessages: processedMessages.length,
            totalSenders: senders.size,
            dateRange: {
                start: new Date(Math.min(...processedMessages.map(m => m.timestamp))).toISOString().split('T')[0],
                end: new Date(Math.max(...processedMessages.map(m => m.timestamp))).toISOString().split('T')[0]
            },
            topSenders: Array.from(senders.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map(s => ({ name: s.name, count: s.count }))
        };

        console.log('✅ Import completed:', { dataset, stats });

        return { dataset, stats };

    } catch (error) {
        console.error('❌ Import failed:', error);

        // 🔧 修复：如果创建了数据集但导入失败，清理空数据集
        if (dataset && dataset.id) {
            try {
                console.warn('[Import] Cleaning up failed dataset:', dataset.id);
                await window.DatasetManagerV3.deleteDataset(dataset.id);
                console.log('[Import] Cleanup successful');
            } catch (cleanupError) {
                console.error('[Import] Cleanup failed:', cleanupError);
                // 清理失败不影响错误抛出
            }
        }

        throw error; // 重新抛出原始错误
    }
}

// ========== 快速创建空数据集 ==========

/**
 * 快速创建空数据集
 * @param {Object} datasetInfo - 数据集信息
 * @returns {Promise<Dataset>}
 */
async function createEmptyDataset(datasetInfo) {
    return await window.DatasetManagerV3.createDataset(datasetInfo);
}

// ========== 导出数据集 ==========

/**
 * 导出数据集为JSON
 * @param {string} datasetId - 数据集ID
 * @returns {Promise<Object>} - JSON数据
 */
async function exportDataset(datasetId) {
    const dbHelper = await window.DatasetManagerV3.initDatabase();

    const dataset = await window.DatasetManagerV3.getDataset(datasetId);
    if (!dataset) {
        throw new Error(`数据集不存在: ${datasetId}`);
    }

    const messages = await dbHelper.getByIndex(
        MESSAGES_STORE,
        'datasetId',
        datasetId
    );

    return {
        name: dataset.name,
        description: dataset.description,
        createdAt: dataset.createdAt,
        messageCount: dataset.messageCount,
        participantCount: dataset.participantCount,
        tags: dataset.tags,
        messages: messages.map(msg => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            timestamp: msg.timestamp,
            text: msg.text,
            sentiment: msg.sentiment,
            keywords: msg.keywords
        }))
    };
}

// ========== 下载文件 ==========

/**
 * 触发下载JSON文件
 * @param {Object} data - JSON数据
 * @param {string} filename - 文件名
 */
function downloadJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// ========== UI辅助函数 ==========

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化后的大小
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

/**
 * 格式化消息数量
 * @param {number} count - 消息数量
 * @returns {string} - 格式化后的数量
 */
function formatMessageCount(count) {
    if (count < 1000) return count.toString();
    if (count < 10000) return (count / 1000).toFixed(1) + 'k';
    if (count < 1000000) return (count / 10000).toFixed(1) + '万';
    return (count / 1000000).toFixed(1) + 'M';
}

// ========== 全局导出 ==========

window.DataImportV3 = {
    // 验证
    validateJSON,
    parseTimestamp,
    parseMessageData,

    // 读取
    readJSONFile,

    // 导入
    importJSON,
    createEmptyDataset,

    // 导出
    exportDataset,
    downloadJSON,

    // UI辅助
    formatFileSize,
    formatMessageCount,

    // 配置（引用统一配置）
    get MAX_FILE_SIZE() { return window.ChatGalaxyConfig.MAX_FILE_SIZE; },
    get MAX_MESSAGES_FAST() { return window.ChatGalaxyConfig.MAX_MESSAGES_FAST; }
};

console.log('📥 DataImport v3.0 initialized');
