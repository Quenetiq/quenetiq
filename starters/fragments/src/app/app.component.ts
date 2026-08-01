import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql, isSuccess, unwrap } from '@quenetiq/client';
import { fragment, spread, compose } from '@quenetiq/fragments';

const NoteFragment = fragment('NoteFragment', 'Note', gql`{ id title }`);
const NoteWithContent = compose(NoteFragment, fragment('NoteWithContent', 'Note', gql`{ content }`));

const GET_NOTES = gql`
  query { getNotes { ...NoteFragmentFields ...NoteWithContentFields } }
`;

const client = createClient({ endpoint: '/graphql' });

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/fragments</h1>
    <p>Composable GraphQL fragments for reusable query building.</p>
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
