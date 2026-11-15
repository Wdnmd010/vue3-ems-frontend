import {
  queryEmployees,
  findEmployee,
  insertEmployee,
  modifyEmployee,
  removeEmployee,
  selectEmployees,
} from '../data/db';
import {
  buildEmployeeBlob,
  buildTemplateBlob,
  parseEmployeeFile,
  validateRows,
  commitImport,
} from '../utils/employeeExcel';

/**
 * 员工接口（纯前端版）
 * 保持与原后端相同的函数签名与返回结构（{ data: ... }），页面代码无需改动。
 */

export async function getEmployees(params) {
  return { data: queryEmployees(params) };
}

export async function getEmployee(id) {
  return { data: findEmployee(id) };
}

export async function createEmployee(data) {
  return { data: insertEmployee(data) };
}

export async function updateEmployee(id, data) {
  return { data: modifyEmployee(id, data) };
}

export async function deleteEmployee(id) {
  removeEmployee(id);
  return { data: { id } };
}

// 导出 Excel：返回 Blob，由页面负责触发下载（与原先 axios responseType=blob 的用法一致）
export async function exportEmployees(params = {}) {
  const scope = params.scope === 'all' ? 'all' : 'filtered';
  const rows = scope === 'all' ? selectEmployees({}) : selectEmployees(params);

  const exportRows = rows.map((row) => ({
    emp_no: row.emp_no,
    name: row.name,
    gender: row.gender,
    phone: row.phone || '',
    email: row.email || '',
    department_name: row.department_name || '',
    position: row.position || '',
    status_text: row.status === 1 ? '在职' : '离职',
    hire_date: row.hire_date || '',
  }));

  return buildEmployeeBlob(exportRows);
}

// 下载导入模板
export async function downloadImportTemplate() {
  return buildTemplateBlob();
}

// 读取本地文件为 ArrayBuffer
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('文件读取失败，请重新选择文件'));
    reader.readAsArrayBuffer(file);
  });
}

// 预览校验：只解析和校验，不写入任何数据
export async function previewImportEmployees(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const { rows, ignoredExampleRow } = await parseEmployeeFile(buffer);

  if (!rows.length) {
    throw new Error(
      ignoredExampleRow ? '文件中只有模板示例行，没有可导入的数据' : '文件中没有可导入的数据'
    );
  }

  const { validRows, errors } = validateRows(rows);
  return {
    data: {
      total: rows.length,
      validCount: validRows.length,
      failedCount: errors.length,
      errors,
      ignoredExampleRow,
    },
  };
}

// 执行导入：校验后逐条写入 localStorage，错误行跳过
export async function importEmployees(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const { rows, ignoredExampleRow } = await parseEmployeeFile(buffer);

  if (!rows.length) {
    throw new Error(
      ignoredExampleRow ? '文件中只有模板示例行，没有可导入的数据' : '文件中没有可导入的数据'
    );
  }

  const { validRows, errors: validateErrors } = validateRows(rows);
  const { success, errors: writeErrors } = commitImport(validRows);
  const errors = [...validateErrors, ...writeErrors].sort((a, b) => a.row - b.row);

  return {
    data: {
      total: rows.length,
      success,
      failed: rows.length - success,
      errors,
      ignoredExampleRow,
    },
  };
}
