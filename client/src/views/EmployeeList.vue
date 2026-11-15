<template>
  <div class="employee-page">
    <el-card class="page-card" shadow="never">
      <template #header>
        <div class="page-card__header">
          <div class="page-card__heading">
            <span class="head-icon"><el-icon><User /></el-icon></span>
            <span class="page-card__title">员工管理</span>
            <span class="page-card__sub">共 {{ total }} 名员工</span>
          </div>
          <div class="page-card__actions">
            <el-dropdown trigger="click" :disabled="exporting" @command="handleExport">
              <el-button :icon="Download" :loading="exporting">
                导出 Excel
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="filtered">导出当前筛选结果</el-dropdown-item>
                  <el-dropdown-item command="all">导出全部员工</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button :icon="Upload" @click="openImportDialog">导入 Excel</el-button>
            <el-button type="primary" :icon="Plus" @click="openForm()">新增员工</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索与筛选 -->
      <el-form :inline="!isMobile" class="filter-bar" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="姓名 / 工号"
            clearable
            class="filter-input"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select
            v-model="query.department_id"
            placeholder="全部部门"
            clearable
            class="filter-input"
            @change="handleSearch"
          >
            <el-option v-for="d in departmentOptions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部状态"
            clearable
            class="filter-input"
            @change="handleSearch"
          >
            <el-option label="在职" :value="1" />
            <el-option label="离职" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 桌面/平板：表格布局（窄屏自动横向滚动） -->
      <el-table
        v-if="!isMobile"
        :data="employees"
        v-loading="loading"
        stripe
        class="emp-table"
      >
        <el-table-column prop="emp_no" label="工号" width="100" fixed />
        <el-table-column prop="name" label="姓名" width="90" />
        <el-table-column prop="gender" label="性别" width="70" align="center" />
        <el-table-column prop="phone" label="手机号" width="140">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column prop="department_name" label="部门" min-width="130">
          <template #default="{ row }">{{ row.department_name || '未分配' }}</template>
        </el-table-column>
        <el-table-column prop="position" label="职位" min-width="160">
          <template #default="{ row }">{{ row.position || '-' }}</template>
        </el-table-column>
        <el-table-column prop="hire_date" label="入职日期" width="110" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button
              link
              type="danger"
              :loading="deletingId === row.id"
              :disabled="deletingId !== null"
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无员工数据" />
        </template>
      </el-table>

      <!-- 手机：卡片布局 -->
      <div v-else v-loading="loading" class="emp-cards">
        <el-empty v-if="!employees.length && !loading" description="暂无员工数据" />
        <div v-for="emp in employees" :key="emp.id" class="emp-card">
          <div class="emp-card__head">
            <div class="emp-card__identity">
              <span class="emp-card__name">{{ emp.name }}</span>
              <span class="emp-card__no">{{ emp.emp_no }}</span>
            </div>
            <el-tag :type="emp.status === 1 ? 'success' : 'info'" size="small">
              {{ emp.status === 1 ? '在职' : '离职' }}
            </el-tag>
          </div>
          <div class="emp-card__row">
            <span class="emp-card__label">部门</span>
            <span>{{ emp.department_name || '未分配' }}<template v-if="emp.position"> · {{ emp.position }}</template></span>
          </div>
          <div class="emp-card__row">
            <span class="emp-card__label">手机号</span>
            <span>{{ emp.phone || '-' }}</span>
          </div>
          <div class="emp-card__row">
            <span class="emp-card__label">入职日期</span>
            <span>{{ emp.hire_date || '-' }}</span>
          </div>
          <div class="emp-card__actions">
            <el-button type="primary" plain size="small" @click="openForm(emp)">编辑</el-button>
            <el-button
              plain
              size="small"
              :loading="deletingId === emp.id"
              :disabled="deletingId !== null"
              @click="handleDelete(emp)"
            >删除</el-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
          :small="isMobile"
          background
          @current-change="loadEmployees"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑员工弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="form.id ? '编辑员工' : '新增员工'"
      :width="isMobile ? '94%' : '540px'"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :label-width="isMobile ? '76px' : '90px'"
        class="emp-form"
      >
        <el-form-item label="工号" prop="emp_no">
          <el-input v-model="form.emp_no" placeholder="如 EMP011" maxlength="20" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio value="男">男</el-radio>
            <el-radio value="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="name@example.com" maxlength="100" />
        </el-form-item>
        <el-form-item label="部门" prop="department_id">
          <el-select v-model="form.department_id" placeholder="请选择部门" clearable class="emp-form__full">
            <el-option v-for="d in departmentOptions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="职位" prop="position">
          <el-input v-model="form.position" placeholder="如 前端工程师" maxlength="50" />
        </el-form-item>
        <el-form-item label="入职日期" prop="hire_date">
          <el-date-picker
            v-model="form.hire_date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            class="emp-form__full"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">在职</el-radio>
            <el-radio :value="0">离职</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入 Excel 弹窗 -->
    <el-dialog
      v-model="importVisible"
      title="导入 Excel"
      :width="isMobile ? '94%' : '620px'"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="resetImport"
    >
      <div class="import-step">
        <div class="import-step__title">1. 下载模板（可选）</div>
        <el-button :icon="Download" :loading="templateLoading" @click="handleDownloadTemplate">
          下载导入模板
        </el-button>
        <div class="import-step__tip">
          模板中第 2 行为示例数据，导入时会自动跳过；请从第 3 行开始填写正式数据。
        </div>
      </div>

      <div class="import-step">
        <div class="import-step__title">2. 选择 Excel 文件</div>
        <el-upload
          ref="uploadRef"
          drag
          action="#"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :on-exceed="handleExceed"
          class="import-upload"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将 .xlsx 文件拖到此处，或<em>点击选择</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持 .xlsx 格式，文件大小不超过 5MB</div>
          </template>
        </el-upload>
        <div v-if="importFile" class="import-file">已选文件：{{ importFile.name }}</div>
        <div v-if="previewing" class="import-status">正在校验文件，请稍候…</div>
      </div>

      <!-- 校验结果预览（确认前） -->
      <template v-if="preview && !importResult">
        <el-alert
          v-if="preview.validCount > 0"
          :type="preview.failedCount > 0 ? 'warning' : 'success'"
          :closable="false"
          show-icon
          :title="`共 ${preview.total} 条记录，可导入 ${preview.validCount} 条，需跳过 ${preview.failedCount} 条`"
        />
        <el-alert
          v-else
          type="error"
          :closable="false"
          show-icon
          :title="`共 ${preview.total} 条记录，但没有可导入的数据，请修正后再试`"
        />
        <div v-if="preview.ignoredExampleRow" class="import-step__tip">已自动忽略模板示例行。</div>
        <el-table
          v-if="preview.errors.length"
          :data="preview.errors"
          size="small"
          max-height="220"
          class="import-errors"
        >
          <el-table-column prop="row" label="行号" width="66" align="center" />
          <el-table-column prop="emp_no" label="工号" width="110" />
          <el-table-column prop="reason" label="错误原因" min-width="150" show-overflow-tooltip />
        </el-table>
      </template>

      <!-- 导入结果 -->
      <template v-if="importResult">
        <div class="import-result">
          <div class="import-result__item">
            总记录数
            <strong>{{ importResult.total }}</strong>
          </div>
          <div class="import-result__item import-result__item--ok">
            成功导入
            <strong>{{ importResult.success }}</strong>
          </div>
          <div class="import-result__item import-result__item--fail">
            导入失败
            <strong>{{ importResult.failed }}</strong>
          </div>
        </div>
        <div v-if="importResult.ignoredExampleRow" class="import-step__tip">已自动忽略模板示例行。</div>
        <el-alert
          v-if="!importResult.errors.length"
          type="success"
          :closable="false"
          show-icon
          title="全部记录导入成功"
        />
        <el-table
          v-else
          :data="importResult.errors"
          size="small"
          max-height="220"
          class="import-errors"
        >
          <el-table-column prop="row" label="行号" width="66" align="center" />
          <el-table-column prop="emp_no" label="工号" width="110" />
          <el-table-column prop="reason" label="失败原因" min-width="150" show-overflow-tooltip />
        </el-table>
      </template>

      <template #footer>
        <el-button @click="importVisible = false">{{ importResult ? '关闭' : '取消' }}</el-button>
        <el-button
          v-if="!importResult"
          type="primary"
          :loading="importing"
          :disabled="previewing || !preview || preview.validCount === 0"
          @click="confirmImport"
        >
          确认导入{{ preview ? `（${preview.validCount} 条）` : '' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh, Download, Upload, UploadFilled, ArrowDown, User } from '@element-plus/icons-vue';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  exportEmployees,
  downloadImportTemplate,
  previewImportEmployees,
  importEmployees,
} from '../api/employee';
import { getDepartmentOptions } from '../api/department';
import { useResponsive } from '../composables/useResponsive';

