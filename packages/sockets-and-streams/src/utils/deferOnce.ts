export function createDeferOnce() {
    let hitCountBeforeExecution = 0;
    let hitCountDuringExecution = 0;
    let executing = false;

    return async function defer<T extends Function>(fn: T) {
        if (executing) {
            hitCountDuringExecution++;
            hitCountBeforeExecution = 0;
            return;
        }
        if (hitCountBeforeExecution) {
            hitCountBeforeExecution++;
            return;
        }
        // no recursion to avoid running out of stack space (in case of "infinite" (to deep) recursion)
        do {
            hitCountBeforeExecution = 0;
            hitCountDuringExecution = 0;
            executing = true;
            await Promise.resolve()
                .then(async () => {
                    return fn();
                })
                .catch(() => {
                    // sink errors, errors should be handled in fn() call
                });
            executing = false;
        } while (hitCountDuringExecution);
        hitCountBeforeExecution = 0;
    };
}