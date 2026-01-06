"""
ChatGalaxy 聊天数据处理边缘函数
部署在阿里云 ESA (Edge Script Functions)

功能：
- jieba 精确分词
- SnowNLP 情感分析
- TF-IDF 关键词提取
- 批量处理支持

作者: ChatGalaxy Team
版本: 1.0.0
日期: 2026-01-07
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 尝试导入依赖（边缘函数环境）
try:
    import jieba
    import jieba.analyse
    from snownlp import SnowNLP
    DEPENDENCIES_AVAILABLE = True
    logger.info("Dependencies loaded successfully")
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    logger.warning(f"Dependencies not available: {e}")


# ========== 配置 ==========

class Config:
    """边缘函数配置"""

    # 分词设置
    JIEBA_MODE = '精确模式'  # 精确模式 | 全模式 | 搜索引擎模式
    CUT_ALL = False  # 是否全模式

    # 关键词提取设置
    KEYWORD_EXTRACTION = 'TF-IDF'  # TF-IDF | TextRank
    TOP_K = 5  # 提取前N个关键词
    WITH_WEIGHT = True  # 是否返回权重

    # 情感分析设置
    SENTIMENT_THRESHOLD = {
        'negative': 0.3,  # < 0.3 为消极
        'question': 0.5,  # 0.3 - 0.5 为疑问
        'neutral': 0.7,   # 0.5 - 0.7 为中性
        'positive': 1.0   # > 0.7 为积极
    }

    # 批处理设置
    BATCH_SIZE = 100
    MAX_MESSAGES = 10000


# ========== 工具函数 ==========

def analyze_sentiment(score: float) -> int:
    """
    转换情感分数为分类标签

    Args:
        score: SnowNLP 情感分数 (0-1)

    Returns:
        int: 情感标签 (0=消极, 1=中性, 2=积极, 3=疑问)
    """
    if score < Config.SENTIMENT_THRESHOLD['negative']:
        return 0  # 消极
    elif score < Config.SENTIMENT_THRESHOLD['question']:
        return 3  # 疑问
    elif score < Config.SENTIMENT_THRESHOLD['neutral']:
        return 1  # 中性
    else:
        return 2  # 积极


def extract_keywords(text: str, top_k: int = Config.TOP_K) -> List[str]:
    """
    提取关键词

    Args:
        text: 文本内容
        top_k: 提取前N个关键词

    Returns:
        List[str]: 关键词列表
    """
    if not DEPENDENCIES_AVAILABLE:
        return []

    try:
        if Config.KEYWORD_EXTRACTION == 'TF-IDF':
            # 使用 TF-IDF 算法
            keywords = jieba.analyse.extract_tags(
                text,
                topK=top_k,
                withWeight=Config.WITH_WEIGHT
            )
            return [kw[0] for kw in keywords] if Config.WITH_WEIGHT else keywords
        else:
            # 使用 TextRank 算法
            keywords = jieba.analyse.textrank(
                text,
                topK=top_k,
                withWeight=Config.WITH_WEIGHT
            )
            return [kw[0] for kw in keywords] if Config.WITH_WEIGHT else keywords
    except Exception as e:
        logger.error(f"Keyword extraction failed: {e}")
        return []


def segment_text(text: str) -> List[str]:
    """
    中文分词

    Args:
        text: 文本内容

    Returns:
        List[str]: 分词结果
    """
    if not DEPENDENCIES_AVAILABLE:
        return list(text)  # 降级到单字符分割

    try:
        if Config.CUT_ALL:
            return list(jieba.cut(text, cut_all=True))
        else:
            return list(jieba.cut(text, cut_all=False))
    except Exception as e:
        logger.error(f"Segmentation failed: {e}")
        return list(text)


def process_message(message: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理单条消息

    Args:
        message: 原始消息对象

    Returns:
        Dict[str, Any]: 处理后的消息
    """
    try:
        # 提取文本内容
        text = message.get('text', '')

        # 分词
        words = segment_text(text)

        # 情感分析
        if DEPENDENCIES_AVAILABLE:
            try:
                s = SnowNLP(text)
                sentiment_score = s.sentiments
                sentiment = analyze_sentiment(sentiment_score)
            except Exception as e:
                logger.warning(f"Sentiment analysis failed for message {message.get('id')}: {e}")
                sentiment = 1  # 默认中性
        else:
            sentiment = 1  # 默认中性

        # 关键词提取
        keywords = extract_keywords(text)

        # 返回处理结果
        return {
            'id': message.get('id'),
            'senderName': message.get('senderName'),
            'senderId': message.get('senderId'),
            'text': text,
            'timestamp': message.get('timestamp'),
            'sentiment': sentiment,
            'keywords': keywords,
            'words': words[:20]  # 只保留前20个词，减少数据量
        }

    except Exception as e:
        logger.error(f"Failed to process message {message.get('id')}: {e}")
        # 返回原始数据，带有默认的情感值
        return {
            'id': message.get('id'),
            'senderName': message.get('senderName'),
            'senderId': message.get('senderId'),
            'text': message.get('text', ''),
            'timestamp': message.get('timestamp'),
            'sentiment': 1,  # 默认中性
            'keywords': [],
            'words': [],
            'error': str(e)
        }


