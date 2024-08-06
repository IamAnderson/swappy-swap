import { ethers } from "hardhat";

async function main() {
  let token;
  let exchange;

  const accounts = await ethers.getSigners();
  console.log(
    `Accounts Feteched: ${accounts[0].address}\n${accounts[1].address}`
  );

  await ethers.getContractFactory("Token").then(async (Token) => {
    token = await Token.deploy("With Ease", "WEAE", "1000000");
    await token.waitForDeployment();

    console.log(`WEAE Token deployed to: ${await token.getAddress()}`);
  });

  await ethers.getContractFactory("Token").then(async (Token) => {
    token = await Token.deploy("mini ETH", "mETH", "1000000");
    await token.waitForDeployment();

    console.log(`mETH Token deployed to: ${await token.getAddress()}`);
  });

  await ethers.getContractFactory("Token").then(async (Token) => {
    token = await Token.deploy("mini Dai", "mDAI", "1000000");
    await token.waitForDeployment();

    console.log(`mDai Token deployed to: ${await token.getAddress()}`);
  });

  //Deploy exchange
  await ethers.getContractFactory("Exchange").then(async (Token) => {
    exchange = await Token.deploy(accounts[1].address, 10);
    await exchange.waitForDeployment();

    console.log(`Exchange deployed to: ${await exchange.getAddress()}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
