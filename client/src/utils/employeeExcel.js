/**
 * 浏览器端 Excel 工具：复用原后端 employeeExcel.js 的列定义、表头样式与解析规则，
 * 只把 ExcelJS 的运行环境从 Node 换到浏览器（写文件改成生成 Blob）。
 */
import { readDb, insertEmployee, validateEmployeeInput } from '../data/db';

// ExcelJS 体积较大且只在导入/导出时用到，这里按需动态加载，避免拖慢首屏
let exceljsPromise = null;
function loadExcelJS() {
  if (!exceljsPromise) {
    exceljsPromise = import('exceljs').then((mod) => mod.default || mod);
  }
  return exceljsPromise;
}

// 员工 Excel 列定义（顺序即导出/模板列顺序）
export const COLUMNS = [
  { key: 'emp_no', header: '工号', width: 14 },
  { key: 'name', header: '姓名', width: 12 },
  { key: 'gender', header: '性别', width: 8 },
  { key: 'phone', header: '手机号', width: 16 },
  { key: 'email', header: '邮箱', width: 28 },
  { key: 'department_name', header: '所属部门', width: 14 },
  { key: 'position', header: '职位', width: 18 },
  { key: 'status_text', header: '员工状态', width: 10 },
  { key: 'hire_date', header: '入职日期', width: 14 },
];

// 模板中的示例行（导入时会自动跳过）
const EXAMPLE_ROW = {
  emp_no: 'DEMO001',
  name: '示例员工（导入前请删除本行）',
  gender: '男',
  phone: '13800000000',
  email: 'demo@example.com',
  department_name: '技术部',
  position: '示例职位',
  status_text: '在职',
  hire_date: '2024-01-01',
};

const BORDER = {
  top: { style: 'thin', color: 'FFD9D9D9' },
  left: { style: 'thin', color: 'FFD9D9D9' },
  bottom: { style: 'thin', color: 'FFD9D9D9' },
  right: { style: 'thin', color: 'FFD9D9D9' },
};

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const pad2 = (n) => String(n).padStart(2, '0');

// 防止 Excel 公式注入：以 = + - @ 开头的文本统一加前导单引号
function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) return `'${text}`;
  return text;
}

function writeHeader(ws) {
  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  COLUMNS.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FF1F2D3D' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: 'FFE7F5EF' };
    cell.border = BORDER;
    ws.getColumn(index + 1).width = col.width;
  });
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

// 工作簿 → Blob（浏览器下载）
async function workbookToBlob(workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}

function formatHireDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  const matched = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matched) return `${matched[1]}-${pad2(matched[2])}-${pad2(matched[3])}`;
  return text;
}

// 构建员工数据工作簿并返回 Blob
export async function buildEmployeeBlob(rows) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EMS';

  const ws = workbook.addWorksheet('员工数据');
  writeHeader(ws);

  rows.forEach((row) => {
    const values = COLUMNS.map((col) =>
      col.key === 'hire_date' ? formatHireDate(row[col.key]) : sanitizeText(row[col.key])
    );
    const added = ws.addRow(values);
    added.height = 22;
    added.eachCell((cell, colNumber) => {
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: colNumber <= 2 ? 'left' : 'center' };
    });
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, ws.rowCount), column: COLUMNS.length },
  };

  return workbookToBlob(workbook);
}

