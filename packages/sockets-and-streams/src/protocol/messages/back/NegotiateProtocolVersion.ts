/*
NegotiateProtocolVersion (B) 
Byte1('v')
Identifies the message as a protocol version negotiation message.

Int32
Length of message contents in bytes, including self.

Int32
Newest minor protocol version supported by the server for the major protocol version requested by the client.

Int32
Number of protocol options not recognized by the server.

Then, for protocol option not recognized by the server, there is the following:

String
The option name.
*/
