import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql, isSuccess, unwrap } from '@quenetiq/client';

const GET_NOTES = gql`
  query { getNotes { id title content } }
`;

const client = createClient({ endpoint: '/graphql' });

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/ssr</h1>
    <p>Server-side rendering with cache transfer — no waterfalls.</p>
    @if (notes().length) {
      <ul>
        @for (note of notes(); track note.id) {
          <li><strong>{{ note.title }}</strong>: {{ note.content }}</li>
        }
      </ul>
      <p><em>View page source — data is pre-rendered in the HTML.</em></p>
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
