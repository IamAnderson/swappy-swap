import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractTransactionResponse, Signer } from "ethers";

const tokens = (n: number): bigint => ethers.parseUnits(n.toString(), "ether");

describe("Token", () => {
  let token: Contract;
  let accounts: Signer[];
  let deployer: Signer;
  let receiver: Signer;
  let exchange: Signer;

  beforeEach(async () => {
    const Token = await ethers.getContractFactory("Token");
    //@ts-ignore
    token = await Token.deploy("TokenX", "TKX", "1000000");
    accounts = await ethers.getSigners();
    [deployer, receiver, exchange] = accounts;
  });

  const expectEvent = async (
    transaction: ContractTransactionResponse,
    eventName: string,
    expectedArgs: any
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
          expect(event.args[index]).to.equal(expectedArgs[key]);
        });
      }
    }
  };

  describe("Deployment", () => {
    const name = "TokenX";
    const symbol = "TKX";
    const decimals = 18;
    const totalSupply = tokens(1000000);

    it("has correct token properties", async () => {
      expect(await token.name()).to.equal(name);
      expect(await token.symbol()).to.equal(symbol);
      expect(await token.decimals()).to.equal(decimals);
      expect(await token.totalSupply()).to.equal(totalSupply);
      expect(await token.balanceOf(await deployer.getAddress())).to.equal(totalSupply);
    });
  });

  describe("Token Operations", () => {
    describe("Transfers", () => {
        let tx: any;
      const amount = tokens(900);
      beforeEach(async() => {
        //@ts-ignore
        tx = await token.connect(deployer).transfer(await receiver.getAddress(), amount);
      });

      it("transfers tokens successfully", async () => {
          expect(await token.balanceOf(await deployer.getAddress())).to.equal(tokens(999100));
          expect(await token.balanceOf(await receiver.getAddress())).to.equal(amount);
        });
        
        it("emits transfer event", async() => {
        await expectEvent(tx, "Transfer", {
            _from: await deployer.getAddress(),
            _to: await receiver.getAddress(),
            _value: amount
        });
  
      });

      it("rejects invalid transfers", async () => {
        await expect(
            //@ts-ignore
          token.connect(deployer).transfer(await receiver.getAddress(), tokens(1000000000000))
        ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

        await expect(
            //@ts-ignore
          token.connect(deployer).transfer(ethers.ZeroAddress, amount)
        ).to.be.reverted;
      });
    });

    describe("Approvals", () => {
      const amount = tokens(100);

      it("approves tokens for delegated transfer", async () => {
        //@ts-ignore
        const tx = await token.connect(deployer).approve(await exchange.getAddress(), amount);
        await expectEvent(tx, "Approval", {
          _owner: await deployer.getAddress(),
          _spender: await exchange.getAddress(),
          _value: amount
        });

        expect(
          await token.allowance(await deployer.getAddress(), await exchange.getAddress())
        ).to.equal(amount);
      });

      it("rejects invalid approvals", async () => {
        await expect(
            //@ts-ignore
          token.connect(deployer).approve(ethers.ZeroAddress, amount)
        ).to.be.revertedWith("ERC20: cannot approve to the zero address");
      });
    });

    describe("Delegated Transfers", () => {
      const amount = tokens(100);

      beforeEach(async () => {
        //@ts-ignore
        await token.connect(deployer).approve(await exchange.getAddress(), amount);
      });

      it("performs delegated transfer successfully", async () => {
        const tx = await token
          .connect(exchange)
          //@ts-ignore
          .transferFrom(await deployer.getAddress(), await receiver.getAddress(), amount);
        
        await expectEvent(tx, "Transfer", {
          _from: await deployer.getAddress(),
          _to: await receiver.getAddress(),
          _value: amount
        });

        expect(await token.balanceOf(await deployer.getAddress())).to.equal(tokens(999900));
        expect(await token.balanceOf(await receiver.getAddress())).to.equal(amount);
        expect(
          await token.allowance(await deployer.getAddress(), await exchange.getAddress())
        ).to.equal(0);
      });

      it("rejects invalid delegated transfers", async () => {
        await expect(
          token
            .connect(exchange)
            //@ts-ignore
            .transferFrom(await deployer.getAddress(), await receiver.getAddress(), tokens(100000000))
        ).to.be.revertedWith("ERC20: insufficient allowance");
      });
    });
  });
});