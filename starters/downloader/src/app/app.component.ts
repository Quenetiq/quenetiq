import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/downloader</h1>
    <p>Download and cache your GraphQL schema for offline use.</p>
    <pre><code>import &#123; downloadAndStoreSchema &#125; from '@quenetiq/downloader';

await downloadAndStoreSchema(&#123;
  endpoint: 'https://api.example.com/graphql',
  output: './schema.graphql',
&#125;);</code></pre>
    <p><em>Run <code>npx quenetiq-download-schema</code> to fetch your schema.</em></p>
  `,
})
export class AppComponent {}
