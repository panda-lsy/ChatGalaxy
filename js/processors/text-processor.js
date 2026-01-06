/**
 * ChatGalaxy 前端文本处理器 v1.0
 * 纯浏览器实现：中文分词 + 情感分析 + 关键词提取
 *
 * 技术方案：
 * - 分词：Intl.Segmenter (浏览器原生API)
 * - 情感：规则引擎 (疑问词 + 情感词库)
 * - 关键词：简化版TF-IDF
 *
 * @version 1.0.0
 * @updated 2026-01-06
 */

// ========== 中文分词 ==========

/**
 * 中文分词器
 * 使用 Intl.Segmenter API（浏览器原生支持）
 */
const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });

/**
 * 分词函数
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

// ========== 情感分析 ==========

/**
 * 疑问词库
 */
const QUESTION_WORDS = new Set([
    '什么', '怎么', '为什么', '哪', '谁', '多少', '几', '吗', '呢', '吧',
    '如何', '怎样', '是否', '能否', '可否', '难道', '岂', '哎'
]);

/**
 * 积极情感词库
 */
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

/**
 * 消极情感词库
 */
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

/**
 * 情感增强词（用于调节情感强度）
 */
const INTENSIFIERS = new Set([
    '非常', '特别', '很', '超', '超级', '极其', '十分', '万分', '格外',
    '相当', '挺', '蛮', '有点', '一些', '太', '更', '最', '比较', '稍微'
]);

/**
 * 情感分析函数（规则引擎）
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

        // 检测增强词
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

    // 判断情感类别
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

// ========== 停用词过滤 ==========

/**
 * 中文停用词表（常用但无意义词）
 */
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

/**
 * 过滤停用词
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

// ========== 黑名单过滤 ==========

/**
 * 从文本中移除中括号内容
 * @param {string} text - 输入文本
 * @returns {string} - 移除中括号后的文本
 */
function removeBracketedContent(text) {
    // 检查是否启用黑名单
    if (!window.ChatGalaxyConfig || !window.ChatGalaxyConfig.ENABLE_BLACKLIST) {
        return text;
    }

    // 移除所有中括号及其内容
    return text.replace(/\[[^\]]*\]/g, '');
}

/**
 * 过滤中括号内容
 * @param {string[]} words - 分词数组
 * @returns {string[]} - 过滤后的词数组
 */
function filterBlacklistWords(words) {
    // 检查是否启用黑名单
    if (!window.ChatGalaxyConfig || !window.ChatGalaxyConfig.ENABLE_BLACKLIST) {
        return words;
    }

    return words.filter(word => {
        // 只过滤用中括号括起来的词
        if (/^\[.+\]$/.test(word)) {
            return false;
        }

        return true;
    });
}

/**
 * 检测文本是否包含中括号标记
 * @param {string} text - 输入文本
 * @returns {Object} - { isBlacklisted: boolean, matchedPatterns: string[] }
 */
function detectBlacklistContent(text) {
    // 检查是否启用黑名单
    if (!window.ChatGalaxyConfig || !window.ChatGalaxyConfig.ENABLE_BLACKLIST) {
        return { isBlacklisted: false, matchedPatterns: [] };
    }

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

// ========== 关键词提取 ==========

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
 * 提取关键词（简化版TF-IDF）
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
    let filteredWords = filterStopWords(words);

    // 3. 过滤黑名单词
    filteredWords = filterBlacklistWords(filteredWords);

    if (filteredWords.length === 0) {
        return [];
    }

    // 4. 计算词频
    const tf = calculateTermFrequency(filteredWords);

    // 5. 计算IDF简化版（基于词长度和词频的权重）
    const keywords = [];
    for (const [word, count] of tf.entries()) {
        // TF-IDF简化公式：score = TF * log(word_length)
        const score = count * Math.log(word.length);

        keywords.push({
            word: word,
            score: score
        });
    }

    // 6. 排序并返回TopN
    keywords.sort((a, b) => b.score - a.score);

    return keywords.slice(0, topN);
}

// ========== 批量处理 ==========

/**
 * 批量处理消息
 * @param {Array<{text: string}>} messages - 消息数组
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array<{text: string, sentiment: number, keywords: string[]}>>}
 */
async function processMessages(messages, onProgress) {
    const results = [];
    const total = messages.length;

    // 获取黑名单策略
    const strategy = window.ChatGalaxyConfig?.BLACKLIST_STRATEGY || 'filter_only';

    for (let i = 0; i < total; i++) {
        const msg = messages[i];
        let text = msg.text || '';

        // 检测黑名单内容（在原始文本上检测）
        const blacklistCheck = detectBlacklistContent(text);

        // 根据策略处理黑名单消息
        if (blacklistCheck.isBlacklisted && strategy === 'skip') {
            // 跳过包含黑名单的消息
            console.debug('[TextProcessor] 跳过黑名单消息:', blacklistCheck.matchedPatterns);
            continue;
        }

        // 移除中括号内容（在情感分析和关键词提取之前）
        text = removeBracketedContent(text);

        // 分词
        const words = segmentText(text);

        // 情感分析（使用清理后的文本）
        const sentiment = analyzeSentiment(text);

        // 关键词提取（已包含黑名单词过滤）
        const keywordObjects = extractKeywords(text, 5);
        const keywords = keywordObjects.map(k => k.word);

        const processedMsg = {
            ...msg,
            sentiment,
            keywords
        };

        // 如果策略是 mark，标记包含黑名单的消息
        if (blacklistCheck.isBlacklisted && strategy === 'mark') {
            processedMsg.isBlacklisted = true;
            processedMsg.blacklistReasons = blacklistCheck.matchedPatterns;
        }

        results.push(processedMsg);

        // 报告进度（每处理100条报告一次）
        if (onProgress && (i + 1) % 100 === 0) {
            onProgress(i + 1, total);
        }

        // 避免阻塞UI（每处理10条让出控制权）
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return results;
}

// ========== 文本统计 ==========

/**
 * 文本统计信息
 * @param {string} text - 输入文本
 * @returns {Object} - 统计信息
 */
function getTextStats(text) {
    if (!text || typeof text !== 'string') {
        return {
            charCount: 0,
            wordCount: 0,
            sentenceCount: 0,
            avgWordLength: 0
        };
    }

    // 字符数
    const charCount = text.length;

    // 分词
    const words = segmentText(text);
    const wordCount = words.length;

    // 句子数（按。！？等标点分割）
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;

    // 平均词长
    const avgWordLength = wordCount > 0
        ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
        : 0;

    return {
        charCount,
        wordCount,
        sentenceCount,
        avgWordLength: avgWordLength.toFixed(2)
    };
}

// ========== 全局导出 ==========

window.TextProcessor = {
    // 分词
    segmentText,

    // 情感分析
    analyzeSentiment,

    // 关键词提取
    extractKeywords,

    // 批量处理
    processMessages,

    // 文本统计
    getTextStats,

    // 黑名单工具
    removeBracketedContent,
    filterStopWords,
    filterBlacklistWords,
    detectBlacklistContent,
    calculateTermFrequency
};

console.log('📝 TextProcessor v1.0 initialized');
console.log('✅ 中文分词: Intl.Segmenter');
console.log('✅ 情感分析: 规则引擎');
console.log('✅ 关键词提取: 简化版TF-IDF');
console.log('✅ 黑名单过滤: 已启用');
