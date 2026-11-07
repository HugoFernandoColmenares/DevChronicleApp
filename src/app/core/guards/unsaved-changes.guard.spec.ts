import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  function run(component: {
    hasUnsavedChanges: () => boolean;
    confirmDiscard: () => Promise<boolean>;
  }): ReturnType<typeof unsavedChangesGuard> {
    return unsavedChangesGuard(component, {} as never, {} as never, {} as never);
  }

  it('allows navigation when the editor has no pending changes', async () => {
    const confirmDiscard = vi.fn().mockResolvedValue(true);

    expect(await run({ hasUnsavedChanges: () => false, confirmDiscard })).toBe(true);
    expect(confirmDiscard).not.toHaveBeenCalled();
  });

  it('asks the author before discarding changes', async () => {
    const confirmDiscard = vi.fn().mockResolvedValue(true);

    expect(await run({ hasUnsavedChanges: () => true, confirmDiscard })).toBe(true);
    expect(confirmDiscard).toHaveBeenCalledOnce();
  });

  it('blocks navigation when the author cancels', async () => {
    const confirmDiscard = vi.fn().mockResolvedValue(false);

    expect(await run({ hasUnsavedChanges: () => true, confirmDiscard })).toBe(false);
  });
});
