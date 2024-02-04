export const defaultActivityTimeReducer = (delay: number) => {
    const bin = delay; //Math.trunc(Math.sqrt(Math.max(delay, 0)));
    return bin;
};

export function delayMillis(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
