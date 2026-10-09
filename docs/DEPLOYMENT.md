# 星流部署指南

本指南依据仓库配置与代码整理。当前没有一键部署脚本，也未完成全套中间件联调；下述为可执行的构建入口与初始化清单，故障时请以服务日志定位，不能把进程启动等同于所有业务已通过验收。

## 1. 环境与目录

- Java：源码目标 Java 8，建议先用 JDK 8/11 与 Maven 3.8+ 进行兼容性验证。新 JDK 可能需要处理旧依赖兼容问题。
- 前端：Vue CLI 5，Node.js 建议从 20 LTS 兼容环境验证；使用 pnpm（仓库包含 pnpm-lock.yaml）。
- 数据：MySQL 8（DDL 使用 utf8mb4_0900_ai_ci）、Redis、MinIO。
- 服务组件：Nacos、RocketMQ nameserver + broker、Elasticsearch 7.13.3 对齐现有客户端；XXL-JOB 2.3.x 对齐客户端。
- Zipkin 属于追踪组件，可独立准备。AI、短信与邮件需要自行开通相应服务，不在仓库内提供共享凭据。

这些是已有依赖的兼容部署基线，不是对旧版本安全性或当前官方支持状态的承诺。正式上线前应升级、扫描并重新测试。

```bash
git clone https://github.com/chenxiyubp/streamforge-ai.git
cd streamforge-ai
```

默认面向“应用与基础服务运行在同一台开发电脑”。如果将 Java 放进容器，`localhost` 会指向容器自身，必须改为对应服务地址；不要直接套用本地配置。

## 2. 基础服务与端口

| 组件 | 配置中的默认入口 |
|---|---|
| MySQL | localhost:3306，数据库 bilibili |
| Redis | localhost:6379 |
| MinIO API | localhost:9000 |
| Nacos | localhost:8848 |
| RocketMQ nameserver | localhost:9876；还需可达的 broker |
| Elasticsearch | localhost:9200 |
| XXL-JOB 管理端 | localhost:8080/xxl-job-admin |
| 搜索任务执行器 | 9916 |
| Zipkin | localhost:9411 |

网关固定路由到本机业务端口，部分服务还启用了 Nacos。先启动基础组件，再启动应用。组件的具体安装方式可按自己的 Docker/本机环境选择；仓库不含第三方镜像或安装包。

## 3. 初始化 MySQL

使用有建库权限的账号登录 MySQL：

```sql
CREATE DATABASE IF NOT EXISTS bilibili CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE bilibili;
SOURCE /absolute/path/to/streamforge-ai/sql.sql;
```

Windows 的 SOURCE 路径可以用正斜杠。为应用单独创建账号并授予该库所需权限，在环境变量中配置。`sql.sql` 是 19 张表的结构文件，不含演示账号和业务数据；请使用页面注册流程创建测试用户。已补齐建表语句末尾分号和 7 个触发器的 DELIMITER，移除写死的 DEFINER；导入账号需具备 TRIGGER 权限。可选的 Zipkin 表结构独立保存在 `docs/zipkin-schema.sql`，使用独立数据库按需导入。

## 4. 环境变量与服务配置

根目录 `.env.example` 只是清单，**Java 不会自动读取这个文件**。在启动终端、IDE Run Configuration 或服务管理器中注入变量。不要提交真实 `.env` 或本地配置。

必需项：

| 变量 | 用途 |
|---|---|
| DB_USER / DB_PASSWORD | MySQL 应用账号 |
| MINIO_ACCESS_KEY / MINIO_SECRET_KEY | 对象存储凭据 |
| JWT_SECRET | JWT 签名密钥，使用自己生成的足够长的 Base64 随机值 |
| MEDIA_PUBLIC_BASE | 浏览器可访问的媒体根地址，不带尾部斜杠；默认 http://localhost:9000 |
| XXL_JOB_ACCESS_TOKEN | 与任务管理端配置一致 |

