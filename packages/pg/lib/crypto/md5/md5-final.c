typedef unsigned int UINT4;
static UINT4 state[4];
static unsigned int length;
static unsigned char buffer[64];

static unsigned char *md5_final()
{
    int i, buflen = length & 63;
    buffer[buflen++] = 0x80;
    memset(buffer + buflen, 0, 64 - buflen);
    if (buflen > 56)
    {
        md5_transform(buffer);
        memset(buffer, 0, 64);
        buflen = 0;
    }

    *(UINT4 *)(buffer + 56) = cpu_to_le32(8 * length);
    *(UINT4 *)(buffer + 60) = 0;
    md5_transform(buffer);
    for (i = 0; i < 4; i++)
        state[i] = cpu_to_le32(state[i]);
    return (unsigned char *)state;
}