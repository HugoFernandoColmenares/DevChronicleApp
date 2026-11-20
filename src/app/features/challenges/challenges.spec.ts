import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ChallengeDetailComponent } from './challenge-detail';
import { ChallengesComponent } from './challenges';
import { CHALLENGES } from './challenges.data';

function routeWithSlug(slug: string) {
  const params = convertToParamMap({ slug });
  return {
    snapshot: { paramMap: params },
    paramMap: of(params),
  };
}

describe('ChallengesComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChallengesComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('lists every practice drill', async () => {
    const fixture = TestBed.createComponent(ChallengesComponent);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Desafíos de programación.');
    for (const challenge of CHALLENGES) {
      expect(text).toContain(challenge.title);
    }
  });
});

describe('ChallengeDetailComponent', () => {
  it('renders the even-sum drill with revealable hint and solution', async () => {
    TestBed.configureTestingModule({
      imports: [ChallengeDetailComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: routeWithSlug('suma-numeros-pares'),
        },
      ],
    });

    const fixture = TestBed.createComponent(ChallengeDetailComponent);
    await fixture.whenStable();

    const view = fixture.nativeElement as HTMLElement;
    expect(view.textContent).toContain('Suma de números pares');
    expect(view.textContent).toContain('sumaNumerosPares');
    expect(view.textContent).not.toContain('actual += 2');

    const hintButton = [...view.querySelectorAll('button')].find((node) =>
      node.textContent?.includes('Ver pista'),
    ) as HTMLButtonElement;
    hintButton.click();
    await fixture.whenStable();
    expect(view.textContent).toContain('while (actual <= numero)');

    const solutionButton = [...view.querySelectorAll('button')].find((node) =>
      node.textContent?.includes('Ver solución'),
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
          provide: ActivatedRoute,
          useValue: routeWithSlug('no-existe'),
        },
      ],
    });

    const fixture = TestBed.createComponent(ChallengeDetailComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Desafío no encontrado.');
  });
});
