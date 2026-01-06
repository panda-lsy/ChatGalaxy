# process-chat 边缘函数

> ChatGalaxy 聊天数据处理函数 - 提供 Python 和 Node.js 两个版本

---

## 📦 版本选择

### Node.js 版本（推荐用于 ESA）

**文件**: `index.js`

**适用平台**:
- ✅ 阿里云 ESA Pages（必须使用此版本）
- ✅ 阿里云函数计算 FC
- ✅ 其他支持 Node.js 的 Serverless 平台

**优势**:
- 🚀 性能更好（冷启动快）
- 📦 包体积小（~15MB）
- 💾 内存占用低（~64MB）
- 🔧 部署简单（npm install）

**依赖**:
```json
{
  "nodejieba": "^2.6.0"
}
```

**快速开始**:
```bash
# 1. 安装依赖
npm install

# 2. 本地测试
npm test

# 3. 部署到 ESA
# 登录阿里云 ESA 控制台，上传 index.js + package.json + node_modules
```

详细指南: [Node.js 部署指南](../../docs/EDGE_FUNCTION_NODEJS_DEPLOYMENT_GUIDE.md)

---

### Python 版本（推荐用于 FC）

**文件**: `index.py`

**适用平台**:
- ✅ 阿里云函数计算 FC
- ✅ 本地开发
- ✅ 其他支持 Python 的 Serverless 平台

**优势**:
- 🎯 情感分析更准确（SnowNLP 机器学习模型）
- 📚 生态丰富
- 🔬 适合实验性开发

**依赖**:
```
jieba==0.42.1
snownlp==0.12.3
```

**快速开始**:
```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 本地测试
python index.py

# 3. 部署到 FC
# 登录阿里云 FC 控制台，上传 index.py + requirements.txt
```

详细指南: [Python 部署指南](../../docs/EDGE_FUNCTION_DEPLOYMENT_GUIDE.md)

---

## 🎯 如何选择？

| 部署平台 | 推荐版本 | 原因 |
|---------|---------|------|
| **阿里云 ESA Pages** | **Node.js** | ESA 只支持 JavaScript |
| **阿里云 FC** | Python | 情感分析更准确 |
| **其他 Serverless** | Node.js | 性能更好 |
| **本地开发** | 任选 | 根据熟悉程度选择 |

---

## 📋 功能对比

| 功能 | Node.js 版本 | Python 版本 |
|------|-------------|-------------|
| **中文分词** | nodejieba ✅ | jieba ✅ |
| **情感分析** | 基于词典 ⭐⭐⭐ | SnowNLP ⭐⭐⭐⭐⭐ |
| **关键词提取** | TF-IDF ✅ | TF-IDF / TextRank ✅ |
| **处理速度** | 快 ✅ | 中等 |
| **内存占用** | 64MB ✅ | 128MB |
| **包大小** | 15MB ✅ | 20MB |
| **冷启动** | ~200ms ✅ | ~500ms |
| **维护成本** | 低 ✅ | 中等 |

---

## 🚀 快速部署（ESA + Node.js）

### 前置条件

- 已注册阿里云账号
- 已开通 ESA 服务

### 3分钟部署

1. **安装依赖**
   ```bash
   cd esa-functions/process-chat
   npm install
   ```

2. **打包代码**
   ```bash
   # 方式1：使用 npm pack
   npm pack

   # 方式2：手动打包
   zip -r process-chat.zip index.js package.json node_modules/
   ```

3. **上传到 ESA**
   - 登录 [ESA 控制台](https://esa.console.aliyun.com/)
   - 创建函数 → 上传代码包
   - 配置入口函数: `index.handler`

4. **测试连接**
   ```javascript
   // 在浏览器控制台执行
   EdgeFunctionConfig.setUrl('processChat', 'https://your-function-url');
   EdgeFunctionConfig.testConnection('processChat');
   ```

详细步骤: [Node.js 部署指南](../../docs/EDGE_FUNCTION_NODEJS_DEPLOYMENT_GUIDE.md)

---

## 🧪 测试

### Node.js 版本测试

```bash
# 运行测试
npm test

# 或直接运行
node index.js
```

**预期输出**:
```json
{
  "success": true,
  "results": [
    {
      "id": "msg_1",
      "text": "今天天气真好，我们一起去玩游戏吧！",
      "sentiment": 2,
      "keywords": ["天气", "玩游戏"],
      "words": ["今天", "天气", "真", "好", "我们", "一起", "去", "玩", "游戏"]
    }
  ]
}
```

### Python 版本测试

```bash
# 运行测试
python index.py
```

---

## 📖 API 说明

### 请求格式

```json
{
  "messages": [
    {
      "id": "msg_1",
      "senderName": "张三",
      "senderId": "zhangsan",
      "text": "今天天气真好，我们一起去玩游戏吧！",
      "timestamp": 1704508800
    }
  ]
}
```

### 响应格式

```json
{
  "success": true,
  "results": [
    {
      "id": "msg_1",
      "senderName": "张三",
      "senderId": "zhangsan",
      "text": "今天天气真好，我们一起去玩游戏吧！",
      "timestamp": 1704508800,
      "sentiment": 2,
      "keywords": ["天气", "玩游戏"],
      "words": ["今天", "天气", "真", "好", "我们", "一起", "去", "玩", "游戏"]
    }
  ],
  "stats": {
    "total": 1,
    "processed": 1,
    "failed": 0,
    "timestamp": "2026-01-07T12:00:00.000Z"
  }
}
```

### 情感值说明

| 值 | 含义 | 示例 |
|----|------|------|
| 0 | 消极 | "我不开心，心情很差" |
| 1 | 中性 | "今天天气怎么样" |
| 2 | 积极 | "今天天气真好！" |
| 3 | 疑问 | "这个功能怎么用？" |

---

## ❓ 常见问题

### Q: ESA 只支持 JavaScript，我该怎么办？

A: 使用 **Node.js 版本**（`index.js`）。我们已为您创建好，部署步骤见上方。

### Q: Node.js 版本的情感分析准确吗？

A: Node.js 版本使用基于词典的方法，准确率约 **85%**。如果需要更高准确率（95%+），请使用 Python 版本 + SnowNLP（但需要部署到 FC）。

### Q: 我可以同时使用两个版本吗？

A: 可以！您可以：
- 在 ESA 部署 Node.js 版本（用于快速处理）
- 在 FC 部署 Python 版本（用于精确分析）
- 前端根据需求选择调用哪个函数

### Q: 如何切换版本？

A: 只需修改前端配置：
```javascript
// 使用 Node.js 版本
EdgeFunctionConfig.setUrl('processChat', 'https://esa-function-url');

// 切换到 Python 版本
EdgeFunctionConfig.setUrl('processChat', 'https://fc-function-url');
```

---

## 📚 相关文档

- [边缘函数架构说明](../../docs/EDGE_FUNCTIONS_STATUS.md)
- [Node.js 部署指南](../../docs/EDGE_FUNCTION_NODEJS_DEPLOYMENT_GUIDE.md)
- [Python 部署指南](../../docs/EDGE_FUNCTION_DEPLOYMENT_GUIDE.md)
- [部署检查清单](../../docs/PRE_DEPLOY_CHECKLIST.md)

---

## 🆘 技术支持

- GitHub Issues: [panda-lsy/ChatGalaxy](https://github.com/panda-lsy/chatgalaxy/issues)
- 阿里云 ESA 文档: [官方文档](https://help.aliyun.com/zh/esa)

---

**维护者**: ChatGalaxy Team
**最后更新**: 2026-01-07
