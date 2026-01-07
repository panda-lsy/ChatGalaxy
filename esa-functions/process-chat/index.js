/**
 * ChatGalaxy 聊天数据处理边缘函数 (Node.js 版本 v2.1)
 * 部署在阿里云 ESA (Edge Script Functions)
 *
 * 算法统一：使用 text-processor.js 的规则引擎方法
 * - 分词：nodejieba (Node.js 版 jieba)
 * - 情感分析：规则引擎 (积极/消极/疑问词库 + 阈值)
 * - 关键词提取：简化版 TF-IDF
 *
 * 作者: ChatGalaxy Team
 * 版本: 2.1.0
 * 日期: 2026-01-07
 * 参考: text-processor.js
 */

'use strict';

// ========== 依赖导入 ==========

const nodejieba = require('nodejieba');

// ========== 疑问词库 ==========

const QUESTION_WORDS = new Set([
    '什么', '怎么', '为什么', '哪', '谁', '多少', '几', '吗', '呢', '吧',
    '如何', '怎样', '是否', '能否', '可否', '难道', '岂', '哎'
]);

// ========== 情感词库 ==========

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

// ========== 停用词表 ==========

const STOP_WORDS = new Set([
    '的', '了', '是', '在', '和', '与', '或', '及', '等', '着', '过',
    '啊', '呀', '哦', '嗯', '哼', '唉', '哎', '吧', '呢', '嘛',
    '这', '那', '这个', '那个', '这些', '那些', '某', '各', '每',
    '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们',
    '自己', '人家', '大家', '咱们',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '个', '些', '件', '种', '次', '回', '趟', '遍', '番', '声',
    '来', '去', '上', '下', '进', '出', '回', '过', '到',
    '把', '被', '让', '叫', '使', '由', '对', '向', '往', '从',
    '就', '都', '也', '还', '再', '又', '才', '不', '没', '别',
    '能', '可以', '会', '要', '想', '愿', '肯', '敢', '得', '该',
    '说', '道', '讲', '问', '答', '告诉', '表示', '认为', '觉得',
    '有', '无', '非', '未', '否',
    // 媒体占位符
    '图片', '表情', '语音', '视频', '通话', '位置', '文件', '引用'
]);

// ========== 配置类 ==========

class Config {
    static get TOP_N() {
        return 10; // 提取前10个关键词（与 text-processor.js 一致）
    }

    static get BATCH_SIZE() {
        return 100;
    }

    static get MAX_MESSAGES() {
        return 10000;
    }
}

// ========== 工具函数 ==========

/**
 * 移除回复引用标记
 * @param {string} text - 输入文本
 * @returns {string} - 清理后的文本
 */
function stripReplyReference(text) {
    if (!text) {
        return text;
    }
    // 移除 [回复 XXX] 格式的标记
    const REPLY_PATTERN = /\[回复[^\]]*\]/g;
    const cleaned = text.replace(REPLY_PATTERN, '');
    return cleaned.trim();
}

/**
 * 移除中括号内容（黑名单）
 * @param {string} text - 输入文本
 * @returns {string} - 清理后的文本
 */
function removeBracketedContent(text) {
    if (!text) {
        return text;
    }
    return text.replace(/\[[^\]]*\]/g, '').trim();
}

// ========== 中文分词 ==========

/**
 * 中文分词（使用 nodejieba）
 * @param {string} text - 文本内容
 * @returns {string[]} - 分词结果
 */
function segmentText(text) {
    try {
        // 精确模式分词
        const words = nodejieba.cut(text, true);

        // 过滤掉空白和标点
        return words.filter(word => {
            // 只保留中文、英文、数字
            return /^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(word) && word.trim().length > 0;
        });
    } catch (error) {
        console.error('Segmentation failed:', error);
        // 降级到单字符分割
        return text.split('').filter(c => /^[\u4e00-\u9fa5a-zA-Z0-9]$/.test(c));
    }
}

// ========== 情感分析 ==========

/**
 * 情感分析（规则引擎，与 text-processor.js 一致）
 * @param {string} text - 文本内容
 * @returns {number} - 情感标签：0=消极, 1=中性, 2=积极, 3=疑问
 */
function analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
        return 1; // 默认中性
    }

    // 分词
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

// ========== 关键词提取 ==========

/**
 * 过滤停用词
 * @param {string[]} words - 分词数组
 * @returns {string[]} - 过滤后的词数组
 */
