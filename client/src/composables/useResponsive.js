import { ref, onMounted, onUnmounted } from 'vue';

// 响应式断点：<768px 视为手机
export function useResponsive() {
  const isMobile = ref(window.innerWidth < 768);
  const onResize = () => {
    isMobile.value = window.innerWidth < 768;
  };
  onMounted(() => window.addEventListener('resize', onResize));
  onUnmounted(() => window.removeEventListener('resize', onResize));
  return { isMobile };
}
