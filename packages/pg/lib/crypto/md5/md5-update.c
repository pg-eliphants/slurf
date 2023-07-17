
static unsigned char buffer[64];
static unsigned int length;
static void md5_update(const char *input, int inputlen)
{
    int buflen = length & 63;
    length += inputlen;
    if (buflen + inputlen < 64)
    {
        memcpy(buffer + buflen, input, inputlen);
        buflen += inputlen;
        return;
    }

    memcpy(buffer + buflen, input, 64 - buflen);
    md5_transform(buffer);
    input += 64 - buflen;
    inputlen -= 64 - buflen;
    while (inputlen >= 64)
    {
        md5_transform(input);
        input += 64;
        inputlen -= 64;
    }
    memcpy(buffer, input, inputlen);
    buflen = inputlen;
}
