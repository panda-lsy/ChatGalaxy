#!/usr/bin/env python3
"""
数据脱敏脚本 - 将真实聊天数据转换为示例数据
用于 ChatGalaxy 展示
"""

import json
import random
from datetime import datetime, timedelta

# 示例用户名（匿名化）
EXAMPLE_USERS = [
    "Alice", "Bob", "Charlie", "Diana", "Eve",
    "Frank", "Grace", "Henry", "Ivy", "Jack",
    "Kate", "Liam", "Mia", "Noah", "Olivia",
    "Peter", "Quinn", "Rose", "Sam", "Tina"
]

# 示例消息模板
EXAMPLE_MESSAGES = [
    "大家好！",
    "这个功能太棒了！",
    "我同意你的看法。",
    "有时间一起讨论一下？",
    "已完成，请查收。",
    "这个问题很有趣。",
    "感谢分享！",
    "明白了，谢谢。",
    "我来帮你看看。",
    "这个想法不错！",
    "让我试试。",
    "好的，我知道了。",
    "期待明天的活动！",
    "加油！",
    "支持支持！",
    "这个设计很棒。",
    "学到了很多。",
    "继续努力！",
    "有进展了！",
    "收到，谢谢提醒。",
    "这个建议很有帮助。",
    "我来分享一下。",
    "非常好用。",
    "推荐给大家！",
    "效率提升了。",
    "结果很满意。",
    "辛苦了！",
    "合作愉快！",
    "期待后续更新。",
    "这个工具真好用。"
]

def anonymize_sender_id(original_id: int, index: int) -> int:
    """匿名化发送者ID，保持一致性"""
    return (original_id % 1000) + 1000

def anonymize_name(name: str, user_map: dict) -> str:
    """匿名化用户名"""
    if name not in user_map:
        user_map[name] = EXAMPLE_USERS[len(user_map) % len(EXAMPLE_USERS)]
    return user_map[name]

def anonymize_message(text: str, keywords: list) -> tuple:
    """匿名化消息内容"""
    # 随机选择一条示例消息
    new_text = random.choice(EXAMPLE_MESSAGES)

    # 生成示例关键词（从消息中提取）
    words = new_text.split()
    new_keywords = [w for w in words if len(w) >= 2][:3]

    return new_text, new_keywords

def anonymize_sentiment(original: int) -> int:
    """保持情感倾向的分布"""
    return original

def anonymize_timestamp(original: float, index: int, base_time: float) -> float:
    """生成合理的时间戳"""
    # 在原时间基础上调整，保持相对顺序
    time_variation = random.randint(60, 3600)  # 1分钟到1小时
    return base_time + (index * time_variation)

def main():
    print("[*] 开始数据脱敏...")

    # 读取原始数据
    print("[*] 读取原始数据...")
    with open('js/data.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取 JSON 数据（去掉 window.CHAT_DATA = 和末尾的 ;）
    print("[*] 解析数据结构...")
    data_start = content.find('{')
    data_end = content.rfind('}') + 1
    json_content = content[data_start:data_end]
    data_json = json.loads(json_content)

    # 初始化用户映射
    user_map = {}
    sender_id_map = {}

    # 获取发送者列表
    original_senders = data_json.get('meta', {}).get('senders', [])
    print(f"[+] 发现 {len(original_senders)} 个用户")

    # 匿名化发送者列表
    anonymized_senders = []
    for i, sender in enumerate(original_senders[:20]):  # 限制为20个示例用户
        new_name = anonymize_name(str(sender), user_map)
        anonymized_senders.append(new_name)

    # 更新发送者映射
    new_user_map = {}
    for old_name, new_name in user_map.items():
        try:
            old_index = original_senders.index(old_name)
            new_index = anonymized_senders.index(new_name)
            new_user_map[old_index] = new_index
        except ValueError:
            pass

    print(f"[+] 匿名化为 {len(anonymized_senders)} 个示例用户")

    # 处理消息
    print("[*] 处理消息数据...")
    original_messages = data_json.get('messages', [])

    # 限制消息数量（示例数据不需要太多）
    max_messages = min(1000, len(original_messages))
    selected_messages = original_messages[:max_messages]

    anonymized_messages = []
    base_timestamp = datetime(2025, 1, 1).timestamp()

    for i, msg in enumerate(selected_messages):
        if not isinstance(msg, list) or len(msg) < 4:
            continue

        # msg 结构: [id, sender_id, timestamp, text, sentiment, keywords]
        msg_id = i
        original_sender_id = msg[1]

        # 映射发送者ID
        new_sender_id = new_user_map.get(original_sender_id, 0)

        # 生成时间戳
        new_timestamp = base_timestamp + (i * random.randint(60, 600))

        # 匿名化消息内容
        new_text, new_keywords = anonymize_message(msg[3], msg[5] if len(msg) > 5 else [])

        # 保持情感
        sentiment = msg[4] if len(msg) > 4 else 0

        anonymized_msg = [msg_id, new_sender_id, new_timestamp, new_text, sentiment, new_keywords]
        anonymized_messages.append(anonymized_msg)

    print(f"[+] 处理了 {len(anonymized_messages)} 条消息")

    # 处理排名数据（关键词）
    print("[*] 处理关键词排名...")
    anonymized_ranking = []

    # 创建示例关键词
    example_keywords = [
        "功能", "使用", "体验", "效率", "工具",
        "分享", "学习", "讨论", "合作", "支持",
        "帮助", "建议", "感谢", "推荐", "满意"
    ]

    for i, keyword in enumerate(example_keywords[:50]):
        count = random.randint(20, 500)
        anonymized_ranking.append({
            "name": keyword,
            "count": count
        })

    print(f"[+] 生成了 {len(anonymized_ranking)} 个示例关键词")

    # 处理布局数据
    print("[*] 处理布局数据...")
    original_layout = data_json.get('layout', {})
    anonymized_layout = {
        "layout_radius": original_layout.get('layout_radius', 414),
        "star_min": original_layout.get('star_min', 621),
        "star_max": original_layout.get('star_max', 1656),
        "max_node_value": 500  # 调整为示例数据的最大值
    }

    # 构建最终的匿名化数据
    print("[*] 构建最终数据...")
    anonymized_data = {
        "meta": {
            "senders": anonymized_senders,
            "sentiment_map": {
                "0": "neutral",
                "1": "happy",
                "2": "question",
                "3": "sad"
            }
        },
        "layout": anonymized_layout,
        "ranking": anonymized_ranking,
        "messages": anonymized_messages
    }

    # 生成新的 data.js
    print("[*] 生成匿名化数据文件...")
    output_content = f"window.CHAT_DATA = {json.dumps(anonymized_data, ensure_ascii=False, indent=2)};"

    # 备份原始文件
    import shutil
    shutil.copy('js/data.js', 'js/data.js.backup')
    print("[+] 原始文件已备份到 data.js.backup")

    # 写入新文件
    with open('js/data.js', 'w', encoding='utf-8') as f:
        f.write(output_content)

    print(f"[+] 匿名化数据已写入 js/data.js")
    print()
    print("[*] 数据统计：")
    print(f"  - 用户数: {len(anonymized_senders)}")
    print(f"  - 消息数: {len(anonymized_messages)}")
    print(f"  - 关键词数: {len(anonymized_ranking)}")
    print()
    print("[+] 数据脱敏完成!")
    print()
    print("[!] 注意：")
    print("  - 原始数据已备份到 js/data.js.backup")
    print("  - 新数据为匿名化示例数据")
    print("  - 所有用户名和消息内容已替换")
    print("  - 保留了数据结构和统计特征")

if __name__ == "__main__":
    main()