function filterStopWords(words) {
    return words.filter(word => {
        // 过滤单字
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
 * @param {string} text - 文本内容
 * @param {number} topN - 返回前N个关键词
 * @returns {Array<{word: string, score: number}>} - 关键词数组
 */
function extractKeywords(text, topN = 10) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // 0. 先移除中括号内容（在分词之前）
    text = removeBracketedContent(text);

    // 检查是否是纯占位符
    if (/^\[.*?\]$/.test(text)) {
        return [];
    }

    // 1. 移除回复引用
    text = stripReplyReference(text);

    // 2. 分词
    const words = segmentText(text);

    // 3. 过滤停用词
    const filteredWords = filterStopWords(words);

    if (filteredWords.length === 0) {
        return [];
    }

    // 4. 计算词频
    const tf = calculateTermFrequency(filteredWords);

    // 5. 计算简化版 TF-IDF（与 text-processor.js 一致）
    const keywords = [];
    for (const [word, count] of tf.entries()) {
        // score = TF × log(词长)
        const score = count * Math.log(word.length);

        keywords.push({
            word: word,
            score: score
        });
    }

    // 6. 排序并返回 TopN
    keywords.sort((a, b) => b.score - a.score);

    return keywords.slice(0, topN);
}

// ========== 消息处理 ==========

/**
 * 处理单条消息
 * @param {Object} message - 原始消息对象
 * @param {number} index - 消息索引
 * @returns {Object} - 处理后的消息
 */
function processMessage(message, index) {
    try {
        // 提取文本内容
        const content = message.content || {};
        let text = content.text || '';

        // 移除回复引用
        text = stripReplyReference(text);

        // 跳过空消息或占位符
        if (!text || text.length < 2) {
            return null;
        }

        const PLACEHOLDERS = ['[图片]', '[表情]', '[语音]', '[视频]', '[通话]'];
        if (PLACEHOLDERS.includes(text) || /^\[.*?\]$/.test(text)) {
            return null;
        }

        // 分词
        const words = segmentText(text);

        // 情感分析（使用规则引擎）
        const sentiment = analyzeSentiment(text);

        // 关键词提取（topN=10）
        const keywordObjects = extractKeywords(text, 10);
        const keywords = keywordObjects.map(k => k.word);

        // 发送者名称
        const sender = message.sender || {};
        const senderName = sender.name || 'Unknown';

        // 时间戳
        const timestamp = message.timestamp || Date.now();

        // 返回处理结果
        return {
            id: message.id || `msg_${index}`,
            senderName: senderName,
            senderId: sender.id || senderName,
            text: text,
            timestamp: timestamp,
            sentiment: sentiment,
            keywords: keywords,
            words: Array.isArray(words) ? words.slice(0, 20) : [] // 只保留前20个词
        };

    } catch (error) {
        console.error(`Failed to process message ${index}:`, error);
        return null;
    }
}

/**
 * 批量处理消息
 * @param {Array} messages - 消息列表
 * @returns {Array} - 处理后的消息列表
 */
function processMessagesBatch(messages) {
    const results = [];

    for (let i = 0; i < messages.length; i++) {
        // 每处理100条记录一次日志
        if (i % 100 === 0) {
            console.log(`Processing message ${i + 1}/${messages.length}`);
        }

        const result = processMessage(messages[i], i);
        if (result) {
            results.push(result);
        }
    }

    console.log(`Completed processing ${results.length} messages (filtered ${messages.length - results.length} placeholders)`);
    return results;
}

// ========== 边缘函数入口 ==========

/**
 * 阿里云 ESA 边缘函数入口
 * @param {Object} event - ESA 边缘函数事件对象
 * @param {Object} context - 函数上下文
 * @returns {Object} - 响应对象
 */
function handler(event, context) {
    try {
        // 解析请求
        let body;
        if (typeof event === 'string') {
            body = JSON.parse(event);
        } else if (event.body) {
            body = JSON.parse(event.body);
        } else {
            body = event;
        }

        const messages = body.messages || [];

        if (!messages || messages.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No messages provided'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        // 检查消息数量限制
        if (messages.length > Config.MAX_MESSAGES) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: `Too many messages. Maximum ${Config.MAX_MESSAGES} allowed.`
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        console.log(`Processing ${messages.length} messages with text-processor.js algorithm...`);

        // 处理消息
        const results = processMessagesBatch(messages);

        // 返回结果
        const response = {
            success: true,
            results: results,
            stats: {
                total: messages.length,
                processed: results.length,
                filtered: messages.length - results.length,
                timestamp: new Date().toISOString()
            }
        };

        return {
            statusCode: 200,
            body: JSON.stringify(response),
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            }
        };

    } catch (error) {
        console.error('Unexpected error:', error);

        if (error instanceof SyntaxError) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid JSON format'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}

// ========== 导出 ==========

module.exports.handler = handler;

// ========== 测试代码 ==========

if (require.main === module) {
    // 本地测试
    const testMessages = [
        {
            id: 'msg_1',
            sender: { name: '张三', id: 'zhangsan' },
            content: { text: '今天天气真好，我们一起去玩游戏吧！' },
            timestamp: 1704508800
        },
        {
            id: 'msg_2',
            sender: { name: '李四' },
            content: { text: '这个功能怎么用？有人能帮我吗？' },
            timestamp: 1704508860
        },
        {
            id: 'msg_3',
            sender: { name: '王五' },
            content: { text: '我不开心，心情很差。' },
            timestamp: 1704508920
        },
        {
            id: 'msg_4',
            sender: { name: '测试' },
            content: { text: '[图片]' },
            timestamp: 1704508980
        },
        {
            id: 'msg_5',
            sender: { name: '赵六' },
            content: { text: '这个真的太棒了！非常赞！' },
            timestamp: 1704509040
        }
    ];

    // 模拟事件
    const testEvent = {
        body: JSON.stringify({ messages: testMessages })
    };

    // 执行处理
    const result = handler(testEvent, {});

    // 打印结果
    console.log('='.repeat(60));
    console.log('边缘函数测试结果 (text-processor.js 算法):');
    console.log('='.repeat(60));
    const responseBody = JSON.parse(result.body);
    console.log(JSON.stringify(responseBody, null, 2));
    console.log('\n统计信息:');
    console.log(`- 总消息数: ${responseBody.stats.total}`);
    console.log(`- 处理成功: ${responseBody.stats.processed}`);
    console.log(`- 过滤占位符: ${responseBody.stats.filtered}`);

    // 打印每条消息的情感和关键词
    if (responseBody.success && responseBody.results) {
        console.log('\n详细结果:');
        responseBody.results.forEach((msg, i) => {
            const sentimentLabels = ['消极', '中性', '积极', '疑问'];
            console.log(`\n[消息 ${i + 1}] ${msg.senderName}: ${msg.text}`);
            console.log(`  情感: ${sentimentLabels[msg.sentiment]} (${msg.sentiment})`);
            console.log(`  关键词: ${msg.keywords.join(', ')}`);
        });
    }
}
