# zppf001 项目说明

## 1. 项目功能

`zppf001` 的应用标题是 `Production label`。根据现有文件判断，这是一个围绕生产标签展示、打印或输出场景构建的 SAP Fiori 应用。

## 2. 主要页面/模块

- `webapp/manifest.json`
  - 定义应用入口、路由和数据源配置。
- `webapp/ext/controller`
  - 当前目录下有 1 个扩展 controller。
- `webapp/ext/fragment`
  - 当前目录下有 3 个 fragment，用于承载标签相关弹窗或辅助交互。
- `README.md`
  - 记录应用标题、模板来源和服务基础信息。

## 3. 用到的知识点

- SAP Fiori elements List Report V4。
- OData V4 服务绑定。
- ControllerExtension 扩展。
- Fragment 弹窗交互。
- 标签或表单输出类页面设计。

## 4. 开发/沟通过程遇到的问题

- 当前仓库中尚未整理出该项目的专项沟通记录。
- 当前能确认项目含有多个 fragment，但具体标签预览、打印和辅助交互流程待确认。

## 5. 解决方案

- 先根据现有文件建立首版说明。
- 后续应优先从扩展 controller 和 3 个 fragment 的实现反推标签业务流程。

## 6. 待确认项

- 生产标签的展示与打印流程，待确认。
- 3 个 fragment 的具体职责，待确认。
- 项目当前使用状态，待确认。
- 打印页数和扩展按钮暂时先注释
```json
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                  "updateGroupId": "API",
                  "submitMode": "API",
                  "tableSettings": {
                    "type": "GridTable",
                    "enableMassEdit": false,
                    "selectAll": true
                  },
                  "columns": {
                    "AddColumn": {
                      "header": "{i18n>numberOfLabels}",
                      "position": {
                        "anchor": "DataField::ExpiredDate",
                        "placement": "After"
                      },
                      "template": "com.cathaydining.zppf001.ext.fragment.AddColumn"
                    }
                  },
                  "actions": {
                    "print": {
                      "press": ".extension.com.cathaydining.zppf001.ext.controller.ListReportExtension.onPrintAction",
                      "visible": true,
                      "enabled": true,
                      "requiresSelection": true,
                      "text": "Print"
                    }
                  }
                }
              }
```
