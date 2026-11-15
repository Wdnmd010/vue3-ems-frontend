import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('../layout/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页仪表盘', requiresAuth: true },
      },
      {
        path: 'employees',
        name: 'EmployeeList',
        component: () => import('../views/EmployeeList.vue'),
        meta: { title: '员工管理', requiresAuth: true },
      },
      {
        path: 'departments',
        name: 'DepartmentList',
        component: () => import('../views/DepartmentList.vue'),
        meta: { title: '部门管理', requiresAuth: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

// 使用 Hash 路由：部署到 GitHub Pages 等静态托管时，刷新/#/employees 不会 404
// （History 模式需要服务端把所有路径回退到 index.html，静态托管做不到）
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 全局前置守卫：
// - 业务页面需登录，未登录跳 /login 并携带 redirect；
// - 已登录访问 /login 自动回仪表盘；
// - 登录状态从 localStorage 读取，无网络请求
router.beforeEach(async (to) => {
  const { state, fetchMe } = useAuthStore();

  if (to.meta.public) {
    const user = state.user || (await fetchMe());
    if (user) return { path: '/dashboard', replace: true };
    return true;
  }

  if (to.meta.requiresAuth) {
    const user = state.user || (await fetchMe());
    if (!user) {
      return {
        path: '/login',
        query: to.fullPath !== '/dashboard' ? { redirect: to.fullPath } : {},
        replace: true,
      };
    }
  }
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} - 企业员工资料管理系统`
    : '企业员工资料管理系统';
});

export default router;
