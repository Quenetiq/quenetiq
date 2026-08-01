import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql } from '@quenetiq/client';
import { GraphQLError, NetworkError, ErrorHandler } from '@quenetiq/errors';

const BAD_QUERY = gql`
  query { nonexistentField { id } }
`;

const client = createClient({ endpoint: '/graphql' });
const errorHandler = new ErrorHandler();

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/errors</h1>
    <p>Typed error classes with centralized error handling.</p>
    @if (status()) {
      <p [class]="status() === 'error' ? 'error' : 'success'">{{ status() }}</p>
    }
    @if (errors().length) {
      <ul>
        @for (err of errors(); track err) {
          <li class="error">{{ err }}</li>
        }
      </ul>
    }
  `,
  styles: [` .error { color: #e53e3e; } .success { color: #38a169; } `],
})
export class AppComponent implements OnInit {
  readonly status = signal('');
  readonly errors = signal<string[]>([]);

  async ngOnInit() {
    try {
      await client.query(BAD_QUERY);
      this.status.set('success');
    } catch (err) {
      this.status.set('error');
      if (err instanceof GraphQLError) {
        this.errors.set(err.messages.map(m => m.message));
      } else if (err instanceof NetworkError) {
        this.errors.set([err.message]);
      } else {
        this.errors.set([String(err)]);
      }
    }
  }
}
