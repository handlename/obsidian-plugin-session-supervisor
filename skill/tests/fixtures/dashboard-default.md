## ユーザーの番

```base
filters:
  and:
    - file.hasTag("supervised")
    - '!file.inFolder("_templates")'
    - '!file.hasTag("project")'
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
    order: [formula.title, summary, priority, subtasks, task_id, parent]
    sort:
      - property: formula.priority_rank
        direction: ASC
      - property: file.mtime
        direction: DESC
    groupOrder: [backlog, in progress, pending, done, archived]
    hideEmptyGroups: false
```

## エージェントの番

```base
filters:
  and:
    - file.hasTag("supervised")
    - '!file.inFolder("_templates")'
    - '!file.hasTag("project")'
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
    order: [formula.title, summary, priority, subtasks, task_id, parent]
    sort:
      - property: formula.priority_rank
        direction: ASC
      - property: file.mtime
        direction: DESC
    groupOrder: [backlog, in progress, pending, done, archived]
    hideEmptyGroups: false
```

## プロジェクト

```base
filters:
  and:
    - file.hasTag("supervised")
    - '!file.inFolder("_templates")'
    - file.hasTag("project")
formulas:
  title: link(file.name, title)
views:
  - type: kanban
    name: プロジェクト
    groupBy:
      property: status
      direction: ASC
    order: [formula.title, summary, project_id, assignee]
    groupOrder: [backlog, in progress, pending, done, archived]
    hideEmptyGroups: false
```
