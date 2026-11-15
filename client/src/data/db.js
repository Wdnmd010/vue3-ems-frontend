/**
 * 纯前端数据层：以 localStorage 作为唯一数据源。
 *
 * 设计要点
 * 1. 全站只有这一个模块直接读写 localStorage，页面与 api 层都不直接操作存储。
 * 2. 数据带 version 字段，读取时统一走 migrate()，后续版本升级可以在这里平滑补字段。
 * 3. 首次访问（本地无数据）才写入演示数据；已有数据永远不会被覆盖。
 * 4. 写操作统一「读 → 改 → 落盘」，每次写完立即持久化，刷新/关浏览器都不丢。
 */
import { createSeedData } from './seed';

const STORAGE_KEY = 'ems.db';
const SESSION_KEY = 'ems.session';
const CURRENT_VERSION = 1;

/* ---------------- 存储读写 ---------------- */

// 把任意历史结构补齐成当前结构，避免旧数据读不出来
function migrate(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const base = createSeedData();

  const db = {
    version: CURRENT_VERSION,
    users: Array.isArray(data.users) && data.users.length ? data.users : base.users,
    departments: Array.isArray(data.departments) ? data.departments : base.departments,
    employees: Array.isArray(data.employees) ? data.employees : base.employees,
    seq: {
      department: Number(data.seq?.department) || base.seq.department,
      employee: Number(data.seq?.employee) || base.seq.employee,
    },
  };

  // 逐条补齐可能缺失的字段（旧版本数据缺列时不至于渲染出错）
  db.departments = db.departments.map((d) => ({
    id: Number(d.id),
    name: String(d.name ?? '').trim(),
    description: d.description ?? null,
    created_at: d.created_at || new Date().toISOString(),
    updated_at: d.updated_at || d.created_at || new Date().toISOString(),
  }));

  db.employees = db.employees.map((e) => ({
    id: Number(e.id),
    emp_no: String(e.emp_no ?? '').trim(),
    name: String(e.name ?? '').trim(),
    gender: e.gender === '女' ? '女' : '男',
    phone: e.phone || null,
    email: e.email || null,
    department_id: e.department_id === null || e.department_id === undefined ? null : Number(e.department_id),
    position: e.position || null,
    status: Number(e.status) === 0 ? 0 : 1,
    hire_date: e.hire_date || null,
    created_at: e.created_at || new Date().toISOString(),
    updated_at: e.updated_at || e.created_at || new Date().toISOString(),
  }));

  // 序列兜底：不能小于现有最大 id，否则新增会出现主键冲突
  const maxDeptId = db.departments.reduce((m, d) => Math.max(m, d.id || 0), 0);
  const maxEmpId = db.employees.reduce((m, e) => Math.max(m, e.id || 0), 0);
  db.seq.department = Math.max(db.seq.department, maxDeptId + 1);
  db.seq.employee = Math.max(db.seq.employee, maxEmpId + 1);

  return db;
}

// 读取整库：不存在或损坏时自动初始化演示数据
export function readDb() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // 隐私模式等场景下 localStorage 不可用，退回内存态，保证页面不白屏
    return migrate(null);
  }
  if (!raw) {
    const seed = createSeedData();
    writeDb(seed);
    return seed;
  }
  try {
    return migrate(JSON.parse(raw));
  } catch {
    const seed = createSeedData();
    writeDb(seed);
    return seed;
  }
}

// 落盘
export function writeDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...db, version: CURRENT_VERSION }));
  } catch (err) {
    throw new Error('本地存储写入失败，可能是浏览器存储空间已满或被禁用');
  }
}

// 只读快照（调用方拿到的是副本，避免误改缓存）
export function snapshot() {
  return JSON.parse(JSON.stringify(readDb()));
}

// 清空本地数据（用于「重置演示数据」，路由/页面暂未使用，保留给后续扩展）
export function resetDb() {
  const seed = createSeedData();
  writeDb(seed);
  return seed;
}

