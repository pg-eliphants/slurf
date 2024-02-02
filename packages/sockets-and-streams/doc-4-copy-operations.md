# copy operations

## mode: copy-in, `COPY FROM STDIN` sql statement

- data transfer to the server
- backend executes `copy from stdin`
- backend sends `CopyInResponse` to the frontend.
- the frontend sends `CopyData` messages to backend
- front end terminate copy-in mode with:
    - send `CopyDone`
    - send `CopyFail`
    - ignore `Sync` and `Flush` messages
    - return to command processing operations.
    - backend send `CommandComplete` or `ErrorResponse`

if error happens during copy:
  - backend issue `ErrorResponse`.
  - following FE commands `CopyData`, `CopyDone`, `Copyfail` will be ignored.
  - Backend waits for `Sync` message of the frontend.
  - Backend issue `ReadyForQuery`.
  - 


## mode: copy-out, backend executes `COPY TO STDOUT` sql statement

backend sends `CopyOutResponse` message to frontend
backend sends 0 or more `CopyData` (once per row) messages to frontend
backend sends `CopyDone` when finished
backend sends `CommandComplete`

frontend cannot abort the transfer, except closing the connection using `Cancel` (kill session) request

ofcourse frontend can disregard data sent by `CopyData` and `CopyDone` messages.

In event of error, backend will issue `ErrorResponse`
Frontend should treat `ErrorResponse` as terminating copy-out mode
Possible for `NoticeResponse` and `ParameterStatus` to interspersed between `CopyData` messages
ANY OTHER MESSAGE THEN `CopyData` and/or `CopyDone` means copy-out mode is terminated.

## copy-both mode

copy-both mode is initiated if walsender executes a START_REPLICATION statement

backend send `CopyBothResponse`
both back end front send `CopyData`

Termination
- gracefull
- send terminate message and close connection











































