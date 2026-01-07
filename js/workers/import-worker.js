/**
 * ChatGalaxy 数据导入 Web Worker v2.1
 * 异步处理大量数据，避免阻塞UI线程
 *
 * 算法统一：使用 text-processor.js 的规则引擎方法
 * - 分词：Intl.Segmenter (浏览器原生 API)
 * - 情感分析：规则引擎 (积极/消极/疑问词库 + 阈值)
 * - 关键词提取：简化版 TF-IDF
 *
 * 使用方式：
 * const worker = new Worker('js/workers/import-worker.js', { type: 'module' });
 * worker.postMessage({ type: 'process', data: messages });
 * worker.onmessage = (e) => { handleResult(e.data); };
 *
 * @version 2.1.0
 * @updated 2026-01-07
 * @reference text-processor.js
 */

// ========== 中文分词（Intl.Segmenter）==========

/**
 * 中文分词器（浏览器原生 API）
 * 注意：Worker 环境支持 Intl.Segmenter
 */
const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });

/**
 * 分词函数（与 text-processor.js 一致）
 * @param {string} text - 输入文本
 * @returns {string[]} - 分词数组
 */
function segmentText(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const segments = segmenter.segment(text);
    const words = [];

    for (const { segment, isWordLike } of segments) {
        // 只保留词性为词语的内容
        if (isWordLike) {
            words.push(segment.trim());
        }
    }

    return words;
}

// ========== 情感词库（与 text-processor.js 一致）==========

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

// ========== 停用词表（与 text-processor.js 一致）==========

const STOP_WORDS = new Set([
    '的', '了', '是', '在', '和', '与', '或', '及', '等', '着', '过',
    '啊', '呀', '哦', '嗯', '哼', '唉', '哎', '唉', '吧', '呢', '嘛',
    '这', '那', '这个', '那个', '这些', '那些', '某', '各', '每',
    '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们',
    '自己', '人家', '大家', '咱们', '谁', '什么', '哪', '哪儿', '哪里',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '个', '些', '件', '种', '次', '回', '趟', '遍', '番', '声',
    '来', '去', '上', '下', '进', '出', '回', '过', '到', '在',
    '把', '被', '让', '叫', '使', '由', '对', '向', '往', '从',
    '很', '太', '更', '最', '非常', '特别', '十分', '比较', '稍微',
    '就', '都', '也', '还', '再', '又', '才', '不', '没', '别',
    '能', '可以', '会', '要', '想', '愿', '肯', '敢', '得', '该',
    '说', '道', '讲', '问', '答', '告诉', '说', '表示', '认为', '觉得',
    '有', '无', '没', '没', '不', '非', '未', '否'
]);

// ========== 情感分析（与 text-processor.js 一致）==========

/**
 * 情感分析函数（规则引擎，与 text-processor.js 一致）
 * @param {string} text - 输入文本
 * @returns {number} - 情感值：0=消极, 1=中性, 2=积极, 3=疑问
 */
function analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
        return 1; // 默认中性
    }

    const words = segmentText(text);
    let positiveScore = 0;
    let negativeScore = 0;
    let questionScore = 0;
    let hasIntensifier = false;

    // 分析每个词
    for (const word of words) {
        // 检测疑问词
        if (QUESTION_WORDS.has(word)) {
            questionScore += 2;
        }

        // 检测增强词（程度副词）
        if (INTENSIFIERS.has(word)) {
            hasIntensifier = true;
        }

        // 检测积极词
        if (POSITIVE_WORDS.has(word)) {
            positiveScore += hasIntensifier ? 2 : 1;
        }

        // 检测消极词
        if (NEGATIVE_WORDS.has(word)) {
            negativeScore += hasIntensifier ? 2 : 1;
        }
    }

    // 判断情感类别（与 text-processor.js 一致）
    if (questionScore > 0) {
        return 3; // 疑问
    }

    const sentimentScore = positiveScore - negativeScore;

    if (sentimentScore > 1) {
        return 2; // 积极
    } else if (sentimentScore < -1) {
        return 0; // 消极
    } else {
        return 1; // 中性
    }
}

// ========== 黑名单过滤 ==========

/**
 * 从文本中移除中括号内容
 * @param {string} text - 输入文本
 * @returns {string} - 移除中括号后的文本
 */
function removeBracketedContent(text) {
    // 移除所有中括号及其内容
    return text.replace(/\[[^\]]*\]/g, '');
}

/**
 * 过滤停用词（与 text-processor.js 一致）
 * @param {string[]} words - 分词数组
 * @returns {string[]} - 过滤后的词数组
 */
function filterStopWords(words) {
    return words.filter(word => {
        // 过滤单字（除非是特殊符号）
        if (word.length === 1) {
            return false;
        }

        // 过滤停用词
        if (STOP_WORDS.has(word)) {
            return false;
        }

        // 过滤纯数字
        if (/^\d+$/.test(word)) {
            return false;
        }

        return true;
    });
}

// ========== 关键词提取（与 text-processor.js 一致）==========

