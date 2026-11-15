<template>
  <div class="login">
    <div class="login__card">
      <div class="login__brand">
        <span class="login__brand-dot"></span>
        <span class="login__brand-name">员工管理系统</span>
      </div>
      <p class="login__subtitle">企业员工资料管理系统 · 请登录后使用</p>
      <p class="login__tip">演示账号 {{ demoAccount }}　密码 {{ demoPassword }}</p>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入账号"
            :prefix-icon="User"
            autocomplete="username"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
            :disabled="loading"
          />
        </el-form-item>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          class="login__error"
        />

        <el-button
          type="primary"
          class="login__submit"
          :loading="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中…' : '登 录' }}
        </el-button>
      </el-form>

      <!-- 管理员快捷登录（仅本机演示环境可用；接口不可用时整块隐藏，不影响账号密码登录） -->
      <template v-if="demoAdmin">
        <div class="login__divider">或快捷登录</div>
        <button
          type="button"
          class="login__demo"
          :disabled="demoLoading || loading"
          @click="handleDemoLogin"
        >
          <span class="login__demo-avatar">A</span>
          <span class="login__demo-info">
            <span class="login__demo-name">{{ demoAdmin }}</span>
            <span class="login__demo-role">管理员账号</span>
          </span>
          <span class="login__demo-action">{{ demoLoading ? '登录中…' : '一键登录' }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User, Lock } from '@element-plus/icons-vue';
import { demoLoginInfoApi } from '../api/auth';
import { DEMO_USER } from '../data/seed';
import { useAuthStore } from '../stores/auth';

// 演示账号直接取自种子数据，界面提示与校验逻辑保持同一来源
const demoAccount = DEMO_USER.username;
const demoPassword = DEMO_USER.password;

const router = useRouter();
const route = useRoute();
const { login, demoLogin } = useAuthStore();

const formRef = ref();
const form = reactive({ username: '', password: '' });
const loading = ref(false);
const errorMessage = ref('');
const demoAdmin = ref('');
const demoLoading = ref(false);

// 登录成功后统一跳转：优先回到登录前想访问的页面，默认进入仪表盘
function goAfterLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '';
  router.replace(redirect && redirect.startsWith('/') ? redirect : '/dashboard');
}

function validate() {
  return formRef.value.validate().catch(() => false);
}

// 查询快捷登录是否可用：接口 403（未启用 / 非本机）时保持隐藏，不影响普通登录
onMounted(async () => {
  try {
    const res = await demoLoginInfoApi();
    demoAdmin.value = res.data?.username || '';
  } catch {
    demoAdmin.value = '';
  }
});

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

// 提交登录：loading 期间禁用表单防止重复提交，失败展示后端提示
async function handleLogin() {
  if (loading.value) return;
  errorMessage.value = '';
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await login(form.username.trim(), form.password);
    goAfterLogin();
  } catch (err) {
    errorMessage.value = err?.message || '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

// 管理员快捷登录：同样的加载态防重复提交，失败给出友好提示
async function handleDemoLogin() {
  if (demoLoading.value || loading.value) return;
  errorMessage.value = '';
  demoLoading.value = true;
  try {
    await demoLogin();
    goAfterLogin();
  } catch (err) {
    errorMessage.value = err?.message || '快捷登录失败，请稍后重试';
  } finally {
    demoLoading.value = false;
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ems-bg);
  padding: 16px;
}

.login__card {
  width: 100%;
  max-width: 420px;
  background-color: var(--ems-card);
  border: 1px solid var(--ems-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--ems-shadow-float);
  padding: 44px 40px 36px;
}

.login__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.login__brand-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--ems-primary);
}

.login__brand-name {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--ems-black);
}

.login__subtitle {
  margin: 12px 0 28px;
  text-align: center;
  font-size: 13px;
  color: var(--ems-text-secondary);
}

/* 纯前端演示版：账密直接写在这里，方便答辩现场登录 */
.login__tip {
  margin: -20px 0 22px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.2px;
  color: var(--ems-text-muted);
}

.login__error {
  margin-bottom: 18px;
}

.login__submit {
  width: 100%;
  letter-spacing: 6px;
}

/* ---------- 管理员快捷登录 ---------- */
.login__divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 16px;
  font-size: 12px;
  color: var(--ems-gray);
}

.login__divider::before,
.login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: var(--ems-border);
}

.login__demo {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background-color: var(--ems-input);
  border: 1px solid var(--ems-border);
  border-radius: var(--radius-md);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: var(--ems-transition);
}

.login__demo:hover:not(:disabled) {
  border-color: var(--ems-primary);
  background-color: var(--ems-primary-soft);
}

.login__demo:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.login__demo-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: var(--ems-primary-soft);
  color: var(--ems-primary-light);
  font-size: 14px;
  font-weight: 700;
}

.login__demo-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.login__demo-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ems-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login__demo-role {
  font-size: 12px;
  color: var(--ems-text-secondary);
}

.login__demo-action {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--ems-primary-light);
}

/* 小屏：收紧卡片内边距，避免内容过于拥挤 */
@media (max-width: 420px) {
  .login__card {
    padding: 32px 24px 28px;
  }

  .login__brand-name {
    font-size: 22px;
  }
}
</style>