const { isMobile } = useResponsive();

// ---------- 列表数据 ----------
const employees = ref([]);
const total = ref(0);
const loading = ref(false);
const departmentOptions = ref([]);
// 列表请求序号：快速切换筛选/分页时丢弃过期响应，避免旧结果覆盖新结果
let loadSeq = 0;

const query = reactive({
  keyword: '',
  department_id: null,
  status: null,
  page: 1,
  pageSize: 10,
});

async function loadEmployees() {
  const seq = ++loadSeq;
  loading.value = true;
  try {
    const res = await getEmployees({
      keyword: query.keyword || undefined,
      department_id: query.department_id ?? undefined,
      status: query.status ?? undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    if (seq !== loadSeq) return; // 已有更新的请求，忽略本次旧结果
    employees.value = res.data.list;
    total.value = res.data.total;
  } catch (err) {
    if (seq !== loadSeq) return; // 过期请求的失败提示不展示
    ElMessage.error(err.message || '加载员工列表失败');
  } finally {
    // loading 只由最新请求关闭，避免旧请求提前结束加载态
    if (seq === loadSeq) loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadEmployees();
}

function handleReset() {
  query.keyword = '';
  query.department_id = null;
  query.status = null;
  query.page = 1;
  loadEmployees();
}

function handleSizeChange() {
  query.page = 1;
  loadEmployees();
}

// ---------- 新增 / 编辑 ----------
const formVisible = ref(false);
const submitting = ref(false);
const formRef = ref(null);

const emptyForm = {
  id: null,
  emp_no: '',
  name: '',
  gender: '男',
  phone: '',
  email: '',
  department_id: null,
  position: '',
  hire_date: '',
  status: 1,
};
const form = reactive({ ...emptyForm });

const formRules = {
  emp_no: [
    { required: true, message: '请输入工号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]{2,20}$/, message: '2-20位字母、数字、-、_', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 1, max: 50, message: '长度 1-50 个字符', trigger: 'blur' },
  ],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
};

function openForm(row) {
  if (row) {
    // 编辑：填入原有信息（hire_date 后端以 YYYY-MM-DD 字符串返回）
    Object.assign(form, {
      id: row.id,
      emp_no: row.emp_no,
      name: row.name,
      gender: row.gender,
      phone: row.phone || '',
      email: row.email || '',
      department_id: row.department_id,
      position: row.position || '',
      hire_date: row.hire_date || '',
      status: row.status,
    });
  } else {
    Object.assign(form, emptyForm);
  }
  formVisible.value = true;
}

async function submitForm() {
  try {
    await formRef.value.validate();
  } catch {
    return; // 校验未通过
  }
  submitting.value = true;
  try {
    const payload = {
      emp_no: form.emp_no,
      name: form.name,
      gender: form.gender,
      phone: form.phone || null,
      email: form.email || null,
      department_id: form.department_id || null,
      position: form.position || null,
      hire_date: form.hire_date || null,
      status: form.status,
    };
    if (form.id) {
      await updateEmployee(form.id, payload);
      ElMessage.success('员工信息已更新');
    } else {
      await createEmployee(payload);
      ElMessage.success('员工创建成功');
    }
    formVisible.value = false;
    loadEmployees();
  } catch (err) {
    ElMessage.error(err.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

// ---------- 删除 ----------
// 正在删除的员工 id：请求期间禁用删除按钮，避免重复提交
const deletingId = ref(null);

async function handleDelete(row) {
  if (deletingId.value !== null) return; // 已有删除请求进行中
  try {
    await ElMessageBox.confirm(
      `确定要删除员工「${row.name}（${row.emp_no}）」吗？此操作不可恢复。`,
      '删除确认',
      {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      // 危险操作：确认按钮用红色，避免与主色紫混淆
      confirmButtonClass: 'el-button--danger',
    }
    );
  } catch {
    return; // 用户取消
  }
  deletingId.value = row.id;
  try {
    await deleteEmployee(row.id);
    ElMessage.success('员工已删除');
    // 删除后若当前页已无数据，回退一页
    if (employees.value.length === 1 && query.page > 1) {
      query.page -= 1;
    }
    loadEmployees();
  } catch (err) {
    ElMessage.error(err.message || '删除失败');
  } finally {
    deletingId.value = null;
  }
}

// ---------- Excel 导出 ----------
const exporting = ref(false);

// 生成下载文件名中的时间戳
function fileStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// 将后端返回的 Blob 保存为本地文件
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleExport(scope) {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const params =
      scope === 'all'
        ? { scope: 'all' }
        : {
            scope: 'filtered',
            keyword: query.keyword || undefined,
            department_id: query.department_id ?? undefined,
            status: query.status ?? undefined,
          };
    const blob = await exportEmployees(params);
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('导出失败，未获取到文件内容');
    }
    saveBlob(blob, `员工数据_${fileStamp()}.xlsx`);
    ElMessage.success(scope === 'all' ? '已导出全部员工数据' : '已导出当前筛选结果');
  } catch (err) {
    ElMessage.error(err.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

// ---------- Excel 导入 ----------
const importVisible = ref(false);
const uploadRef = ref(null);
const importFile = ref(null);
const templateLoading = ref(false);
const previewing = ref(false);
const importing = ref(false);
const preview = ref(null);
const importResult = ref(null);

function openImportDialog() {
  resetImport();
  importVisible.value = true;
}

function resetImport() {
  uploadRef.value?.clearFiles();
  importFile.value = null;
  preview.value = null;
  importResult.value = null;
  previewing.value = false;
  importing.value = false;
}

async function handleDownloadTemplate() {
  if (templateLoading.value) return;
  templateLoading.value = true;
  try {
    const blob = await downloadImportTemplate();
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('模板下载失败，未获取到文件内容');
    }
    saveBlob(blob, '员工导入模板.xlsx');
    ElMessage.success('模板已下载');
  } catch (err) {
    ElMessage.error(err.message || '模板下载失败');
  } finally {
    templateLoading.value = false;
  }
}

// 选择文件：本地先做一次类型和大小检查，再由后端解析校验
async function handleFileChange(uploadFile) {
  const raw = uploadFile?.raw;
  preview.value = null;
  importResult.value = null;
  if (!raw) return;

  if (!/\.xlsx$/i.test(raw.name)) {
    ElMessage.error('只允许上传 .xlsx 格式的 Excel 文件');
    uploadRef.value?.clearFiles();
    importFile.value = null;
    return;
  }
  if (raw.size === 0) {
    ElMessage.error('文件内容为空，请重新选择');
    uploadRef.value?.clearFiles();
    importFile.value = null;
    return;
  }
  if (raw.size > 5 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 5MB');
    uploadRef.value?.clearFiles();
    importFile.value = null;
    return;
  }

  importFile.value = { name: raw.name, size: raw.size, raw };
  await runPreview();
}

function handleFileRemove() {
  importFile.value = null;
  preview.value = null;
  importResult.value = null;
}

function handleExceed() {
  ElMessage.warning('一次只能上传一个文件，请先移除已选文件');
}

async function runPreview() {
  if (!importFile.value) return;
  previewing.value = true;
  try {
    const res = await previewImportEmployees(importFile.value.raw);
    preview.value = res.data;
    if (res.data.validCount === 0) {
      ElMessage.warning('文件中没有可导入的数据，请查看错误原因');
    }
  } catch (err) {
    ElMessage.error(err.message || '文件校验失败');
  } finally {
    previewing.value = false;
  }
}

async function confirmImport() {
  if (!importFile.value || !preview.value || importing.value) return;
  importing.value = true;
  try {
    const res = await importEmployees(importFile.value.raw);
    importResult.value = res.data;
    if (res.data.success > 0) {
      ElMessage.success(`成功导入 ${res.data.success} 条员工数据`);
      query.page = 1;
      loadEmployees();
    } else {
      ElMessage.warning('没有成功导入任何数据，请查看失败原因');
    }
  } catch (err) {
    ElMessage.error(err.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

// ---------- 初始化 ----------
onMounted(async () => {
  loadEmployees();
  try {
    const res = await getDepartmentOptions();
    departmentOptions.value = res.data;
  } catch (err) {
    ElMessage.error(err.message || '加载部门列表失败');
  }
});
</script>

<style scoped>
.page-card {
  border-radius: var(--radius-lg);
}

.page-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.page-card__heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.page-card__title {
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.2px;
  color: var(--ems-text);
}

.page-card__sub {
  font-size: 12.5px;
  color: var(--ems-text-secondary);
  white-space: nowrap;
}

.page-card__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.page-card__actions .el-button {
  margin-left: 0;
}

.filter-bar {
  margin-bottom: 10px;
}

.filter-bar :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.filter-input {
  width: 180px;
}

.emp-table {
  width: 100%;
}

/* 行高与留白统一由全局 style.css 控制，此处不再重复定义 */

/* 表格圆角 */
.emp-table {
  --el-table-border-radius: var(--radius-lg);
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.emp-form__full {
  width: 100%;
}

/* ---------- 导入 Excel 弹窗 ---------- */
.import-step {
  margin-bottom: 16px;
}

.import-step__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.import-step__tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ems-gray);
}

.import-upload {
  width: 100%;
}

.import-file {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ems-gray);
  word-break: break-all;
}

.import-status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ems-primary);
}

.import-errors {
  width: 100%;
  margin-top: 12px;
}

.import-result {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.import-result__item {
  flex: 1;
  padding: 10px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--ems-text-secondary);
  background: var(--ems-input);
  border: 1px solid var(--ems-border);
  border-radius: var(--radius-lg);
}

.import-result__item strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  color: var(--ems-text);
}

.import-result__item--ok strong {
  color: var(--ems-primary-light);
}

.import-result__item--fail strong {
  color: var(--ems-danger);
}

/* ---------- 手机端（<768px） ---------- */
@media (max-width: 767px) {
  /* 标题与操作按钮换行，按钮铺满避免溢出 */
  .page-card__header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .page-card__actions {
    width: 100%;
  }

  .page-card__actions > * {
    flex: 1 1 auto;
  }

  .page-card__actions .el-button {
    width: 100%;
  }

  .import-result {
    gap: 8px;
  }

  .import-result__item {
    padding: 8px 4px;
    font-size: 12px;
  }

  /* 筛选项纵向排列、占满宽度 */
  .filter-bar :deep(.el-form-item) {
    display: flex;
    margin-right: 0;
  }

  .filter-bar :deep(.el-form-item__content) {
    flex: 1;
  }

  .filter-input {
    width: 100%;
  }

  .filter-actions :deep(.el-form-item__content) {
    gap: 8px;
  }

  .filter-actions .el-button {
    flex: 1;
    margin-left: 0;
  }

  /* 员工卡片 */
  .emp-card {
    background: var(--ems-input);
    border: 1px solid var(--ems-border);
    border-radius: var(--radius-lg);
    padding: 14px;
    margin-bottom: 10px;
    transition: var(--ems-transition);
  }

  .emp-card__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .emp-card__name {
    font-size: 16px;
    font-weight: 600;
    margin-right: 8px;
  }

  .emp-card__no {
    font-size: 12px;
    color: var(--ems-gray);
  }

  .emp-card__row {
    display: flex;
    font-size: 13px;
    line-height: 26px;
  }

  .emp-card__label {
    width: 64px;
    flex-shrink: 0;
    color: var(--ems-gray);
  }

  .emp-card__actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .emp-card__actions .el-button {
    flex: 1;
    margin-left: 0;
    min-height: 36px; /* 触屏友好的按钮高度 */
  }

  .pager {
    justify-content: center;
  }
}
</style>
