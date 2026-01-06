import json
import os
import re
import math
from collections import Counter, defaultdict
import jieba
import jieba.analyse
from snownlp import SnowNLP
import time
from datetime import datetime
from multiprocessing import Pool, cpu_count

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, "..", "data.json")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "js", "data.js") # Output to js folder

# Limit to None (process all)
MAX_MESSAGES = None 

# python chat_viz/process_data_v2.py
STOP_WORDS = {
    "图片", "表情", "语音", "视频", "通话", "位置", "文件", "引用",
    "现在", "可以", "知道", "觉得", "感觉", "时候", "什么", "怎么",
    "因为", "所以", "虽然", "但是", "如果", "就是", "还是", "那个",
    "这个", "一个", "一下", "一点", "一些", "已经", "可能", "真的",
    "没有", "不是", "不用", "不要", "不好", "不行", "不错", "好吧",
    "好的", "收到", "嗯嗯", "哈哈", "嘻嘻", "呵呵", "哦哦", "嘿嘿",
    "ok", "OK", "Ok", "http", "https", "www", "com", "cn"
}

# Strip inline reply markers like "[回复 XXX]" from message text
REPLY_PATTERN = re.compile(r"\[回复[^\]]*\]")


def strip_reply_reference(text: str) -> str:
    """Remove inline reply bracketed segments and trim whitespace."""
    if not text:
        return text
    cleaned = REPLY_PATTERN.sub("", text)
    return cleaned.strip()

def load_data(filepath):
    if not os.path.exists(filepath):
        print(f"Error: File not found at {filepath}")
        return None
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def parse_timestamp(ts_str):
    if not ts_str or ts_str == "None":
        return 0

    # 如果是数字（字符串形式），直接转换
    try:
        ts_val = float(ts_str)
        # 判断是毫秒还是秒
        if ts_val > 1000000000000:  # 毫秒
            return ts_val / 1000
        else:  # 秒
            return ts_val
    except:
        pass

    # 处理ISO格式字符串
    formats = [
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S.%f',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d',
    ]

    for fmt in formats:
        try:
            # 处理Z后缀
            clean_str = ts_str
            if clean_str.endswith('Z'):
                clean_str = clean_str[:-1]
            dt = datetime.strptime(clean_str, fmt)
            return dt.timestamp()
        except:
            continue

    # 所有方法都失败
    print(f"Warning: Unable to parse timestamp: {ts_str}")
    return 0

def get_sentiment(text):
    # Rule-based check for questions
    if any(x in text for x in ["?", "？", "什么", "怎么", "为何", "what", "how"]):
        return 2 # question
        
    try:
        # Optimization: Skip SnowNLP for very short texts if they don't have obvious keywords
        # But for quality we keep it.
        s = SnowNLP(text)
        score = s.sentiments
        if score > 0.6:
            return 1 # happy
        elif score < 0.4:
            return 3 # sad
        else:
            return 0 # neutral
    except:
        return 0

def extract_keywords(text):
    # Use jieba TF-IDF to extract keywords
    try:
        # Filter out common placeholders before extraction
        if re.match(r'^\[.*?\]$', text): # Matches [图片], [表情] etc.
            return []
            
        keywords = jieba.analyse.extract_tags(text, topK=3, allowPOS=('n', 'nz', 'v', 'vd', 'vn', 'l', 'a', 'd'))
        # Filter stop words
        keywords = [k for k in keywords if k not in STOP_WORDS and len(k) > 1]
        return keywords
    except:
        return []

def process_chunk(args):
    messages_chunk, start_index = args
    processed_msgs = []
    keyword_occurrences = defaultdict(list)
    senders = set()
    
    for i, msg in enumerate(messages_chunk):
        original_idx = start_index + i
        
        content = msg.get("content", {})
        text = strip_reply_reference(content.get("text", ""))
        
        # Skip empty or placeholder messages
        if not text or len(text) < 2: 
            continue
        if text in ["[图片]", "[表情]", "[语音]", "[视频]", "[通话]"]:
            continue
        if re.match(r'^\[.*?\]$', text):
            continue
            
        sentiment = get_sentiment(text)
        keywords = extract_keywords(text)
        
        sender_name = msg.get("sender", {}).get("name", "Unknown")
        senders.add(sender_name)
        
        # Parse timestamp
        ts_val = parse_timestamp(msg.get("timestamp", ""))

        # Store processed message in compact format
        # [id, sender_name, timestamp, text, sentiment, keywords]
        p_msg = [
            original_idx,
            sender_name,
            ts_val,
            text,
            sentiment,
            keywords
        ]
        processed_msgs.append(p_msg)
        
        for kw in keywords:
            keyword_occurrences[kw].append(len(processed_msgs) - 1)
            
    return processed_msgs, keyword_occurrences, senders

