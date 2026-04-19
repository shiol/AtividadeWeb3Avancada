import assert from "node:assert/strict";
import { network } from "hardhat";

const ORACLE_ADDRESS = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const INITIAL_SUPPLY = 1000n * 10n ** 18n;
const APR_BPS = 1200n;

async function main() {
  const { ethers } = await network.connect();
  const [deployerAddress] = await ethers.provider.send("eth_accounts", []);

  const tokenFactory = await ethers.getContractFactory("EduToken");
  const token = await tokenFactory.deploy(INITIAL_SUPPLY);
  await token.waitForDeployment();

  const nftFactory = await ethers.getContractFactory("EduNFT");
  const nft = await nftFactory.deploy();
  await nft.waitForDeployment();

  const stakingFactory = await ethers.getContractFactory("EduStaking");
  const staking = await stakingFactory.deploy(
    await token.getAddress(),
    ORACLE_ADDRESS,
    APR_BPS
  );
  await staking.waitForDeployment();

  const governanceFactory = await ethers.getContractFactory("EduGovernance");
  const governance = await governanceFactory.deploy(await staking.getAddress());
  await governance.waitForDeployment();

  const minterRole = await token.MINTER_ROLE();
  await (await token.grantRole(minterRole, await staking.getAddress())).wait();

  assert.equal(
    await token.balanceOf(deployerAddress),
    INITIAL_SUPPLY,
    "initial token supply should belong to deployer"
  );
  assert.equal(
    await staking.token(),
    await token.getAddress(),
    "staking should reference deployed token"
  );
  assert.equal(
    await governance.staking(),
    await staking.getAddress(),
    "governance should reference deployed staking"
  );
  assert.equal(
    await token.hasRole(minterRole, await staking.getAddress()),
    true,
    "staking should receive MINTER_ROLE"
  );

  console.log("Hardhat audit check passed");
  console.log(`EduToken local: ${await token.getAddress()}`);
  console.log(`EduNFT local: ${await nft.getAddress()}`);
  console.log(`EduStaking local: ${await staking.getAddress()}`);
  console.log(`EduGovernance local: ${await governance.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
