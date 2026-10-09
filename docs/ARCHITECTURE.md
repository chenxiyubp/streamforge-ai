# 架构与技术难点

## 服务协作

浏览器通过 gateway 调用用户、视频、通知、搜索和聊天 API。数据落 MySQL，缓存和待同步操作存 Redis；对象存储承载媒体。RocketMQ 连接业务操作、通知和视频处理；搜索服务借助 XXL-JOB 协调 MySQL 与 Elasticsearch 同步。WebSocket 端点由 chat 服务注册。

## 源码入口与讨论边界

| 主题 | 入口（相对于 java） | 重点 |
|---|---|---|
| 分片上传 | video 的 `MinioServiceImpl`、`UploadAndEditServiceImpl` | 分片存在性检查、合并与重复请求 |
| 视频处理 | notice 的 `consumer/video_encode/VideoEncodeConsumer` | JAVE 转码、截图、临时文件与异常处理 |
| 检索 | search 的 `SearchServiceImpl` | 多字段匹配、高亮、推荐及索引创建 |
| 数据同步 | search 的 `MysqlToEsHandler`、`MysqlToEsServiceImpl` | 首次全量、增量操作记录、失败补偿 |
| 私聊与 AI | chat 的 `WebSocketConfig`、handler 与 `ChatServiceImpl` | 会话、持久化、连接生命周期与第三方响应 |
| 认证 | gateway 的登录服务、`JwtUtil` 与 Security 配置 | token 生命周期、校验与刷新 |

这些流程已存在于输入工程，不应把“阅读或整理了代码”表述为“独立设计并完成所有模块”。

## 需要继续验证的难点

1. 大文件重复合并、缺片、跨用户上传隔离、进程中断后的恢复是否正确。
2. MQ 重复投递是否造成多次通知或转码；异常后的重试次数、死信和可追踪状态。
3. 全量同步和增量同步的时间窗口；删除是否丢失；同步失败后能否重新执行且不破坏结果。
4. 多节点下 WebSocket 连接路由、用户身份绑定、未读数量一致性及断线重连。
5. AI 接口的超时/断流、模型版本变化、费用额度及并发请求之间的上下文隔离。

当前没有压力测试报告、生产监控或高可用部署证明，不使用“百万并发”“零丢失”“性能提升百分之多少”等无法验证的宣传。

## 本次整理的实际贡献

移除重复前端与开发环境垃圾文件；配置敏感值外置；前端 API 和 WebSocket 使用本地代理；媒体 URL 可配置；去除默认登录填充值；补齐 SQL 语句终止符；重写品牌、架构、部署和简历说明。为保持兼容，没有批量修改上游 Java 包名和协议字段。
