import { ethers } from "hardhat";
import { expect } from "chai";
import { setupFixture } from "./fixtures";

describe("Fixture - Initial Setup", function () {
  describe("Token Minting", function () {
    it("verifies that the deployer holds 1000 units of each token in the pair", async () => {
      const { deployer, token1, token2 } = await setupFixture();

      const expectedBalance = ethers.parseEther("1000");

      expect(await token1.balanceOf(deployer)).to.equal(expectedBalance);
      expect(await token2.balanceOf(deployer)).to.equal(expectedBalance);
    });
  });

  describe("Token Approvals", function () {
    it("should deploy SimpleSwap with correct token addresses", async () => {
      const { token1, token2, swap } = await setupFixture();

      expect(await swap.TOKEN_A()).to.equal(token1.target);
      expect(await swap.TOKEN_B()).to.equal(token2.target);
    });
    it("verifies that the deployer approved the full token amounts to SimpleSwap", async () => {
      const { deployer, token1, token2, swap } = await setupFixture();

      const expectedAllowance = ethers.parseEther("1000");

      expect(await token1.allowance(deployer, swap.target)).to.equal(expectedAllowance);
      expect(await token2.allowance(deployer, swap.target)).to.equal(expectedAllowance);
    });
  });
  describe("verifies names and symbols of tokens", function () {
    it("tokens should have correct name and symbol", async () => {
      const { token1, token2 } = await setupFixture();

      expect(await token1.name()).to.equal("Token 1");
      expect(await token1.symbol()).to.equal("TK1");

      expect(await token2.name()).to.equal("Token 2");
      expect(await token2.symbol()).to.equal("TK2"); // ajustá si el nombre real es distinto
    });
  });
});