// 构建导入模板（含示例行 + 填写说明）并返回 Blob
export async function buildTemplateBlob() {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EMS';

  const ws = workbook.addWorksheet('员工数据');
  writeHeader(ws);

  // 工号与手机号整列文本格式，防止前导零丢失
  [1, 4].forEach((colNumber) => {
    ws.getColumn(colNumber).numFmt = '@';
  });

  const example = ws.addRow(COLUMNS.map((col) => EXAMPLE_ROW[col.key] || ''));
  example.height = 22;
  example.eachCell((cell, colNumber) => {
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: colNumber <= 2 ? 'left' : 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: 'FFF2F3F5' };
    cell.font = { italic: true, color: { argb: 'FF8C8C8C' } };
    if (colNumber === 1 || colNumber === 4) cell.numFmt = '@';
  });

  const tip = workbook.addWorksheet('填写说明');
  tip.getColumn(1).width = 90;
  const lines = [
    '员工导入模板填写说明',
    '1. 只在「员工数据」工作表中填写，请勿修改表头文字与列顺序。',
    '2. 第 2 行为示例数据，导入时会被自动跳过；正式数据从第 3 行开始填写。',
    '3. 工号为必填项，2-20 位字母、数字、-、_，且不能与系统中已有工号重复。',
    '4. 姓名、职位为必填项；性别只能填写「男」或「女」。',
    '5. 手机号、邮箱为选填项，填写时需符合格式要求。',
    '6. 所属部门填写部门名称（如「技术部」），且必须是系统中已存在的部门；留空表示未分配。',
    '7. 员工状态填写「在职」或「离职」。',
    '8. 入职日期格式为 YYYY-MM-DD（如 2024-01-01），也可直接使用 Excel 日期格式。',
    '9. 工号和手机号两列已设置为文本格式，请保持文本格式输入；若改为数值格式，前导零可能丢失。',
  ];
  lines.forEach((text, index) => {
    const cell = tip.getCell(index + 1, 1);
    cell.value = text;
    if (index === 0) cell.font = { bold: true, size: 13 };
  });

  return workbookToBlob(workbook);
}

/* ---------------- 解析 ---------------- */

// 将 Date 对象格式化为 YYYY-MM-DD（Excel 日期以 UTC 零点保存）
function formatDate(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function serialToDateString(serial) {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  return formatDate(date);
}

// 提取单元格文本（兼容普通文本、富文本、日期、公式结果）
function cellText(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const value = cell.value;
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('').trim();
    if (typeof value.text === 'string') return value.text.trim();
    if (value.result !== undefined && value.result !== null) return String(value.result).trim();
    return '';
  }
  return String(value).trim();
}

function normalizeDateText(text) {
  if (!text) return '';
  const matched = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!matched) return text;
  return `${matched[1]}-${pad2(matched[2])}-${pad2(matched[3])}`;
}

// 解析用户选择的 .xlsx（传入 ArrayBuffer）
export async function parseEmployeeFile(arrayBuffer) {
  if (!arrayBuffer || !arrayBuffer.byteLength) {
    throw new Error('上传的文件内容为空');
  }

  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(arrayBuffer);
  } catch {
    throw new Error('Excel 文件无法解析，请确认文件未损坏且为 .xlsx 格式');
  }

  const ws = workbook.worksheets[0];
  if (!ws) throw new Error('Excel 文件中没有工作表');

  // 在前 5 行内定位表头，要求至少包含工号、姓名、性别、职位、员工状态
  const requiredHeaders = ['工号', '姓名', '性别', '职位', '员工状态'];
  let headerRowNumber = 0;
  let headerMap = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 5); r += 1) {
    const row = ws.getRow(r);
    const map = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = cellText(cell).replace(/\s/g, '');
      if (header) map[header] = colNumber;
    });
    if (requiredHeaders.every((h) => map[h])) {
      headerRowNumber = r;
      headerMap = map;
      break;
    }
  }
  if (!headerRowNumber) {
    throw new Error('未找到有效表头，请使用「下载导入模板」生成的模板填写');
  }

  const getValue = (row, header) => {
    const col = headerMap[header];
    return col ? cellText(row.getCell(col)) : '';
  };

  const rows = [];
  let ignoredExampleRow = false;
  const maxRow = Math.min(ws.actualRowCount || ws.rowCount, 10000);

  for (let r = headerRowNumber + 1; r <= maxRow; r += 1) {
    const row = ws.getRow(r);
    const raw = {
      rowNumber: r,
      emp_no: getValue(row, '工号'),
      name: getValue(row, '姓名'),
      gender: getValue(row, '性别'),
      phone: getValue(row, '手机号'),
      email: getValue(row, '邮箱'),
      department: getValue(row, '所属部门'),
      position: getValue(row, '职位'),
      status: getValue(row, '员工状态'),
      hire_date: normalizeDateText(getValue(row, '入职日期')),
    };

    // 跳过整行空白
    if (Object.values(raw).slice(1).every((v) => v === '')) continue;

    // 跳过模板示例行
    if (raw.emp_no === 'DEMO001' && raw.name.includes('示例')) {
      ignoredExampleRow = true;
      continue;
    }

    // 入职日期若是 Excel 序列号，转换为日期文本
    if (/^\d+(\.\d+)?$/.test(raw.hire_date)) {
      raw.hire_date = serialToDateString(Number(raw.hire_date));
    }

    rows.push(raw);
  }

  if (rows.length > 5000) {
    throw new Error('单次导入最多支持 5000 条记录，请拆分文件后再试');
  }

  return { rows, ignoredExampleRow };
}

