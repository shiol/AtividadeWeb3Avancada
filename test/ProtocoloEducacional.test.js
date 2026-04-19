import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const ORACLE_ADDRESS = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const INITIAL_SUPPLY = 1000n * 10n ** 18n;
const APR_BPS = 1200n;

describe("ProtocoloEducacional", async () => {
  const { ethers } = await network.connect();

  it("faz deploy dos contratos principais", async () => {
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

    assert.ok(await token.getAddress());
    assert.ok(await nft.getAddress());
    assert.ok(await staking.getAddress());
    assert.ok(await governance.getAddress());
  });
});
