# worker-cron

**[中文](#中文)** · **[English](#english)**

<br>

## 中文

### 这是什么

此项目有一个 Cloudflare Worker，可全自动向本仓库提交**没用的临时文件**（文件名为 Unix 时间戳，内容为 20 个随机字母）。

> [!important]
> 
> **Note：这并不是一个 GitHub 压力测试实验，或者什么 commit 农场。这是我的定时任务基础设施。**
> 
> commit 是 workflow 触发器，不是目的。

### 它实际在做什么

目前，每半小时它会：

1. **触发一次 [secureblue-watchdog](https://github.com/lingyicute/secureblue-watchdog) 的 `sbwatch.yml`**（secureblue update watch）；
2. 如果我需要，我还会加入其它定时任务。

完整链路：

```
CF Worker cron（每 30 分钟）
  └─ PUT /contents/<unix-timestamp>          → 提交 "chore: add timestamp file …"
       └─ push 触发 .github/workflows/cron.yml（"Trigger and cleanup"）
            ├─ gh workflow run sbwatch.yml -R lingyicute/secureblue-watchdog
            ├─ 删除所有"文件名为十位整数"的触发物
            └─ 提交 "chore: 删除临时文件"
```

所以：时间戳文件是**触发物**，存活约 10 秒；仓库文件树始终保持干净；贡献图上的 commit 流，是把 `push` 当作 workflow 触发器的副产物。

### 为什么不用 Actions 自带的 cron 机制？

有的。secureblue update watch 的 workflow 写了每小时运行（`schedule`），但根据我的观察，最少也要过三四个小时才会运行一次，甚至有时候六七个小时都没运行一次。太扯淡了。

（GitHub 官方文档也承认 scheduled workflows 在高负载时段会延迟或跳过；但实际观测到的偏移远超"偶尔延迟"。于是有了这个中继。）

### 为什么不直接用 API 触发 workflow，而是提交临时文件来触发？

因为相较于前者，后者更不容易被 GitHub 标记为滥用。

一次普通的 `git push` 是 GitHub 上最平常不过的流量；而高频、跨仓库、来自外部定时器的 `workflow_dispatch` API 调用，在滥用检测眼里是另一种形状。我选择看起来最无聊的那种机制。

### 配置

Worker 环境变量：`GITHUB_TOKEN`（`contents:write`）、`GITHUB_REPO`（`owner/repo`）。
Workflow secret：`token1`（可对 `secureblue-watchdog` 发起 workflow dispatch）。

### 给后来的你 / 路人

如果你是因为看到“每半小时一个垃圾 commit”而皱着眉头点进来的：抱歉，也谢谢。上面就是全部真相。

想验证？打开 `.github/workflows/cron.yml` — 删除步骤证明这些文件是触发物，trigger 步骤证明真正的载荷在别处。

<br>

## English

### What this is

This project runs a Cloudflare Worker that automatically commits a **useless timestamp file** (Unix-timestamp filename, 20 random letters as content) to this repository.

> [!important]
> 
> **Note: This is neither a GitHub stress test nor a commit farm. This is my cron job infrastructure.**
>
> The commits are the trigger, not the purpose.

### What it actually does

Every 30 minutes it:

1. **Triggers `sbwatch.yml` (secureblue update watch) in [secureblue-watchdog](https://github.com/lingyicute/secureblue-watchdog);**
2. more scheduled tasks will be added here if I ever need them.

The chain:

```
CF Worker cron (every 30 min)
  └─ PUT /contents/<unix-timestamp>          → commit "chore: add timestamp file …"
       └─ the push triggers .github/workflows/cron.yml ("Trigger and cleanup")
            ├─ gh workflow run sbwatch.yml -R lingyicute/secureblue-watchdog
            ├─ delete every trigger artifact (files named exactly 10 digits)
            └─ commit "chore: 删除临时文件"
```

So: the timestamp file is a **trigger artifact** with a ~10-second lifespan; the file tree stays clean; the commit stream on the contribution graph is a byproduct of using `push` as the trigger transport.

### Why not Actions' built-in cron?

I do use it. The secureblue update watch workflow has an hourly `schedule` — but in my observation it runs at best every three or four hours, and sometimes not once in six or seven. Frankly, that's ridiculous.

(GitHub's own docs concede that scheduled workflows can be delayed or skipped during periods of high load; the skew I observed went far beyond "occasionally". Hence this relay.)

### Why not trigger the workflow directly via the API instead of committing temp files?

Because the latter is less likely to be flagged as abuse by GitHub.

A plain `git push` is the most boring traffic on GitHub; high-frequency, cross-repository `workflow_dispatch` calls from an external timer have a different shape to abuse detection. I pick the boring-looking mechanism.

### Config

Worker env vars: `GITHUB_TOKEN` (`contents:write`), `GITHUB_REPO` (`owner/repo`).
Workflow secret: `token1` (may dispatch workflows in `secureblue-watchdog`).

### For future readers

If you clicked in because "a junk commit every 30 minutes" looked alarming: sorry, and thank you. The above is the whole truth.

Want to verify? Open `.github/workflows/cron.yml` — the delete step proves the files are trigger artifacts; the trigger step proves the real payload lives elsewhere.
