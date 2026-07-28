import { Component, OnInit, signal } from '@angular/core';
import { createClient, gql, isSuccess, unwrap } from '@quenetiq/client';
import { otelMiddleware, consoleExporter } from '@quenetiq/opentelemetry';

const GET_NOTES = gql`
  query { getNotes { id title content } }
`;

const client = createClient({
  endpoint: '/graphql',
  middlewares: [otelMiddleware({ exporter: consoleExporter() })],
});

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/opentelemetry</h1>
    <p>Distributed tracing for GraphQL operations.</p>
    @if (notes().length) {
      <ul>
        @for (note of notes(); track note.id) {
          <li><strong>{{ note.title }}</strong>: {{ note.content }}</li>
        }
      </ul>
      <p><em>Check console for trace spans.</em></p>
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
