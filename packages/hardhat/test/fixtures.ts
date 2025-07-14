import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Token1, Token2, SimpleSwap } from "../typechain-types";

export const setupFixture = (global as any).deployments.createFixture(async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments, ethers } = hre;

  await deployments.fixture(["all"]);

  const { deployer } = await getNamedAccounts();
  const signer = await ethers.getSigner(deployer);

  const token1Deployment = await deployments.get("Token1");
  const token2Deployment = await deployments.get("Token2");
  const swapDeployment = await deployments.get("SimpleSwap");

  const token1: Token1 = await ethers.getContractAt("Token1", token1Deployment.address, signer);
  const token2: Token2 = await ethers.getContractAt("Token2", token2Deployment.address, signer);
  const swap: SimpleSwap = await ethers.getContractAt("SimpleSwap", swapDeployment.address, signer);

  const initialAmount = ethers.parseEther("1000");
  await token1.approve(swap.target, initialAmount);
  await token2.approve(swap.target, initialAmount);

  return { deployer, token1, token2, swap };
});
