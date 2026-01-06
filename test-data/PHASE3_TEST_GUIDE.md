# Phase 3.1 - 边缘函数集成测试指南

> **创建时间**: 2026-01-07
> **测试范围**: 边缘函数配置管理器、前端集成、数据处理流程
> **测试环境**: 本地开发环境 + 阿里云 ESA（可选）

---

## 📋 测试概述

### 测试目标

验证以下功能：
1. ✅ 边缘函数配置管理器（EdgeFunctionConfig）
2. ✅ 处理模式选择器UI
3. ✅ 快速模式与精确模式切换
4. ✅ 边缘函数降级机制
5. ✅ 数据导入流程集成

### 测试前置条件

- [ ] 已完成 Phase 2 所有功能
- [ ] 本地服务器运行中（`npx serve . -p 8000`）
- [ ] 浏览器控制台可访问（F12）
- [ ] 有测试用的聊天数据 JSON 文件

---

## 🧪 测试用例

### 测试 1：配置管理器基础功能

**目的**: 验证 `EdgeFunctionConfig` 类的基本功能

**步骤**:

1. 打开浏览器控制台（F12）

2. 检查配置管理器是否已加载
```javascript
// 应该返回对象
window.EdgeFunctionConfig
```

3. 测试 URL 设置和获取
```javascript
// 设置 URL
window.EdgeFunctionConfig.setUrl('processChat', 'https://test-function.com/process');

// 获取 URL
window.EdgeFunctionConfig.getUrl('processChat');
// 预期输出: "https://test-function.com.com/process"

// 检查可用性
window.EdgeFunctionConfig.isAvailable('processChat');
// 预期输出: true
```

4. 测试配置持久化
```javascript
// 刷新页面
location.reload();

// 配置应该仍然存在
window.EdgeFunctionConfig.getUrl('processChat');
// 预期输出: "https://test-function.com/process"
```

5. 测试清除配置
```javascript
window.EdgeFunctionConfig.clearUrls();

window.EdgeFunctionConfig.isAvailable('processChat');
// 预期输出: false
```

**预期结果**: 所有操作正常执行，LocalStorage 正确保存和读取配置

---

### 测试 2：处理模式选择器UI

**目的**: 验证数据管理页面中的模式选择器

**步骤**:

1. 访问 `http://localhost:8000/data-manager.html`

2. 检查模式选择器是否显示
   - 应该显示两个选项：快速模式和精确模式
   - 默认选中"快速模式"

3. 测试模式切换
   - 点击"精确模式"单选按钮
   - 如果未配置边缘函数，应该弹出提示
   - 点击"取消"应该切换回"快速模式"

4. 检查边缘函数状态徽章（如果已配置）
   - 精确模式卡片右上角应显示"可用"徽章
   - 徽章背景为绿色渐变

**预期结果**: UI 正确显示，交互逻辑符合预期

---

### 测试 3：边缘函数配置UI

**目的**: 测试通过界面配置边缘函数

**步骤**:

1. 在数据管理页面，点击"精确模式"

2. 在弹出提示中点击"配置"

3. 输入测试 URL（模拟模式）
```
mock://edge-function
```

4. 确认保存

5. 检查以下内容：
   - 提示"边缘函数URL已保存"
   - 精确模式卡片显示"可用"徽章
   - 快速模式仍然可用

**预期结果**: 配置成功保存，UI 更新正确

---

### 测试 4：快速模式数据导入

**目的**: 验证快速模式（前端处理）正常工作

**步骤**:

1. 访问 `data-manager.html`

2. 确保选中"快速模式"

3. 准备测试数据（小数据集，< 100 条消息）
```json
{
  "messages": [
    {
      "sender": {"name": "张三"},
      "content": {"text": "大家好！"},
      "timestamp": "2024-01-01T10:00:00"
    },
    {
      "sender": {"name": "李四"},
      "content": {"text": "你好呀！"},
      "timestamp": "2024-01-01T10:01:00"
    }
  ]
}
```

4. 填写数据集信息：
   - 名称：测试数据集-快速模式
   - 描述：测试快速处理
   - 标签：测试

5. 点击"导入数据集"

6. 观察控制台输出：
```
[INFO] [Import] Processing 2 messages in fast mode
[INFO] [Import] Using sync processing
[INFO] [Import] Processed 2/2 messages
```

7. 验证数据集已创建：
   - 数据集列表显示新数据集
   - 点击查看详情，消息已正确分词和情感分析

**预期结果**: 数据成功导入，使用前端处理

---

### 测试 5：精确模式降级测试

**目的**: 验证边缘函数不可用时的降级机制

**步骤**:

1. 清除边缘函数配置
```javascript
window.EdgeFunctionConfig.clearUrls()
```

2. 刷新数据管理页面

3. 选择"精确模式"

4. 尝试导入相同的测试数据

5. 观察控制台输出：
```
[INFO] [Import] Processing 2 messages in precise mode
[WARN] [Import] Edge Function not configured or unavailable, falling back to Worker
[INFO] [Import] Using sync processing
```

6. 验证数据仍然成功导入

**预期结果**: 自动降级到快速模式，数据成功处理

---

### 测试 6：边缘函数模拟测试

**目的**: 测试边缘函数调用逻辑（使用模拟模式）

**步骤**:

1. 配置模拟边缘函数
```javascript
window.EdgeFunctionConfig.setUrl('processChat', 'mock://edge-function')
```

2. 访问测试页面 `test-data/test-edge-function.html`

3. 点击"使用模拟模式"

4. 验证状态徽章更新为"边缘函数已配置"

