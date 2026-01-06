/**
 * ChatGalaxy 聊天数据处理边缘函数 (Node.js 版本)
 * 部署在阿里云 ESA (Edge Script Functions)
 *
 * 功能：
 * - nodejieba 精确分词
 * - 基于词典的情感分析
 * - TF-IDF 关键词提取
 * - 批量处理支持
 *
 * 作者: ChatGalaxy Team
 * 版本: 1.0.0
 * 日期: 2026-01-07
 */

'use strict';

// ========== 依赖导入 ==========

const nodejieba = require('nodejieba');

// ========== 配置类 ==========

class Config {
    /**
     * 边缘函数配置
     */
    static get JIEBA_MODE() {
        return '精确模式'; // 精确模式 | 全模式 | 搜索引擎模式
    }

    static get CUT_ALL() {
        return false; // 是否全模式
    }

    static get TOP_K() {
        return 5; // 提取前N个关键词
    }

    static get SENTIMENT_THRESHOLD() {
        return {
            negative: 0.3,   // < 0.3 为消极
            question: 0.5,   // 0.3 - 0.5 为疑问
            neutral: 0.7,    // 0.5 - 0.7 为中性
            positive: 1.0    // > 0.7 为积极
        };
    }

    static get BATCH_SIZE() {
        return 100;
    }

    static get MAX_MESSAGES() {
        return 10000;
    }
}

// ========== 情感分析词典 ==========

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

// ========== 工具函数 ==========

/**
 * 分析情感（基于词典）
 * @param {string} text - 文本内容
 * @returns {number} - 情感标签 (0=消极, 1=中性, 2=积极, 3=疑问)
 */
function analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
        return 1; // 默认中性
    }

    let score = 0.5; // 基础分数（中性）

    // 1. 检查是否包含疑问词
    const hasQuestionWord = QUESTION_WORDS.some(word => text.includes(word));
    if (hasQuestionWord) {
        return 3; // 疑问
    }

    // 2. 计算积极和消极词数量
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of POSITIVE_WORDS) {
        if (text.includes(word)) {
            positiveCount++;
        }
    }

    for (const word of NEGATIVE_WORDS) {
        if (text.includes(word)) {
            negativeCount++;
        }
    }

    // 3. 检查是否有程度副词
    let hasIntensifier = false;
    for (const word of INTENSIFIERS) {
        if (text.includes(word)) {
            hasIntensifier = true;
            break;
        }
    }

    // 4. 计算情感分数
    if (positiveCount === 0 && negativeCount === 0) {
        // 没有明显的情感词，返回中性
        return 1;
    }

    if (hasIntensifier) {
        // 有程度副词，权重加倍
        positiveCount *= 2;
        negativeCount *= 2;
    }

    const total = positiveCount + negativeCount;
    score = positiveCount / total;

    // 5. 根据分数返回情感标签
    if (score < Config.SENTIMENT_THRESHOLD.negative) {
        return 0; // 消极
    } else if (score < Config.SENTIMENT_THRESHOLD.neutral) {
        return 1; // 中性
    } else {
        return 2; // 积极
    }
}

/**
 * 提取关键词
 * @param {string} text - 文本内容
 * @param {number} topK - 提取前N个关键词
 * @returns {string[]} - 关键词列表
 */
function extractKeywords(text, topK = Config.TOP_K) {
    try {
        // 使用 nodejieba 提取关键词（TF-IDF 算法）
        const keywords = nodejieba.extract(text, topK);
        return keywords.map(kw => kw.word);
    } catch (error) {
        console.error('Keyword extraction failed:', error);
        return [];
    }
}

/**
 * 中文分词
 * @param {string} text - 文本内容
 * @returns {string[]} - 分词结果
 */
function segmentText(text) {
    try {
        if (Config.CUT_ALL) {
            return nodejieba.cut(text, true);
        } else {
            return nodejieba.cut(text, false);
        }
    } catch (error) {
        console.error('Segmentation failed:', error);
        // 降级到单字符分割
        return text.split('');
    }
}

/**
 * 处理单条消息
 * @param {Object} message - 原始消息对象
 * @returns {Object} - 处理后的消息
 */
function processMessage(message) {
    try {
        // 提取文本内容
        const text = message.text || '';

        // 分词
        const words = segmentText(text);

        // 情感分析
        const sentiment = analyzeSentiment(text);

        // 关键词提取
        const keywords = extractKeywords(text);

        // 返回处理结果
        return {
            id: message.id,
            senderName: message.senderName,
            senderId: message.senderId,
            text: text,
            timestamp: message.timestamp,
            sentiment: sentiment,
            keywords: keywords,
            words: words.slice(0, 20) // 只保留前20个词，减少数据量
        };

    } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error);
        // 返回原始数据，带有默认的情感值
        return {
            id: message.id,
            senderName: message.senderName,
            senderId: message.senderId,
            text: message.text || '',
            timestamp: message.timestamp,
            sentiment: 1, // 默认中性
            keywords: [],
            words: [],
            error: error.message
        };
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

        const result = processMessage(messages[i]);
        results.push(result);
    }

    console.log(`Completed processing ${results.length} messages`);
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

        console.log(`Processing ${messages.length} messages...`);

        // 处理消息
        const results = processMessagesBatch(messages);

        // 返回结果
        const response = {
            success: true,
            results: results,
            stats: {
                total: results.length,
                processed: results.filter(r => !r.error).length,
                failed: results.filter(r => r.error).length,
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
            senderName: '张三',
            senderId: 'zhangsan',
            text: '今天天气真好，我们一起去玩游戏吧！',
            timestamp: 1704508800
        },
        {
            id: 'msg_2',
            senderName: '李四',
            text: '这个功能怎么用？有人能帮我吗？',
            timestamp: 1704508860
        },
        {
            id: 'msg_3',
            senderName: '王五',
            text: '我不开心，心情很差。',
            timestamp: 1704508920
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
    console.log('边缘函数测试结果:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(JSON.parse(result.body), null, 2));
}
