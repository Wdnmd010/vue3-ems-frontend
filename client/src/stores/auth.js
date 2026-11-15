import { reactive } from 'vue';
import { loginApi, meApi, logoutApi, demoLoginApi } from '../api/auth';

/**
 * 认证状态单例（响应式）
 * 纯前端版本：登录状态持久化在 localStorage（api/auth 内部维护），
 * 这里只缓存当前用户的非敏感信息（id、username），不保存密码。
 */
const state = reactive({
  user: null, // { id, username } | null
  ready: false, // 是否已完成首次登录状态检查
});

// 防止多个页面/守卫同时初始化时重复读取会话
let mePromise = null;

// 获取当前登录用户；未登录时返回 null 而不是抛错
async function fetchMe() {
  if (state.user) return state.user;
  if (mePromise) return mePromise;
  mePromise = meApi()
    .then((res) => {
      state.user = res.data;
      return state.user;
    })
    .catch(() => {
      state.user = null;
      return null;
    })
    .finally(() => {
      state.ready = true;
      mePromise = null;
    });
  return mePromise;
}

// 登录：成功后缓存用户信息；失败时清空状态并抛出可读提示
async function login(username, password) {
  try {
    const res = await loginApi({ username, password });
    state.user = res.data;
    state.ready = true;
    return state.user;
  } catch (err) {
    state.user = null;
    throw err;
  }
}

// 管理员快捷登录
async function demoLogin() {
  try {
    const res = await demoLoginApi();
    state.user = res.data;
    state.ready = true;
    return state.user;
  } catch (err) {
    state.user = null;
    throw err;
  }
}

// 退出登录：清除会话记录与内存状态
async function logout() {
  try {
    await logoutApi();
  } finally {
    state.user = null;
  }
}

// 仅清空内存状态（会话异常时兜底）
function clearUser() {
  state.user = null;
}

export function useAuthStore() {
  return { state, fetchMe, login, demoLogin, logout, clearUser };
}
