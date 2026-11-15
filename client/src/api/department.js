import {
  queryDepartmentOptions,
  queryDepartments,
  insertDepartment,
  modifyDepartment,
  removeDepartment,
} from '../data/db';

/**
 * 部门接口（纯前端版）
 * 返回结构与原来保持一致：{ data: ... }
 */

export async function getDepartmentOptions() {
  return { data: queryDepartmentOptions() };
}

export async function getDepartments(params) {
  return { data: queryDepartments(params) };
}

export async function createDepartment(data) {
  return { data: insertDepartment(data) };
}

export async function updateDepartment(id, data) {
  return { data: modifyDepartment(id, data) };
}

export async function deleteDepartment(id) {
  removeDepartment(id);
  return { data: { id } };
}