def process_messages_multiprocess(data):
    messages = data.get("messages", [])
    
    if MAX_MESSAGES and len(messages) > MAX_MESSAGES:
        print(f"Data too large ({len(messages)} msgs), processing last {MAX_MESSAGES} messages...")
        messages = messages[-MAX_MESSAGES:]
    
    total_msgs = len(messages)
    print(f"Processing {total_msgs} messages with multiprocessing...")
    
    try:
        num_processes = min(cpu_count(), 8)
    except:
        num_processes = 4
        
    chunk_size = math.ceil(total_msgs / num_processes)
    
    chunks = []
    for i in range(num_processes):
        start = i * chunk_size
        end = min((i + 1) * chunk_size, total_msgs)
        if start >= end: break
        chunks.append((messages[start:end], start))
        
    print(f"Split into {len(chunks)} chunks (approx {chunk_size} msgs each).")
    
    start_time = time.time()
    
    with Pool(processes=num_processes) as pool:
        results = pool.map(process_chunk, chunks)
        
    print(f"Processing finished in {time.time() - start_time:.2f}s. Merging results...")
    
    # Merge results
    final_msgs = []
    final_keywords = defaultdict(list)
    final_senders_set = set()
    
    current_base_index = 0
    
    for msgs, kw_occ, snds in results:
        final_senders_set.update(snds)
        
        for kw, indices in kw_occ.items():
            adjusted_indices = [idx + current_base_index for idx in indices]
            final_keywords[kw].extend(adjusted_indices)
            
        final_msgs.extend(msgs)
        current_base_index += len(msgs)
        
    # Post-process: Map sender names to IDs
    sender_list = sorted(list(final_senders_set))
    sender_map = {name: i for i, name in enumerate(sender_list)}
    
    for msg in final_msgs:
        msg[1] = sender_map.get(msg[1], 0)
        
    print(f"Merged {len(final_msgs)} messages.")
    return final_msgs, final_keywords, sender_list

