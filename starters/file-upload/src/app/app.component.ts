import { Component, inject, signal } from '@angular/core';
import { UploadService, hasFiles } from '@quenetiq/file-upload';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>@quenetiq/file-upload</h1>
    <p>GraphQL multipart file uploads.</p>
    <input type="file" (change)="onFileSelected($event)" multiple />
    @if (uploading()) { <p>Uploading...</p> }
    @if (uploadedFiles().length) {
      <ul>
        @for (file of uploadedFiles(); track file) {
          <li>{{ file }}</li>
        }
      </ul>
    }
  `,
})
export class AppComponent {
  private readonly uploadService = inject(UploadService);
  readonly uploading = signal(false);
  readonly uploadedFiles = signal<string[]>([]);

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploading.set(true);
    const files = Array.from(input.files);
    this.uploadedFiles.set(files.map(f => f.name));
    this.uploading.set(false);
  }
}
