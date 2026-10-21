import { Component, input } from '@angular/core';

@Component({
  selector: 'dev-tag',
  templateUrl: './tag.html',
  styleUrl: './tag.css',
})
export class TagComponent {
  readonly label = input.required<string>();
  readonly active = input(false);
}