/* ---------------- 通用工具 ---------------- */

const now = () => new Date().toISOString();
const toIntOrNull = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const PAGE_SIZE_MAX = 100;

function normalizePaging({ page, pageSize } = {}) {
  let p = Number(page) || 1;
  let s = Number(pageSize) || 10;
  if (p < 1) p = 1;
  if (s < 1) s = 10;
  if (s > PAGE_SIZE_MAX) s = PAGE_SIZE_MAX;
  return { page: p, pageSize: s };
}

function paginate(list, { page, pageSize }) {
  const start = (page - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
  };
}

/* ---------------- 部门 ---------------- */

export function queryDepartmentOptions() {
  const db = readDb();
  return db.departments
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((d) => ({ id: d.id, name: d.name }));
}

export function queryDepartments({ keyword, page, pageSize } = {}) {
  const db = readDb();
  const kw = String(keyword ?? '').trim().toLowerCase();
  const paging = normalizePaging({ page, pageSize });

  const countMap = new Map();
  db.employees.forEach((e) => {
    if (e.department_id === null) return;
    countMap.set(e.department_id, (countMap.get(e.department_id) || 0) + 1);
  });

  let rows = db.departments.slice().sort((a, b) => a.id - b.id);
  if (kw) {
    rows = rows.filter(
      (d) =>
        d.name.toLowerCase().includes(kw) ||
        String(d.description || '').toLowerCase().includes(kw)
    );
  }

  const withCount = rows.map((d) => ({ ...d, employee_count: countMap.get(d.id) || 0 }));
  return paginate(withCount, paging);
}

function assertDepartmentName(name, excludeId = null) {
  const value = String(name ?? '').trim();
  if (!value) throw new Error('部门名称不能为空');
  if (value.length > 50) throw new Error('部门名称长度不能超过 50 个字符');

  const db = readDb();
  const duplicated = db.departments.some(
    (d) => d.name.trim() === value && d.id !== excludeId
  );
  if (duplicated) throw new Error(`部门「${value}」已存在`);
  return value;
}

export function insertDepartment({ name, description } = {}) {
  const value = assertDepartmentName(name);
  const desc = description ? String(description).trim() : null;
  if (desc && desc.length > 200) throw new Error('部门描述长度不能超过 200 个字符');

  const db = readDb();
  const row = {
    id: db.seq.department,
    name: value,
    description: desc,
    created_at: now(),
    updated_at: now(),
  };
  db.departments.push(row);
  db.seq.department += 1;
  writeDb(db);
  return { ...row, employee_count: 0 };
}

export function modifyDepartment(id, { name, description } = {}) {
  const deptId = Number(id);
  const db = readDb();
  const row = db.departments.find((d) => d.id === deptId);
  if (!row) throw new Error('部门不存在');

  const value = assertDepartmentName(name, deptId);
  const desc = description ? String(description).trim() : null;
  if (desc && desc.length > 200) throw new Error('部门描述长度不能超过 200 个字符');

  row.name = value;
  row.description = desc;
  row.updated_at = now();
  writeDb(db);
  return { ...row };
}

export function removeDepartment(id) {
  const deptId = Number(id);
  const db = readDb();
  const index = db.departments.findIndex((d) => d.id === deptId);
  if (index < 0) throw new Error('部门不存在');

  const used = db.employees.filter((e) => e.department_id === deptId).length;
  if (used > 0) {
    throw new Error(`该部门下仍有 ${used} 名员工，请先将员工转移到其他部门后再删除`);
  }

  db.departments.splice(index, 1);
  writeDb(db);
  return true;
}

/* ---------------- 员工 ---------------- */

