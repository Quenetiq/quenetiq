import { createApp } from 'vue';
import { createClient } from '@quenetiq/client';
import { createQuenetiqPlugin } from '@quenetiq/vue';
import App from './App.vue';

const client = createClient({
  endpoint: '/graphql',
});

createApp(App)
  .use(createQuenetiqPlugin(client))
  .mount('#app');
