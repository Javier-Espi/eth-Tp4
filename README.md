## 📄 Notas de Evaluación - Trabajo Práctico 4

Se completaron todas las tareas indicadas para el cumplimiento del Trabajo Práctico 4.

🧪 **Pruebas de contratos:**
No fue posible ejecutar los tests de cobertura en el entorno `scaffold-eth` debido a incompatibilidades con la función `coverage`. Se intentó, sin éxito, ajustar la configuración de HardHat (aumentando el tamaño de los bloques) y modificar los parámetros de `coverage` (reduciéndolos), sin lograr que funcionen correctamente.

🛠️ **Despliegue y verificación:**
Para verificar el funcionamiento de los contratos, se utilizó un entorno alternativo. El repositorio con el despliegue completo está disponible en el siguiente enlace, donde se incluyen imágenes en el archivo `README.md` que detallan su implementación y alcance:

🔗 [Repositorio: eth-tp4-hardhat](https://github.com/Javier-Espi/eth-tp4-hardhat)

🌐 **Frontend funcional:**
Se subió una copia operativa del frontend a Vercel, con modificaciones y personalización respecto al original. Podés acceder aquí:

🔗 [Frontend: eth-tp4-nextjs.vercel.app](https://eth-tp4-nextjs.vercel.app/)

🧫 **Tokens de prueba:**
Para interactuar con los contratos desplegados, las monedas propuestas incluyen una función `mintMe` que permite obtener tokens de prueba directamente.


## 🌀 SimpleSwap

**SimpleSwap** is a smart contract that enables direct swapping between two ERC20 tokens. It supports basic liquidity management, LP token minting (Token L), and price calculation. The logic is intentionally streamlined to prioritize learning and clarity.

### 🎯 Purpose

This contract is intended for **educational purposes only**. It is designed to help developers understand how an Automated Market Maker (AMM)-style pool works, how token exchanges are calculated, and how liquidity provision functions at a fundamental level.

### 🧱 Design Principles

- **Single-pair focus**: limited to two tokens for simplicity and conceptual clarity.
- **Proportional minting**: LP tokens are issued in proportion to contribution vs. current reserves.
- **No swap fees**: the swap formula is applied without fees to highlight its raw behavior.
- **Babylonian root**: used to compute the initial liquidity seed for the pool.

### 🚀 Core Features

- Add and remove liquidity (`addLiquidity`, `removeLiquidity`)
- Perform swaps (`swapExactTokensForTokens`)
- Price quoting (`getPrice`)
- Output estimation (`getAmountOut`)

### 🛠️ Dependencies

- Solidity ^0.8.0
- OpenZeppelin Contracts

### 📄 License

MIT — free to fork, adapt, or build upon.