const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMP_NO_RE = /^[A-Za-z0-9_-]{2,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateText(str) {
  if (!DATE_RE.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

// 与后端一致的字段校验：返回规范化后的数据，非法时抛出可读错误
export function validateEmployeeInput(input = {}, { excludeId = null, departments = null } = {}) {
  const deptList = departments || readDb().departments;

  const data = {
    emp_no: String(input.emp_no ?? '').trim(),
    name: String(input.name ?? '').trim(),
    gender: String(input.gender ?? '').trim(),
    phone: input.phone ? String(input.phone).trim() : null,
    email: input.email ? String(input.email).trim() : null,
    department_id: toIntOrNull(input.department_id),
    position: input.position ? String(input.position).trim() : '',
    status: Number(input.status) === 0 ? 0 : 1,
    hire_date: input.hire_date ? String(input.hire_date).trim() : null,
  };

  if (!data.emp_no) throw new Error('工号不能为空');
  if (!EMP_NO_RE.test(data.emp_no)) throw new Error('工号格式不正确（2-20位字母、数字、-、_）');
  if (!data.name) throw new Error('姓名不能为空');
  if (data.name.length > 50) throw new Error('姓名长度不能超过50个字符');
  if (data.gender !== '男' && data.gender !== '女') throw new Error('性别只能填写「男」或「女」');
  if (data.phone && !PHONE_RE.test(data.phone)) throw new Error('手机号格式不正确');
  if (data.phone && data.phone.length > 20) throw new Error('手机号长度不能超过20个字符');
  if (data.email && !EMAIL_RE.test(data.email)) throw new Error('邮箱格式不正确');
  if (data.email && data.email.length > 100) throw new Error('邮箱长度不能超过100个字符');
  if (!data.position) throw new Error('职位不能为空');
  if (data.position.length > 50) throw new Error('职位长度不能超过50个字符');
  if (data.department_id !== null) {
    const exists = deptList.some((d) => Number(d.id) === data.department_id);
    if (!exists) throw new Error('所属部门不存在');
  }
  if (data.hire_date && !isValidDateText(data.hire_date)) {
    throw new Error('入职日期不是有效日期，格式应为 YYYY-MM-DD');
  }

  // 工号唯一（localStorage 中按不区分大小写比较，与 MySQL utf8mb4_unicode_ci 行为一致）
  const db = readDb();
  const dup = db.employees.some(
    (e) => e.emp_no.toLowerCase() === data.emp_no.toLowerCase() && e.id !== excludeId
  );
  if (dup) throw new Error(`工号 ${data.emp_no} 已存在`);

  return data;
}

function withDepartmentName(employee, deptMap) {
  return {
    ...employee,
    department_name: employee.department_id ? deptMap.get(employee.department_id) || null : null,
  };
}

// 按筛选条件取员工（供列表与导出共用）
export function selectEmployees({ keyword, department_id, status } = {}) {
  const db = readDb();
  const deptMap = new Map(db.departments.map((d) => [d.id, d.name]));
  const kw = String(keyword ?? '').trim().toLowerCase();
  const deptId = toIntOrNull(department_id);
  const statusNum = status === null || status === undefined || status === '' ? null : Number(status);

  let rows = db.employees
    .slice()
    .sort((a, b) => b.id - a.id) // 与原后端 ORDER BY e.id DESC 一致
    .map((e) => withDepartmentName(e, deptMap));

  if (kw) {
    rows = rows.filter(
      (e) => e.name.toLowerCase().includes(kw) || e.emp_no.toLowerCase().includes(kw)
    );
  }
  if (deptId !== null) rows = rows.filter((e) => e.department_id === deptId);
  if (statusNum !== null) rows = rows.filter((e) => e.status === statusNum);

  return rows;
}

export function queryEmployees({ keyword, department_id, status, page, pageSize } = {}) {
  const rows = selectEmployees({ keyword, department_id, status });
  return paginate(rows, normalizePaging({ page, pageSize }));
}

export function findEmployee(id) {
  const db = readDb();
  const deptMap = new Map(db.departments.map((d) => [d.id, d.name]));
  const row = db.employees.find((e) => e.id === Number(id));
  if (!row) throw new Error('员工不存在');
  return withDepartmentName(row, deptMap);
}

export function insertEmployee(input) {
  const data = validateEmployeeInput(input);
  const db = readDb();
  const row = { id: db.seq.employee, ...data, created_at: now(), updated_at: now() };
  db.employees.push(row);
  db.seq.employee += 1;
  writeDb(db);
  return findEmployee(row.id);
}

export function modifyEmployee(id, input) {
  const empId = Number(id);
  const db = readDb();
  const row = db.employees.find((e) => e.id === empId);
  if (!row) throw new Error('员工不存在');

  const data = validateEmployeeInput(input, { excludeId: empId });
  Object.assign(row, data, { updated_at: now() });
  writeDb(db);
  return findEmployee(empId);
}

export function removeEmployee(id) {
  const empId = Number(id);
  const db = readDb();
  const index = db.employees.findIndex((e) => e.id === empId);
  if (index < 0) throw new Error('员工不存在');
  db.employees.splice(index, 1);
  writeDb(db);
  return true;
}

/* ---------------- 首页统计 ---------------- */

const RECENT_DAYS = 30;

function todayText() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysAgoText(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function computeDashboardStats() {
  const db = readDb();
  const today = todayText();
  // 含今天共 30 个自然日，且排除未来入职日期（与原 SQL 一致）
  const from = daysAgoText(RECENT_DAYS - 1);

  const total = db.employees.length;
  const active = db.employees.filter((e) => e.status === 1).length;
  const recentHires = db.employees.filter(
    (e) => e.hire_date && e.hire_date >= from && e.hire_date <= today
  ).length;

  // 部门分布：包含人数为 0 的部门，人数降序、同数按 id 升序
  const deptDist = db.departments
    .map((d) => ({
      name: d.name,
      count: db.employees.filter((e) => e.department_id === d.id).length,
      id: d.id,
    }))
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .map(({ name, count }) => ({ name, count }));

  // 性别分布：非男/女统一归入「未知」，人数降序
  const genderMap = new Map();
  db.employees.forEach((e) => {
    const key = e.gender === '男' || e.gender === '女' ? e.gender : '未知';
    genderMap.set(key, (genderMap.get(key) || 0) + 1);
  });
  const genderDist = [...genderMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 最近入职 5 人：排除未来日期，未填日期的排最后
  const deptNameMap = new Map(db.departments.map((d) => [d.id, d.name]));
  const recentEmployees = db.employees
    .filter((e) => !e.hire_date || e.hire_date <= today)
    .sort((a, b) => {
      if (!a.hire_date && !b.hire_date) return b.id - a.id;
      if (!a.hire_date) return 1;
      if (!b.hire_date) return -1;
      if (a.hire_date !== b.hire_date) return a.hire_date < b.hire_date ? 1 : -1;
      return b.id - a.id;
    })
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      emp_no: e.emp_no,
      name: e.name,
      department_name: e.department_id ? deptNameMap.get(e.department_id) || null : null,
      hire_date: e.hire_date,
    }));

  return {
    employee_total: total,
    employee_active: active,
    employee_inactive: total - active,
    department_total: db.departments.length,
    recent_days: RECENT_DAYS,
    recent_hires: recentHires,
    dept_distribution: deptDist,
    gender_distribution: genderDist,
    recent_employees: recentEmployees,
  };
}

/* ---------------- 会话（演示登录） ---------------- */

export function findUser(username, password) {
  const db = readDb();
  const name = String(username ?? '').trim();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === name.toLowerCase() && u.password === String(password ?? '')
  );
  return user || null;
}

export function findAdmin() {
  const db = readDb();
  return db.users.find((u) => u.role === 'admin') || db.users[0] || null;
}

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(user) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id: user.id, username: user.username, loginAt: now() })
    );
  } catch {
    // 存不下也不影响本次会话（state 里仍有用户）
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // 忽略
  }
}
