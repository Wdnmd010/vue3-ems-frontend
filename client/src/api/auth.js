import { findUser, findAdmin, readSession, writeSession, clearSession } from '../data/db';

/**
 * 认证接口（纯前端演示版）
 *
 * 说明：没有后端、没有 JWT / Cookie / bcrypt。
 * 账号密码直接与 localStorage 中的演示账号比对，登录状态以 localStorage 中的
 * session 记录表示。仅用于课程演示，**不构成任何真实的安全认证**。
 */

export async function loginApi({ username, password } = {}) {
  const user = findUser(username, password);
  if (!user) {
    throw new Error('账号或密码不正确');
  }
  const data = { id: user.id, username: user.username };
  writeSession(data);
  return { data };
}

export async function meApi() {
  const session = readSession();
  if (!session) throw new Error('未登录');
  return { data: { id: session.id, username: session.username } };
}

export async function logoutApi() {
  clearSession();
  return { data: null };
}

// 管理员快捷登录：本地没有多用户权限体系，直接以演示管理员身份登录
export async function demoLoginApi() {
  const admin = findAdmin();
  if (!admin) throw new Error('没有可用的管理员账号');
  const data = { id: admin.id, username: admin.username };
  writeSession(data);
  return { data };
}

// 查询快捷登录可用性与管理员用户名（纯前端下始终可用）
export async function demoLoginInfoApi() {
  const admin = findAdmin();
  if (!admin) throw new Error('没有可用的管理员账号');
  return { data: { username: admin.username, role: admin.role } };
}
