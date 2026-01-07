# ChatGalaxy - 聊天记录智能分析与可视化平台

> **阿里云 ESA Pages 边缘开发大赛参赛作品**
>
> 本项目由[阿里云ESA](https://www.aliyun.com/product/esa)提供加速、计算和保护
>
> ![](https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png)
>
> 将你的聊天记录转化为可探索的 3D 星系宇宙 ✨

---

## 📋 项目简介

**ChatGalaxy** 是一款创新的聊天记录可视化分析平台，通过 3D 星系技术将对话转化为数字宇宙，让每个人都能从日常聊天中发现有趣的故事和洞察。

### 核心特性

- 🌌 **3D 星系可视化** - 关键词化作星辰，对话构成星河
- 📊 **智能洞察报告** - 自动生成年度账单式数据分析
- ⏰ **时间轴回放** - 沉浸式回顾对话历史
- 📦 **多数据集管理** - 支持创建、切换、编辑多个数据集
- 🔗 **数据集分享** - 分享码系统，轻松与好友分享
- ⚡ **双模式处理** - 快速模式 / 精确模式自由选择
- 🎨 **5种主题配色** - 星云紫、深空蓝、浪漫粉、午夜黑
- 🚀 **边缘计算优化** - 基于阿里云 ESA 全球加速

---

## 🌐 在线体验

- **GitHub**: [https://github.com/panda-lsy/chatgalaxy](https://github.com/panda-lsy/chatgalaxy)
- **演示地址**: [https://chatgalaxy.89b52195.er.aliyun-esa.net/](https://chatgalaxy.89b52195.er.aliyun-esa.net/)

---

## 🚀 快速开始

### 方式 1：浏览器导入（推荐新手）

```bash
# 1. 启动本地服务器
npx serve . -p 8000

# 2. 访问数据管理页面
open http://localhost:8000/data-manager.html

# 3. 上传 JSON 文件导入数据集
```

### 方式 2：Python 预处理（适合大数据集）

```bash
# 1. 安装依赖
pip install jieba snownlp numpy pandas

# 2. 数据预处理
python process_data_v2.py

# 3. 启动服务器
npx serve . -p 8000
```

---

## 📥 数据导入指南

### 支持的聊天软件

- ✅ **QQ** - 支持 [QQChatExporter V5](https://github.com/shuakami/qq-chat-exporter) 导出的数据
- ✅ 通用 JSON 格式（自定义格式）
- 🚧 微信（计划中）
- 🚧 Telegram（计划中）

### QQ 数据导入步骤

1. 下载 [QQChatExporter V5](https://github.com/shuakami/qq-chat-exporter)
2. 导出聊天记录为 JSON 格式
3. 在数据管理器中上传导出的文件
4. 系统自动识别并处理数据

### 数据格式要求

```json
{
  "messages": [
    {
      "sender": {"name": "张三"},
      "content": {"text": "大家早上好！"},
      "timestamp": "2024-01-15T09:00:00"
    }
  ]
}
```

---

## 🎨 功能展示

### 1. 主页面 - 3D 星系可视化

- **关键词星球** - 每个关键词是一颗星，大小代表出现频率
- **对话星河** - 星星间的连线表示词语共现关系
- **时间旅行** - 拖动时间轴回顾历史对话
- **交互探索** - 点击星球查看消息，缩放、旋转星系
- **闲置漫游** - 闲置时自动漫游模式，隐藏侧边栏

### 2. 洞察报告 - 年度账单风格

- **聊天活跃度** - 按小时/星期/月份统计
- **情感趋势分析** - 情感曲线和分布
- **关键词热度** - Top 50 关键词排行
- **特殊时刻** - 最活跃的一天、最长消息

### 3. 数据管理器 - v3.0

- **数据集管理** - 创建、切换、删除、编辑数据集
- **智能导入** - 拖拽上传，自动验证和格式转换
- **消息编辑** - 单条编辑，批量操作
- **数据导出** - 导出为 JSON 文件

### 4. 数据集分享 - v3.2

- **创建分享** - 生成分享码，设置权限和有效期
- **导入分享** - 输入分享码，一键导入好友数据
- **访问控制** - 密码保护、过期时间、访问次数限制

---

## ⚙️ 双模式数据处理

### 快速模式（前端处理）

- ✅ 浏览器原生分词（Intl.Segmenter）
- ✅ 适合小数据集（< 1,000 条消息）
- ✅ 秒级响应，无需服务器

### 精确模式（边缘函数）

- ✅ jieba 精确分词
- ✅ SnowNLP 情感分析
- ✅ 适合大数据集
- ✅ 准确率 95%

---

## 🏗️ 技术架构

### 前端技术栈

- **3D 渲染**: Three.js r149 + 3d-force-graph v1.73.1
- **图表展示**: Chart.js v4.4.0
- **UI 框架**: Vanilla JS + Web Components
- **图标库**: RemixIcon v3.5.0

### 边缘计算

- **托管平台**: 阿里云 ESA Pages
- **边缘函数**: Node.js (nodejieba)
- **CDN 加速**: 全球节点，毫秒级响应
- **缓存策略**: 30 天静态资源缓存

### 数据处理

- **本地预处理**: Python 3.x (jieba + SnowNLP)
- **浏览器分词**: Intl.Segmenter API
- **存储方案**: IndexedDB + LocalStorage

---

## 📁 项目结构

```
ChatGalaxy/
├── index.html              # 主页面（3D 星系）
├── insights.html           # 洞察报告
├── intro.html              # 介绍页面
├── data-manager.html       # 数据管理器
│
├── css/                    # 样式文件
│   ├── style.css           # 主样式
│   ├── sidebar.css         # 侧边栏
│   ├── data-manager.css    # 数据管理器
│   └── ...
│
├── js/                     # JavaScript 核心代码
│   ├── app.js              # 主应用逻辑
│   ├── data-manager.js     # 数据集管理器
│   ├── data-import.js      # 数据导入
│   ├── data-share.js       # 数据分享
│   ├── processors/         # 数据处理器
│   ├── workers/            # Web Workers
│   └── ui/                 # UI 组件
│
├── esa-functions/          # 边缘函数
│   └── process-chat/       # Node.js 处理函数
│       ├── index.js        # 函数入口
│       ├── index.py        # Python 版本
│       └── requirements.txt
│
├── process_data_v2.py      # Python 预处理脚本
├── generate_insights.py    # 洞察报告生成
└── test-data/              # 测试数据
```

---

## ⚡ 性能优化

- ✅ 所有脚本使用 `defer` 异步加载
- ✅ Gzip/Brotli 压缩（> 1KB 文件）
- ✅ Web Worker 后台处理
- ✅ 虚拟滚动（大列表优化）
- ✅ 分层缓存策略
- ✅ CDN 静态资源加速

---

## 🔧 配置说明

### 边缘函数配置

在数据管理器中配置边缘函数 URL：

```javascript
// 配置示例
window.EdgeFunctionConfig.setUrl('processChat', 'https://your-function-url');
```

### 主题配色

支持 4 种主题，可在设置中切换：

- 💜 **星云紫** (默认) - 神秘梦幻
- 🌌 **深空蓝** - 科技感
- 💖 **浪漫粉** - 温暖可爱
- 🌑 **午夜黑** - 极简黑白

---

## 📊 版本历史

- **v3.2** (2026-01-07) - 数据集分享功能
- **v3.1** (2026-01-07) - 边缘函数集成，双模式处理
- **v3.0** (2026-01-06) - 数据集管理系统
- **v2.0** - 时间轴回放，视觉增强
- **v1.0** - 初始版本，基础 3D 可视化

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件

---

## 👥 团队

**深山有密林团队**

- 阿里云 ESA Pages 边缘开发大赛参赛作品

---

## 📮 联系方式

- **GitHub Issues**: [提交问题](https://github.com/panda-lsy/chatgalaxy/issues)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by ChatGalaxy Team

</div>
