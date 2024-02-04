export default function delayMillis(ts: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ts));
}
