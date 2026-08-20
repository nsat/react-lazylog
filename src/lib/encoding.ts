export const encode = (value: string): Uint8Array => new TextEncoder().encode(value);
export const decode = (value: Uint8Array | number): string => {
    let view: ArrayBufferView;

    if (!ArrayBuffer.isView(value)) {
        view = new Uint8Array([value as number]);
    } else {
        view = value;
    }

    return new TextDecoder().decode(view);
};