/**
 * 计算词频（TF）
 * @param {string[]} words - 分词数组
 * @returns {Map<string, number>} - 词频映射
 */
function calculateTermFrequency(words) {
    const freq = new Map();

    for (const word of words) {
        const count = freq.get(word) || 0;
        freq.set(word, count + 1);
    }

    return freq;
}

/**
 * 提取关键词（简化版 TF-IDF，与 text-processor.js 一致）
 * @param {string} text - 输入文本
 * @param {number} topN - 返回前N个关键词
 * @returns {Array<{word: string, score: number}>} - 关键词数组
 */
function extractKeywords(text, topN = 10) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // 0. 先移除中括号内容（在分词之前）
    text = removeBracketedContent(text);

    // 1. 分词
    const words = segmentText(text);

    // 2. 过滤停用词
    const filteredWords = filterStopWords(words);

    if (filteredWords.length === 0) {
        return [];
    }

    // 3. 计算词频
    const tf = calculateTermFrequency(filteredWords);

    // 4. 计算简化版 TF-IDF（与 text-processor.js 一致）
    const keywords = [];
    for (const [word, count] of tf.entries()) {
        // score = TF × log(词长)
        const score = count * Math.log(word.length);

        keywords.push({
            word: word,
            score: score
        });
    }

    // 5. 排序并返回 TopN
    keywords.sort((a, b) => b.score - a.score);

    return keywords.slice(0, topN);
}

// ========== 消息处理 ==========

/**
 * 处理单条消息
 * @param {Object} msg - 原始消息
 * @param {number} index - 消息索引
 * @returns {Object} - 处理后的消息
 */
function processMessage(msg, index) {
    let text = msg.text || msg.content?.text || '';

    // 检测黑名单内容
    const blacklistCheck = detectBlacklistContent(text);

    // 根据策略处理黑名单消息（默认只过滤）
    if (blacklistCheck.isBlacklisted) {
        // 移除中括号内容
        text = removeBracketedContent(text);
    }

    return {
        ...msg,
        id: msg.id || `msg_${index}`,
        sentiment: analyzeSentiment(text),
        keywords: extractKeywords(text, 10).map(k => k.word), // topN=10，与 text-processor.js 一致
        words: segmentText(text).slice(0, 20) // 只保留前20个词
    };
}

/**
 * 检测文本是否包含中括号标记
 * @param {string} text - 输入文本
 * @returns {Object} - { isBlacklisted: boolean, matchedPatterns: string[] }
 */
function detectBlacklistContent(text) {
    const matchedPatterns = [];

    // 检查中括号格式的内容
    const bracketMatches = text.match(/\[[^\]]+\]/g);
    if (bracketMatches) {
        bracketMatches.forEach(match => {
            matchedPatterns.push(`标记: ${match}`);
        });
    }

    return {
        isBlacklisted: matchedPatterns.length > 0,
        matchedPatterns
    };
}

/**
 * 批量处理消息
 * @param {Array} messages - 消息数组
 * @param {Function} onProgress - 进度回调
 * @returns {Array} - 处理后的消息数组
 */
function processMessages(messages, onProgress) {
    const results = [];

    for (let i = 0; i < messages.length; i++) {
        const processedMsg = processMessage(messages[i], i);
        results.push(processedMsg);

        // 报告进度（每处理100条报告一次）
        if (onProgress && (i + 1) % 100 === 0) {
            onProgress(i + 1, messages.length);
        }
    }

    return results;
}

// ========== 消息监听 ==========

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'process':
            try {
                console.log(`[Worker] Processing ${data.messages.length} messages with text-processor.js algorithm...`);

                const processedMessages = processMessages(
                    data.messages,
                    (current, total) => {
                        // 发送进度更新
                        self.postMessage({
                            type: 'progress',
                            data: {
                                current: current,
                                total: total,
                                percent: Math.round((current / total) * 100)
                            }
                        });
                    }
                );

                console.log(`[Worker] Completed processing ${processedMessages.length} messages`);

                // 发送结果
                self.postMessage({
                    type: 'success',
                    data: {
                        messages: processedMessages,
                        stats: {
                            total: data.messages.length,
                            processed: processedMessages.length
                        }
                    }
                });

            } catch (error) {
                console.error('[Worker] Error:', error);
                self.postMessage({
                    type: 'error',
                    data: {
                        message: error.message,
                        stack: error.stack
                    }
                });
            }
            break;

        case 'abort':
            // 可以在这里添加清理逻辑
            self.postMessage({
                type: 'aborted',
                data: {}
            });
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

// ========== Worker初始化 ==========

console.log('[Worker] ImportWorker v2.1 initialized');
console.log('[Worker] Using text-processor.js algorithm:');
console.log('[Worker] - Chinese segmentation: Intl.Segmenter');
console.log('[Worker] - Sentiment analysis: Rule engine (threshold: >1 positive, <-1 negative)');
console.log('[Worker] - Keyword extraction: Simplified TF-IDF (topN=10)');

self.postMessage({
    type: 'ready',
    data: {
        message: 'ImportWorker v2.1 initialized with text-processor.js algorithm'
    }
});
