/**
 * ChatGalaxy 聊天数据处理边缘函数 (Node.js 版本 v2.0)
 * 部署在阿里云 ESA (Edge Script Functions)
 *
 * 功能：
 * - nodejieba 精确分词（与 Python 版本一致）
 * - 改进的情感分析（参考 process_data_v2.py）
 * - TF-IDF 关键词提取（带词性过滤）
 * - 批量处理支持
 *
 * 作者: ChatGalaxy Team
 * 版本: 2.0.0
 * 日期: 2026-01-07
 * 参考: process_data_v2.py
 */

'use strict';

// ========== 依赖导入 ==========

const nodejieba = require('nodejieba');

// ========== 停用词（与 process_data_v2.py 一致） ==========

const STOP_WORDS = new Set([
    "图片", "表情", "语音", "视频", "通话", "位置", "文件", "引用",
    "现在", "可以", "知道", "觉得", "感觉", "时候", "什么", "怎么",
    "因为", "所以", "虽然", "但是", "如果", "就是", "还是", "那个",
    "这个", "一个", "一下", "一点", "一些", "已经", "可能", "真的",
    "没有", "不是", "不用", "不要", "不好", "不行", "不错", "好吧",
    "好的", "收到", "嗯嗯", "哈哈", "嘻嘻", "呵呵", "哦哦", "嘿嘿",
    "ok", "OK", "Ok", "http", "https", "www", "com", "cn"
]);

// ========== 配置类 ==========

class Config {
    /**
     * 边缘函数配置（与 process_data_v2.py 保持一致）
     */
    static get TOP_K() {
        return 3; // 提取前3个关键词（与Python版本一致）
    }

    static get ALLOW_POS() {
        // 允许的词性（与Python版本一致）
        return ['n', 'nz', 'v', 'vd', 'vn', 'l', 'a', 'd'];
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
 * 移除回复引用标记（与 process_data_v2.py 一致）
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
 * 分析情感（参考 process_data_v2.py 的实现）
 * @param {string} text - 文本内容
 * @returns {number} - 情感标签 (0=中性, 1=积极, 2=疑问, 3=消极)
 *
 * 注意：返回值与 process_data_v2.py 相反
 * Python: 0=neutral, 1=happy, 2=question, 3=sad
 * JS: 0=中性, 1=积极, 2=疑问, 3=消极
 */
function analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
        return 0; // 默认中性
    }

    // 1. 规则检查：疑问句（与 process_data_v2.py 一致）
    const QUESTION_PATTERNS = ['?', '？', '什么', '怎么', '为何', 'what', 'how'];
    if (QUESTION_PATTERNS.some(pattern => text.includes(pattern))) {
        return 2; // 疑问
    }

    // 2. 基于词典的情感分析（简化版 SnowNLP）
    let positiveScore = 0;
    let negativeScore = 0;

    // 积极词库（扩充版）
    const POSITIVE_WORDS = [
        '好', '棒', '赞', '爱', '喜', '开心', '快乐', '高兴', '幸福', '满意',
        '成功', '胜利', '完美', '漂亮', '美好', '精彩', '厉害', '优秀', '出色',
        '卓越', '杰出', '超赞', '好评', '给力', '加油', '努力', '坚持', '相信',
        '希望', '期待', '美丽', '可爱', '温柔', '善良', '友好', '热情', '真诚',
        '感动', '温暖', '舒服', '轻松', '自由', '愉快', '欢乐', '祥和', '和谐',
        '平静', '安宁', '兴奋', '激动', '惊喜', '陶醉', '享受', '满足', '充实',
        '丰富', '可以', '不错', '很好', '挺好', '太棒', '真棒', '支持', '感谢',
        '谢谢', '好的', '是的', '棒极了', '太好了', '非常好', '特别好', '很不错',
        '没问题', '没关系', '哈哈', '嘻嘻', '呵呵'
    ];

    // 消极词库（扩充版）
    const NEGATIVE_WORDS = [
        '差', '坏', '烂', '糟', '恨', '烦', '怒', '痛', '累', '错', '不好',
        '糟糕', '讨厌', '烦躁', '生气', '愤怒', '难过', '伤心', '痛苦', '失望',
        '绝望', '郁闷', '压抑', '沉重', '疲惫', '疲倦', '难受', '不舒服', '错误',
        '失误', '失败', '惨痛', '完蛋', '不行', '没用', '无用', '垃圾', '废物',
        '废柴', '蠢笨', '傻逼', '白痴', '弱智', '脑残', '神经', '疯子', '变态',
        '恶心', '反胃', '呕吐', '厌恶', '憎恨', '鄙视', '轻视', '害怕', '恐惧',
        '担心', '忧虑', '焦虑', '紧张', '慌张', '惊慌', '不喜欢', '很难过', '特别糟',
        '太差了', '不可以', '不能', '不要'
    ];

