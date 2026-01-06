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

// ========== 中文分词（Worker环境）==========

/**
 * 统计分词算法（基于互信息和N-gram）
 * 不依赖词典，自动从文本中发现词汇
 */

/**
 * 提取所有可能的候选词（基于统计规律）
 * @param {string} text - 输入文本
 * @returns {Map<string, number>} - 词频统计
 */
function extractCandidates(text) {
    // 移除中括号内容
    text = text.replace(/\[[^\]]*\]/g, '');

    // 移除特殊字符，保留中文、英文、数字
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');

    // 统计2-4字的词频
    const freq = new Map();
    const chars = cleanText.split('');

    for (let i = 0; i < chars.length; i++) {
        // 单个字符（英文单词）
        if (/[a-zA-Z0-9]/.test(chars[i])) {
            // 提取完整单词
            let word = '';
            let j = i;
            while (j < chars.length && /[a-zA-Z0-9]/.test(chars[j])) {
                word += chars[j];
                j++;
            }
            if (word.length >= 2) {
                freq.set(word, (freq.get(word) || 0) + 1);
            }
            i = j - 1;
            continue;
        }

        // 2-4字的中文词
        for (let len = 2; len <= 4 && i + len <= chars.length; len++) {
            const candidate = chars.slice(i, i + len).join('');

            // 检查是否全是中文
            if (/^[\u4e00-\u9fa5]+$/.test(candidate)) {
                freq.set(candidate, (freq.get(candidate) || 0) + 1);
            }
        }
    }

    return freq;
}

/**
 * 计算互信息，过滤有意义的词
 * @param {Map} freq - 词频统计
 * @returns {Array} - 有意义的词列表
 */
function filterMeaningfulWords(freq) {
    const words = [];

    for (const [word, count] of freq.entries()) {
        // 过滤条件：
        // 1. 频次 >= 2
        // 2. 长度 >= 2
        if (count >= 2 && word.length >= 2) {
            words.push({ word, count });
        }
    }

    // 按频次和长度排序
    words.sort((a, b) => {
        // 长度优先，然后频次
        if (a.word.length !== b.word.length) {
            return b.word.length - a.word.length;
        }
        return b.count - a.count;
    });

    return words;
}

/**
 * 智能分词（基于统计）
 * @param {string} text - 输入文本
 * @returns {string[]} - 分词数组
 */
function statisticalSegment(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // 移除中括号内容
    text = text.replace(/\[[^\]]*\]/g, '');

    // 提取候选词
    const freq = extractCandidates(text);
    const meaningfulWords = filterMeaningfulWords(freq);

    // 构建词典（只保留高频词）
    const dict = new Set(meaningfulWords.slice(0, 200).map(w => w.word));

    // 使用词典进行分词（最大匹配）
    const words = [];
    let i = 0;
    const MAX_WORD_LENGTH = 4;

    while (i < text.length) {
        let matched = false;

        // 从最大长度开始匹配
        for (let len = MAX_WORD_LENGTH; len >= 2; len--) {
            if (i + len > text.length) continue;

            const candidate = text.slice(i, i + len);

            // 检查是否在词典中
            if (dict.has(candidate)) {
                words.push(candidate);
                i += len;
                matched = true;
                break;
            }
        }

        // 如果没有匹配到
        if (!matched) {
            const char = text[i];

            // 跳过标点符号和空格
            if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(char)) {
                // 英文单词
                if (/[a-zA-Z0-9]/.test(char)) {
                    let word = '';
                    let j = i;
                    while (j < text.length && /[a-zA-Z0-9]/.test(text[j])) {
                        word += text[j];
                        j++;
                    }
                    if (word.length >= 2) {
                        words.push(word);
                    }
                    i = j;
                } else {
                    // 单个汉字（跳过）
                    i++;
                }
            } else {
                i++;
            }
        }
    }

    return words;
}

/**
 * 简化版中文分词
 * 使用统计方法 + 规则
 * @param {string} text - 输入文本
 * @returns {string[]} - 分词数组
 */
function simpleSegment(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // 使用统计分词
    const words = statisticalSegment(text);

    // 过滤结果
    return words.filter(word => {
        // 保留双字及以上词汇
        if (word.length >= 2) return true;

        // 保留英文单词
        if (/^[a-zA-Z]{2,}$/.test(word)) return true;

        return false;
    });
}

// ========== 情感分析（复制自主线程） ==========

const QUESTION_WORDS = new Set([
    '什么', '怎么', '为什么', '哪', '谁', '多少', '几', '吗', '呢', '吧',
    '如何', '怎样', '是否', '能否', '可否', '难道', '岂', '哎'
]);

const POSITIVE_WORDS = new Set([
    // 单字词
    '好', '棒', '赞', '爱', '喜', '对', '是', '行', '强', '牛',

    // 双字词
    '优秀', '厉害', '喜欢', '开心', '快乐', '高兴', '幸福', '满意', '成功',
    '胜利', '完美', '漂亮', '美好', '精彩', '出色', '卓越', '杰出', '超赞',
    '好评', '给力', '加油', '努力', '坚持', '相信', '希望', '期待', '美丽',
    '可爱', '温柔', '善良', '友好', '热情', '真诚', '感动', '温暖', '舒服',
    '轻松', '自由', '愉快', '欢乐', '祥和', '和谐', '平静', '安宁', '兴奋',
    '激动', '惊喜', '陶醉', '享受', '满足', '充实', '丰富', '可以', '不错',
    '很好', '挺好', '太棒', '真棒', '支持', '感谢', '谢谢', '好的', '是的',

    // 三字及以上
    '棒极了', '太好了', '非常好', '特别好', '很不错', '没问题', '没关系',
    '哈哈', '嘻嘻', '呵呵'
]);

const NEGATIVE_WORDS = new Set([
    // 单字词
    '差', '坏', '烂', '糟', '恨', '烦', '怒', '痛', '累', '错',

    // 双字词
    '不好', '糟糕', '讨厌', '烦躁', '生气', '愤怒', '难过', '伤心', '痛苦',
    '失望', '绝望', '郁闷', '压抑', '沉重', '疲惫', '疲倦', '难受', '不舒服',
    '错误', '失误', '失败', '失败', '惨痛', '完蛋', '不行', '没用', '无用',
    '垃圾', '废物', '废柴', '蠢笨', '傻逼', '白痴', '弱智', '脑残', '神经',
    '疯子', '变态', '恶心', '反胃', '呕吐', '厌恶', '憎恨', '鄙视', '轻视',
    '害怕', '恐惧', '担心', '忧虑', '焦虑', '紧张', '慌张', '惊慌', '害怕',

    // 三字及以上
    '不喜欢', '很难过', '特别糟', '太差了', '不可以', '不能', '不要'
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
 * 过滤黑名单词
 * @param {string[]} words - 分词数组
 * @returns {string[]} - 过滤后的词数组
 */
function filterBlacklistWords(words) {
    return words.filter(word => {
        // 只过滤用中括号括起来的词
        if (/^\[.+\]$/.test(word)) {
            return false;
        }

        return true;
    });
}

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
 * 提取关键词
 * @param {string} text - 输入文本
 * @param {number} topN - 返回前N个关键词
 * @returns {Array<{word: string, score: number}>}
 */
function extractKeywords(text, topN = 5) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // 先移除中括号内容
    text = removeBracketedContent(text);

    const words = simpleSegment(text);
    let filteredWords = filterStopWords(words);
    filteredWords = filterBlacklistWords(filteredWords);

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
    let text = msg.text || msg.content || '';

    // 移除中括号内容
    text = removeBracketedContent(text);

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
