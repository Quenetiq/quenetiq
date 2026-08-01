import { Component, inject } from '@angular/core';
import { gql } from '@quenetiq/client';
import { QuenetiqQueryDirective, GraphqlService } from '@quenetiq/core';

const GET_NOTES = gql`
  query { getNotes { id title content } }
`;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QuenetiqQueryDirective],
  template: `
    <h1>@quenetiq/core</h1>
    <p>Core Angular integration with GraphQL queries.</p>
    <ng-template quenetiqQuery [query]="GET_NOTES" let-data let-loading="loading" let-error="error">
      @if (loading) { <p>Loading...</p> }
      @if (error) { <p>Error: {{ error }}</p> }
      @if (data) {
        <ul>
          @for (note of data.data.getNotes; track note.id) {
            <li><strong>{{ note.title }}</strong>: {{ note.content }}</li>
          }
        </ul>
      }
    </ng-template>
  `,
})
export class AppComponent {
  readonly GET_NOTES = GET_NOTES;
}
