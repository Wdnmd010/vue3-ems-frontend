<template>
  <div class="dashboard" v-loading="loading" element-loading-text="正在加载统计数据...">
    <!-- 欢迎区：左侧标题与数据说明，右侧只保留刷新操作，不做装饰性元素 -->
    <section class="welcome">
      <div class="welcome__text">
        <h1 class="welcome__title">欢迎回来，{{ username }}</h1>
        <p class="welcome__sub">
          员工管理概览 · 今天是 {{ today }}<template v-if="stats">，共 {{ stats.employee_total }} 名员工、{{ stats.department_total }} 个部门</template>
        </p>
      </div>
      <div class="welcome__actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadStats">刷新数据</el-button>
      </div>
    </section>

    <!-- 加载失败：错误提示 + 重试 -->
    <el-alert
      v-if="loadError"
      type="error"
      class="dashboard__error"
      :closable="false"
      show-icon
    >
      <template #title>
        {{ loadError }}
        <el-button link type="primary" class="dashboard__retry" @click="loadStats">重新加载</el-button>
      </template>
    </el-alert>

    <template v-if="stats">
      <!-- 统计卡片：员工总人数使用蓝色重点卡，其余用彩色图标区分指标 -->
      <el-row :gutter="20">
        <el-col :xs="12" :sm="12" :md="6">
          <el-card class="stat-card stat-card--primary" shadow="never">
            <div class="stat-card__body">
              <span class="stat-card__icon"><el-icon><UserFilled /></el-icon></span>
              <div class="stat-card__info">
                <span class="stat-card__label">员工总人数</span>
                <span class="stat-card__value">{{ stats.employee_total }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6">
          <el-card class="stat-card stat-card--success" shadow="never">
            <div class="stat-card__body">
              <span class="stat-card__icon"><el-icon><CircleCheck /></el-icon></span>
              <div class="stat-card__info">
                <span class="stat-card__label">在职人数</span>
                <span class="stat-card__value">{{ stats.employee_active }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6">
          <el-card class="stat-card stat-card--purple" shadow="never">
            <div class="stat-card__body">
              <span class="stat-card__icon"><el-icon><OfficeBuilding /></el-icon></span>
              <div class="stat-card__info">
                <span class="stat-card__label">部门总数</span>
                <span class="stat-card__value">{{ stats.department_total }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6">
          <el-card class="stat-card stat-card--blue" shadow="never">
            <div class="stat-card__body">
              <span class="stat-card__icon"><el-icon><Calendar /></el-icon></span>
              <div class="stat-card__info">
                <span class="stat-card__label">近{{ stats.recent_days }}天入职</span>
                <span class="stat-card__value">{{ stats.recent_hires }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 中间图表区：左柱状图约 60%，右环形图约 40%（CSS Grid 控制比例，自适应上下排列） -->
      <div class="dashboard__charts">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-head">
              <span class="head-icon"><el-icon><Histogram /></el-icon></span>
              <span class="card-title">各部门员工分布</span>
            </div>
          </template>
          <div v-if="stats.dept_distribution.length" ref="deptChartRef" class="chart"></div>
          <el-empty v-else description="暂无部门数据" />
        </el-card>

        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-head">
              <span class="head-icon"><el-icon><PieIcon /></el-icon></span>
              <span class="card-title">员工性别分布</span>
            </div>
          </template>
          <div v-if="stats.gender_distribution.length" ref="genderChartRef" class="chart"></div>
          <el-empty v-else description="暂无员工数据" />
        </el-card>
      </div>

      <!-- 底部：左侧最近入职约 65%，右侧快捷操作约 35% -->
      <div class="dashboard__bottom">
        <el-card class="recent-card" shadow="never">
          <template #header>
            <div class="recent-card__header">
              <div class="card-head">
                <span class="head-icon"><el-icon><Clock /></el-icon></span>
                <span class="card-title">最近入职的员工</span>
              </div>
              <el-button link type="primary" @click="goEmployees">查看全部</el-button>
            </div>
          </template>

          <!-- 桌面/平板：表格 -->
          <el-table
            v-if="!isMobile"
            :data="stats.recent_employees"
            stripe
            class="recent-table"
          >
            <el-table-column prop="name" label="姓名" min-width="100" />
            <el-table-column prop="emp_no" label="工号" width="120" />
            <el-table-column label="所属部门" min-width="120">
              <template #default="{ row }">{{ row.department_name || '未分配' }}</template>
            </el-table-column>
            <el-table-column label="入职日期" width="130">
              <template #default="{ row }">{{ row.hire_date || '-' }}</template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无员工数据" />
            </template>
          </el-table>

          <!-- 手机：简洁列表 -->
          <div v-else>
            <el-empty v-if="!stats.recent_employees.length" description="暂无员工数据" />
            <div v-for="emp in stats.recent_employees" :key="emp.id" class="recent-item">
              <div class="recent-item__main">
                <span class="recent-item__name">{{ emp.name }}</span>
                <span class="recent-item__no">{{ emp.emp_no }}</span>
              </div>
              <div class="recent-item__sub">
                {{ emp.department_name || '未分配' }} · {{ emp.hire_date || '-' }} 入职
              </div>
            </div>
          </div>
        </el-card>

        <!-- 快捷操作：复用现有路由与导出接口，不新增业务逻辑 -->
        <el-card class="quick-card" shadow="never">
          <template #header>
            <div class="card-head">
              <span class="head-icon"><el-icon><Lightning /></el-icon></span>
              <span class="card-title">快捷操作</span>
            </div>
          </template>
          <div class="quick-list">
            <button
              v-for="action in quickActions"
              :key="action.key"
              type="button"
              class="quick-item"
              :disabled="action.key === 'export' && exporting"
              @click="action.handler"
            >
              <span class="quick-item__icon" :class="`quick-item__icon--${action.tone}`">
                <el-icon><component :is="action.icon" /></el-icon>
              </span>
              <span class="quick-item__body">
                <span class="quick-item__title">
                  {{ action.key === 'export' && exporting ? '正在导出…' : action.title }}
                </span>
                <span class="quick-item__desc">{{ action.desc }}</span>
              </span>
              <el-icon class="quick-item__arrow"><ArrowRight /></el-icon>
            </button>
          </div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Refresh,
  UserFilled,
  CircleCheck,
  OfficeBuilding,
  Calendar,
  Plus,
  Upload,
  Download,
  ArrowRight,
  Histogram,
  PieChart as PieIcon,
  Clock,
  Lightning,
} from '@element-plus/icons-vue';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent, GraphicComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getDashboardStats } from '../api/stats';
import { exportEmployees } from '../api/employee';
import { useResponsive } from '../composables/useResponsive';
import { useAuthStore } from '../stores/auth';

// 按需注册：仅引入仪表盘实际使用的柱状图、饼图及配套组件，减小初始包体积
echarts.use([
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  GraphicComponent,
  CanvasRenderer,
]);

const router = useRouter();
const { isMobile } = useResponsive();
const { state: authState } = useAuthStore();

// 欢迎区展示：当前登录用户名 + 当天日期（均为真实数据，不做占位）
const username = computed(() => authState.user?.username || '管理员');
const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const stats = ref(null);
const loading = ref(false);
const loadError = ref('');

const deptChartRef = ref(null);
const genderChartRef = ref(null);
let deptChart = null;
let genderChart = null;

// 图表配色：以紫色为主，蓝色仅作环形图的第二区分色
const CHART_PRIMARY = '#8957f5';
const CHART_ACCENT = '#4b8df8';
const CHART_TEXT = '#92929d';
const CHART_LABEL = '#d7d7de';
const CHART_LINE = '#303036';
const CHART_SPLIT = '#26262c';
const CHART_SURFACE = '#19191d';
const CHART_BORDER = '#303036';
const CHART_TOOLTIP = {
  backgroundColor: '#1f1f24',
  borderColor: CHART_BORDER,
  textStyle: { color: '#f5f5f7', fontSize: 12 },
};

// 复用或重建实例：v-if 会让容器节点被销毁重建，旧实例仍绑定在已脱离 DOM 的旧节点上，
// 直接复用会导致图表不显示，因此实例与当前容器不一致时先销毁旧实例再初始化。
function ensureChart(instance, el) {
  if (instance && instance.getDom() === el) return instance;
  if (instance) instance.dispose();
  return echarts.init(el);
}

function renderCharts() {
  if (!stats.value) return;

  // 部门人员分布：柱状图，紫 / 蓝交替区分部门；部门较多时旋转标签避免重叠
  if (deptChartRef.value && stats.value.dept_distribution.length) {
    deptChart = ensureChart(deptChart, deptChartRef.value);
    const names = stats.value.dept_distribution.map((d) => d.name);
    deptChart.setOption({
      // 只用紫 / 蓝两种强调色交替，既能区分分类又不会显得嘈杂
      color: [CHART_PRIMARY, CHART_ACCENT],
      tooltip: {
        ...CHART_TOOLTIP,
        trigger: 'axis',
        axisPointer: { lineStyle: { color: '#3d3d46' } },
      },
      // 收紧绘图区留白，让柱子更饱满（参考图柱宽约为分类间距的一半）
      grid: { left: 4, right: 10, top: 28, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: CHART_LINE } },
        axisTick: { show: false },
        axisLabel: {
          interval: 0,
          // 窄容器或分类较多时倾斜标签，避免文字互相挤压
          rotate: deptChartRef.value.clientWidth < 460 || names.length > 5 ? 30 : 0,
          fontSize: 12,
          color: CHART_TEXT,
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisLabel: { color: CHART_TEXT },
        splitLine: { lineStyle: { color: CHART_SPLIT } },
      },
      series: [
        {
          name: '员工人数',
          type: 'bar',
          colorBy: 'data',
          data: stats.value.dept_distribution.map((d) => d.count),
          barWidth: '44%',
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: 'top', color: CHART_LABEL, fontSize: 12 },
        },
      ],
    });
  }

  // 性别分布：环形图，紫 + 蓝（蓝色仅用于区分两个分类）
  if (genderChartRef.value && stats.value.gender_distribution.length) {
    genderChart = ensureChart(genderChart, genderChartRef.value);
    // 窄容器（手机）下外置标签会被裁切，改为只保留图例；图例直接带人数
    const narrow = genderChartRef.value.clientWidth < 420;
    const genderTotal = stats.value.gender_distribution.reduce((sum, g) => sum + g.count, 0);
    const legendBase = {
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
      textStyle: { color: CHART_TEXT },
      formatter: (name) => {
        const item = stats.value.gender_distribution.find((g) => g.name === name);
        // 参考图不在环外放标签，人数统一由图例承载
        return `${name}  ${item ? item.count : 0} 人`;
      },
    };

    genderChart.setOption({
      color: [CHART_PRIMARY, CHART_ACCENT],
      tooltip: {
        ...CHART_TOOLTIP,
        trigger: 'item',
        formatter: '{b}: {c} 人 ({d}%)',
      },
      // 环心显示总人数（由同一份统计结果汇总，不额外编造数据）
      // 桌面端环体略偏左，把右侧空间留给竖排图例
      graphic: [
        {
          type: 'text',
          left: narrow ? 'center' : '42%',
          top: narrow ? '33%' : '39%',
          style: {
            text: `总计\n${genderTotal} 人`,
            fill: CHART_LABEL,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 20,
            align: 'center',
          },
        },
      ],
      // 桌面/平板图例竖排在右侧，窄屏回到底部
      legend: narrow
        ? { ...legendBase, bottom: 0 }
        : { ...legendBase, orient: 'vertical', right: 24, top: 'middle', itemGap: 16 },
      series: [
        {
          name: '性别分布',
          type: 'pie',
          radius: narrow ? ['44%', '64%'] : ['42%', '66%'],
          center: narrow ? ['50%', '44%'] : ['42%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: CHART_SURFACE, borderWidth: 3 },
          label: { show: false },
          labelLine: { show: false },
          data: stats.value.gender_distribution.map((g) => ({ name: g.name, value: g.count })),
        },
      ],
    });
  }
}

async function loadStats() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await getDashboardStats();
    stats.value = res.data;
    await nextTick();
    renderCharts();
  } catch (err) {
    loadError.value = err.message || '统计数据加载失败';
    ElMessage.error(loadError.value);
  } finally {
    loading.value = false;
  }
}

