import { validationFactory } from '~lib/utils';

export const ifInvalidPortString = validationFactory((s: any) =>
    !(s && /^[0-9]+$/.test(s) && Number.parseInt(s) > 0));