def build_graph(keyword_occurrences, messages):
    total_msgs = len(messages)
    nodes = []
    links = []
    
    # --- Dynamic Configuration for Large Datasets ---
    
    # 1. Node Count Limit (MAX_NODES)
    # Prevent browser crash by capping nodes. 
    # Growth is very slow (power of 0.25) to handle 10k vs 1M messages.
    # 5k msgs -> ~400 nodes
    # 250k msgs -> ~1000 nodes
    ratio = max(1.0, total_msgs / 5000.0)
    MAX_NODES = int(400 * (ratio ** 0.25))
    MAX_NODES = min(MAX_NODES, 1000) # Hard cap
    
    # 2. Keyword Frequency Threshold (MIN_OCCURRENCE)
    # As data grows, "rare" words become noise.
    # But we shouldn't be too aggressive, or we lose the "long tail" that makes the graph interesting.
    # Previous: total_msgs / 500 -> too high.
    # New: Logarithmic scale or very gentle linear.
    # 5k msgs -> 3
    # 250k msgs -> 10
    MIN_OCCURRENCE = max(3, int(math.log(total_msgs) * 0.8))
    
    # 3. Link Strength Threshold (MIN_LINK_WEIGHT)
    # 5k msgs -> 1
    # 250k msgs -> 5
    MIN_LINK_WEIGHT = max(1, int(math.log(total_msgs) * 0.4))
    
    print(f"Dynamic Config: {total_msgs} msgs -> MaxNodes:{MAX_NODES}, MinFreq:{MIN_OCCURRENCE}, MinLink:{MIN_LINK_WEIGHT}")
    
    # --- Node Generation ---
    
    sorted_keywords = sorted(keyword_occurrences.items(), key=lambda x: len(x[1]), reverse=True)
    
    # Export top 100 for UI ranking
    ui_ranking = [{"name": k, "count": len(v)} for k, v in sorted_keywords[:100]]
    
    # Filter by occurrence
    filtered_keywords = [x for x in sorted_keywords if len(x[1]) >= MIN_OCCURRENCE]
    
    # Take top N
    top_keywords = filtered_keywords[:MAX_NODES]
    
    valid_keywords_set = set(k for k, v in top_keywords)
    
    max_value = 0
    for kw, indices in top_keywords:
        val = len(indices)
        if val > max_value: max_value = val
        
        # Calculate first_seen timestamp
        # indices are indices into messages array
        # messages[idx][2] is timestamp
        timestamps = [messages[idx][2] for idx in indices]
        first_seen = min(timestamps) if timestamps else 0
        
        nodes.append({
            "id": kw,
            "name": kw,
            "value": val,
            "category": "Keyword",
            "first_seen": first_seen
        })
        
    valid_keywords = list(valid_keywords_set)
    print(f"Building graph with {len(valid_keywords)} keywords (Max Val: {max_value})...")
    
    # --- Link Generation ---
    
    link_count = 0
    for i in range(len(valid_keywords)):
        for j in range(i + 1, len(valid_keywords)):
            kw1 = valid_keywords[i]
            kw2 = valid_keywords[j]
            
            msgs1 = set(keyword_occurrences[kw1])
            msgs2 = set(keyword_occurrences[kw2])
            
            intersection = msgs1.intersection(msgs2)
            weight = len(intersection)
            
            if weight >= MIN_LINK_WEIGHT:
                # Calculate link first_seen
                timestamps = [messages[idx][2] for idx in intersection]
                first_seen = min(timestamps) if timestamps else 0
                
                links.append({
                    "source": kw1,
                    "target": kw2,
                    "value": weight,
                    "first_seen": first_seen
                })
                link_count += 1
                
    print(f"Generated {link_count} links.")
    
    # --- Layout Configuration ---
    
    actual_nodes = len(nodes)
    
    # Radius Calculation
    # We want constant surface density on the spherical shell to avoid clumping.
    # Surface Area ~ r^2. Nodes ~ N. 
    # To keep density constant: r^2 ~ N  =>  r ~ sqrt(N)
    
    base_radius = 350
    base_nodes = 400
    
    # Scale radius based on node count relative to base
    scale_factor = (max(actual_nodes, 100) / base_nodes) ** 0.5
    layout_radius = int(base_radius * scale_factor)
    
    # Ensure minimum radius isn't too small
    layout_radius = max(layout_radius, 350)
    
    config = {
        "layout_radius": layout_radius,
        "star_min": int(layout_radius * 1.5), # Stars start further out
        "star_max": int(layout_radius * 4.0),  # Deep space
        "max_node_value": max_value # Pass max value for frontend scaling
    }
                
    return {"nodes": nodes, "links": links, "config": config, "ranking": ui_ranking}

def main():
    print("Loading data...")
    data = load_data(INPUT_FILE)
    if not data:
        return

    print("Processing messages...")
    # Use multiprocessing version
    processed_msgs, keyword_occurrences, sender_list = process_messages_multiprocess(data)
    
    print("Building graph...")
    graph_data = build_graph(keyword_occurrences, processed_msgs)
    
    # Extract config
    graph_config = graph_data.pop("config")
    keyword_ranking = graph_data.pop("ranking")
    
    output_data = {
        "meta": {
            "senders": sender_list,
            "sentiment_map": {0: "neutral", 1: "happy", 2: "question", 3: "sad"},
            "layout": graph_config,
            "ranking": keyword_ranking
        },
        "messages": processed_msgs,
        "graph": graph_data
    }
    
    print(f"Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # Split into chunks if needed, but for now just dump
        json_str = json.dumps(output_data, ensure_ascii=False)
        f.write(f"window.CHAT_DATA = {json_str};")
        
    print(f"Done!")

if __name__ == "__main__":
    main()