function goEmployees() {
  router.push('/employees');
}

function goDepartments() {
  router.push('/departments');
}

// ---------- 快捷操作 ----------
// 说明：新增员工弹窗、Excel 导入弹窗（选文件 → 校验预览 → 确认导入）都是
// 员工管理页内部的交互流程，无法在仪表盘直连；这里只做路由跳转，
// 不改动员工管理页，也不复制其业务逻辑。导出为纯接口调用，可直接复用。
const exporting = ref(false);

// 文件名时间戳（与员工管理页导出一致）
function fileStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// 把后端返回的 Blob 保存为本地文件
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

// 导出全部员工：复用 api/employee.js 的 exportEmployees（scope=all）
async function handleExportAll() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const blob = await exportEmployees({ scope: 'all' });
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('导出失败，未获取到文件内容');
    }
    saveBlob(blob, `员工数据_${fileStamp()}.xlsx`);
    ElMessage.success('已导出全部员工数据');
  } catch (err) {
    ElMessage.error(err.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

const quickActions = [
  {
    key: 'create',
    title: '新增员工',
    desc: '前往员工管理新建档案',
    icon: Plus,
    tone: 'primary',
    handler: goEmployees,
  },
  {
    key: 'department',
    title: '部门管理',
    desc: '维护部门与人员归属',
    icon: OfficeBuilding,
    tone: 'primary',
    handler: goDepartments,
  },
  {
    key: 'import',
    title: 'Excel 导入',
    desc: '在员工管理页批量导入',
    icon: Upload,
    tone: 'blue',
    handler: goEmployees,
  },
  {
    key: 'export',
    title: 'Excel 导出',
    desc: '一键导出全部员工数据',
    icon: Download,
    tone: 'blue',
    handler: handleExportAll,
  },
];

function handleResize() {
  deptChart && deptChart.resize();
  genderChart && genderChart.resize();
}

onMounted(() => {
  loadStats();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  deptChart && deptChart.dispose();
  genderChart && genderChart.dispose();
  deptChart = null;
  genderChart = null;
});
</script>

<style scoped>
.dashboard {
  position: relative;
}

/* 欢迎区：与页面同背景，无卡片包裹，仅层级与留白 */
.welcome {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 28px;
}

.welcome__title {
  font-size: 28px;
  line-height: 1.3;
  font-weight: 600;
  color: var(--ems-text);
  letter-spacing: 0.2px;
}

.welcome__sub {
  margin-top: 8px;
  font-size: 13px;
  color: #83838e;
}

.welcome__actions {
  flex-shrink: 0;
  padding-bottom: 2px;
}

.dashboard__error {
  border-radius: var(--radius-lg);
  margin-bottom: 12px;
}

.dashboard__retry {
  vertical-align: baseline;
}

.stat-card {
  border-radius: var(--radius-lg);
  margin-bottom: 20px;
  transition: border-color 0.2s ease;
}

/* 卡片内部上下留白加大，内容整体更舒展（非单纯拉高卡片） */
.stat-card :deep(.el-card__body) {
  padding: 22px 20px;
}

.stat-card:hover {
  border-color: #3d3d46;
  background-color: var(--ems-card-hover);
}

/* 横向排布：图标在左，指标名与数值在右 */
.stat-card__body {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-card__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.stat-card__label {
  font-size: 13px;
  line-height: 1.4;
  color: var(--ems-text-secondary);
}

.stat-card__value {
  font-size: 32px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: var(--ems-text);
  font-variant-numeric: tabular-nums;
}

.stat-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  font-size: 21px;
  background-color: var(--ems-primary-soft);
  color: var(--ems-primary-light);
}

/* 四个指标用不同低饱和实色图标块区分（蓝 / 绿 / 紫 / 蓝），与参考图一致；
   彩色只出现在 40px 图标块上，卡片本体仍保持深灰 */
.stat-card--primary .stat-card__icon,
.stat-card--blue .stat-card__icon {
  background-color: var(--ems-blue);
  color: #ffffff;
}

.stat-card--success .stat-card__icon {
  background-color: var(--ems-success);
  color: #ffffff;
}

.stat-card--purple .stat-card__icon {
  background-color: var(--ems-primary);
  color: #ffffff;
}

/* ---------- 中间图表区：左 60% / 右 40% ---------- */
.dashboard__charts {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
}

/* 卡片等高：标题区固定，内容区撑满 */
.chart-card :deep(.el-card__header) {
  flex: 0 0 auto;
}

.chart-card :deep(.el-card__body) {
  flex: 1;
}

.chart {
  width: 100%;
  height: 268px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--ems-text);
}

/* 标题前的图标块 .head-icon 与卡片标题行 .card-head 定义在全局 style.css，避免重复 */

/* ---------- 底部：左最近入职 65% / 右快捷操作 35% ---------- */
.dashboard__bottom {
  display: grid;
  grid-template-columns: minmax(0, 13fr) minmax(0, 7fr);
  gap: 20px;
  align-items: stretch;
}

.recent-card {
  border-radius: var(--radius-lg);
}

.recent-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-table {
  width: 100%;
  --el-table-border-radius: var(--radius-lg);
}

/* ---------- 快捷操作 ---------- */
.quick-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
}

