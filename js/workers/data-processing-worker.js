/**
 * ChatGalaxy 数据处理 Web Worker v2.0
 * 增强版：支持分批处理、实时进度、大文件解析
 *
 * 功能：
 * - JSON 文件解析
 * - 批量消息处理（分词、情感分析、关键词提取）
 * - 实时进度反馈
 * - 错误隔离和恢复
 *
 * 使用方式：
 * const worker = new Worker('js/workers/data-processing-worker.js');
 * worker.postMessage({ type: 'parse', data: { fileData, datasetId } });
 * worker.onmessage = (e) => { handleMessage(e.data); };
 *
 * @version 2.0.0
 * @updated 2026-01-06
 */

// ========== 配置 ==========

const CONFIG = {
    BATCH_SIZE: 100,              // 每批处理的消息数量
    PROGRESS_INTERVAL: 10,        // 进度更新频率（每N批更新一次）
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 最大文件大小 10MB
    TOP_KEYWORDS: 5                // 提取前N个关键词
};

// ========== 简化版中文分词 ==========

/**
 * 简化版中文分词（基于正则）
 * Web Worker 中无法使用 Intl.Segmenter
 */
function simpleSegment(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // 移除标点符号，保留中英文和数字
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');

    // 按空格分割
    const words = cleanText.split(/\s+/).filter(w => w.length >= 2);

    return words;
}

// ========== 情感分析 ==========

const QUESTION_WORDS = new Set([
    '什么', '怎么', '为什么', '哪', '谁', '多少', '几', '吗', '呢', '吧',
    '如何', '怎样', '是否', '能否', '可否', '难道', '岂', '哎'
]);

const POSITIVE_WORDS = new Set([
    '好', '棒', '优秀', '厉害', '强', '喜欢', '爱', '开心', '快乐', '高兴',
    '幸福', '满意', '赞', '支持', '感谢', '谢谢', '不错', '可以', '行',
    '对', '是', '成功', '胜利', '棒极了', '太好了', '优秀', '完美', '漂亮',
    '美好', '精彩', '出色', '卓越', '杰出', '超赞', '好评', '给力', '牛',
    '哈哈', '嘻嘻', '呵呵', '加油', '努力', '坚持', '相信', '希望', '期待',
    '美丽', '可爱', '温柔', '善良', '友好', '热情', '真诚', '感动', '温暖',
    '舒服', '轻松', '自由', '愉快', '欢乐', '祥和', '和谐', '平静', '安宁',
    '兴奋', '激动', '惊喜', '陶醉', '沉迷', '享受', '满足', '充实', '丰富'
]);

const NEGATIVE_WORDS = new Set([
    '不好', '差', '坏', '烂', '糟糕', '讨厌', '恨', '烦', '烦躁', '生气',
    '愤怒', '难过', '伤心', '痛苦', '失望', '绝望', '郁闷', '压抑', '沉重',
    '累', '疲惫', '疲倦', '困', '饿', '痛', '难受', '不舒服', '病', '伤',
    '错', '错误', '失误', '失败', '输', '败', '惨', '惨痛', '糟糕', '完蛋',
    '不行', '不可以', '不能', '没用', '无用', '垃圾', '废物', '废柴', '笨',
    '蠢', '傻', '傻逼', '白痴', '弱智', '脑残', '神经病', '疯子', '变态',
    '恶心', '反胃', '呕吐', '厌恶', '憎恨', '鄙视', '轻视', '看不起', '瞧不起',
    '害怕', '恐惧', '担心', '忧虑', '焦虑', '紧张', '慌', '慌张', '惊慌'
]);

const INTENSIFIERS = new Set([
    '非常', '特别', '很', '超', '超级', '极其', '十分', '万分', '格外',
    '相当', '挺', '蛮', '有点', '一些', '太', '更', '最', '比较', '稍微'
]);

/**
 * 情感分析（规则引擎）
 * @param {string} text - 输入文本
 * @returns {number} - 情感值：0=消极, 1=中性, 2=积极, 3=疑问
 */
function analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
        return 1; // 默认中性
    }

    const words = simpleSegment(text);
    let positiveScore = 0;
    let negativeScore = 0;
    let questionScore = 0;
    let hasIntensifier = false;

    for (const word of words) {
        if (QUESTION_WORDS.has(word)) {
            questionScore += 2;
        }

        if (INTENSIFIERS.has(word)) {
            hasIntensifier = true;
        }

        if (POSITIVE_WORDS.has(word)) {
            positiveScore += hasIntensifier ? 2 : 1;
        }

        if (NEGATIVE_WORDS.has(word)) {
            negativeScore += hasIntensifier ? 2 : 1;
        }
    }

    // 疑问句优先
    if (questionScore > 0) {
        return 3;
    }

    // 计算情感倾向
    const sentimentScore = positiveScore - negativeScore;

    if (sentimentScore > 1) {
        return 2; // 积极
    } else if (sentimentScore < -1) {
        return 0; // 消极
    } else {
        return 1; // 中性
    }
}

// ========== 关键词提取 ==========

const STOP_WORDS = new Set([
    '的', '了', '是', '在', '和', '与', '或', '及', '等', '着', '过',
    '啊', '呀', '哦', '嗯', '哼', '唉', '哎', '吧', '呢', '嘛',
    '这', '那', '这个', '那个', '这些', '那些', '某', '各', '每',
    '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们',
    '自己', '人家', '大家', '咱们', '谁', '什么', '哪', '哪儿', '哪里',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '个', '些', '件', '种', '次', '回', '趟', '遍', '番', '声'
]);

/**
 * 过滤停用词
 */
function filterStopWords(words) {
    return words.filter(word => {
        if (word.length < 2) return false;
        if (STOP_WORDS.has(word)) return false;
        if (/^\d+$/.test(word)) return false;
        return true;
    });
}

/**
 * 提取关键词（简化版TF-IDF）
 * @param {string} text - 输入文本
 * @param {number} topN - 返回前N个关键词
 * @returns {Array<{word: string, score: number}>}
 */
function extractKeywords(text, topN = CONFIG.TOP_KEYWORDS) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const words = simpleSegment(text);
    const filteredWords = filterStopWords(words);

    if (filteredWords.length === 0) {
        return [];
    }

    // 计算词频
    const freq = new Map();
    for (const word of filteredWords) {
        const count = freq.get(word) || 0;
        freq.set(word, count + 1);
    }

    // 计算TF-IDF简化版
    const keywords = [];
    for (const [word, count] of freq.entries()) {
        const score = count * Math.log(word.length);
        keywords.push({
            word: word,
            score: score
        });
    }

    // 按分数降序排序
    keywords.sort((a, b) => b.score - a.score);

    return keywords.slice(0, topN);
}

// ========== 消息处理 ==========

/**
 * 处理单条消息
 * @param {Object} msg - 原始消息
 * @param {string} datasetId - 数据集ID
 * @returns {Object} - 处理后的消息
 */
