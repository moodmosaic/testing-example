import {
  Account,
  Chain,
  Context,
} from "../../deps.ts";

import {
  ExampleModel
} from "../../models/example.model.ts";

import fc from "../../fast-check.ts"

type State = {
  valuesMap: Map<number, number>,
  isInitialized: boolean
};

class InitializeCommand
  implements fc.Command<State, Chain> {

  readonly example: ExampleModel;
  readonly account: Account;

  constructor(
      example: ExampleModel
    , account: Account
    ) {
    this.example = example;
    this.account = account;
  }

  check(s: Readonly<State>): boolean {
    return s.isInitialized === false;
  }

  run(state: State, chain: Chain): void {
    const tx = this.example.initialize(this.account);

    const receipt = chain.mineBlock([tx]).receipts[0];

    receipt.result
      .expectOk()
      .expectBool(true);
    state.isInitialized = true;

    console.log(`✓ ${this.toString()}`);
  }

  toString() {
    return `account ${this.account.name} initialize()`;
  }
}

class InitializeCommand_WhenAlreadyInitialized
  implements fc.Command<State, Chain> {

  readonly example: ExampleModel;
  readonly account: Account;

  constructor(
      example: ExampleModel
    , account: Account
    ) {
    this.example = example;
    this.account = account;
  }

  check(s: Readonly<State>): boolean {
    return s.isInitialized;
  }

  run(_: State, chain: Chain): void {
    const tx = this.example.initialize(this.account);

    const receipt = chain.mineBlock([tx]).receipts[0];

    receipt.result
      .expectErr()
      .expectUint(ExampleModel.Err.ERR_NOT_AUTHORIZED);

    console.log(`✓ ${this.toString()} > ERR_NOT_AUTHORIZED`);
  }

  toString() {
    return `account ${this.account.name} initialize()`;
  }
}

class SetValuesCommand
  implements fc.Command<State, Chain> {

  readonly example: ExampleModel;
  readonly account: Account;
  readonly values: number[];
  readonly numTxs: number;

  constructor(
      example: ExampleModel
    , account: Account
    , values: number[]
    , numTxs: number
    ) {
    this.example = example;
    this.account = account;
    this.values = values;
    this.numTxs = numTxs;
  }

  check(s: Readonly<State>): boolean {
    return s.isInitialized === true;
  }

  run(state: State, chain: Chain): void {
    const setValuesTx = this.example.setValues(this.values, this.account);

    const receipt = chain.mineBlock(
        [...Array(this.numTxs).keys()].map(() => setValuesTx)).receipts[0];

    receipt.result
      .expectOk()
      .expectBool(true);

    let bh = chain.blockHeight - 1;
    for (let value of this.values) {
      const existing = state.valuesMap.has(bh) ? state.valuesMap.get(bh)! : 0;
      state.valuesMap.set(bh, value * this.numTxs + existing);

      this.example
        .getValue(bh)
        .expectSome()
        .expectUint(state.valuesMap.get(bh)!);
      bh++;
    }

    console.log(`✓ ${this.toString()} > ${this.values.toString()}`);
  }

  toString() {
    return `account ${this.account.name} set-values()`;
  }
}

class SetValuesCommand_WhenNotInitialized
  implements fc.Command<State, Chain> {

  readonly example: ExampleModel;
  readonly account: Account;
  readonly values: number[];
  readonly numTxs: number;

  constructor(
      example: ExampleModel
    , account: Account
    , values: number[]
    , numTxs: number
    ) {
    this.example = example;
    this.account = account;
    this.values = values;
    this.numTxs = numTxs;
  }

  check(s: Readonly<State>): boolean {
    return s.isInitialized === false;
  }

  run(_: State, chain: Chain): void {
    const setValuesTx = this.example.setValues(this.values, this.account);

    const receipt = chain.mineBlock(
        [...Array(this.numTxs).keys()].map(() => setValuesTx)).receipts[0];

    receipt.result
      .expectErr()
      .expectUint(ExampleModel.Err.ERR_NOT_AUTHORIZED);

    console.log(`✓ ${this.toString()} > ERR_NOT_AUTHORIZED`);
  }

  toString() {
    return `account ${this.account.name} set-values()`;
  }
}

export function CompositionRoot(ctx: Context) { 
  const allCommands = [
    // Construct InitializeCommand
    fc.record({
        example: fc.constant(ctx.models.get(ExampleModel))
      , account: fc.constantFrom(...ctx.accounts.values())
    }).map(r =>
      new InitializeCommand(
          r.example
        , r.account
        )
      ),
    // Construct InitializeCommand_WhenAlreadyInitialized
    fc.record({
        example: fc.constant(ctx.models.get(ExampleModel))
      , account: fc.constantFrom(...ctx.accounts.values())
    }).map(r =>
      new InitializeCommand_WhenAlreadyInitialized(
          r.example
        , r.account
        )
      ),
    // Construct SetValuesCommand
    fc.record({
        example: fc.constant(ctx.models.get(ExampleModel))
      , account: fc.constantFrom(...ctx.accounts.values())
      , values: fc.array(fc.nat())
      , numTxs: fc.integer(1, 100)
    }).map(r =>
      new SetValuesCommand(
          r.example
        , r.account
        , r.values
        , r.numTxs
        )
      ),
    // Construct SetValuesCommand_WhenNotInitialized
    fc.record({
        example: fc.constant(ctx.models.get(ExampleModel))
      , account: fc.constantFrom(...ctx.accounts.values())
      , values: fc.array(fc.nat())
      , numTxs: fc.integer(1, 100)
    }).map(r =>
      new SetValuesCommand_WhenNotInitialized(
          r.example
        , r.account
        , r.values
        , r.numTxs
        )
      ),
  ];
  return fc.commands(allCommands, { size: '+1' });
}
