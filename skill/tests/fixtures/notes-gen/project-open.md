---
uid: "20261110_090000"
title: "t"
para: "Project"
aliases: []
created_at: 2026-11-10 09:00:00
archived_at: null
tags: ["supervised","project","task"]
start_date: null
due_date: null
pending_until: null
completed_at: null
status: "in progress"
assignee: "user"
summary: null
project_id: "P-1"
---
## 概要


## タスク

### ユーザーの番

```base
filters:
  and:
    - file.hasTag("supervised")
    - '!file.hasTag("project")'
    - 'parent == this'
    - 'assignee == "user"'
formulas:
  title: link(file.name, title)
  priority_rank: 'if(priority == "A", 1, if(priority == "C", 3, 2))'
views:
  - type: kanban
    name: ユーザー
    groupBy:
      property: status
      direction: ASC
    order: [formula.title, summary, priority, task_id, subtasks]
    sort:
      - property: formula.priority_rank
        direction: ASC
      - property: file.mtime
        direction: DESC
    groupOrder: [backlog, in progress, pending, done, archived]
    hideEmptyGroups: false
```

### エージェントの番

```base
filters:
  and:
    - file.hasTag("supervised")
    - '!file.hasTag("project")'
    - 'parent == this'
    - 'assignee == "agent"'
formulas:
  title: link(file.name, title)
  priority_rank: 'if(priority == "A", 1, if(priority == "C", 3, 2))'
views:
  - type: kanban
    name: エージェント
    groupBy:
      property: status
      direction: ASC
    order: [formula.title, summary, priority, task_id, subtasks]
    sort:
      - property: formula.priority_rank
        direction: ASC
      - property: file.mtime
        direction: DESC
    groupOrder: [backlog, in progress, pending, done, archived]
    hideEmptyGroups: false
```

## 知見


## アクション

### [UA-0001] @user どちらにしますか

<!-- sv ask since=2026-11-10T09:00:00+09:00 -->

#### やりとり

- [ ] 完了にする



## 関連ノート


## 関連資料


## ログ

