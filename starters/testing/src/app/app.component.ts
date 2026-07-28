import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/testing</h1>
    <p>Test utilities with mock GraphQL service.</p>
    <pre><code>import &#123; provideQuenetiqTesting, MockGraphqlService &#125; from '@quenetiq/testing';

TestBed.configureTestingModule(&#123;
  providers: [provideQuenetiqTesting(&#123;
    mocks: [&#123;
      query: GET_NOTES,
      response: &#123; data: &#123; getNotes: mockNotes &#125; &#125;,
    &#125;]
  &#125;)]
&#125;);</code></pre>
    <p><em>Run tests with <code>ng test</code>.</em></p>
  `,
})
export class AppComponent {}