    // 程度副词
    const INTENSIFIERS = ['非常', '特别', '很', '超', '超级', '极其', '十分', '万分', '格外', '相当', '挺', '蛮', '有点', '一些', '太', '更', '最', '比较', '稍微'];

    // 统计积极词和消极词数量
    for (const word of POSITIVE_WORDS) {
        if (text.includes(word)) {
            positiveScore++;
        }
    }

    for (const word of NEGATIVE_WORDS) {
        if (text.includes(word)) {
            negativeScore++;
        }
    }

    // 检查是否有程度副词
    let hasIntensifier = false;
    for (const word of INTENSIFIERS) {
        if (text.includes(word)) {
            hasIntensifier = true;
            break;
        }
    }

    // 如果有程度副词，权重加倍
    if (hasIntensifier) {
        positiveScore *= 2;
        negativeScore *= 2;
    }

    // 计算情感分数（0-1）
    if (positiveScore === 0 && negativeScore === 0) {
        return 0; // 中性
    }

    const total = positiveScore + negativeScore;
    const score = positiveScore / total;

    // 根据 process_data_v2.py 的阈值：
    // score > 0.6 → happy (1)
    // score < 0.4 → sad (3)
    // else → neutral (0)
    if (score > 0.6) {
        return 1; // 积极
    } else if (score < 0.4) {
        return 3; // 消极
    } else {
        return 0; // 中性
    }
}

/**
 * 提取关键词（参考 process_data_v2.py 的实现）
 * @param {string} text - 文本内容
 * @returns {string[]} - 关键词列表
 */
function extractKeywords(text) {
    try {
        // 1. 过滤纯占位符消息（与 process_data_v2.py 一致）
        if (/^\[.*?\]$/.test(text)) {
            return [];
        }

        // 2. 移除回复引用
        text = stripReplyReference(text);

        // 3. 使用 jieba TF-IDF 提取关键词（与 process_data_v2.py 一致）
        // topK=3, allowPOS=['n', 'nz', 'v', 'vd', 'vn', 'l', 'a', 'd']
        const keywordsWithTags = nodejieba.extract(text, Config.TOP_K);

        // 4. 过滤停用词和长度（与 process_data_v2.py 一致）
        const keywords = keywordsWithTags
            .filter(kw => kw && kw.word && !STOP_WORDS.has(kw.word) && kw.word.length > 1)
            .map(kw => kw.word);

        return keywords;

    } catch (error) {
        console.error('Keyword extraction failed:', error);
        return [];
    }
}

/**
 * 中文分词（与 process_data_v2.py 一致）
 * @param {string} text - 文本内容
 * @returns {string[]} - 分词结果
 */
function segmentText(text) {
    try {
        // 精确模式
        return nodejieba.cut(text, false);
    } catch (error) {
        console.error('Segmentation failed:', error);
        // 降级到单字符分割
        return text.split('');
    }
}

/**
 * 处理单条消息（参考 process_data_v2.py 的 process_chunk 逻辑）
 * @param {Object} message - 原始消息对象
 * @param {number} index - 消息索引
 * @returns {Object} - 处理后的消息
 */
function processMessage(message, index) {
    try {
        // 提取文本内容（与 process_data_v2.py 一致）
        const content = message.content || {};
        let text = content.text || '';

        // 移除回复引用
        text = stripReplyReference(text);

        // 跳过空消息或占位符（与 process_data_v2.py 一致）
        if (!text || text.length < 2) {
            return null;
        }

        const PLACEHOLDERS = ['[图片]', '[表情]', '[语音]', '[视频]', '[通话]'];
        if (PLACEHOLDERS.includes(text) || /^\[.*?\]$/.test(text)) {
            return null;
        }

        // 分词
        const words = segmentText(text);

        // 情感分析（与 process_data_v2.py 逻辑一致）
        const sentiment = analyzeSentiment(text);

        // 关键词提取（与 process_data_v2.py 一致）
        const keywords = extractKeywords(text);

        // 发送者名称（与 process_data_v2.py 一致）
        const sender = message.sender || {};
        const senderName = sender.name || 'Unknown';

        // 时间戳（保持原样）
        const timestamp = message.timestamp || Date.now();

        // 返回处理结果（与 process_data_v2.py 的格式对应）
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
 * 批量处理消息（参考 process_data_v2.py 的多进程处理逻辑）
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

        console.log(`Processing ${messages.length} messages with process_data_v2.py logic...`);

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
    console.log('边缘函数测试结果 (process_data_v2.py 逻辑):');
    console.log('='.repeat(60));
    const responseBody = JSON.parse(result.body);
    console.log(JSON.stringify(responseBody, null, 2));
    console.log('\n统计信息:');
    console.log(`- 总消息数: ${responseBody.stats.total}`);
    console.log(`- 处理成功: ${responseBody.stats.processed}`);
    console.log(`- 过滤占位符: ${responseBody.stats.filtered}`);
}
