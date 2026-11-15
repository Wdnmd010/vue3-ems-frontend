<template>
  <div class="dept-page">
    <el-card class="page-card" shadow="never">
      <template #header>
        <div class="page-card__header">
          <div class="page-card__heading">
            <span class="head-icon"><el-icon><OfficeBuilding /></el-icon></span>
            <span class="page-card__title">部门管理</span>
            <span class="page-card__sub">共 {{ total }} 个部门</span>
          </div>
          <div class="page-card__actions">
            <el-button type="primary" :icon="Plus" @click="openForm()">新增部门</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索 -->
      <el-form :inline="!isMobile" class="filter-bar" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="部门名称"
            clearable
            class="filter-input"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 桌面/平板：表格布局（窄屏自动横向滚动） -->
      <el-table
        v-if="!isMobile"
        :data="departments"
        v-loading="loading"
        stripe
        class="dept-table"
      >
        <el-table-column prop="id" label="编号" width="70" align="center" />
        <el-table-column prop="name" label="部门名称" min-width="120" />
        <el-table-column prop="description" label="部门描述" min-width="180">
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column label="员工人数" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" type="info">{{ row.employee_count }} 人</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
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
          <el-empty description="暂无部门数据" />
        </template>
      </el-table>

      <!-- 手机：卡片布局 -->
      <div v-else v-loading="loading" class="dept-cards">
        <el-empty v-if="!departments.length && !loading" description="暂无部门数据" />
        <div v-for="dept in departments" :key="dept.id" class="dept-card">
          <div class="dept-card__head">
            <div class="dept-card__identity">
              <span class="dept-card__name">{{ dept.name }}</span>
              <span class="dept-card__no">编号 {{ dept.id }}</span>
            </div>
            <el-tag size="small" effect="plain" type="info">{{ dept.employee_count }} 人</el-tag>
          </div>
          <div class="dept-card__row">
            <span class="dept-card__label">描述</span>
            <span>{{ dept.description || '-' }}</span>
          </div>
          <div class="dept-card__row">
            <span class="dept-card__label">创建时间</span>
            <span>{{ dept.created_at }}</span>
          </div>
          <div class="dept-card__actions">
            <el-button type="primary" plain size="small" @click="openForm(dept)">编辑</el-button>
            <el-button
              plain
              size="small"
              :loading="deletingId === dept.id"
              :disabled="deletingId !== null"
              @click="handleDelete(dept)"
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
          @current-change="loadDepartments"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑部门弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="form.id ? '编辑部门' : '新增部门'"
      :width="isMobile ? '94%' : '480px'"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :label-width="isMobile ? '84px' : '90px'"
        class="dept-form"
      >
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="如 市场部" maxlength="50" />
        </el-form-item>
        <el-form-item label="部门描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入部门描述（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh, OfficeBuilding } from '@element-plus/icons-vue';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../api/department';
import { useResponsive } from '../composables/useResponsive';

const { isMobile } = useResponsive();

// ---------- 列表数据 ----------
const departments = ref([]);
const total = ref(0);
const loading = ref(false);

const query = reactive({
  keyword: '',
  page: 1,
  pageSize: 10,
});

async function loadDepartments() {
  loading.value = true;
  try {
    const res = await getDepartments({
      keyword: query.keyword || undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    departments.value = res.data.list;
    total.value = res.data.total;
  } catch (err) {
    ElMessage.error(err.message || '加载部门列表失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadDepartments();
}

function handleReset() {
  query.keyword = '';
  query.page = 1;
  loadDepartments();
}

function handleSizeChange() {
  query.page = 1;
  loadDepartments();
}

// ---------- 新增 / 编辑 ----------
const formVisible = ref(false);
const submitting = ref(false);
const formRef = ref(null);

const emptyForm = {
  id: null,
  name: '',
  description: '',
};
const form = reactive({ ...emptyForm });

const formRules = {
  name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度 1-50 个字符', trigger: 'blur' },
  ],
  description: [{ max: 200, message: '长度不能超过 200 个字符', trigger: 'blur' }],
};

function openForm(row) {
  if (row) {
    // 编辑：填入原有信息
    Object.assign(form, {
      id: row.id,
      name: row.name,
      description: row.description || '',
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
      name: form.name.trim(),
      description: form.description.trim() || null,
    };
    if (form.id) {
      await updateDepartment(form.id, payload);
      ElMessage.success('部门信息已更新');
    } else {
      await createDepartment(payload);
      ElMessage.success('部门创建成功');
    }
    formVisible.value = false;
    loadDepartments();
  } catch (err) {
    ElMessage.error(err.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

// ---------- 删除 ----------
// 正在删除的部门 id：请求期间禁用删除按钮，避免重复提交
const deletingId = ref(null);

async function handleDelete(row) {
  if (deletingId.value !== null) return; // 已有删除请求进行中
  const tip =
    row.employee_count > 0
      ? `部门「${row.name}」下仍有 ${row.employee_count} 名员工。删除会失败，请先将员工转移到其他部门。仍要尝试删除吗？`
      : `确定要删除部门「${row.name}」吗？此操作不可恢复。`;
  try {
    await ElMessageBox.confirm(tip, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      // 危险操作：确认按钮用红色，避免与主色紫混淆
      confirmButtonClass: 'el-button--danger',
    });
  } catch {
    return; // 用户取消
  }
  deletingId.value = row.id;
  try {
    await deleteDepartment(row.id);
    ElMessage.success('部门已删除');
    // 删除后若当前页已无数据，回退一页
    if (departments.value.length === 1 && query.page > 1) {
      query.page -= 1;
    }
    loadDepartments();
  } catch (err) {
    ElMessage.error(err.message || '删除失败');
  } finally {
    deletingId.value = null;
  }
}

// ---------- 初始化 ----------
onMounted(loadDepartments);
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
  width: 220px;
}

.dept-table {
  width: 100%;
  --el-table-border-radius: var(--radius-lg);
}

/* 行高与留白统一由全局 style.css 控制，此处不再重复定义 */

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

/* ---------- 手机端（<768px） ---------- */
@media (max-width: 767px) {
  /* 标题与操作按钮换行，与员工管理保持一致 */
  .page-card__header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .page-card__actions {
    width: 100%;
  }

  .page-card__actions .el-button {
    width: 100%;
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

  /* 部门卡片 */
  .dept-card {
    background: var(--ems-input);
    border: 1px solid var(--ems-border);
    border-radius: var(--radius-lg);
    padding: 14px;
    margin-bottom: 10px;
    transition: var(--ems-transition);
  }

  .dept-card__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .dept-card__name {
    font-size: 16px;
    font-weight: 600;
    margin-right: 8px;
  }

  .dept-card__no {
    font-size: 12px;
    color: var(--ems-gray);
  }

  .dept-card__row {
    display: flex;
    font-size: 13px;
    line-height: 26px;
  }

  .dept-card__label {
    width: 64px;
    flex-shrink: 0;
    color: var(--ems-gray);
  }

  .dept-card__actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .dept-card__actions .el-button {
    flex: 1;
    margin-left: 0;
    min-height: 36px; /* 触屏友好的按钮高度 */
  }

  .pager {
    justify-content: center;
  }
}
</style>
