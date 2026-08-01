import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/apollo-adapter</h1>
    <p>Migrate from Apollo Client to @quenetiq/cache.</p>
    <pre><code>import &#123; fromApolloCache &#125; from '@quenetiq/apollo-adapter';

// Convert your existing Apollo cache
const quenetiqCache = fromApolloCache(apolloClient.cache);

// Use with quenetiq client
const client = createClient(&#123;
  endpoint: '/graphql',
  cache: quenetiqCache,
&#125;);</code></pre>
    <p><em>Run <code>npx quenetiq-migrate</code> for a full migration guide.</em></p>
  `,
})
export class AppComponent {}
