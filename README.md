# ChatGalaxy 聊天记录智能分析平台

> **阿里云 ESA Pages 边缘开发大赛**参赛作品
>
> 本项目由[阿里云ESA](https://www.aliyun.com/product/esa)提供加速、计算和保护
>
> ![](https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png)

---

## 📋 项目简介

**ChatGalaxy** 是一款面向大众的聊天记录智能分析与可视化平台，通过创新的 3D 星系可视化技术，将用户的聊天记录转化为可探索的数字宇宙。

### 核心特性

✨ **3D 星系可视化** - 将聊天关键词构建成可探索的宇宙
📊 **智能洞察报告** - 自动生成聊天习惯分析、情感趋势、活跃度统计
⏰ **时间轴回放** - 沉浸式回顾对话历史
🎨 **视觉增强系统** - 5 种主题、粒子特效、动画过渡
🚀 **边缘计算优化** - 基于阿里云 ESA Pages 全球加速

---

## 🌐 在线体验

**部署地址**: WIP

**GitHub 仓库**: [https://github.com/panda-lsy/chatgalaxy](https://github.com/panda-lsy/chatgalaxy)

---

## 🎯 三大评选亮点

### 💡 创意卓越

**独特的可视化概念**：

- 将抽象的聊天数据转化为具象的 3D 星系
- 每个关键词都是一颗星星，每条对话都是一条星河
- 提供沉浸式的"星际漫游"体验，让用户在星海中回顾对话

**视觉设计亮点**：

- 黑色宇宙背景，营造深邃的星际氛围
- 动态粒子特效，模拟宇宙尘埃和星云
- 流畅的 3D 交互，支持拖拽、缩放、旋转

### 🔧 应用价值

**广泛的适用场景**：

- **社交达人** - 回顾微信群聊，发现有趣的聊天模式
- **家庭用户** - 珍藏与亲友的对话时光，制作年度账单式报告
- **兴趣社群** - 分析社群讨论热点，追踪话题演变
- **个人回忆** - 将聊天记录转化为可视化纪念册

**开箱即用**：

- 支持微信、QQ 等主流聊天软件导出格式
- 一键式数据处理和可视化生成
- 无需编程知识，普通用户也能轻松使用

### ⚙️ 技术探索

**完整的边缘生态应用**：

- **静态托管** (ESA Pages) - 全球 CDN 加速，毫秒级响应
- **边缘函数** (Edge Functions) - 实时洞察生成，智能数据处理
- **缓存优化** - 分层缓存策略，30 天静态资源缓存
- **性能监控** - Web Vitals 集成，实时追踪用户体验

**技术实现深度**：

- Three.js + 3D Force Graph - 构建 3D 力导向图
- Intl.Segmenter - 浏览器原生中文分词，无需后端
- TypeScript 边缘函数 - 类型安全，易于维护
- 智能懒加载 - defer 属性优化脚本加载
- Gzip/Brotli 压缩 - 减小传输体积 60-80%

---



## 📊 项目结构

```
ChatGalaxy/
├── index.html                  # 3D 星系可视化主页
├── insights.html               # 洞察报告页面
├── data-manager.html           # 数据管理页面
│
├── README.md                   # 项目文档
├── LICENSE                     # MIT 开源协议
├── .gitignore                  # Git 忽略配置
│
├── js/                         # JavaScript 文件
│   ├── app.js                 # 核心逻辑 (2646 行)
│   ├── visual-enhancer.js     # 视觉增强系统
│   ├── time-travel.js         # 时间轴回放
│   ├── particle-system.js     # 粒子系统
│   ├── data-import.js         # 数据导入
│   ├── data.js                # 可视化数据 (1.6 MB)
│   └── insights.js            # 洞察数据 (4.5 KB)
│
├── css/                        # 样式文件
│   └── main.css               # 主样式表
│
├── functions/                  # 边缘函数源码（可选）
│   └── api/
│       ├── generate-insights.ts  # 洞察生成
│       └── health.ts             # 健康检查
│
├── dist/                       # 编译后的边缘函数
│   └── api/
│       ├── generate-insights.js
│       └── health.js
│
├── package.json                # NPM 配置
├── tsconfig.json               # TypeScript 配置
│
└── docs/                       # 文档目录
    ├── DEPLOYMENT_GUIDE.md     # 部署指南
    ├── PRE_DEPLOY_CHECKLIST.md # 部署检查清单
    └── QUICK_REFERENCE.md      # 快速参考
```

**注意**：数据文件 `data.js` 和 `insights.js` 需要使用本地工具生成。如需自定义数据，请使用主仓库的 Python 脚本处理。

---

## 🛠️ 本地开发

### 环境准备

```bash
# 安装 Python 依赖
pip install jieba snownlp numpy pandas networkx

# （可选）安装开发依赖
pip install jupyter matplotlib
```

### 快速启动

```bash
# 1. 数据预处理
python chat_viz/process_data_v2.py

# 2. 生成洞察报告
python chat_viz/generate_insights.py

# 3. 启动本地服务器
python chat_viz/server.py

# 4. 访问 http://localhost:8000
```

### NPM 脚本

```bash
cd pages
npm run serve      # 启动本地服务器
npm run process    # 处理数据
npm run insights   # 生成洞察
```

---

## 🎨 功能展示

### 主页面（3D 星系可视化）

- **关键词星球** - 每个关键词是一颗星，大小代表出现频率
- **对话星河** - 关键词之间的连线表示共现关系
- **时间旅行** - 拖动时间轴，回顾历史对话
- **交互探索** - 点击星球查看相关消息，缩放、旋转星系

### 洞察报告（年度账单风格）

- **聊天活跃度** - 按小时/星期/月份统计
- **情感趋势分析** - 整体情感曲线和分布
- **关键词热度** - Top 50 关键词排行
- **特殊时刻** - 最活跃的一天、最长的消息等

### 数据管理

- **数据集切换** - 支持多个群组数据独立管理
- **一键处理** - 自动数据导入和处理
- **备份恢复** - 数据集自动备份机制

---

## ⚡ 性能优化

### 缓存策略

| 资源类型    | 缓存时间 | 说明                       |
| ----------- | -------- | -------------------------- |
| JS/CSS 文件 | 30 天    | 长期缓存，不变内容         |
| HTML 文件   | 1 小时   | 短期缓存，支持快速更新     |
| 数据文件    | 1 天     | 中期缓存，平衡性能与新鲜度 |

### 加载优化

- ✅ 所有脚本使用 `defer` 属性异步加载
- ✅ 启用 Gzip/Brotli 压缩（> 1KB 文件）
- ✅ 加载动画提升用户体验
- ✅ 阿里云全球 CDN 边缘加速

### Web Vitals 监控

**监控指标**：

- **LCP** (Largest Contentful Paint) - 最大内容绘制
- **FID** (First Input Delay) - 首次输入延迟
- **CLS** (Cumulative Layout Shift) - 累积布局偏移
- **FCP** (First Contentful Paint) - 首次内容绘制

**查看方式**：打开浏览器开发者工具（F12）→ Console 标签页

---

## 📖 技术栈

### 前端技术

- **Three.js** (r149) - 3D 图形渲染
- **D3.js** (v7.8.5) - 数据可视化
- **3d-force-graph** (v1.73.1) - 3D 力导向图
- **RemixIcon** (v3.5.0) - 图标库
- **Chart.js** (v4.4.0) - 图表绘制

### 后端技术（本地）

- **Python** - 数据处理和洞察生成
- **jieba** - 中文分词
- **SnowNLP** - 情感分析
- **multiprocessing** - 并行处理

### 边缘计算

- **阿里云 ESA Pages** - 静态网站托管
- **Edge Functions** (TypeScript) - 边缘函数
- **Node.js 20** - 运行时环境
- **Intl.Segmenter** - 浏览器原生分词 API

---

## 📚 数据导入指南

### 支持的聊天软件

- ✅ QQ（PC 端导出）
- 🚧 微信（计划中）
- 🚧 Telegram（计划中）
- 🚧 WhatsApp（计划中）

### 数据格式要求

```json
[
  {
    "sender_name": "发送者名称",
    "timestamp": "2025-12-11 12:00:00",
    "content": "消息内容",
    "msg_type": 1
  }
]
```

**字段说明**：

- `sender_name`: 发送者名称或昵称
- `timestamp`: 时间戳（支持多种格式）
- `content`: 消息文本内容
- `msg_type`: 消息类型（1=文本，其他类型会被忽略）

---

## 🔧 故障排查

### 问题：3D 图形不显示

**原因**：浏览器不支持 WebGL
**解决**：使用最新版 Chrome/Firefox/Edge

### 问题：数据加载失败

**原因**：data.js 文件未生成或路径错误
**解决**：运行 `npm run process` 重新生成数据

### 问题：页面空白

**原因**：CDN 资源加载失败
**解决**：

1. 检查网络连接
2. 强制刷新浏览器（Ctrl+F5）
3. 查看控制台错误信息

---

## 🎁 后续规划

### 短期优化（1-2 周）

- [ ] 实现数据增量更新功能
- [ ] 添加多数据集管理界面
- [ ] 优化移动端响应式布局
- [ ] 添加 PWA 离线支持

### 中期规划（1-3 个月）

- [ ] 接入阿里云边缘存储服务
- [ ] 完善边缘函数数据处理
- [ ] 添加用户认证系统
- [ ] 实现数据导出功能（PDF/Excel）

### 长期愿景（3 个月+）

- [ ] WebAssembly 高性能分词
- [ ] AI 洞察功能（聊天摘要、情感预测）
- [ ] 多语言支持（i18n）
- [ ] 数据隐私加密和权限管理

---

## 📞 技术支持

- **项目主页**：[GitHub Repository](https://github.com/panda-lsy/chatgalaxy)
- **问题反馈**：[Issues](https://github.com/panda-lsy/chatgalaxy/issues)

---

## 📄 开源协议

MIT License

---

**参赛信息**：

- 赛事：阿里云 ESA Pages 边缘开发大赛
- 参赛者：深山有密林团队
- 提交时间：2026-01-05
- 作品类别：实用工具 + 数据可视化

**本作品由[阿里云ESA](https://www.aliyun.com/product/esa)提供加速、计算和保护**

![](https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png)
