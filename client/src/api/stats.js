import { computeDashboardStats } from '../data/db';

// 首页仪表盘统计：数据全部由本地员工/部门数据实时汇总
export async function getDashboardStats() {
  return { data: computeDashboardStats() };
}