function processMessage(msg, datasetId) {
    const text = msg.text || msg.content || '';

    return {
        id: msg.id || `${datasetId}_${msg.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        datasetId: datasetId,
        senderId: msg.senderId || msg.sender_name || 'unknown',
        senderName: msg.senderName || msg.sender_name || msg.sender || '未知',
        timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
        text: text,
        sentiment: analyzeSentiment(text),
        keywords: extractKeywords(text, CONFIG.TOP_KEYWORDS).map(k => k.word),
        processedAt: Date.now()
    };
}

/**
 * 批量处理消息（分批）
 * @param {Array} messages - 原始消息数组
 * @param {string} datasetId - 数据集ID
 * @param {Function} onProgress - 进度回调
 * @returns {Array} - 处理后的消息数组
 */
function processMessagesBatch(messages, datasetId, onProgress) {
    const total = messages.length;
    const processed = [];
    let batchCount = 0;

    for (let i = 0; i < total; i += CONFIG.BATCH_SIZE) {
        const batch = messages.slice(i, Math.min(i + CONFIG.BATCH_SIZE, total));

        // 处理当前批次
        const processedBatch = batch.map(msg => processMessage(msg, datasetId));
        processed.push(...processedBatch);

        // 更新进度
        batchCount++;
        if (batchCount % CONFIG.PROGRESS_INTERVAL === 0 || i + CONFIG.BATCH_SIZE >= total) {
            if (onProgress) {
                onProgress({
                    current: processed.length,
                    total: total,
                    percent: Math.floor((processed.length / total) * 100)
                });
            }
        }
    }

    return processed;
}

// ========== 文件解析 ==========

/**
 * 解析 JSON 文件
 * @param {string} fileData - 文件内容（JSON字符串）
 * @returns {Object} - 解析结果
 */
function parseJSONFile(fileData) {
    try {
        const data = JSON.parse(fileData);

        // 验证数据结构
        if (!data || typeof data !== 'object') {
            throw new Error('无效的JSON格式：根节点必须是对象');
        }

        // 检查消息数组
        const messages = data.messages || [];
        if (!Array.isArray(messages)) {
            throw new Error('无效的数据格式：messages 必须是数组');
        }

        return {
            success: true,
            data: {
                meta: data.meta || data.chatInfo || {},
                messages: messages
            }
        };

    } catch (error) {
        return {
            success: false,
            error: {
                message: `JSON解析失败: ${error.message}`,
                line: error.line,
                column: error.column
            }
        };
    }
}

/**
 * 验证消息数据
 * @param {Object} data - 解析后的数据
 * @returns {Object} - 验证结果
 */
function validateData(data) {
    const warnings = [];
    const errors = [];

    // 检查消息数量
    if (data.messages.length === 0) {
        errors.push('消息数量为0');
    }

    // 检查必填字段
    let missingText = 0;
    let missingSender = 0;
    let missingTimestamp = 0;

    for (let i = 0; i < Math.min(data.messages.length, 100); i++) {
        const msg = data.messages[i];

        if (!msg.text && !msg.content) {
            missingText++;
        }

        if (!msg.senderName && !msg.sender_name && !msg.sender) {
            missingSender++;
        }

        if (!msg.timestamp) {
            missingTimestamp++;
        }
    }

    if (missingText > 0) {
        warnings.push(`前100条消息中有 ${missingText} 条缺少内容`);
    }

    if (missingSender > 0) {
        warnings.push(`前100条消息中有 ${missingSender} 条缺少发送者`);
    }

    if (missingTimestamp > 0) {
        warnings.push(`前100条消息中有 ${missingTimestamp} 条缺少时间戳`);
    }

    return {
        valid: errors.length === 0,
        warnings: warnings,
        errors: errors
    };
}

// ========== 消息处理 ==========

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'parse':
            // 解析文件
            handleParse(data);
            break;

        case 'process':
            // 处理消息
            handleProcess(data);
            break;

        case 'abort':
            // 中止处理
            handleAbort();
            break;

        default:
            self.postMessage({
                type: 'error',
                data: {
                    message: `Unknown message type: ${type}`
                }
            });
    }
};

/**
 * 处理文件解析
 */
function handleParse(data) {
    try {
        const { fileData, datasetId } = data;

        // 1. 解析 JSON
        const parseResult = parseJSONFile(fileData);
        if (!parseResult.success) {
            self.postMessage({
                type: 'error',
                data: {
                    step: 'parse',
                    error: parseResult.error
                }
            });
            return;
        }

        // 2. 验证数据
        const validation = validateData(parseResult.data);
        if (!validation.valid) {
            self.postMessage({
                type: 'error',
                data: {
                    step: 'validate',
                    errors: validation.errors,
                    warnings: validation.warnings
                }
            });
            return;
        }

        // 3. 发送验证成功消息
        self.postMessage({
            type: 'parsed',
            data: {
                meta: parseResult.data.meta,
                messageCount: parseResult.data.messages.length,
                warnings: validation.warnings
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            data: {
                step: 'parse',
                error: {
                    message: error.message,
                    stack: error.stack
                }
            }
        });
    }
}

/**
 * 处理消息处理
 */
function handleProcess(data) {
    try {
        const { messages, datasetId } = data;

        // 分批处理
        const processedMessages = processMessagesBatch(
            messages,
            datasetId,
            (progress) => {
                // 发送进度更新
                self.postMessage({
                    type: 'progress',
                    data: progress
                });
            }
        );

        // 发送完成消息
        self.postMessage({
            type: 'complete',
            data: {
                messages: processedMessages,
                stats: {
                    total: messages.length,
                    processed: processedMessages.length,
                    timestamp: Date.now()
                }
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            data: {
                step: 'process',
                error: {
                    message: error.message,
                    stack: error.stack
                }
            }
        });
    }
}

/**
 * 处理中止请求
 */
function handleAbort() {
    self.postMessage({
        type: 'aborted',
        data: {
            message: 'Processing aborted by user'
        }
    });
}

// ========== Worker初始化 ==========

self.postMessage({
    type: 'ready',
    data: {
        message: 'DataProcessingWorker v2.0 initialized',
        config: CONFIG
    }
});
