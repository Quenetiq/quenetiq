import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { gql } from '@quenetiq/client';
import { GraphqlSubscription, WsClient } from '@quenetiq/subscriptions';

const ON_NOTE_ADDED = gql`
  subscription { noteAdded { id title content } }
`;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GraphqlSubscription],
  template: `
    <h1>@quenetiq/subscriptions</h1>
    <p>Real-time WebSocket subscriptions.</p>
    <ng-template quenetiqSubscription [query]="ON_NOTE_ADDED" let-data let-loading="loading" let-error="error">
      @if (loading) { <p>Connecting...</p> }
      @if (error) { <p>Error: {{ error }}</p> }
      @if (data) {
        <div class="event">
          <strong>New note:</strong> {{ data.data.noteAdded.title }}
        </div>
      }
    </ng-template>
  `,
})
export class AppComponent {
  readonly ON_NOTE_ADDED = ON_NOTE_ADDED;
}