5. 点击"测试连接"
   - 应该显示连接成功（模拟）

6. 点击"模拟处理"
   - 应该显示处理结果
   - 返回模拟的分析数据

**预期结果**: 模拟测试通过，UI 交互正常

---

### 测试 7：大数据集性能测试

**目的**: 验证处理大量消息时的性能

**步骤**:

1. 准备包含 1000+ 条消息的测试数据

2. 测试快速模式：
   - 记录开始时间
   - 导入数据
   - 记录结束时间
   - 计算处理时间

3. 测试精确模式（降级）：
   - 记录开始时间
   - 导入数据
   - 记录结束时间
   - 计算处理时间

4. 对比两种模式的性能

**预期结果**:
- 快速模式：< 10 秒（1000 条消息）
- 精确模式（降级）：与快速模式类似
- 浏览器不卡顿，UI 保持响应

---

### 测试 8：错误处理

**目的**: 验证各种错误情况的处理

**测试场景**:

1. **无效的边缘函数 URL**
   ```javascript
   window.EdgeFunctionConfig.setUrl('processChat', 'https://invalid-url-that-does-not-exist.com')
   ```
   - 尝试精确模式导入
   - 预期：降级到快速模式，显示警告

2. **边缘函数返回错误**
   - 模拟边缘函数返回 500 错误
   - 预期：降级到快速模式

3. **网络超时**
   - 设置超时时间为 1ms
   - 尝试调用边缘函数
   - 预期：超时后降级

4. **无效的 JSON 数据**
   - 上传格式错误的 JSON
   - 预期：显示友好的错误提示

**预期结果**: 所有错误都被捕获，用户看到友好的错误消息

---

## 🚀 真实边缘函数测试（可选）

如果已部署边缘函数到阿里云 ESA：

### 部署步骤

1. 按照 `docs/EDGE_FUNCTION_DEPLOYMENT_GUIDE.md` 部署边缘函数

2. 获取边缘函数 URL

3. 在数据管理页面配置 URL

### 测试步骤

1. **连接测试**
   ```javascript
   const result = await window.EdgeFunctionConfig.testConnection('processChat');
   console.log('Connection test:', result);
   ```
   预期：`{ success: true, responseTime: ... }`

2. **精确模式导入**
   - 使用相同的测试数据
   - 选择"精确模式"
   - 观察控制台输出：
   ```
   [INFO] [Import] Using Edge Function for precise processing...
   [INFO] [Import] Edge Function processing completed: 2 messages
   ```

3. **对比结果质量**
   - 比较快速模式和精确模式的分词结果
   - 精确模式应该使用 jieba 分词，更准确
   - 情感分析应该更精确（SnowNLP）

4. **性能测试**
   - 测试 1000 条消息的处理时间
   - 预期：< 5 秒（边缘函数）

**预期结果**: 边缘函数正常工作，结果质量优于快速模式

---

## ✅ 测试检查清单

### 配置管理器
- [ ] URL 设置和获取
- [ ] LocalStorage 持久化
- [ ] 可用性检查
- [ ] 配置清除
- [ ] 连接测试

### UI 组件
- [ ] 模式选择器显示正确
- [ ] 快速模式/精确模式切换
- [ ] 状态徽章显示
- [ ] 配置按钮功能

### 数据导入
- [ ] 快速模式正常工作
- [ ] 精确模式调用边缘函数
- [ ] 降级机制正常
- [ ] 进度条显示正确
- [ ] 错误处理友好

### 性能
- [ ] 小数据集（< 100 条）快速处理
- [ ] 中等数据集（100-1000 条）稳定处理
- [ ] 大数据集（> 1000 条）不卡顿

### 边缘函数（如果已部署）
- [ ] 连接测试通过
- [ ] 精确模式正常工作
- [ ] 结果质量优于快速模式
- [ ] 性能符合预期

---

## 🐛 已知问题和解决方案

### 问题 1：快速模式在大数据集时卡顿

**原因**: 同步处理大量消息阻塞主线程

**解决方案**:
- 自动使用 Web Worker（> 500 条消息）
- 或使用精确模式（边缘函数）

### 问题 2：边缘函数配置后仍然显示"未配置"

**原因**: LocalStorage 未正确保存

**解决方案**:
```javascript
// 手动清除并重新设置
localStorage.removeItem('edgeFunctionUrls');
window.EdgeFunctionConfig.setUrl('processChat', 'your-url');
```

### 问题 3：精确模式导入失败

**原因**: 边缘函数 URL 错误或服务不可用

**解决方案**:
- 检查 URL 是否正确
- 使用 `testConnection()` 测试连接
- 查看浏览器网络面板的错误信息

---

## 📊 测试结果记录

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 配置管理器基础功能 | ⬜ 通过 | |
| 处理模式选择器UI | ⬜ 通过 | |
| 边缘函数配置UI | ⬜ 通过 | |
| 快速模式数据导入 | ⬜ 通过 | |
| 精确模式降级测试 | ⬜ 通过 | |
| 边缘函数模拟测试 | ⬜ 通过 | |
| 大数据集性能测试 | ⬜ 通过 | |
| 错误处理 | ⬜ 通过 | |
| 真实边缘函数测试 | ⬜ 通过 | （可选） |

**测试人**: ___________
**测试日期**: ___________
**浏览器**: ___________
**备注**: ___________

---

## 🔗 相关文档

- [边缘函数部署指南](../docs/EDGE_FUNCTION_DEPLOYMENT_GUIDE.md)
- [Phase 3 开发计划](../PHASE3_PLAN.md)
- [数据管理器文档](../js/data-manager.js)
