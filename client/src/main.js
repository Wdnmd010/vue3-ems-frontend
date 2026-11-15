import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
// 官方暗色变量：必须配合 index.html 的 html.dark 使用
import 'element-plus/theme-chalk/dark/css-vars.css';

import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);

app.use(router);
app.use(ElementPlus, { locale: zhCn });

app.mount('#app');
