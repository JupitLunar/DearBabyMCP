# MCP Inspector 连接指南

本文档提供 Dear Baby MCP 服务器与 MCP Inspector 的完整连接步骤。

## 📋 前置条件

- Node.js 已安装
- 项目依赖已安装 (`npm install`)
- 环境变量已配置（`.env` 文件）

## 🚀 启动步骤

### 1️⃣ 构建项目

```bash
cd /Users/cathleenlin/Desktop/code/MCP/DearBabyMCP
npm run build
```

**预期输出**：构建成功，无错误信息

---

### 2️⃣ 启动 MCP 服务器

在**第一个终端窗口**运行：

```bash
cd /Users/cathleenlin/Desktop/code/MCP/DearBabyMCP
PORT=4040 npm run start
```

**成功标志**：看到以下日志

```json
{"level":30,"time":...,"port":4040,"msg":"Dear Baby MCP server listening"}
```

**重要**：保持此终端窗口运行，不要关闭！

---

### 3️⃣ 启动 MCP Inspector

在**第二个终端窗口**运行：

```bash
cd /Users/cathleenlin/Desktop/code/MCP/DearBabyMCP
DANGEROUSLY_OMIT_AUTH=true npx @modelcontextprotocol/inspector
```

**成功标志**：看到以下输出

```
⚙️ Proxy server listening on localhost:6277
⚠️  WARNING: Authentication is disabled. This is not recommended.
🚀 MCP Inspector is up and running at:
   http://localhost:6274
```

**重要**：保持此终端窗口运行，不要关闭！

---

## 🔧 Inspector 界面配置

### 步骤 1：打开浏览器

访问：**http://localhost:6274**

### 步骤 2：填写连接配置

在 Inspector 界面中，按照以下设置填写：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Transport Type** | `Streamable HTTP` | 传输类型 |
| **URL** | `http://localhost:4040/` | MCP 服务器地址（**注意不要加 /mcp 路径**）|
| **Connection Type** | `Via Proxy` | 通过代理连接 |
| **Server Entry** | `Servers File` | - |
| **Authentication** | `Configuration` | - |
| **Request Timeout** | `10000` | 请求超时（毫秒）|
| **Reset Timeout on Progress** | `True` | ✅ 勾选 |
| **Maximum Total Timeout** | `60000` | 最大超时（毫秒）|
| **Inspector Proxy Address** | `http://localhost:6277` | Inspector 代理地址 |
| **Proxy Session Token** | **留空** | 因为使用了 `DANGEROUSLY_OMIT_AUTH=true`，所以不需要填写 |

### 步骤 3：连接

点击 **Connect** 按钮

**成功标志**：
- 连接状态变为 "Connected"
- 可以看到 Tools 和 Resources 列表

---

## ✅ 验证连接成功

### 查看可用工具（Tools）

在 Inspector 的 **Tools** 标签页，应该能看到以下工具：

- `solidstart.recipes.search` - 搜索食谱
- `solidstart.recipes.featured` - 获取推荐食谱  
- `solidstart.recipes.getDetails` - 查看食谱详情
- `solidstart.recipes.toggleBookmark` - 收藏/取消收藏
- `solidstart.recipes.toggleLike` - 点赞/取消点赞

### 查看可用资源（Resources）

在 Inspector 的 **Resources** 标签页，应该能看到食谱相关资源。

### 测试工具调用

尝试调用 `solidstart.recipes.featured`：

```json
{
  "baby_age_months": 6,
  "limit": 5,
  "lang": "zh"
}
```

如果返回食谱列表，说明连接完全正常！

---

## 🛑 停止服务

### 停止 MCP 服务器

在运行 `npm run start` 的终端窗口按 `Ctrl + C`

### 停止 Inspector

在运行 Inspector 的终端窗口按 `Ctrl + C`

或者使用命令：

```bash
# 查找 Inspector 进程
lsof -iTCP:6274 -sTCP:LISTEN

# 停止进程（替换 <PID> 为上一步的进程 ID）
kill <PID>
```

---

## 🔍 常见问题排查

### ❌ 问题 1：端口已被占用

**错误信息**：`Error: listen EADDRINUSE: address already in use :::4040`

**解决方案**：

```bash
# 查找占用端口的进程
lsof -iTCP:4040 -sTCP:LISTEN

# 停止该进程
kill <PID>
```

---

### ❌ 问题 2：Inspector 连接失败 "Connection Error"

**可能原因**：URL 设置错误

**检查清单**：
- ✅ URL 应该是 `http://localhost:4040/`（末尾有 `/`）
- ✅ URL **不应该**是 `http://localhost:4040/mcp?sessionId=xxx`
- ✅ Proxy Session Token 应该**留空**
- ✅ Inspector Proxy Address 是 `http://localhost:6277`

---

### ❌ 问题 3：MCP 服务器未启动

**错误信息**：Inspector 显示 "Error accessing endpoint (HTTP 404)" 或无法连接

**解决方案**：

1. 确认 MCP 服务器正在运行：
   ```bash
   lsof -iTCP:4040 -sTCP:LISTEN
   ```

2. 如果没有输出，重新启动服务器：
   ```bash
   PORT=4040 npm run start
   ```

3. 测试服务器是否响应：
   ```bash
   curl -X POST http://localhost:4040/ \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
   ```
   
   应该返回包含 `"serverInfo":{"name":"dearbaby-mcp","version":"0.1.0"}` 的 JSON 响应

---

### ❌ 问题 4：npm 缓存权限错误

**错误信息**：`npm error code EPERM` 或 `Your cache folder contains root-owned files`

**解决方案**：

```bash
# 清理 npm 缓存
npm cache clean --force

# 如果还不行，手动修复权限（需要输入密码）
sudo chown -R $(whoami) ~/.npm
```

---

## 📝 快速启动脚本

为了简化启动流程，可以使用以下脚本：

### 创建启动脚本（可选）

```bash
cat > start-inspector.sh << 'EOF'
#!/bin/bash

echo "🔨 构建项目..."
npm run build

echo ""
echo "🚀 启动 MCP 服务器（端口 4040）..."
PORT=4040 npm run start &
MCP_PID=$!

sleep 3

echo ""
echo "🔍 启动 Inspector（端口 6274）..."
DANGEROUSLY_OMIT_AUTH=true npx @modelcontextprotocol/inspector &
INSPECTOR_PID=$!

echo ""
echo "✅ 服务已启动！"
echo "   MCP Server PID: $MCP_PID"
echo "   Inspector PID: $INSPECTOR_PID"
echo ""
echo "🌐 在浏览器中打开：http://localhost:6274"
echo ""
echo "按 Ctrl+C 停止所有服务..."

# 捕获退出信号
trap "kill $MCP_PID $INSPECTOR_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
EOF

chmod +x start-inspector.sh
```

**使用方法**：

```bash
./start-inspector.sh
```

---

## 📚 相关文档

- [MCP 工具规划](./mcp-tool-plan.md) - 完整工具列表和开发计划
- [API 摘要](./api-summary.md) - Solid Start API 端点说明
- [项目 README](../README.md) - 项目概览和路线图

---

## 💡 提示

1. **每次修改代码后**，需要重新运行 `npm run build` 并重启 MCP 服务器
2. **Inspector 通常不需要重启**，只需要在界面上点击重新连接即可
3. **开发时**建议使用两个独立的终端窗口，便于查看日志
4. **生产环境**不要使用 `DANGEROUSLY_OMIT_AUTH=true`，应配置适当的认证

---

最后更新：2025-10-18

