// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token2 is ERC20 {

    constructor() ERC20("Token 2","TK2") {
        _mint(msg.sender, 1000e18);
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }

    function mintMe() external {
        _mint(msg.sender, 1000e18);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
