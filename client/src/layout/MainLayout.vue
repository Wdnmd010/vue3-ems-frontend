<template>
  <div class="app">
    <!-- 顶部导航：与页面背景同色，无独立面板、无边框、无阴影 -->
    <header class="topbar">
      <router-link to="/dashboard" class="topbar__brand">
        <span class="topbar__logo"><el-icon><Grid /></el-icon></span>
        <span class="topbar__name">员工管理系统</span>
      </router-link>

      <nav class="topbar__nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-pill"
          :class="{ 'nav-pill--active': route.path === item.path }"
        >
          <el-icon class="nav-pill__icon"><component :is="item.icon" /></el-icon>
          <span class="nav-pill__text">{{ item.title }}</span>
        </router-link>
      </nav>

      <div class="topbar__user">
        <span class="topbar__username">
          <span class="topbar__avatar"><el-icon><UserFilled /></el-icon></span>
          <span class="topbar__username-text">{{ authState.user?.username || '' }}</span>
        </span>
        <button
          type="button"
          class="topbar__logout"
          :disabled="logoutLoading"
          @click="handleLogout"
        >
          <el-icon><SwitchButton /></el-icon>
          <span class="topbar__logout-text">{{ logoutLoading ? '退出中…' : '退出登录' }}</span>
        </button>
      </div>
    </header>

    <main class="app__main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  DataAnalysis,
  User,
  OfficeBuilding,
  Grid,
  UserFilled,
  SwitchButton,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();

const { state: authState, logout } = useAuthStore();
const logoutLoading = ref(false);

// 退出登录：防重复点击，成功后清理状态并回登录页（逻辑未改动）
async function handleLogout() {
  if (logoutLoading.value) return;
  logoutLoading.value = true;
  try {
    await logout();
    router.replace('/login');
  } catch {
    ElMessage.error('退出失败，请稍后重试');
  } finally {
    logoutLoading.value = false;
  }
}

const menus = [
  { path: '/dashboard', title: '首页', icon: DataAnalysis },
  { path: '/employees', title: '员工管理', icon: User },
  { path: '/departments', title: '部门管理', icon: OfficeBuilding },
];
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--ems-bg);
}

/* ---------- 顶部导航 ---------- */
/* 三列栅格：品牌左、导航严格居中、用户信息右，避免用 auto margin 时导航被右侧信息挤偏 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  height: 68px;
  padding: 0 28px;
  /* 整行与页面背景完全一致，不设独立背景色 / 边框 / 阴影 */
  background-color: var(--ems-bg);
}

.topbar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-self: start;
  min-width: 0;
  text-decoration: none;
}

.topbar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: var(--ems-primary);
  color: #ffffff;
  font-size: 17px;
}

.topbar__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ems-text);
  white-space: nowrap;
}

.topbar__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 导航项之间留出更舒展的间距 */
  gap: 10px;
  justify-self: center;
}

/* 胶囊导航按钮：未选中透明底 + 柔和灰白文字 */
.nav-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 18px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  color: #a6a6b0;
  text-decoration: none;
  white-space: nowrap;
  transition: var(--ems-transition);
}

.nav-pill:hover {
  color: var(--ems-text);
  background-color: rgba(255, 255, 255, 0.05);
}

/* 选中态：纯白底 + 深黑文字图标，靠对比度区分，不用彩色 */
.nav-pill--active,
.nav-pill--active:hover {
  background-color: #ffffff;
  color: #0b0b0d;
  font-weight: 500;
}

.nav-pill__icon {
  font-size: 16px;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-self: end;
  min-width: 0;
}

.topbar__username {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ems-text-secondary);
}

.topbar__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--ems-input);
  color: var(--ems-text-secondary);
  font-size: 15px;
}

.topbar__logout {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--ems-border);
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: var(--ems-text-secondary);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: var(--ems-transition);
}

.topbar__logout:hover:not(:disabled) {
  background-color: var(--ems-card);
  border-color: #3d3d46;
  color: var(--ems-text);
}

.topbar__logout:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* ---------- 主内容 ---------- */
.app__main {
  flex: 1;
  padding: 24px 28px 32px;
}

/* ---------- 平板 ---------- */
@media (max-width: 1023px) {
  .topbar {
    gap: 10px;
    padding: 0 18px;
  }

  .nav-pill {
    padding: 0 12px;
    font-size: 13px;
  }

  .app__main {
    padding: 20px 18px 26px;
  }
}

/* ---------- 手机：紧凑横向，仅保留图标 ---------- */
@media (max-width: 767px) {
  .topbar {
    height: 56px;
    gap: 8px;
    padding: 0 12px;
  }

  .topbar__name,
  .nav-pill__text,
  .topbar__username-text,
  .topbar__logout-text {
    display: none;
  }

  .topbar__nav {
    gap: 4px;
  }

  .nav-pill {
    height: 34px;
    padding: 0 10px;
  }

  .nav-pill__icon {
    font-size: 17px;
  }

  .topbar__logout {
    padding: 0 9px;
  }

  .app__main {
    padding: 16px 12px 24px;
  }
}
</style>
