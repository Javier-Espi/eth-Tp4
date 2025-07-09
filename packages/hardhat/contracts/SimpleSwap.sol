// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title SimpleSwap Pool for two tokens with liquidity management
/// @author Javier Marcelo Espiñeira
/// @notice Supports swapping between TOKEN_A and TOKEN_B with ERC20 LP token minting
contract SimpleSwap is ERC20 {
    address public immutable TOKEN_A;
    address public immutable TOKEN_B;

    uint256 private reserveA;
    uint256 private reserveB;

    // Structs para evitar stack too deep
    struct LiquidityParams {
        uint256 amountADesired;
        uint256 amountBDesired;
        uint256 amountAMin;
        uint256 amountBMin;
        uint256 reserveA;
        uint256 reserveB;
    }

    struct RemoveLiquidityParams {
        uint256 liquidity;
        uint256 amountAMin;
        uint256 amountBMin;
        address to;
        uint256 totalSupply;
    }

    event LiquidityAdded(address indexed provider, address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 liquidity);
    event SwapSuccess(address indexed sender, uint256 amountIn, uint256 amountOut, address indexed to);

    /// @notice Sets the token pair for the liquidity pool
    /// @param tokenA_ Address of token A
    /// @param tokenB_ Address of token B
    constructor(address tokenA_, address tokenB_) ERC20("Token L", "TKL") {
        require(tokenA_ != address(0) && tokenB_ != address(0), "Token addresses cannot be empty");
        require(tokenA_ != tokenB_, "Tokens must be different");
        TOKEN_A = tokenA_;
        TOKEN_B = tokenB_;
    }

    modifier inTime(uint256 deadline) {
        require(deadline >= block.timestamp, "Deadline has passed");
        _;
    }

    modifier isSupportedPair(address tokenA_, address tokenB_) {
        require(tokenA_ == TOKEN_A && tokenB_ == TOKEN_B, "Token pair is not supported");
        _;
    }

    modifier isValidReceiver(address to) {
        require(to != address(0), "Receiver address cannot be empty");
        _;
    }

    // *** MAIN FUNCTIONS ***

    /// @notice Adds liquidity to the pool in proportion to the current reserves
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        inTime(deadline)
        isSupportedPair(tokenA, tokenB)
        isValidReceiver(to)
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        LiquidityParams memory params = LiquidityParams({
            amountADesired: amountADesired,
            amountBDesired: amountBDesired,
            amountAMin: amountAMin,
            amountBMin: amountBMin,
            reserveA: reserveA,
            reserveB: reserveB
        });

        return _addLiquidityInternal(params, to);
    }

    /// @notice Removes liquidity and returns tokens A and B proportionally
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        inTime(deadline)
        isSupportedPair(tokenA, tokenB)
        isValidReceiver(to)
        returns (uint256 amountA, uint256 amountB)
    {
        require(liquidity > 0 && balanceOf(msg.sender) >= liquidity, "Not enough liquidity to remove");

        RemoveLiquidityParams memory params = RemoveLiquidityParams({
            liquidity: liquidity,
            amountAMin: amountAMin,
            amountBMin: amountBMin,
            to: to,
            totalSupply: totalSupply()
        });

        return _removeLiquidityInternal(params, tokenA, tokenB);
    }

    /// @notice Swaps exact amount of one token for the other
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
)
    external
    inTime(deadline)
    isValidReceiver(to)
    returns (uint256[] memory amounts)
{
    require(path.length == 2, "Invalid swap path");
    require(path[0] != address(0) && path[1] != address(0), "Pair not supported");
    require(
        (path[0] == TOKEN_A && path[1] == TOKEN_B) ||
        (path[0] == TOKEN_B && path[1] == TOKEN_A),
        "Pair not supported"
    );

    return _executeSwap(amountIn, amountOutMin, path, to);
}

    /// @notice Returns token A/B price (scaled to 1e18)
    function getPrice(address tokenA, address tokenB)
        external
        view
        isSupportedPair(tokenA, tokenB)
        returns (uint256 price)
    {
        require(reserveA > 0 && reserveB > 0, "No liquidity available");
        price = tokenA == TOKEN_A
            ? (reserveB * 1e18) / reserveA
            : (reserveA * 1e18) / reserveB;
    }

    /// @notice Returns output amount given input and reserves
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    )
        public
        pure
        returns (uint256)
    {
        require(amountIn > 0, "Input amount must be greater than zero");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity for this operation");

        return (amountIn * reserveOut) / (amountIn + reserveIn);
    }

    /// @notice Returns current reserves
    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    // *** AUXILIARY FUNCTIONS ***

    function _addLiquidityInternal(LiquidityParams memory params, address to) 
        private 
        returns (uint256 amountA, uint256 amountB, uint256 liquidity) 
    {
        (amountA, amountB) = _calculateOptimalAmounts(
            params.amountADesired,
            params.amountBDesired,
            params.reserveA,
            params.reserveB,
            params.amountAMin,
            params.amountBMin
        );

        require(IERC20(TOKEN_A).transferFrom(msg.sender, address(this), amountA), "Token A transfer failed");
        require(IERC20(TOKEN_B).transferFrom(msg.sender, address(this), amountB), "Token B transfer failed");

        liquidity = _calculateLiquidity(amountA, amountB, params.reserveA, params.reserveB);
        require(liquidity > 0, "Insufficient liquidity minted");

        _mint(to, liquidity);
        _updateReserves();

        emit LiquidityAdded(to, TOKEN_A, TOKEN_B, amountA, amountB, liquidity);
    }

    function _removeLiquidityInternal(
        RemoveLiquidityParams memory params,
        address tokenA,
        address tokenB
    ) private returns (uint256 amountA, uint256 amountB) {
        amountA = (params.liquidity * reserveA) / params.totalSupply;
        amountB = (params.liquidity * reserveB) / params.totalSupply;

        require(amountA >= params.amountAMin && amountB >= params.amountBMin, "Minimum output amounts not met");

        _executeTokenTransfers(TOKEN_A, TOKEN_B, amountA, amountB, params.to);
        _burn(msg.sender, params.liquidity);
        _updateReserves();

        emit LiquidityRemoved(params.to, tokenA, tokenB, amountA, amountB, params.liquidity);
    }

    function _executeSwap(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to
    ) private returns (uint256[] memory amounts) {
        bool isTokenAIn = path[0] == TOKEN_A;
        
        // Calcular output sin variables intermedias
        uint256 amountOut = getAmountOut(
            amountIn, 
            isTokenAIn ? reserveA : reserveB,
            isTokenAIn ? reserveB : reserveA
        );
        
        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Ejecutar transferencias
        _executeSwapTransfers(path[0], path[1], amountIn, amountOut, to);
        _updateReserves();

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;

        emit SwapSuccess(msg.sender, amountIn, amountOut, to);
    }

    function _executeSwapTransfers(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address to
    ) private {
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Input token transfer failed");
        require(IERC20(tokenOut).transfer(to, amountOut), "Output token transfer failed");
    }

    function _executeTokenTransfers(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address to
    ) private {
        require(IERC20(tokenA).transfer(to, amountA), "Token A transfer failed");
        require(IERC20(tokenB).transfer(to, amountB), "Token B transfer failed");
    }

    function _updateReserves() private {
        reserveA = IERC20(TOKEN_A).balanceOf(address(this));
        reserveB = IERC20(TOKEN_B).balanceOf(address(this));
    }

    function _calculateOptimalAmounts(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 reserveA_,
        uint256 reserveB_,
        uint256 amountAMin,
        uint256 amountBMin
    )
    internal
    pure
    returns (uint256 amountA, uint256 amountB)
    {
        if (reserveA_ == 0 && reserveB_ == 0) {
            require(amountADesired >= amountAMin, "Insufficient amount for token A");
            require(amountBDesired >= amountBMin, "Insufficient amount for token B");
            return (amountADesired, amountBDesired);
        }

        uint256 amountBOptimal = (amountADesired * reserveB_) / reserveA_;
        if (amountBOptimal <= amountBDesired) {
            require(amountBOptimal >= amountBMin, "Insufficient amount for token B");
            return (amountADesired, amountBOptimal);
        } else {
            uint256 amountAOptimal = (amountBDesired * reserveA_) / reserveB_;
            require(amountAOptimal >= amountAMin, "Insufficient amount for token A");
            return (amountAOptimal, amountBDesired);
        }
    }

    function _calculateLiquidity(
        uint256 amountA,
        uint256 amountB,
        uint256 reserveA_,
        uint256 reserveB_
    )
        internal
        view
        returns (uint256)
    {
        if (totalSupply() == 0) {
            return _initialLiquidityBase(amountA * amountB);
        }
        uint256 liqA = (amountA * totalSupply()) / reserveA_;
        uint256 liqB = (amountB * totalSupply()) / reserveB_;
        return liqA < liqB ? liqA : liqB;
    }

    /// @dev Babylonian method for integer square root
    function _initialLiquidityBase(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        } else {
            z = 0;
        }
    }
}