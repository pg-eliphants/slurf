typedef unsigned int UINT4;
static UINT4 state[4];
static unsigned int length;
static UINT4 initstate[4] = {
    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476};

static char *md5(const char *input)
{
    memcpy((char *)state, (char *)initstate, sizeof(initstate));
    length = 0;
    md5_update(input, strlen(input));
    return md5_final();
}