按功能配置：`MAIL_USERNAME`、`MAIL_PASSWORD`（SMTP 授权码）；`ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`SMS_SIGN_NAME`、`SMS_TEMPLATE_CODE`；`SPARK_APP_ID`、`SPARK_API_KEY`、`SPARK_API_SECRET`。

目前星火代码仍使用原有接口版本和鉴权方式，需要确认自己的账号开通了对应对话、绘图与 PPT 文案能力。没有凭据时不要测试这些入口，也不要使用他人账号。

PowerShell 示例（值由你在本机填写）：

```powershell
$env:DB_USER = 'streamforge'
$env:DB_PASSWORD = '<你的数据库密码>'
$env:MINIO_ACCESS_KEY = '<你的 MinIO 账号>'
$env:MINIO_SECRET_KEY = '<你的 MinIO 密钥>'
$env:JWT_SECRET = '<自行生成的 Base64 随机密钥>'
$env:XXL_JOB_ACCESS_TOKEN = '<你的执行器令牌>'
```

其他地址通过各模块 `src/main/resources/application*.yml` 调整。网关激活 `dev` 配置。Spring Boot 也可用 `SPRING_DATASOURCE_URL`、`SPRING_REDIS_HOST` 等环境覆盖方式指定地址。

## 5. MinIO 与搜索初始化

创建 `video`、`video-cover`、`user-cover` 三个桶；上传自行准备的 `user-cover/default.png`。当前代码生成浏览器直接读取的 URL，需为用于展示的媒体设置合适读取策略，写入保持认证。不要开放匿名写权限。远程部署的 MEDIA_PUBLIC_BASE 不能写成仅服务端可访问的 localhost。

搜索代码使用 `video`、`user`、`history_search` 索引。请根据服务 DTO/Mapper 的实际 JSON 字段创建映射后再导入数据：数字 ID/计数为整型，标题、简介、昵称为 text，精确字段为 keyword，时间字段为 date。仓库没有完整可复用的索引导入包，不能声称直接启动就已有搜索结果。

在 XXL-JOB 中注册与 `application.yml` 一致的执行器，配置 Bean 任务 `mysqlToEs`。代码首次执行全量同步，随后根据 Redis 操作记录进行增量更新；首次联调需验证新建、更新、删除三个方向。执行器 token 与管理端保持一致。

## 6. 构建并启动后端

```bash
cd java
mvn clean package -DskipTests
```

该命令跳过测试，不代表测试通过。各服务输出 `模块/target/模块-1.0.jar`（实际文件以 Maven 输出为准）。分别在终端启动：

```bash
java -jar user_center/target/user_center-1.0.jar
java -jar video/target/video-1.0.jar
java -jar notice/target/notice-1.0.jar
java -jar search/target/search-1.0.jar
java -jar chat/target/chat-1.0.jar
java -jar gateway/target/gateway-1.0.jar
```

每条命令占用独立终端，common 无需启动。确认服务端口、数据库连接、MQ 消费者与注册状态正常后再启动前端。如果打包失败，先核对 JDK、Maven 仓库访问和 POM 中的历史依赖组合；不要直接忽略编译错误。

## 7. 启动前端

```bash
cd vue
```

复制 `.env.example` 为 `.env.local`，然后：

```bash
pnpm install
pnpm serve
```

浏览器打开 `http://localhost:2023`。开发代理将 `/api` 去掉前缀后转发到网关 8200，将 `/wschat` 转发到 chat 的 `/ljl/bilibili/chat`。关键词补全也已使用同一 API 基址。

生产构建：`pnpm build`，生成 `vue/dist`。环境变量 `VUE_APP_*` 在构建时写入前端，不能放密钥；修改后需重新构建。

## 8. 生产静态托管示例

下面是 Nginx 关键片段，假设网关与 chat 在同机。公网应另外配置域名、HTTPS、访问控制和日志，不直接暴露数据库及管理端口。

```nginx
location / {
    root /srv/streamforge/dist;
    try_files $uri $uri/ /index.html;
}
location /api/ {
    proxy_pass http://127.0.0.1:8200/;
    client_max_body_size 350m;
}
location /wschat {
    proxy_pass http://127.0.0.1:1688/ljl/bilibili/chat;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
}
```

## 9. 验收与排错

按顺序验证：账号注册/登录 → 个人资料 → 视频上传与播放 → 点赞评论弹幕 → 双账号私聊 → 通知 → 搜索同步 → 有凭据后验证 AI。

- 404：检查 `/api` 是否去掉、服务是否使用文档中的端口。
- WebSocket 失败：检查 Upgrade 头、地址是否为 `/ljl/bilibili/chat`，HTTPS 页面应使用 wss。
- 图片/视频无法显示：检查桶、对象 URL、读取策略和 MEDIA_PUBLIC_BASE。
- 搜索为空：检查索引映射、是否已有内容、XXL-JOB 执行与 ES 同步日志。
- 邮件/短信/AI 失败：核对自己的授权、额度和接口版本，不把外部服务故障当作前端构建问题。
- 部分页面是演示数据：前端仍有样例资产及非核心页面；这些不代表完整商城或直播后端。