def process_messages_batch(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    批量处理消息

    Args:
        messages: 消息列表

    Returns:
        List[Dict[str, Any]]: 处理后的消息列表
    """
    results = []

    for i, message in enumerate(messages):
        # 每处理100条记录一次日志
        if i % 100 == 0:
            logger.info(f"Processing message {i + 1}/{len(messages)}")

        result = process_message(message)
        results.append(result)

    logger.info(f"Completed processing {len(results)} messages")
    return results


# ========== 边缘函数入口 ==========

def handler(event):
    """
    边缘函数入口

    Args:
        event: ESA 边缘函数事件对象
            - body: JSON 字符串，包含 messages 数组
            - headers: HTTP 请求头

    Returns:
        Dict: 响应对象
            - statusCode: HTTP 状态码
            - body: JSON 字符串
            - headers: 响应头
    """
    try:
        # 解析请求
        if isinstance(event, str):
            body = json.loads(event)
        elif hasattr(event, 'body'):
            body = json.loads(event.body)
        else:
            body = event

        messages = body.get('messages', [])

        if not messages:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'success': False,
                    'error': 'No messages provided'
                }),
                'headers': {
                    'Content-Type': 'application/json'
                }
            }

        # 检查消息数量限制
        if len(messages) > Config.MAX_MESSAGES:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'success': False,
                    'error': f'Too many messages. Maximum {Config.MAX_MESSAGES} allowed.'
                }),
                'headers': {
                    'Content-Type': 'application/json'
                }
            }

        logger.info(f"Processing {len(messages)} messages...")

        # 检查依赖是否可用
        if not DEPENDENCIES_AVAILABLE:
            logger.warning("Dependencies not available, using fallback processing")
            # 降级模式：只返回原始数据
            results = [{
                'id': msg.get('id'),
                'senderName': msg.get('senderName'),
                'text': msg.get('text', ''),
                'timestamp': msg.get('timestamp'),
                'sentiment': 1,  # 默认中性
                'keywords': [],
                'warning': 'Dependencies not available, using fallback'
            } for msg in messages]
        else:
            # 正常模式：使用 NLP 处理
            results = process_messages_batch(messages)

        # 返回结果
        response = {
            'success': True,
            'results': results,
            'stats': {
                'total': len(results),
                'processed': len([r for r in results if 'error' not in r]),
                'failed': len([r for r in results if 'error' in r]),
                'timestamp': datetime.now().isoformat()
            }
        }

        return {
            'statusCode': 200,
            'body': json.dumps(response, ensure_ascii=False),
            'headers': {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            }
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps({
                'success': False,
                'error': 'Invalid JSON format'
            }),
            'headers': {
                'Content-Type': 'application/json'
            }
        }

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            }),
            'headers': {
                'Content-Type': 'application/json'
            }
        }


# ========== 测试代码 ==========

if __name__ == '__main__':
    """本地测试"""
    test_messages = [
        {
            'id': 'msg_1',
            'senderName': '张三',
            'senderId': 'zhangsan',
            'text': '今天天气真好，我们一起去玩游戏吧！',
            'timestamp': 1704508800
        },
        {
            'id': 'msg_2',
            'senderName': '李四',
            'text': '这个功能怎么用？有人能帮我吗？',
            'timestamp': 1704508860
        },
        {
            'id': 'msg_3',
            'senderName': '王五',
            'text': '我不开心，心情很差。',
            'timestamp': 1704508920
        }
    ]

    # 模拟事件
    test_event = {
        'body': json.dumps({'messages': test_messages})
    }

    # 执行处理
    result = handler(test_event)

    # 打印结果
    print("=" * 60)
    print("边缘函数测试结果:")
    print("=" * 60)
    print(json.dumps(json.loads(result['body']), indent=2, ensure_ascii=False))
