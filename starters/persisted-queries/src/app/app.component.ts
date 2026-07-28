import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql, isSuccess, unwrap } from '@quenetiq/client';
import { apqMiddleware } from '@quenetiq/persisted-queries';

const GET_NOTES = gql`
  query { getNotes { id title content } }
`;

const client = createClient({
  endpoint: '/graphql',
  middlewares: [apqMiddleware()],
});

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/persisted-queries</h1>
    <p>Automatic Persisted Queries — sends query hashes instead of full queries.</p>
    @if (notes().length) {
      <ul>
        @for (note of notes(); track note.id) {
          <li><strong>{{ note.title }}</strong>: {{ note.content }}</li>
        }
      </ul>
      <p><em>Check Network tab — queries are sent as hashes after first load.</em></p>
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
