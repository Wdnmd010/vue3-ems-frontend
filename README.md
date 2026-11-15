# 企业员工资料管理系统（纯前端版）

Vue 3 + Element Plus 实现的员工资料管理系统，**纯前端架构**：数据保存在浏览器 localStorage，不需要 Node.js 后端、Express、MySQL 或任何数据库，构建后可直接部署到 GitHub Pages。

> 本项目为课程实训作品，登录为**演示性质**，不具备真实的安全认证能力。

---

## 功能

| 模块 | 内容 |
|---|---|
| 登录 | 账号密码登录、管理员快捷登录、登录状态持久化、路由守卫 |
| 首页 | 四张统计卡、部门人员分布柱状图、性别分布环形图、最近入职列表、快捷操作 |
| 员工管理 | 列表、关键词搜索、部门/状态筛选、分页、新增、编辑、删除、Excel 导入（含预览校验）、导出 |
| 部门管理 | 列表、搜索、分页、新增、编辑、删除、部门人数统计（有员工的部门禁止删除） |
| 通用 | 顶部胶囊导航、响应式（桌面 / 平板 / 手机）、统一深色主题 |

## 技术栈

- Vue 3 + Vite 6
- Element Plus（深色主题变量）
- Vue Router 4（**Hash 模式**）
- ECharts 6（按需引入）
- ExcelJS 4（浏览器端读写 xlsx，按需动态加载）

## 快速开始

```bash
cd client
npm install
npm run dev        # http://127.0.0.1:5173
```

生产构建：

```bash
cd client
npm run build      # 产物在 client/dist
npm run preview    # 本地预览构建结果
```

## 演示账号

| 账号 | 密码 |
|---|---|
| `root` | `admin123` |

登录页也提供「一键登录」卡片，无需输入即可进入系统。

## 数据说明

- 所有数据（员工、部门、账号、登录状态）保存在浏览器 **localStorage**：
  - `ems.db` —— 业务数据，含 `version` 字段，后续结构升级会自动迁移补齐
  - `ems.session` —— 登录状态
- 首次打开且本地无数据时，自动写入 5 个部门 + 10 名员工的演示数据；**已有数据不会被覆盖**。
- 刷新页面、关闭浏览器后重新打开，数据仍然保留。
- 清空数据：浏览器控制台执行 `localStorage.clear()` 后刷新，会重新生成演示数据。
- 数据只存在当前浏览器、当前域名下，换浏览器或换设备不会同步。

## 部署到 GitHub Pages

仓库已内置 `.github/workflows/deploy.yml`，步骤：

1. 把项目推到 GitHub 仓库（默认分支 `main`）。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送后自动构建部署，访问 `https://<用户名>.github.io/<仓库名>/`。

要点说明：

- `vite.config.js` 中 `base: './'`，资源用相对路径引用，部署在任意仓库子路径下都能正常加载，不需要改配置。
- 路由使用 Hash 模式（`/#/employees`），刷新页面不会 404，静态托管无需额外回退规则。
- 部署产物只包含 `client/dist`，与仓库里的其它目录无关。

其它静态托管（Vercel / Netlify / 宝塔 / Nginx）把 `client/dist` 直接上传即可，无需任何服务端配置。

## 目录结构

```
.
├─ .github/workflows/deploy.yml   GitHub Pages 自动部署
├─ client/                        前端工程
│  ├─ src/
│  │  ├─ api/                     业务接口层（函数签名与原后端一致）
│  │  ├─ data/                    数据层：localStorage 读写、演示数据、统计计算
│  │  ├─ utils/employeeExcel.js   Excel 导入解析 / 导出生成
│  │  ├─ stores/auth.js           登录状态
│  │  ├─ router/index.js          Hash 路由与守卫
│  │  ├─ layout/MainLayout.vue    顶部胶囊导航
│  │  └─ views/                   Login / Dashboard / EmployeeList / DepartmentList
│  ├─ index.html
│  └─ vite.config.js
└─ 项目文档/                      各阶段实施报告与改造说明
```

## 与原前后端分离版的差异

| 项目 | 原版 | 当前版本 |
|---|---|---|
| 数据存储 | MySQL | localStorage |
| 后端 | Express + MySQL + 连接池 | 无 |
| 认证 | JWT + HttpOnly Cookie + bcrypt | localStorage 会话（演示） |
| Excel | 后端 ExcelJS + Multer，接口传文件 | 浏览器端 ExcelJS 直接读写 |
| 路由 | History 模式（需服务端回退） | Hash 模式（静态托管友好） |
| 部署 | 需常驻 Node 服务 | 任意静态托管 |

## 已知限制

1. 演示登录把账号密码写在本地数据里，任何人打开浏览器都能看到，**不可用于真实生产环境**。
2. 数据只存在单浏览器本地，换设备/清缓存即丢失，无多人协作与并发控制。
3. 单次导入上限 5000 行；ExcelJS 首次加载约 940 KB（按需加载，不影响首屏）。
4. 无文件上传服务，员工头像等二进制资源不在功能范围内。

## 免责声明

本项目仅用于课程实训与演示，登录校验、权限控制均为前端模拟，不构成任何安全保证。
