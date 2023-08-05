export function absorbTill(v: string, pos: number, token: string) {
    let i = pos;
    const len = v.length;
    for (; i < len && v[i] !== token; i++);
    if (i === pos) {
        return '';
    }
    return v.slice(pos, len);
}
