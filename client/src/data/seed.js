// 首次打开系统时写入浏览器的演示数据（结构与原 MySQL 种子数据一致）
// 只有 localStorage 中不存在数据时才会注入，不会覆盖用户已修改的内容

export const DEMO_USER = {
  id: 1,
  username: 'root',
  password: 'admin123',
  role: 'admin',
};

export const SEED_DEPARTMENTS = [
  { id: 1, name: '技术部', description: '负责产品研发与技术支持' },
  { id: 2, name: '人事部', description: '负责招聘、考勤与员工关系' },
  { id: 3, name: '财务部', description: '负责公司财务与报销' },
  { id: 4, name: '市场部', description: '负责市场推广与品牌宣传' },
  { id: 5, name: '行政部', description: '负责日常行政与后勤保障' },
];

export const SEED_EMPLOYEES = [
  { emp_no: 'EMP001', name: '张伟', gender: '男', phone: '13800000001', email: 'zhangwei@example.com', department_id: 1, position: '后端工程师', status: 1, hire_date: '2023-03-15' },
  { emp_no: 'EMP002', name: '李娜', gender: '女', phone: '13800000002', email: 'lina@example.com', department_id: 1, position: '前端工程师', status: 1, hire_date: '2023-05-20' },
  { emp_no: 'EMP003', name: '王强', gender: '男', phone: '13800000003', email: 'wangqiang@example.com', department_id: 1, position: '技术总监', status: 1, hire_date: '2021-07-01' },
  { emp_no: 'EMP004', name: '刘洋', gender: '男', phone: '13800000004', email: 'liuyang@example.com', department_id: 2, position: '人事专员', status: 1, hire_date: '2024-01-10' },
  { emp_no: 'EMP005', name: '陈静', gender: '女', phone: '13800000005', email: 'chenjing@example.com', department_id: 2, position: '人事经理', status: 1, hire_date: '2022-09-05' },
  { emp_no: 'EMP006', name: '杨帆', gender: '男', phone: '13800000006', email: 'yangfan@example.com', department_id: 3, position: '会计', status: 1, hire_date: '2023-11-18' },
  { emp_no: 'EMP007', name: '赵敏', gender: '女', phone: '13800000007', email: 'zhaomin@example.com', department_id: 4, position: '市场专员', status: 0, hire_date: '2022-04-02' },
  { emp_no: 'EMP008', name: '孙磊', gender: '男', phone: '13800000008', email: 'sunlei@example.com', department_id: 4, position: '市场经理', status: 1, hire_date: '2020-12-01' },
  { emp_no: 'EMP009', name: '周洁', gender: '女', phone: '13800000009', email: 'zhoujie@example.com', department_id: 5, position: '行政专员', status: 1, hire_date: '2024-06-25' },
  { emp_no: 'EMP010', name: '吴军', gender: '男', phone: '13800000010', email: 'wujun@example.com', department_id: 1, position: '测试工程师', status: 0, hire_date: '2023-08-14' },
];

// 生成一份全新的初始库（含自增序列，替代 MySQL 的 AUTO_INCREMENT）
export function createSeedData() {
  const now = new Date().toISOString();
  return {
    version: 1,
    users: [{ ...DEMO_USER }],
    departments: SEED_DEPARTMENTS.map((d, i) => ({
      ...d,
      created_at: now,
      updated_at: now,
      _order: i + 1,
    })),
    employees: SEED_EMPLOYEES.map((e, i) => ({
      ...e,
      id: i + 1,
      created_at: now,
      updated_at: now,
    })),
    seq: {
      department: SEED_DEPARTMENTS.length + 1,
      employee: SEED_EMPLOYEES.length + 1,
    },
  };
}