.quick-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
}

/* 参考图为 2×2 网格：两列两行，随卡片高度平分 */
.quick-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(72px, 1fr));
  gap: 12px;
  width: 100%;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 76px;
  padding: 12px;
  background-color: var(--ems-input);
  border: 1px solid var(--ems-border);
  border-radius: var(--radius-md);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: var(--ems-transition);
}

.quick-item:hover:not(:disabled) {
  border-color: #3d3d46;
  background-color: var(--ems-card-hover);
}

.quick-item:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* 深色圆角方形图标容器：扁平线性图标 + 紫色为主、蓝色为辅 */
.quick-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background-color: #2d2d37;
  color: var(--ems-primary-light);
  font-size: 20px;
}

/* 蓝色仅用于 Excel 导入 / 导出这类数据处理入口，与紫色区分功能分组 */
.quick-item__icon--blue {
  color: var(--ems-blue);
}

.quick-item__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.quick-item__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ems-text);
}

.quick-item__desc {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--ems-text-secondary);
  /* 2×2 卡片较窄，副标题允许折两行 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.quick-item__arrow {
  display: none;
}

.quick-item:hover:not(:disabled) .quick-item__arrow {
  color: var(--ems-primary-light);
}

/* 手机端：最近入职简洁列表 */
.recent-item {
  padding: 10px 2px;
  border-bottom: 1px solid var(--ems-border);
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item__name {
  font-weight: 600;
  margin-right: 8px;
}

.recent-item__no {
  font-size: 12px;
  color: var(--ems-gray);
}

.recent-item__sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ems-gray);
}

/* ---------- 平板及以下：左右分栏改为上下排列 ---------- */
@media (max-width: 1023px) {
  .dashboard__charts,
  .dashboard__bottom {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 上下排列后图表可用宽度变大，适当降低高度保持节奏 */
  .chart {
    height: 300px;
  }

  /* 平板仍保持 2×2，行高按内容自适应 */
  .quick-list {
    grid-template-rows: repeat(2, minmax(0, auto));
  }

  .quick-item {
    min-height: 68px;
  }
}

@media (max-width: 767px) {
  .stat-card__value {
    font-size: 28px;
  }

  .stat-card :deep(.el-card__body) {
    padding: 18px 16px;
  }

  .chart {
    height: 260px;
  }

  /* 手机端欢迎区改为纵向：标题在上，刷新按钮在下 */
  .welcome {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 0 0 16px;
  }

  .welcome__title {
    font-size: 20px;
  }

  .welcome__actions {
    padding-bottom: 0;
  }

  /* 手机端快捷操作回到单列，触控区域更高 */
  .quick-list {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
  }

  .quick-item {
    min-height: 60px;
  }
}
</style>
