//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Token {
    string public name;
    string public symbol;
    uint256 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf; //Balance of deployer
    mapping(address => mapping(address => uint256)) public allowance; //Balance of spender

    event Transfer(address _from, address _to, uint256 _value);
    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value
    );

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply * (10 ** decimals);
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(
        address _to,
        uint256 _value
    ) public returns (bool success) {
        //Require that sender has enough tokens to spend
        require(
            balanceOf[msg.sender] >= _value,
            "ERC20: transfer amount exceeds balance"
        );
        _transfer(msg.sender, _to, _value);
        return true;
    }

    function _transfer(address _from, address _to, uint256 _value) internal {
        require(_to != address(0));
        // Objective: Deduct tokens from spender, Credit tokens to reciever
        balanceOf[_from] = balanceOf[_from] - _value;
        balanceOf[_to] = balanceOf[_to] + _value;
        emit Transfer(_from, _to, _value);
    }

    function approve(
        address _spender,
        uint256 _value
    ) public returns (bool success) {
        require(_spender != address(0), "ERC20: cannot approve to the zero address");
        allowance[msg.sender][_spender] = _value;

        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool success) {
        // require(_value <= allowance[_from]);
        require(
            _value <= allowance[_from][msg.sender],
            "ERC20: insufficient allowance"
        );

        _transfer(_from, _to, _value);

        // Reset Allowance: prevent double transaction without approval
        allowance[_from][msg.sender] = allowance[_from][msg.sender] - _value;

        return true;
    }
}
