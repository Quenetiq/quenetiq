import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql, isSuccess, unwrap } from '@quenetiq/client';
import { createCache } from '@quenetiq/cache';

const GET_NOTES = gql`
  query { getNotes { id title content } }
`;

const cache = createCache();
const client = createClient({ endpoint: '/graphql', cache });

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/cache</h1>
    <p>Normalized caching — second load is instant.</p>
    @if (loading()) { <p>Loading...</p> }
    @if (error()) { <p>Error: {{ error() }}</p> }
    @if (notes().length) {
      <ul>
        @for (note of notes(); track note.id) {
          <li><strong>{{ note.title }}</strong>: {{ note.content }}</li>
        }
      </ul>
      <p><em>Reload the page — data loads from cache instantly.</em></p>
    }
  `,
})
export class AppComponent implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notes = signal<{ id: string; title: string; content: string }[]>([]);

  async ngOnInit() {
    const result = await client.query<{ getNotes: { id: string; title: string; content: string }[] }>(GET_NOTES);
    this.loading.set(false);
    if (isSuccess(result)) {
      this.notes.set(unwrap(result).getNotes);
    } else {
      this.error.set(String(result));
    }
  }
}
