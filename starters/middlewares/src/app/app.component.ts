import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql, isSuccess, unwrap } from '@quenetiq/client';
import { retryExchange, dedupMiddleware } from '@quenetiq/middlewares';

const GET_NOTES = gql`
  query { getNotes { id title content } }
`;

const client = createClient({
  endpoint: '/graphql',
  middlewares: [dedupMiddleware(), retryExchange({ maxRetries: 3 })],
});

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/middlewares</h1>
    <p>Retry, dedup, rate-limit, and offline queue middleware.</p>
    @if (notes().length) {
      <ul>
        @for (note of notes(); track note.id) {
          <li><strong>{{ note.title }}</strong>: {{ note.content }}</li>
        }
      </ul>
    }
  `,
})
export class AppComponent implements OnInit {
  readonly notes = signal<{ id: string; title: string; content: string }[]>([]);

  async ngOnInit() {
    const result = await client.query<{ getNotes: { id: string; title: string; content: string }[] }>(GET_NOTES);
    if (isSuccess(result)) {
      this.notes.set(unwrap(result).getNotes);
    }
  }
}
