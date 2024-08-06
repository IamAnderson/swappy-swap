import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractTransactionResponse, Signer } from "ethers";

const tokens = (n: number): bigint => {
  return ethers.parseUnits(n.toString(), "ether");
};

describe("Exchange", () => {
  let exchange: Contract;
  let accounts: Signer[];
  let deployer: Signer;
  let feeAccount: Signer;
  let token1: Contract;
  let token2: Contract;
  let user1: Signer;
  let user2: Signer;

  const feePercent = 10;
  const amount = tokens(100);

  beforeEach(async () => {
    const Token = await ethers.getContractFactory("Token");
    const Exchange = await ethers.getContractFactory("Exchange");

    accounts = await ethers.getSigners();
    [deployer, feeAccount, user1, user2] = accounts;
    //@ts-expect-error ...
    token1 = await Token.deploy("With Ease", "WEZ", "1000000");
    //@ts-expect-error ...
    token2 = await Token.deploy("Mock Token", "MTK", "1000000");

    //@ts-expect-error ...
    exchange = await Exchange.deploy(await feeAccount.getAddress(), feePercent);
    //@ts-expect-error ...
    await token1.connect(deployer).transfer(await user1.getAddress(), tokens(1000));
    //@ts-expect-error ...
    await token2.connect(deployer).transfer(await user2.getAddress(), tokens(1000));
  });

  const expectEvent = async (
    transaction: ContractTransactionResponse,
    eventName: string,
    expectedArgs: object,
  ) => {
    const receipt = await transaction.wait();
    expect(receipt).to.not.be.null;
    if (receipt) {
      const event = receipt.logs.find(
        (log) => log instanceof ethers.EventLog && log.eventName === eventName
      );
      expect(event).to.not.be.undefined;
      if (event && event instanceof ethers.EventLog) {
        expect(event.eventName).to.equal(eventName);
        Object.keys(expectedArgs).forEach((key, index) => {
          //@ts-expect-error ...
          expect(event.args[index]).to.equal(expectedArgs[key]);
        });
      }
    }
  };

  describe("Deployment", () => {
    it("tracks the fee account", async () => {
      expect(await exchange.feeAccount()).to.equal(await feeAccount.getAddress());
    });

    it("tracks the fee percent", async () => {
      expect(await exchange.feePercent()).to.equal(feePercent);
    });
  });

  describe("Depositing Tokens", () => {
    let transaction: ContractTransactionResponse;

    beforeEach(async () => {
      //@ts-expect-error ...
      await token1.connect(user1).approve(await exchange.getAddress(), amount);
      //@ts-expect-error ...
      transaction = await exchange.connect(user1).depositToken(await token1.getAddress(), amount);
    });

    describe("Success", () => {
      it("tracks the token deposit", async () => {
        expect(await token1.balanceOf(await exchange.getAddress())).to.equal(amount);
        expect(await exchange.tokens(await token1.getAddress(), await user1.getAddress())).to.equal(amount);
        expect(await exchange.balanceOf(await token1.getAddress(), await user1.getAddress())).to.equal(amount);
      });

      it("emits a deposit event", async () => {
        await expectEvent(transaction, "Deposit", {
          token: await token1.getAddress(),
          user: await user1.getAddress(),
          amount: amount,
          balance: amount
        });
      });
    });

    describe("Failure", () => {
      it("fails when no tokens are approved", async () => {
        await expect(
          //@ts-expect-error ...
          exchange.connect(user2).depositToken(await token1.getAddress(), amount)
        ).to.be.revertedWith("ERC20: insufficient allowance");
      });
    });
  });

  describe("Order actions", () => {
    const tradeAmount = tokens(100);
    const feeAmount = (tradeAmount * BigInt(feePercent)) / 100n;
    const totalAmount = tradeAmount + feeAmount;
  
    beforeEach(async () => {
      // User1 approves and deposits token1
      //@ts-expect-error ...
      await token1.connect(user1).approve(await exchange.getAddress(), tradeAmount);
      //@ts-expect-error ...
      await exchange.connect(user1).depositToken(await token1.getAddress(), tradeAmount);
  
      // User2 approves and deposits token2 (including fee)
      //@ts-expect-error ...
      await token2.connect(user2).approve(await exchange.getAddress(), totalAmount);
      //@ts-expect-error ...
      await exchange.connect(user2).depositToken(await token2.getAddress(), totalAmount);
  
      // User1 makes an order
      //@ts-expect-error ...
      await exchange.connect(user1).makeOrder(await token2.getAddress(), tradeAmount, await token1.getAddress(), tradeAmount);
    });
  
    describe("Filling Order", () => {
      describe("Success", () => {
        let transaction: ContractTransactionResponse;
        let user1Balance: number, user2Balance: number, feeAccountBalance: number;
  
        beforeEach(async () => {
          // Fill the order
          //@ts-expect-error ...
          transaction = await exchange.connect(user2).fillOrder(1);
  
          // Get balances after the trade
          user1Balance = await exchange.balanceOf(await token2.getAddress(), await user1.getAddress());
          user2Balance = await exchange.balanceOf(await token1.getAddress(), await user2.getAddress());
          feeAccountBalance = await exchange.balanceOf(await token2.getAddress(), await feeAccount.getAddress());
        });
  
        it("executes the trade and charges fees", async () => {
          expect(user1Balance).to.equal(tradeAmount);
          expect(user2Balance).to.equal(tradeAmount);
          expect(feeAccountBalance).to.equal(feeAmount);
  
          expect(await exchange.balanceOf(await token1.getAddress(), await user1.getAddress())).to.equal(0n);
          expect(await exchange.balanceOf(await token2.getAddress(), await user2.getAddress())).to.equal(0n);
        });
  
        it("updates filled orders", async () => {
          expect(await exchange.orderFilled(1)).to.equal(true);
        });
  
        it("emits trade event", async () => {
          await expectEvent(transaction, "Trade", {
            id: 1,
            user: await user2.getAddress(),
            tokenGet: await token2.getAddress(),
            amountGet: tradeAmount,
            tokenGive: await token1.getAddress(),
            amountGive: tradeAmount,
            creator: await user1.getAddress()
          });
        });
      });
      describe("Failure", () => {
        it("rejects invalid ids", async () => {
          await expect(
            //@ts-expect-error ...
            exchange.connect(user2).fillOrder(99999)
          ).to.be.revertedWith("Invalid order id");
        });

        it("rejects already filled orders", async () => {
          //@ts-expect-error ...
          await exchange.connect(user2).fillOrder(1);
          await expect(
            //@ts-expect-error ...
            exchange.connect(user2).fillOrder(1)
          ).to.be.revertedWith("Order already filled");
        });

        it("rejects cancelled orders", async () => {
          //@ts-expect-error ...
          await exchange.connect(user1).cancelOrder(1);
          await expect(
            //@ts-expect-error ...
            exchange.connect(user2).fillOrder(1)
          ).to.be.revertedWith("Cannot fill cancelled orders");
        });
      });
    });
  });
});