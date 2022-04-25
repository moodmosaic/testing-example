import { Account, Model, types } from "../deps.ts";

enum Err {
  ERR_NOT_AUTHORIZED = 200,
}

export class ExampleModel extends Model {
  name = "example";

  static Err = Err;

  initialize(txSender: string | Account) {
    return this.callPublic("initialize", [], txSender);
  }

  getValue(blockHeight: number | bigint) {
    return this.callReadOnly("get-value", [types.uint(blockHeight)]).result;
  }

  setValues(values: (number | bigint)[], txSender: string | Account) {
    return this.callPublic("set-values", [
      types.list(values.map((value) => types.uint(value))),
    ], txSender);
  }
}
