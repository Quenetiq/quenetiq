import { createApp } from 'vue';
import { createQuenetiqPlugin } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';
import App from './App.vue';

const client = createClient({ endpoint: '/graphql' });

const app = createApp(App);
app.use(createQuenetiqPlugin(client));
app.mount('#app');
