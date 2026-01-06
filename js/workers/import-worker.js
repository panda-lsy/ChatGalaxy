/**
 * ChatGalaxy 数据导入 Web Worker
 * 异步处理大量数据，避免阻塞UI线程
 *
 * 使用方式：
 * const worker = new Worker('js/workers/import-worker.js');
 * worker.postMessage({ type: 'process', data: messages });
 * worker.onmessage = (e) => { handleResult(e.data); };
 *
 * @version 1.0.0
 * @updated 2026-01-06
 */

// ========== 导入主线程的分词器 ==========

// Web Worker中无法直接使用Intl.Segmenter
// 需要通过消息传递接收分词结果，或使用简化分词

/**
 * 简化版中文分词（基于正则）
 * @param {string} text - 输入文本
 * @returns {string[]} - 分词数组
 */
function simpleSegment(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // 移除标点符号
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');

    // 按空格分割
    const words = cleanText.split(/\s+/).filter(w => w.length >= 2);

    return words;
}

// ========== 情感分析（复制自主线程） ==========

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
    '美丽', '可爱', '温柔', '善良', '友好', '热情', '真诚', '感动', '温暖'
]);

const NEGATIVE_WORDS = new Set([
    '不好', '差', '坏', '烂', '糟糕', '讨厌', '恨', '烦', '烦躁', '生气',
    '愤怒', '难过', '伤心', '痛苦', '失望', '绝望', '郁闷', '压抑', '沉重',
    '累', '疲惫', '疲倦', '困', '饿', '痛', '难受', '不舒服', '病', '伤',
    '错', '错误', '失误', '失败', '输', '败', '惨', '惨痛', '糟糕', '完蛋',
    '不行', '不可以', '不能', '没用', '无用', '垃圾', '废物', '废柴', '笨'
]);

const INTENSIFIERS = new Set([
    '非常', '特别', '很', '超', '超级', '极其', '十分', '万分', '格外',
    '相当', '挺', '蛮', '有点', '一些', '太', '更', '最', '比较', '稍微'
]);

/**
 * 情感分析
 * @param {string} text - 输入文本
 * @returns {number} - 情感值
 */
function analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
        return 1;
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

    if (questionScore > 0) {
        return 3;
    }

    const sentimentScore = positiveScore - negativeScore;

    if (sentimentScore > 1) {
        return 2;
    } else if (sentimentScore < -1) {
        return 0;
    } else {
        return 1;
    }
}

// ========== 关键词提取 ==========

const STOP_WORDS = new Set([
    '的', '了', '是', '在', '和', '与', '或', '及', '等', '着', '过',
    '啊', '呀', '哦', '嗯', '哼', '唉', '哎', '唉', '吧', '呢', '嘛',
    '这', '那', '这个', '那个', '这些', '那些', '某', '各', '每',
    '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们',
    '自己', '人家', '大家', '咱们', '谁', '什么', '哪', '哪儿', '哪里',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '个', '些', '件', '种', '次', '回', '趟', '遍', '番', '声'
]);

/**
 * 过滤停用词
 * @param {string[]} words - 分词数组
 * @returns {string[]} - 过滤后的词数组
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
 * 提取关键词
 * @param {string} text - 输入文本
 * @param {number} topN - 返回前N个关键词
 * @returns {Array<{word: string, score: number}>}
 */
function extractKeywords(text, topN = 5) {
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

    keywords.sort((a, b) => b.score - a.score);

    return keywords.slice(0, topN);
}

// ========== 消息处理 ==========

/**
 * 处理单条消息
 * @param {Object} msg - 原始消息
 * @returns {Object} - 处理后的消息
 */
function processMessage(msg) {
    const text = msg.text || msg.content || '';

    return {
        ...msg,
        sentiment: analyzeSentiment(text),
        keywords: extractKeywords(text, 5).map(k => k.word)
    };
}

/**
 * 批量处理消息
 * @param {Array} messages - 消息数组
 * @returns {Array} - 处理后的消息数组
 */
function processMessages(messages) {
    return messages.map(processMessage);
}

// ========== 消息监听 ==========

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'process':
            try {
                const processedMessages = processMessages(data.messages);

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

                // 发送进度完成
                self.postMessage({
                    type: 'progress',
                    data: {
                        current: processedMessages.length,
                        total: data.messages.length,
                        percent: 100
                    }
                });

            } catch (error) {
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

self.postMessage({
    type: 'ready',
    data: {
        message: 'ImportWorker initialized'
    }
});
