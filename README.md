# 新周礼记

一个记录“今事古书、旧辞新梗”的静态前端小册。

## 运行

```bash
npm run build
python3 -m http.server 5174
```

然后打开 `http://localhost:5174/`。如果端口被占用，换成其他空闲端口即可。

## 新增篇目

1. 在 `articles/` 中新增一篇 `.md` 文件。
2. 如需新卷，先在 `data/volumes.json` 中补一个卷。
3. 运行 `npm run build` 自动生成 `generated/articles.json`。
4. 每篇正文顶部使用 front matter。

每篇 `.md` 顶部的 front matter 是构建时源数据；浏览器不拿它覆盖页面，只用它后面的正文。`generated/articles.json` 是生成给浏览器读取的目录，不需要手写。GitHub Pages 工作流也会自动生成它。

这里用 Node 只是为了自动扫描 Markdown 生成索引，没有第三方依赖；最终页面仍然是普通静态 HTML/CSS/JS。

## 目录分工

- `articles/`：手写文章，只放 `.md`。
- `data/volumes.json`：手写卷目，维护卷 id 和卷名。
- `generated/articles.json`：自动生成目录，不手写。

`data/volumes.json` 统一管理卷的 id 和名字。文章里只写 `volumeId`，前端显示时再查出卷名：

```json
[
  { "id": "a", "name": "aname" },
  { "id": "b", "name": "bname" }
]
```

```md
---
order: 300
title: "篇名"
volumeId: "a"
date: "1999-01-01"
source: "自录"
sourceUrl: "https://example.com/original"
---

正文从这里开始。
```

## GitHub Pages

仓库推到 GitHub 后，第一次部署前先在 Settings → Pages 里把 Source 选为 GitHub Actions。之后每次推送到 `main`，`.github/workflows/pages.yml` 会自动：

1. 运行 `npm run build`
2. 上传静态站点
3. 部署到 GitHub Pages