/* ---------------- 业务校验（与后端规则一致） ---------------- */

function validateRow(raw, departmentMap) {
  const data = {
    emp_no: raw.emp_no || '',
    name: raw.name || '',
    gender: raw.gender || '',
    phone: raw.phone || null,
    email: raw.email || null,
    department_id: null,
    position: raw.position || '',
    status: null,
    hire_date: raw.hire_date || null,
  };

  const errors = [];
  if (!data.emp_no) errors.push('工号不能为空');
  else if (!/^[A-Za-z0-9_-]{2,20}$/.test(data.emp_no))
    errors.push('工号格式不正确（2-20位字母、数字、-、_）');
  if (!data.name) errors.push('姓名不能为空');
  else if (data.name.length > 50) errors.push('姓名长度不能超过50个字符');
  if (!data.gender) errors.push('性别不能为空');
  else if (data.gender !== '男' && data.gender !== '女') errors.push('性别只能填写「男」或「女」');
  if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) errors.push('手机号格式不正确');
  if (data.phone && data.phone.length > 20) errors.push('手机号长度不能超过20个字符');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('邮箱格式不正确');
  if (data.email && data.email.length > 100) errors.push('邮箱长度不能超过100个字符');
  if (!data.position) errors.push('职位不能为空');
  else if (data.position.length > 50) errors.push('职位长度不能超过50个字符');

  const departmentName = (raw.department || '').trim();
  if (departmentName) {
    if (!departmentMap.has(departmentName)) errors.push(`所属部门不存在：${departmentName}`);
    else data.department_id = departmentMap.get(departmentName);
  }

  const statusText = (raw.status || '').trim();
  if (statusText === '在职' || statusText === '1') data.status = 1;
  else if (statusText === '离职' || statusText === '0') data.status = 0;
  else errors.push('员工状态只能填写「在职」或「离职」');

  if (data.hire_date) {
    const ok =
      /^\d{4}-\d{2}-\d{2}$/.test(data.hire_date) &&
      (() => {
        const [y, m, d] = data.hire_date.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        return (
          dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
        );
      })();
    if (!ok) errors.push('入职日期不是有效日期，格式应为 YYYY-MM-DD');
  }

  return { errors, data };
}

// 批量校验：逐条校验 + 数据库已有工号 + 文件内重复工号
export function validateRows(rows) {
  const db = readDb();
  const departmentMap = new Map(db.departments.map((d) => [d.name.trim(), d.id]));
  const existing = new Set(db.employees.map((e) => String(e.emp_no).toLowerCase()));

  const seen = new Map();
  const errors = [];
  const validRows = [];

  for (const raw of rows) {
    const { errors: rowErrors, data } = validateRow(raw, departmentMap);
    const empNo = data.emp_no;
    const key = String(empNo).toLowerCase();

    if (rowErrors.length) {
      errors.push({ row: raw.rowNumber, emp_no: empNo || '-', reason: rowErrors.join('；') });
      continue;
    }
    if (existing.has(key)) {
      errors.push({
        row: raw.rowNumber,
        emp_no: empNo,
        reason: `工号 ${empNo} 已存在于数据库中`,
      });
      continue;
    }
    if (seen.has(key)) {
      errors.push({
        row: raw.rowNumber,
        emp_no: empNo,
        reason: `工号 ${empNo} 与第 ${seen.get(key)} 行重复`,
      });
      continue;
    }

    seen.set(key, raw.rowNumber);
    validRows.push({ ...data, rowNumber: raw.rowNumber });
  }

  return { validRows, errors };
}

// 逐条写入 localStorage：单行失败不影响其它行
export function commitImport(validRows) {
  let success = 0;
  const errors = [];
  for (const row of validRows) {
    try {
      // 走统一的新增接口，保证字段校验与列表页新增完全一致
      validateEmployeeInput({ ...row });
      insertEmployee({ ...row });
      success += 1;
    } catch (err) {
      errors.push({
        row: row.rowNumber,
        emp_no: row.emp_no,
        reason: err.message || '写入失败，请稍后重试',
      });
    }
  }
  errors.sort((a, b) => a.row - b.row);
  return { success, errors };
}
