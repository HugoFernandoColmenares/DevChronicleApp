import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Challenge } from '@core/models/challenge.model';
import { JournalError } from '@core/models/journal-error';
import { ChallengeService } from '@core/services/challenge.service';

import { ChallengeDetailComponent } from './challenge-detail';
import { ChallengesComponent } from './challenges';

const evenSum: Challenge = {
  slug: 'suma-numeros-pares',
  title: 'Suma de números pares',
  summary: 'Escribe una función que sume todos los números pares.',
  difficulty: 'warmup',
  tags: ['javascript', 'loops'],
  language: 'javascript',
  prompt: 'Escribe `sumaNumerosPares`.',
  hint: 'while (actual <= numero) {}',
  solution: 'actual += 2;',
  articleSlug: null,
  articleTitle: null,
  order: 10,
  status: 'published',
  publishedAt: '2026-11-27T12:00:00.000Z',
  updatedAt: '2026-11-27T12:00:00.000Z',
};

function routeWithSlug(slug: string) {
  const params = convertToParamMap({ slug });
  return {
    snapshot: { paramMap: params },
    paramMap: of(params),
  };
}

function service(overrides: Partial<ChallengeService> = {}): Partial<ChallengeService> {
  return {
    offline: signal(false),
    watchPublished: () => of([]),
    watchOne: () => of(evenSum),
    ...overrides,
  } as Partial<ChallengeService>;
}

describe('ChallengesComponent', () => {
  it('lists published drills', async () => {
    TestBed.configureTestingModule({
      imports: [ChallengesComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ChallengeService, useValue: service({ watchPublished: () => of([evenSum]) }) },
      ],
    });

    const fixture = TestBed.createComponent(ChallengesComponent);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Coding challenges.');
    expect(text).toContain(evenSum.title);
  });

  it('shows an empty state when nothing is published', async () => {
    TestBed.configureTestingModule({
      imports: [ChallengesComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ChallengeService, useValue: service({ watchPublished: () => of([]) }) },
      ],
    });

    const fixture = TestBed.createComponent(ChallengesComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No challenges are published yet.');
  });

  it('shows an error state and can retry', async () => {
    let attempts = 0;
    TestBed.configureTestingModule({
      imports: [ChallengesComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ChallengeService,
          useValue: service({
            watchPublished: () => {
              attempts += 1;
              return attempts === 1
                ? throwError(() => new JournalError('invalid', 'broken'))
                : of([evenSum]);
            },
          }),
        },
      ],
    });

    const fixture = TestBed.createComponent(ChallengesComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('The challenges could not be loaded.');

    fixture.componentInstance.retry();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(evenSum.title);
  });
});

describe('ChallengeDetailComponent', () => {
  it('renders the drill with revealable hint and solution', async () => {
    TestBed.configureTestingModule({
      imports: [ChallengeDetailComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ChallengeService, useValue: service() },
        { provide: ActivatedRoute, useValue: routeWithSlug('suma-numeros-pares') },
      ],
    });

    const fixture = TestBed.createComponent(ChallengeDetailComponent);
    await fixture.whenStable();

    const view = fixture.nativeElement as HTMLElement;
    expect(view.textContent).toContain('Suma de números pares');
    expect(view.textContent).not.toContain('actual += 2');

    const hintButton = [...view.querySelectorAll('button')].find((node) =>
      node.textContent?.includes('Show hint'),
    ) as HTMLButtonElement;
    hintButton.click();
    await fixture.whenStable();
    expect(view.textContent).toContain('while (actual <= numero)');

    const solutionButton = [...view.querySelectorAll('button')].find((node) =>
      node.textContent?.includes('Reveal solution'),
    ) as HTMLButtonElement;
    solutionButton.click();
    await fixture.whenStable();
    expect(view.textContent).toContain('actual += 2');
  });

  it('shows a not-found state for unknown slugs', async () => {
    TestBed.configureTestingModule({
      imports: [ChallengeDetailComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ChallengeService,
          useValue: service({
            watchOne: () => throwError(() => new JournalError('not-found', 'missing')),
          }),
        },
        { provide: ActivatedRoute, useValue: routeWithSlug('no-existe') },
      ],
    });

    const fixture = TestBed.createComponent(ChallengeDetailComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Challenge not found.');
  });

  it('falls back to the bundled drills when Firestore is offline', async () => {
    TestBed.configureTestingModule({
      imports: [ChallengeDetailComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ChallengeService,
          useValue: service({
            watchOne: () => throwError(() => new JournalError('offline', 'offline')),
          }),
        },
        { provide: ActivatedRoute, useValue: routeWithSlug('suma-numeros-pares') },
      ],
    });

    const fixture = TestBed.createComponent(ChallengeDetailComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Suma de números pares');
  });
});
