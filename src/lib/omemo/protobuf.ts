import { Message, Reader, Type, Writer, loadSync } from "protobufjs";

const proto = `
message OMEMOMessage {
    required uint32 n          = 1;
    required uint32 pn         = 2;
    required bytes  dh_pub     = 3;
    optional bytes  ciphertext = 4;
}

message OMEMOAuthenticatedMessage {
    required bytes mac     = 1;
    required bytes message = 2; // Byte-encoding of an OMEMOMessage
}

message OMEMOKeyExchange {
    required uint32 pk_id  = 1;
    required uint32 spk_id = 2;
    required bytes  ik     = 3;
    required bytes  ek     = 4;
    required OMEMOAuthenticatedMessage message = 5;
}
`;

export type OMEMOMessageType = {
  n: number;
  pn: number;
  dh_pub: Uint8Array;
  ciphertext?: Uint8Array;
};

export type OMEMOAuthenticatedMessageType = {
  mac: Uint8Array;
  message: OMEMOMessageType;
};

export type OMEMOKeyExchangeType = {
  pk_id: number;
  spk_id: number;
  ik: Uint8Array;
  ek: Uint8Array;
  message: OMEMOAuthenticatedMessageType;
};

type TypedType<T extends object> = Omit<
  Type,
  "create" | "encode" | "decode" | "toObject"
> & {
  create(message: T): Message<T>;
  encode(message: Message<T>): Writer;
  decode(reader: Reader | Uint8Array, length?: number): Message<T>;
  toObject(message: Message<T>): T;
};

const root = loadSync(proto);
function lookupTypeProperly<T extends object>(name: string) {
  return root.lookupType(name) as unknown as TypedType<T>;
}

export const OMEMOMessage =
  lookupTypeProperly<OMEMOMessageType>("OMEMOMessage");
export const OMEMOAuthenticatedMessage =
  lookupTypeProperly<OMEMOAuthenticatedMessageType>(
    "OMEMOAuthenticatedMessage"
  );
export const OMEMOKeyExchange =
  lookupTypeProperly<OMEMOKeyExchangeType>("OMEMOKeyExchange");
