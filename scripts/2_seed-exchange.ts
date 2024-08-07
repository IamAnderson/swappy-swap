import { ethers } from "hardhat";
import config from "../config.json"

const tokens = (n: number): bigint => {
  return ethers.parseUnits(n.toString(), "ether");
};

const wait = (seconds: number) => {
  const milliseconds = seconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

async function main() {
  const accounts = await ethers.getSigners();

  const { chainId } = await ethers.provider.getNetwork();
  console.log("Using chainId:", chainId);

  const weae = await ethers.getContractAt(
    "Token",
    //@ts-expect-error ...
    config[chainId]?.wEAE?.address
  );
  const mEth = await ethers.getContractAt(
    "Token",
    //@ts-expect-error ...
    config[chainId]?.mETH?.address
  );
  const mDai = await ethers.getContractAt(
    "Token",
    //@ts-expect-error ...
    config[chainId]?.mDAI?.address
  );
  const exchange = await ethers.getContractAt(
    "Exchange",
    //@ts-expect-error ...
    config[chainId]?.exchange?.address
  );

  //Distribute tokens
  // Give tokens to account[1]
  const sender = accounts[0]; // deployer of tokens / user1
  const receiver = accounts[2]; // user2
  let amount = tokens(10000);
  let tx, receipt;

  //Give user1 10,000 mETH
  tx = await mEth.connect(sender).transfer(await receiver.getAddress(), amount);
  console.log(
    `Transferred ${amount} tokens from ${sender.address} to ${receiver.address}`
  );

  // Set up the exchange
  const user1 = accounts[0];
  const user2 = accounts[2];
  amount = tokens(10000);

  //Deposit tokens to exchange
  // User1 approves 10,000 WEAE
  tx = await weae.connect(user1).approve(await exchange.getAddress(), amount);
  await tx.wait();
  console.log(
    `User1 Approved ${amount} WEAE from ${
      user1.address
    } to spender: ${await exchange.getAddress()}`
  );

  // User1 deposits token to exchange (spender)
  tx = await exchange
    .connect(user1)
    .depositToken(await weae.getAddress(), amount);
  await tx.wait();
  console.log(
    `User1 Deposited ${amount} WEAE from ${
      user1.address
    } to spender: ${await exchange.getAddress()}`
  );

  // User2 approves 10,000 mETH
  tx = await mEth.connect(user2).approve(await exchange.getAddress(), amount);
  await tx.wait();
  console.log(
    `User2 Approved ${amount} mETH from ${
      user2.address
    } to spender: ${await exchange.getAddress()}`
  );

  // User2 deposits token to exchange (spender)
  tx = await exchange
    .connect(user2)
    .depositToken(await mEth.getAddress(), amount);
  await tx.wait();
  console.log(
    `User2 Deposited ${amount} mETH from ${
      user2.address
    } to spender: ${await exchange.getAddress()}`
  );

  // User1 makes order and cancels order
  // Make orders
  let orderEvent;
  let orderId;

  tx = await exchange
    .connect(user1)
    .makeOrder(
      await mEth.getAddress(),
      tokens(100),
      await weae.getAddress(),
      tokens(10)
    );
  receipt = await tx.wait();
  console.log(`Made order from ${user1.address}`);

  // Extract orderId
  orderEvent = receipt?.logs.find(
    (log) => log instanceof ethers.EventLog && log.eventName === "Order"
  );
  console.log("ORDER_EVENT:", orderEvent);
  //@ts-expect-error ...
  orderId = orderEvent?.args[0];

  // Cancel Orders
  tx = await exchange.connect(user1).cancelOrder(orderId);
  receipt = await tx.wait();
  console.log(`Order ${orderId} cancelled by ${user1.address}`);

  await wait(1);

  // User1 makes order and user2 fills order
  // Make orders
  tx = await exchange
    .connect(user1)
    .makeOrder(
      await mEth.getAddress(),
      tokens(50),
      await weae.getAddress(),
      tokens(15)
    );
  receipt = await tx.wait();
  console.log(`Made order from ${user1.address}`);

  // Extract orderId
  orderEvent = receipt?.logs.find(
    (log) => log instanceof ethers.EventLog && log.eventName === "Order"
  );
  console.log("ORDER_EVENT:", orderEvent);
  //@ts-expect-error ...
  orderId = orderEvent?.args[0];

  // Fill orders
  tx = await exchange.connect(user2).fillOrder(orderId);
  receipt = await tx.wait();
  console.log(`Order ${orderId} filled by ${user2.address}`);

  await wait(1);

  // User1 makes another order and user2 fills order
  // Make orders
  tx = await exchange
    .connect(user1)
    .makeOrder(
      await mEth.getAddress(),
      tokens(100),
      await weae.getAddress(),
      tokens(10)
    );
  receipt = await tx.wait();
  console.log(`Made order from ${user1.address}`);

  // Extract orderId
  orderEvent = receipt?.logs.find(
    (log) => log instanceof ethers.EventLog && log.eventName === "Order"
  );
  console.log("ORDER_EVENT:", orderEvent);
  //@ts-expect-error ...
  orderId = orderEvent?.args[0];

  // Fill orders
  tx = await exchange.connect(user2).fillOrder(orderId);
  receipt = await tx.wait();
  console.log(`Order ${orderId} filled by ${user2.address}`);

  await wait(1);

  
  // User1 makes final order and user2 fills order
  // Make orders
  tx = await exchange
    .connect(user1)
    .makeOrder(
      await mEth.getAddress(),
      tokens(200),
      await weae.getAddress(),
      tokens(20)
    );
  receipt = await tx.wait();
  console.log(`Made order from ${user1.address}`);

  // Extract orderId
  orderEvent = receipt?.logs.find(
    (log) => log instanceof ethers.EventLog && log.eventName === "Order"
  );
  console.log("ORDER_EVENT:", orderEvent);
  //@ts-expect-error ...
  orderId = orderEvent?.args[0];

  // Fill orders
  tx = await exchange.connect(user2).fillOrder(orderId);
  receipt = await tx.wait();
  console.log(`Order ${orderId} filled by ${user2.address}`);

  await wait(1);

  // Seed open orders
  // User 1 makes 10 orders
  for(let i = 1; i <= 10; i++) {
    tx = await exchange.connect(user1).makeOrder(await mEth.getAddress(), (10 * i), await weae.getAddress(), (10));
    receipt = tx.wait();
    console.log(`Orders made from user1: ${user1.address}`);
    await wait(1);
  }

    // User 2 makes 10 orders
    for(let i = 1; i <= 10; i++) {
        tx = await exchange.connect(user2).makeOrder(await weae.getAddress(), (10), await mEth.getAddress(), (10 * i));
        receipt = tx.wait();
        console.log(`Orders made from user2: ${user2.address}`);
        await wait(1);
      }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
