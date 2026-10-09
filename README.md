# 星流 · StreamForge AI

**视频内容社区 × 实时互动 × AI 创作工作台**

基于 Spring Boot / Spring Cloud 与 Vue 3 的前后端分离项目，覆盖视频上传、播放互动、用户关系、站内消息、聚合搜索及 AI 内容生成。适合学习微服务协作、媒体处理与异步数据同步，也可作为个人二次开发和项目展示的基础。

[部署指南](docs/DEPLOYMENT.md) · [技术难点](docs/ARCHITECTURE.md) · [整理与验证记录](docs/CHANGELOG.md)

> 本仓库由 chenxiyubp 基于提供的 aigcbilibili 项目整理维护。已通过前端生产打包和后端全部模块编译打包，尚未完成中间件与第三方接口的端到端验收。

## 项目能做什么

| 场景 | 源码包含的能力 |
|---|---|
| 视频社区 | 分片上传、断点续传相关流程、对象存储、转码/封面处理、视频播放 |
| 内容互动 | 点赞、收藏、评论、弹幕与用户关注 |
| 个人中心 | 用户资料、个人主页、内容管理和权限设置 |
| 实时通信 | WebSocket 私聊、会话记录及站内通知 |
| 内容发现 | 视频/用户聚合搜索、关键词补全与高亮 |
| AI 创作 | 星火大模型对话、文生图、主题生成 PPT 文案相关接口；需要自己的服务凭据 |

功能来自代码实现核对，不表示所有场景已在当前环境验收。PPT 部分包含大纲及章节文案生成，不将其宣传为已验证的完整 PPTX 导出工具。

## 项目亮点

- **业务链路完整**：从用户登录、上传和存储，到播放、互动与通知，便于理解跨模块协作，而不仅是独立 CRUD 页面。
- **媒体处理与主请求解耦**：RocketMQ 消费者承接视频处理与通知逻辑，可围绕耗时任务、失败重试和资源回收继续改进。
- **搜索与业务存储分离**：MySQL 保存业务数据，Elasticsearch 支撑检索，Redis 操作记录与定时任务组织数据同步。
- **实时通信结合内容创作**：同一系统包含私聊与 AI 响应处理，可研究连接生命周期、会话隔离和消息持久化。
- **部署入口可配置**：前端 API/WebSocket 代理改为本地默认地址；数据库、对象存储、邮件、短信、JWT 与 AI 凭据通过环境变量注入。
- **便于二次开发**：去掉嵌套前端副本、运行日志和 IDE 文件，单独整理部署、设计取舍和构建验证材料。

## 技术栈与模块

后端：Java 8 编译目标、Spring Boot 2.6.11、Spring Cloud 2021.0.4、Spring Cloud Alibaba 2021.0.4.0、Spring Security、MyBatis-Plus、OpenFeign。

数据与基础设施：MySQL、Redis、MinIO、RocketMQ、Elasticsearch（代码客户端 7.13.3）、Nacos、XXL-JOB；可选 Zipkin 链路观察。前端：Vue 3、Vue Router、Pinia、Element Plus、Axios、DPlayer、Vue CLI。

| 模块 | 职责 | 默认端口 |
|---|---|---|
| gateway | 登录、鉴权、HTTP 路由 | 8200 |
| user_center | 用户资料、关注、个人中心 | 3000 |
| video | 上传、播放与互动 API | 10201 |
| notice | 通知与异步消费者 | 30000 |
| search | 搜索、索引同步任务 | 8201 |
| chat | 私聊与 AI 创作接口、WebSocket | 1688 |
| common | 共享实体、Mapper 和公共组件 | 无独立服务 |
| vue | 浏览器前端 | 2023（开发模式） |

## 本地部署概要

这是一套需要后端与中间件的 Web 项目。可以在本地电脑学习运行；部署到公网时需要提供这些运行环境，GitHub 仓库本身不会自动运行服务。

```bash
git clone https://github.com/chenxiyubp/streamforge-ai.git
cd streamforge-ai
```

1. 准备 JDK/Maven、Node.js 与 pnpm，以及 MySQL 8、Redis、MinIO、Nacos、RocketMQ、Elasticsearch；按需要启动 XXL-JOB 和 Zipkin。
2. 创建 `bilibili` 数据库并导入 `sql.sql`，配置自己的凭据，创建媒体桶和检索索引。
3. 在 `java/` 执行 `mvn clean package -DskipTests`，启动各业务服务和网关。
4. 在 `vue/` 复制 `.env.example` 为 `.env.local`，执行 `pnpm install`、`pnpm serve`，打开 `http://localhost:2023`。

**完整的端口表、启动顺序、环境变量、反向代理、初始化与排错步骤见 [DEPLOYMENT.md](docs/DEPLOYMENT.md)。** 首次部署不依赖原作者的线上域名或账号。

## 值得深入的技术难点

| 难点 | 需要解决的问题 |
|---|---|
| 分片与合并 | 重传去重、分片完整性、并发合并和临时文件清理 |
| 异步任务 | 消费失败重试、重复消息幂等及处理状态可观察性 |
| MySQL → ES | 全量与增量衔接、删除同步、失败补偿和最终一致性 |
| WebSocket | 鉴权、会话隔离、断线重连、离线记录与顺序 |
| AI 调用 | 服务鉴权、调用限额、超时、响应分段和前端交互 |

这些是源码可支撑的讨论主题及需要继续验证的问题，不代表项目已经具备生产级幂等、高并发或完整容灾能力。具体入口见 [架构说明](docs/ARCHITECTURE.md)。

## 目录

```text
java/                 后端多模块 Maven 工程
vue/                  唯一保留的前端工程
sql.sql               MySQL 表结构（无业务数据）
.env.example          后端环境变量清单
docs/DEPLOYMENT.md     详细部署与排错
docs/ARCHITECTURE.md   设计、源码入口及技术难点
```

## 当前验证范围

已通过配置静态检查、前端生产打包及后端全部模块编译打包。具体环境与结果见 [构建验证报告](docs/BUILD_VERIFICATION.md)。后端打包使用 `-DskipTests`，未执行测试。尚未使用真实短信、邮件和 AI 账号验收，未完成全套微服务联调或压力测试。不提供虚构的 QPS、性能提升比例或生产用户量。

保留上游 Java 包名与既有接口字段以降低兼容风险；展示名称改为星流，不意味着将第三方实现声明为完全原创。原项目的宣传与招聘效果承诺不再作为本项目说明。
