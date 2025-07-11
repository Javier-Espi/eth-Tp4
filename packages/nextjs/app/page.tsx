"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Alumno: Javier Espiñeira</span>
            <span className="block text-4xl font-bold">SimpleSwap - TP4</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Cuenta Conectada:</p>
            <Address address={connectedAddress} />
          </div>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Acceder al Entorno de contratos de{" "}
                <Link href="/debug" passHref className="link">
                  SimpleSwap
                </Link>{" "}
                .
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explorar la Blockchain{" "}
                <Link href="https://sepolia.etherscan.io/" passHref className="link">
                  Block Explorer
                </Link>{" "}
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
