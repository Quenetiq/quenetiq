import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql, isSuccess, unwrap } from '@quenetiq/client';
import { offsetPagination, offsetMerge } from '@quenetiq/pagination';

const GET_NOTES = gql`
  query ($offset: Int, $limit: Int) {
    getNotes(offset: $offset, limit: $limit) { id title content }
  }
`;

const client = createClient({ endpoint: '/graphql' });
const pagination = offsetPagination({ limit: 5 });

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/pagination</h1>
    <p>Offset-based pagination with automatic merge.</p>
    @if (loading()) { <p>Loading...</p> }
    @if (notes().length) {
      <ul>
        @for (note of notes(); track note.id) {
          <li><strong>{{ note.title }}</strong>: {{ note.content }}</li>
        }
      </ul>
      <button (click)="loadMore()">Load more</button>
    }
  `,
})
export class AppComponent implements OnInit {
  readonly loading = signal(true);
  readonly notes = signal<{ id: string; title: string; content: string }[]>([]);

  async ngOnInit() {
    await this.fetchNotes(0);
  }

  async fetchNotes(offset: number) {
    const vars = pagination({ offset });
    const result = await client.query<{ getNotes: { id: string; title: string; content: string }[] }>(GET_NOTES, vars);
    this.loading.set(false);
    if (isSuccess(result)) {
      const newNotes = unwrap(result).getNotes;
      this.notes.set(offset === 0 ? newNotes : offsetMerge(this.notes(), newNotes));
    }
  }

  async loadMore() {
    this.loading.set(true);
    await this.fetchNotes(this.notes().length);
  }
}
