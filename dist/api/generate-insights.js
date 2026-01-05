"use strict";
// functions/api/generate-insights.ts
// 洞察报告生成边缘函数
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
async function handler(event, context) {
    // 处理 OPTIONS 预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            isBase64Encoded: false,
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }
    // 只允许 POST 请求
    if (event.httpMethod !== 'POST') {
        return {
            isBase64Encoded: false,
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed'
            })
        };
    }
    try {
        console.log('开始生成洞察报告...');
        // 在边缘函数环境中，我们需要从 COS 或其他存储服务加载数据
        // 这里我们假设数据已经通过 data.js 预加载，或者需要用户提供数据路径
        // 为了简化，我们返回一个提示，说明需要先准备数据
        // 生成示例洞察（实际应该从数据加载）
        const insights = {
            basic_stats: {
                total_messages: 0,
                date_range: {
                    start: new Date().toISOString(),
                    end: new Date().toISOString()
                },
                unique_senders: 0,
                top_senders: []
            },
            time_analysis: {
                hourly: new Array(24).fill(0),
                daily: new Array(7).fill(0),
                peak_hour: 0,
                peak_day: 0
            },
            sentiment: {
                overall: {
                    positive: 0,
                    neutral: 0,
                    negative: 0
                }
            },
            keywords: {
                top_keywords: [],
                total_unique_words: 0
            },
            special_moments: {
                most_active_day: {
                    date: '',
                    count: 0
                },
                longest_message: {
                    text: '',
                    length: 0
                }
            },
            user_tags: []
        };
        console.log('洞察生成完成');
        return {
            isBase64Encoded: false,
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: '洞察报告生成成功',
                data: insights,
                note: '当前为简化版本，完整功能需要配置数据存储服务'
            })
        };
    }
    catch (error) {
        console.error('生成洞察失败:', error);
        return {
            isBase64Encoded: false,
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message || '生成洞察失败'
            })
        };
    }
}
// 导出 handler（阿里云云函数标准格式）
exports.default = { handler };
// ==================== 辅助函数 ====================
function extractMessages(chatData) {
    const messages = [];
    for (const msg of chatData.messages) {
        // [id, sender_id, timestamp, text, sentiment, keywords]
        if (Array.isArray(msg) && msg.length >= 4) {
            messages.push({
                id: msg[0],
                sender_id: msg[1],
                timestamp: msg[2],
                text: msg[3],
                sentiment: msg[4] || 0,
                keywords: msg[5] || []
            });
        }
    }
    return messages;
}
function analyzeBasicStats(messages) {
    const senderCounts = new Map();
    for (const msg of messages) {
        senderCounts.set(msg.sender_id, (senderCounts.get(msg.sender_id) || 0) + 1);
    }
    const topSenders = Array.from(senderCounts.entries())
        .map(([id, count]) => ({ name: `用户${id}`, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    const timestamps = messages.map(m => m.timestamp).filter(t => t > 0);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    return {
        total_messages: messages.length,
        date_range: {
            start: new Date(minTime * 1000).toISOString(),
            end: new Date(maxTime * 1000).toISOString()
        },
        unique_senders: senderCounts.size,
        top_senders: topSenders
    };
}
function analyzeTimePatterns(messages) {
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);
    for (const msg of messages) {
        if (msg.timestamp > 0) {
            const date = new Date(msg.timestamp * 1000);
            hourly[date.getHours()]++;
            daily[date.getDay()]++;
        }
    }
    const peak_hour = hourly.indexOf(Math.max(...hourly));
    const peak_day = daily.indexOf(Math.max(...daily));
    return {
        hourly,
        daily,
        peak_hour,
        peak_day
    };
}
function analyzeSentiment(messages) {
    let positive = 0, negative = 0, neutral = 0;
    for (const msg of messages) {
        switch (msg.sentiment) {
            case 1:
                positive++;
                break;
            case 3:
                negative++;
                break;
            default:
                neutral++;
                break;
        }
    }
    const total = positive + negative + neutral;
    return {
        overall: {
            positive: total > 0 ? Math.round((positive / total) * 1000) / 10 : 0,
            neutral: total > 0 ? Math.round((neutral / total) * 1000) / 10 : 0,
            negative: total > 0 ? Math.round((negative / total) * 1000) / 10 : 0
        }
    };
}
function extractKeywords(messages) {
    const wordCounts = new Map();
    // 使用浏览器原生 Intl.Segmenter（边缘函数环境支持）
    // @ts-ignore - Intl.Segmenter 在边缘函数环境中可用
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    for (const msg of messages) {
        const segments = segmenter.segment(msg.text);
        for (const { segment, isWordLike } of segments) {
            if (isWordLike && segment.length >= 2) {
                wordCounts.set(segment, (wordCounts.get(segment) || 0) + 1);
            }
        }
    }
    const topKeywords = Array.from(wordCounts.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
    return {
        top_keywords: topKeywords,
        total_unique_words: wordCounts.size
    };
}
function findSpecialMoments(messages) {
    // 按日期统计消息数
    const dailyCount = new Map();
    for (const msg of messages) {
        if (msg.timestamp > 0) {
            const date = new Date(msg.timestamp * 1000).toDateString();
            dailyCount.set(date, (dailyCount.get(date) || 0) + 1);
        }
    }
    const mostActiveDayEntry = Array.from(dailyCount.entries())
        .sort((a, b) => b[1] - a[1])[0];
    // 找最长的消息
    const longestMessage = messages
        .filter(m => m.text && m.text.length > 0)
        .sort((a, b) => b.text.length - a.text.length)[0];
    return {
        most_active_day: {
            date: mostActiveDayEntry ? mostActiveDayEntry[0] : '',
            count: mostActiveDayEntry ? mostActiveDayEntry[1] : 0
        },
        longest_message: {
            text: longestMessage ? longestMessage.text.substring(0, 100) + '...' : '',
            length: longestMessage ? longestMessage.text.length : 0
        }
    };
}
function generateUserTags(messages) {
    const tags = [];
    // 基于活跃度生成标签
    const senderCounts = new Map();
    for (const msg of messages) {
        senderCounts.set(msg.sender_id, (senderCounts.get(msg.sender_id) || 0) + 1);
    }
    const avgCount = messages.length / senderCounts.size;
    for (const [id, count] of senderCounts.entries()) {
        if (count > avgCount * 2) {
            tags.push(`用户${id}: 活跃达人`);
        }
        else if (count < avgCount * 0.3) {
            tags.push(`用户${id}: 潜水员`);
        }
    }
    return tags;
}
