export type List<T> = null | {
    prev?: List<T>;
    next?: List<T>;
    value: T;
};

export function first<T>(l: List<T>): List<T> {
    return !l?.prev ? l : first(l.prev);
}

export function last<T>(l: List<T>): List<T> {
    return !l?.next ? l : last(l.next);
}

export function insertBefore<T>(list: List<T>, item: List<T>): List<T> {
    item!.next = list;
    item!.prev = list?.prev ?? null;
    if (item?.prev) {
        item.prev.next = item;
    }
    if (list) {
        list.prev = item;
    }
    return item;
}

export function insertAfter<T>(list: List<T>, item: List<T>): List<T> {
    item!.prev = list;
    item!.next = list?.next;
    if (item?.next) {
        item.next.prev = item;
    }
    if (list) {
        list.next = item;
    }
    return item;
}

export function remove<T>(list: List<T>): List<T> {
    if (!list) {
        return list;
    }
    const temp = list;
    if (temp.prev) {
        temp.prev.next = temp.next;
    }
    if (temp.next) {
        temp.next.prev = temp.prev;
    }
    delete temp.next;
    delete temp.prev;
    return temp;
}
