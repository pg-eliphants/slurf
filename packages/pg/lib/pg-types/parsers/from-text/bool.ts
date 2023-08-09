export default function parseBool(value: string): boolean {
    return (
        value === 'TRUE' ||
        value === 't' ||
        value === 'true' ||
        value === 'y' ||
        value === 'yes' ||
        value === 'on' ||
        value === '1'
    );
}
