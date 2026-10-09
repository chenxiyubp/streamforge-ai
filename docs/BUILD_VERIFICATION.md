# 构建验证报告

日期：2026-10-09（北京时间）。本轮验证的是安装依赖、编译与产物生成，未进行全套业务联调。

## 前端

- Node.js 24.18.0，pnpm 11.25.0。
- `pnpm install --frozen-lockfile --ignore-scripts` 成功，沿用仓库锁文件，未执行依赖安装脚本。
- `pnpm build` 成功，生成 `vue/dist`。
- 修复 VideoRecommend.vue 对 aCarousel.vue 的错误命名导入，改为默认导入；重新构建后该警告消失。
- 剩余两个 webpack 警告为资源体积与入口体积；仍有旧 `::v-deep` 样式语法弃用提示。
- 修复后构建 Hash：83f623970f0a4183。

## 后端

- Eclipse Temurin JDK 17.0.20.1，Maven 3.9.9；源码编译目标仍为 Java 8。
- `mvn validate` 通过。
- `mvn package -DskipTests` 全部八个 reactor 项目 SUCCESS：父工程、common、search、notice、gateway、video、chat、user_center。
- 六个业务模块均生成 Spring Boot 可执行 JAR；common 是共享依赖，不能独立启动。
- 本次跳过测试，不能表述为“全部测试通过”。编译日志存在旧 API 弃用提示。

## 后续验收

MySQL 实际导入、Redis/MinIO/MQ/ES/Nacos/XXL-JOB 环境、登录和权限、上传转码、搜索同步、私聊、短信邮件与 AI 外部调用尚未联调。构建成功不能证明这些业务场景全部可用，也不能作为性能或安全验收证明。

本地依赖、JDK、Maven、构建缓存和生成产物未加入源码仓库。前端静态部署包单独保存，仍需后端运行环境才能使用业务功能。
