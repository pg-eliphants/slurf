# Backend messages

## Authentication

### Authentication Ok
- `[R] [00 00 00 08] [00 00 00 00]`

### AuthenticationKerberosV5
- `[R] [00 00 00 08] [00 00 00 02]`

### AuthenticationClearTextPassword
- `[R] [00 00 00 08] [00 00 00 03]`

### AuthenticationMD5Password

Last 4 bytes are the salt needs to be used in the password encr

- `[R] [00 00 00 12] [00 00 00 05] [.. .. .. .. ..]`

### AuthenticationGSS

- `[R] [00 00 00 08] [00 00 00 07]`

### AuthenticationGSSContinue 

ByteN: GSSAPI or SSPI authentication data.

- `[R] [.. .. .. ..] [00 00 00 08] byteN`

### AuthenticationSSPI

Specifies that SSPI authentication is required.

- `[R] [00 00 00 08] [00 00 00 09]`

### AuthenticationSASL

- `[R] [.. .. .. ..] [00 00 00 0A]`

### AuthenticationSASLContinue

Specifies that this message contains a SASL challenge.

Byte(_n_): SASL data, specific to the SASL mechanism being used.

- `[R] [.. .. .. ..] [00 00 00 0B] Byte(_n_)`

### AuthenticationSASLFinal

- `[R] [.. .. .. ..] [00 00 00 0C] Byte(_n_)`


## BackendKeyData

last int32 is the secret of this backend for the cancelation
-- save this data for use of the "CancelRequest"

- `[K] [00 00 00 0C] [.. .. .. ..] [.. .. .. ..]`

## Bind (frontend)

- `[B] [.. .. .. ..] cstr(portal) cstr(prepared statement) int16  int16[c] int16 (repeat)[int32, byte(n)] int16 int16[r]`

## BindComplete 

- `["2"] [00 00 00 04]`

## CancelRequest (frontend)

the last int32 is the sectret previously sent by message "K"

- `[16] [04 D2 16 2E] [.. .. .. ..] [.. .. .. ..]`

## CloseComplete 

- `['3'] [00 00 00 04]`

## CommandComplete 

- `['C'] [.. .. .. ..] [cstr command tag]`

- INSERT 0 rows
- DELETE rows
- UPDATE rows
- MERGE rows
- SELECT rows
- MOVE rows (cursor movement)
- FETCH rows
- COPY rows

## CopyData (Frontend & backend)

Byte(n): _Data that forms part of a COPY data stream. Messages sent from the backend will always correspond to single data rows, but messages sent by frontends might divide the data stream arbitrarily._

- `['d'] [.. .. .. ..] byte(n)`

## CopyDone (F & B)

- `['c'] [00 00 00 04]`

## CopyInResponse (B)

- `['G'] [.. .. .. ..] [..] [.. ..] int16(N)`

## CopyOutResponse (B)

- `['H'] [.. .. .. ..] [..] [.. ..] int16(N)`

## CopyBothResponse  (B)

- `['W'] [.. .. .. ..] [..] [.. ..] int16(N)`

## DataRow (B)

- `['D'] [.. .. .. ..] [.. ..] repeat([.. .. .. ..] Byte(N))`

## EmptyQueryResponse

- `['I'] [00 00 00 04]`

## ErrorResponse 

- `['E'] [.. .. .. ..] repeat(byte1, string)`

## FunctionCallResponse

- `['V'] [.. .. .. ..] [.. .. .. ..] byte(n)`

## NegotiateProtocolVersion

- `['v'] [.. .. .. ..] [.. .. .. ..] [.. .. .. ..] cstr`

## NoData

- `['n'] [00 00 00 04]`


## NoticeResponse

- `['N'] [.. .. .. ..] repeat(byte1, string)`

## NotificationResponse

- `['A'] [.. .. .. ..] [.. .. .. ..] cstr, cstr`

## ParameterDescription

- `['t'] [.. .. .. ..] [.. ..] [.. .. .. ..]`

## ParameterStatus

- `['S'] [.. .. .. ..] cstr cstr`

## ParseComplete

- `['1'] [.. .. .. ..] [message?]`

## PortalSuspended

- `['s'] [00 00 00 04]`

## ReadyForQuery 

_Current backend transaction status indicator. Possible values are 'I' if idle (not in a transaction block); 'T' if in a transaction block; or 'E' if in a failed transaction block (queries will be rejected until block is ended)._

- `['Z'] [00 00 00 05] Byte1`

## RowDescription

- `['T'] [.. .. .. ..] [nn nn] repeat(n, cstr, int32, int16, int32, int16, Int32, Int16`