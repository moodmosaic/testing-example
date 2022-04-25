import {
  Accounts,
  beforeEach,
  Chain,
  Context,
  describe,
  it,
  run,
} from "../deps.ts";
import { ExampleModel } from "../models/example.model.ts";

let ctx: Context;
let chain: Chain;
let accounts: Accounts;
let example: ExampleModel;

beforeEach(() => {
  ctx = new Context();
  chain = ctx.chain;
  accounts = ctx.accounts;
  example = ctx.models.get(ExampleModel);
});

describe("[Example]", () => {
  describe("initialize()", () => {
    it("succeeds when called by contract deployer", () => {
      const txSender = ctx.deployer;
      const initializeTx = example.initialize(txSender);

      // act
      const receipt = chain.mineBlock([initializeTx]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
    });

    it("succeeds when called by account other than deployer", () => {
      const txSender = accounts.get("wallet_4")!;
      const initializeTx = example.initialize(txSender);

      // act
      const receipt = chain.mineBlock([initializeTx]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
    });

    it("fails when called 2nd time", () => {
      const txSender = ctx.deployer;
      const initializeTx = example.initialize(txSender);
      chain.mineBlock([initializeTx]);

      // act
      const receipt = chain.mineBlock([initializeTx]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(ExampleModel.Err.ERR_NOT_AUTHORIZED);
    });
  });

  describe("set-values()", () => {
    it("fails when contract is not initialized", () => {
      const txSender = accounts.get("wallet_5")!;
      const values = [1, 2, 3];
      const setValuesTx = example.setValues(values, txSender);

      // act
      const receipt = chain.mineBlock([setValuesTx]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(ExampleModel.Err.ERR_NOT_AUTHORIZED);
    });

    describe("when contract is initialized it", () => {
      beforeEach(() => {
        const txSender = ctx.deployer;
        const initializeTx = example.initialize(txSender);
        chain.mineBlock([initializeTx]);
      });

      it("succeeds and store values when called only once", () => {
        const txSender = accounts.get("wallet_5")!;
        const values = [1, 2, 3];
        const setValuesTx = example.setValues(values, txSender);

        // act
        const receipt = chain.mineBlock([setValuesTx]).receipts[0];

        // assert
        receipt.result.expectOk().expectBool(true);

        let blockHeight = chain.blockHeight - 1;
        for (let value of values) {
          example.getValue(blockHeight).expectSome().expectUint(value);
          blockHeight++;
        }
      });

      it("succeeds and store values when called 2x in a single block", () => {
        const txSender = accounts.get("wallet_5")!;
        const values = [1, 2, 3];
        const setValuesTx = example.setValues(values, txSender);

        // act
        const receipt = chain.mineBlock([setValuesTx, setValuesTx]).receipts[0];

        // assert
        receipt.result.expectOk().expectBool(true);

        let blockHeight = chain.blockHeight - 1;
        for (let value of values) {
          example
            .getValue(blockHeight)
            .expectSome()
            .expectUint(value * 2);
          blockHeight++;
        }
      });

      it("succeeds and store values when called once per block over multiple blocks", () => {
        const txSender = accounts.get("wallet_5")!;
        const values = [1, 2, 3];
        const setValuesTx = example.setValues(values, txSender);

        // act
        const receipts = [
          chain.mineBlock([setValuesTx]).receipts[0],
          chain.mineBlock([setValuesTx]).receipts[0],
          chain.mineBlock([setValuesTx]).receipts[0],
        ];

        // assert
        for (let receipt of receipts) {
          receipt.result.expectOk().expectBool(true);
        }

        example.getValue(2).expectSome().expectUint(1); // 1
        example.getValue(3).expectSome().expectUint(3); // 2 + 1
        example.getValue(4).expectSome().expectUint(6); // 3 + 2 + 1
        example.getValue(5).expectSome().expectUint(5); // 3 + 2  
        example.getValue(6).expectSome().expectUint(3); // 3
      });
    });
  });
});

run();
