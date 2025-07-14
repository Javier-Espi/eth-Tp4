import { expect } from "chai";
import { ethers } from "hardhat";
import { setupFixture } from "./fixtures";

describe("SimpleSwap", function () {
  describe("Deployment", function () {
    it("should set correct token addresses", async () => {
      const { token1, token2, swap } = await setupFixture();
      expect(await swap.TOKEN_A()).to.equal(token1.target);
      expect(await swap.TOKEN_B()).to.equal(token2.target);
    });
  });

  describe("Liquidity Management", function () {
    /*
    it("should add liquidity and mint LP tokens", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      const tx = await swap.addLiquidity(
        token1.target,
        token2.target,
        amountA,
        amountB,
        0,
        0,
        deployer,
        deadline
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => swap.interface.parseLog(log))
        .find((e: any) => e && e.name === "LiquidityAdded");

      expect(event).to.not.be.undefined;
      expect(await swap.balanceOf(deployer)).to.be.gt(0);

      const [reserveA, reserveB] = await swap.getReserves();
      expect(reserveA).to.equal(amountA);
      expect(reserveB).to.equal(amountB);
    });
*/
    it("should remove liquidity and burn LP tokens", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0, 0, deployer, deadline);

      const lpBalance = await swap.balanceOf(deployer);

      await swap.approve(swap.target, lpBalance);

      const balA_before = await token1.balanceOf(deployer);
      const balB_before = await token2.balanceOf(deployer);

      await swap.removeLiquidity(token1.target, token2.target, lpBalance, 0, 0, deployer, deadline);

      const balA_after = await token1.balanceOf(deployer);
      const balB_after = await token2.balanceOf(deployer);

      expect(balA_after).to.be.gt(balA_before);
      expect(balB_after).to.be.gt(balB_before);
      expect(await swap.balanceOf(deployer)).to.equal(0);
    });
  });

  describe("Swapping", function () {
    it("should swap exact tokens for tokens", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0, 0, deployer, deadline);

      const swapAmount = ethers.parseEther("10");
      await token1.approve(swap.target, swapAmount);

      const balB_before = await token2.balanceOf(deployer);

      await swap.swapExactTokensForTokens(swapAmount, 0, [token1.target, token2.target], deployer, deadline);

      const balB_after = await token2.balanceOf(deployer);

      expect(balB_after).to.be.gt(balB_before);
    });

    it("should revert if output amount is less than minimum", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0, 0, deployer, deadline);

      const swapAmount = ethers.parseEther("10");
      await token1.approve(swap.target, swapAmount);

      await expect(
        swap.swapExactTokensForTokens(
          swapAmount,
          ethers.parseEther("1000"), // deliberately too high
          [token1.target, token2.target],
          deployer,
          deadline,
        ),
      ).to.be.revertedWith("Insufficient output amount");
    });

    it("reverts when swap path is not exactly [TOKEN_A, TOKEN_B] or [TOKEN_B, TOKEN_A]", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("50");
      const amountB = ethers.parseEther("50");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      // Path with reversed tokens (not supported by contract logic)
      await expect(
        swap.swapExactTokensForTokens(ethers.parseEther("1"), 0n, [token2.target, token2.target], deployer, deadline),
      ).to.be.revertedWith("Pair not supported");

      // Path with more than 2 tokens
      await expect(
        swap.swapExactTokensForTokens(
          ethers.parseEther("1"),
          0n,
          [token1.target, token2.target, token1.target],
          deployer,
          deadline,
        ),
      ).to.be.revertedWith("Invalid swap path");
    });

    it("reverts when receiver address is zero", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      await token1.approve(swap.target, ethers.parseEther("1"));

      await expect(
        swap.swapExactTokensForTokens(
          ethers.parseEther("1"),
          0n,
          [token1.target, token2.target],
          ethers.ZeroAddress,
          deadline,
        ),
      ).to.be.revertedWith("Receiver address cannot be empty");
    });
    /*
    it("reverts when user has not approved enough input tokens for swap", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("20");
      const amountB = ethers.parseEther("20");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(
        token1.target,
        token2.target,
        amountA,
        amountB,
        0n,
        0n,
        deployer,
        deadline
      );

      // No approval for swap amount
      await expect(
        swap.swapExactTokensForTokens(
          ethers.parseEther("5"),
          0n,
          [token1.target, token2.target],
          deployer,
          deadline
        )
      ).to.be.reverted; // Accept any revert, since ERC20 will revert with its own message
    });

    it("emits SwapSuccess event with correct values after a successful swap", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(
        token1.target,
        token2.target,
        amountA,
        amountB,
        0n,
        0n,
        deployer,
        deadline
      );

      const swapAmount = ethers.parseEther("10");
      await token1.approve(swap.target, swapAmount);

      const tx = await swap.swapExactTokensForTokens(
        swapAmount,
        0n,
        [token1.target, token2.target],
        deployer,
        deadline
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => swap.interface.parseLog(log))
        .find((e: any) => e && e.name === "SwapSuccess");

      expect(event).to.not.be.undefined;
      expect(event.args.sender).to.equal(deployer);
      expect(event.args.amountIn).to.equal(swapAmount);
      expect(event.args.to).to.equal(deployer);
      expect(event.args.amountOut).to.be.gt(0);
    });
*/
    it("correctly swaps in both directions (TOKEN_A->TOKEN_B and TOKEN_B->TOKEN_A)", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      // Swap TOKEN_A for TOKEN_B
      const swapAmountA = ethers.parseEther("10");
      await token1.approve(swap.target, swapAmountA);
      const balB_before = await token2.balanceOf(deployer);
      await swap.swapExactTokensForTokens(swapAmountA, 0n, [token1.target, token2.target], deployer, deadline);
      const balB_after = await token2.balanceOf(deployer);
      expect(balB_after).to.be.gt(balB_before);

      // Swap TOKEN_B for TOKEN_A
      const swapAmountB = ethers.parseEther("20");
      await token2.approve(swap.target, swapAmountB);
      const balA_before = await token1.balanceOf(deployer);
      await swap.swapExactTokensForTokens(swapAmountB, 0n, [token2.target, token1.target], deployer, deadline);
      const balA_after = await token1.balanceOf(deployer);
      expect(balA_after).to.be.gt(balA_before);
    });
  });

  describe("View Functions", function () {
    it("should return correct reserves", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("50");
      const amountB = ethers.parseEther("80");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0, 0, deployer, deadline);

      const [reserveA, reserveB] = await swap.getReserves();
      expect(reserveA).to.equal(amountA);
      expect(reserveB).to.equal(amountB);
    });

    it("should return correct price", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("20");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0, 0, deployer, deadline);

      const price = await swap.getPrice(token1.target, token2.target);
      expect(price).to.equal((amountB * BigInt(1e18)) / amountA);
    });
  });

  describe("Branch & Edge Coverage", () => {
    it("rejects addLiquidity when provided minimum A exceeds actual amount by approving tokens then calling addLiquidity with amountAMin > amountA", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      // amountAMin > amountA
      await expect(
        swap.addLiquidity(token1.target, token2.target, amountA, amountB, amountA + 1n, 0n, deployer, deadline),
      ).to.be.revertedWith("Insufficient amount for token A");

      // amountBMin > amountB
      await expect(
        swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, amountB + 1n, deployer, deadline),
      ).to.be.revertedWith("Insufficient amount for token B");
    });

    it("rejects removeLiquidity when minimum output exceeds actual by approving LP then calling removeLiquidity with outputAmin > actual output", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      const lpBalance = await swap.balanceOf(deployer);
      await swap.approve(swap.target, lpBalance);

      // outputAmin > expected
      await expect(
        swap.removeLiquidity(token1.target, token2.target, lpBalance, amountA + 1n, 0n, deployer, deadline),
      ).to.be.revertedWith("Minimum output amounts not met");

      // outputBmin > expected
      await expect(
        swap.removeLiquidity(token1.target, token2.target, lpBalance, 0n, amountB + 1n, deployer, deadline),
      ).to.be.revertedWith("Minimum output amounts not met");
    });

    it("fails getPrice call when no liquidity exists by calling getPrice before any liquidity is added", async () => {
      const { token1, token2, swap } = await setupFixture();

      await expect(swap.getPrice(token1.target, token2.target)).to.be.revertedWith("No liquidity available");
    });

    it("fails getAmountOut when reserves are zero by calling getAmountOut with zero reserves", async () => {
      const { swap } = await setupFixture();

      await expect(swap.getAmountOut(ethers.parseEther("1"), 0, 0)).to.be.revertedWith(
        "Insufficient liquidity for this operation",
      );
    });
  });

  describe("SimpleSwap – Error and Edge Case Scenarios", () => {
    it("reverts addLiquidity when provided deadline is in the past", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const expiredDeadline = Math.floor(Date.now() / 1000) - 1000;

      // user approves tokens before adding liquidity
      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      // attempt to add liquidity with an expired deadline
      await expect(
        swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, expiredDeadline),
      ).to.be.revertedWith("Deadline has passed");
    });

    it("reverts addLiquidity when the token pair is unsupported", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const validDeadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      // use zero address for tokenA to simulate unsupported pair
      await expect(
        swap.addLiquidity(ethers.ZeroAddress, token2.target, amountA, amountB, 0n, 0n, deployer, validDeadline),
      ).to.be.revertedWith("Token pair is not supported");
    });

    it("reverts removeLiquidity when removing more LP tokens than owned", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);

      // add initial liquidity
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      // approve LP tokens and attempt to remove more than balance
      const lpBalance = await swap.balanceOf(deployer);
      await swap.approve(swap.target, lpBalance + 1n);

      await expect(swap.removeLiquidity(token1.target, token2.target, lpBalance + 1n, 0n, 0n, deployer, deadline)).to.be
        .reverted;
    });

    it("reverts swapExactTokensForTokens when deadline has already passed", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      const swapAmount = ethers.parseEther("10");
      await token1.approve(swap.target, swapAmount);

      const expiredDeadline = Math.floor(Date.now() / 1000) - 10;

      // attempt swap with an expired deadline
      await expect(
        swap.swapExactTokensForTokens(swapAmount, 0n, [token1.target, token2.target], deployer, expiredDeadline),
      ).to.be.revertedWith("Deadline has passed");
    });

    it("reverts swapExactTokensForTokens when swap path contains a zero address", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      const swapAmount = ethers.parseEther("10");
      await token1.approve(swap.target, swapAmount);

      // path includes zero address to simulate invalid route
      await expect(
        swap.swapExactTokensForTokens(swapAmount, 0n, [token1.target, ethers.ZeroAddress], deployer, deadline),
      ).to.be.revertedWith("Pair not supported");
    });

    it("reverts swapExactTokensForTokens when input amount is zero", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      // attempt swap with zero input amount
      await expect(
        swap.swapExactTokensForTokens(0n, 0n, [token1.target, token2.target], deployer, deadline),
      ).to.be.revertedWith("Input amount must be greater than zero");
    });

    it("allows full liquidity removal and resets reserves to zero", async () => {
      const { token1, token2, swap, deployer } = await setupFixture();
      const amountA = ethers.parseEther("50");
      const amountB = ethers.parseEther("50");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await token1.approve(swap.target, amountA);
      await token2.approve(swap.target, amountB);
      await swap.addLiquidity(token1.target, token2.target, amountA, amountB, 0n, 0n, deployer, deadline);

      // remove all liquidity and confirm reserves are cleared
      const lpBalance = await swap.balanceOf(deployer);
      await swap.approve(swap.target, lpBalance);
      await swap.removeLiquidity(token1.target, token2.target, lpBalance, 0n, 0n, deployer, deadline);

      const [reserveA, reserveB] = await swap.getReserves();
      expect(reserveA).to.equal(0n);
      expect(reserveB).to.equal(0n);
    });
  });
});
