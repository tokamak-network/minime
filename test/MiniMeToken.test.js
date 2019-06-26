const { BN, constants } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory');
const MiniMeToken = artifacts.require('MiniMeToken');

require('chai')
  .should();

contract('MiniMeToken', function ([controller, ...accounts]) {
  const b = [];

  before(async function () {
    const tokenFactory = await MiniMeTokenFactory.new({ from: controller });
    this.miniMeToken = await MiniMeToken.new(
      tokenFactory.address,
      ZERO_ADDRESS,
      0,
      'MiniMe Test Token',
      18,
      'MMT',
      true);
  });

  it('should generate tokens for address 1', async function() {
    b[0] = await web3.eth.getBlockNumber();

    await this.miniMeToken.generateTokens(accounts[1], new BN(10));
    (await this.miniMeToken.totalSupply()).should.be.bignumber.equal(new BN(10));
    (await this.miniMeToken.balanceOf(accounts[1])).should.be.bignumber.equal(new BN(10));

    b[1] = await web3.eth.getBlockNumber();
  });

  it('should transfer tokens from address 1 to address 2', async function() {
    await this.miniMeToken.transfer(accounts[2], new BN(2), { from: accounts[1], gas: 200000 });

    b[2] = await web3.eth.getBlockNumber();

    (await this.miniMeToken.totalSupply()).should.be.bignumber.equal(new BN(10));
    (await this.miniMeToken.balanceOf(accounts[1])).should.be.bignumber.equal(new BN(8));
    (await this.miniMeToken.balanceOf(accounts[2])).should.be.bignumber.equal(new BN(2));

    (await this.miniMeToken.balanceOfAt(accounts[1], b[1])).should.be.bignumber.equal(new BN(10));
  });

  it('should allow and transfer tokens from address 2 to address 1 allowed to 3', async function () {
    await this.miniMeToken.approve(accounts[3], new BN(2), { from: accounts[2] });
    (await this.miniMeToken.allowance(accounts[2], accounts[3])).should.be.bignumber.equal(new BN(2));

    await this.miniMeToken.transferFrom(accounts[2], accounts[1], new BN(1), { from: accounts[3] });
    (await this.miniMeToken.allowance(accounts[2], accounts[3])).should.be.bignumber.equal(new BN(1));

    b[3] = await web3.eth.getBlockNumber();

    (await this.miniMeToken.totalSupply()).should.be.bignumber.equal(new BN(10));
    (await this.miniMeToken.balanceOf(accounts[1])).should.be.bignumber.equal(new BN(9));
    (await this.miniMeToken.balanceOf(accounts[2])).should.be.bignumber.equal(new BN(1));

    (await this.miniMeToken.balanceOfAt(accounts[1], b[2])).should.be.bignumber.equal(new BN(8));
    (await this.miniMeToken.balanceOfAt(accounts[2], b[2])).should.be.bignumber.equal(new BN(2));
    (await this.miniMeToken.balanceOfAt(accounts[1], b[1])).should.be.bignumber.equal(new BN(10));
    (await this.miniMeToken.balanceOfAt(accounts[2], b[1])).should.be.bignumber.equal(new BN(0));
    (await this.miniMeToken.balanceOfAt(accounts[1], b[0])).should.be.bignumber.equal(new BN(0));
    (await this.miniMeToken.balanceOfAt(accounts[2], b[0])).should.be.bignumber.equal(new BN(0));
    (await this.miniMeToken.balanceOfAt(accounts[1], 0)).should.be.bignumber.equal(new BN(0));
    (await this.miniMeToken.balanceOfAt(accounts[2], 0)).should.be.bignumber.equal(new BN(0));
  });
  
  it('should destroy 3 tokens from 1 and 1 from 2', async function () {
    await this.miniMeToken.destroyTokens(accounts[1], new BN(3), { from: controller, gas: 200000 });

    b[4] = await web3.eth.getBlockNumber();

    (await this.miniMeToken.totalSupply()).should.be.bignumber.equal(new BN(7));
    (await this.miniMeToken.balanceOf(accounts[1])).should.be.bignumber.equal(new BN(6));
  });

  it('should create the clone token', async function () {
    const miniMeTokenCloneTx = await this.miniMeToken.createCloneToken(
      'Clone Token 1',
      18,
      'MMTc',
      0,
      true,
      { from: controller }
    );

    let addr = miniMeTokenCloneTx.receipt.rawLogs[0].topics[1];
    addr = `0x${addr.slice(26)}`;
    addr = web3.utils.toChecksumAddress(addr);
    this.miniMeTokenClone = new MiniMeToken(addr);

    b[5] = await web3.eth.getBlockNumber();

    (await this.miniMeTokenClone.parentToken()).should.be.equal(this.miniMeToken.address);
    (await this.miniMeTokenClone.parentSnapShotBlock()).should.be.bignumber.equal(new BN(b[5]));
    (await this.miniMeTokenClone.totalSupply()).should.be.bignumber.equal(new BN(7));

    (await this.miniMeToken.balanceOf(accounts[1])).should.be.bignumber.equal(new BN(6));

    (await this.miniMeTokenClone.totalSupplyAt(b[4])).should.be.bignumber.equal(new BN(7));
    (await this.miniMeTokenClone.balanceOfAt(accounts[2], b[4])).should.be.bignumber.equal(new BN(1));
  });

  it('should mine one block to take effect clone', async function () {
    await this.miniMeToken.transfer(accounts[1], 1, { from: accounts[1] });
  });

  it('should move tokens in the clone token from 2 to 3', async function () {
    await this.miniMeTokenClone.transfer(accounts[2], 4, { from: accounts[1] });

    b[6] = await web3.eth.getBlockNumber();

    (await this.miniMeTokenClone.totalSupply()).should.be.bignumber.equal(new BN(7));
    (await this.miniMeTokenClone.balanceOf(accounts[1])).should.be.bignumber.equal(new BN(2));
    (await this.miniMeTokenClone.balanceOf(accounts[2])).should.be.bignumber.equal(new BN(5));

    (await this.miniMeToken.balanceOfAt(accounts[1], b[5])).should.be.bignumber.equal(new BN(6));
    (await this.miniMeToken.balanceOfAt(accounts[2], b[5])).should.be.bignumber.equal(new BN(1));
    (await this.miniMeTokenClone.balanceOfAt(accounts[1], b[5])).should.be.bignumber.equal(new BN(6));
    (await this.miniMeTokenClone.balanceOfAt(accounts[2], b[5])).should.be.bignumber.equal(new BN(1));
    (await this.miniMeTokenClone.balanceOfAt(accounts[1], b[4])).should.be.bignumber.equal(new BN(6));
    (await this.miniMeTokenClone.balanceOfAt(accounts[2], b[4])).should.be.bignumber.equal(new BN(1));

    (await this.miniMeTokenClone.totalSupplyAt(b[5])).should.be.bignumber.equal(new BN(7));
    (await this.miniMeTokenClone.totalSupplyAt(b[4])).should.be.bignumber.equal(new BN(7));
  });

  it('should create tokens in the child token', async function () {
    await this.miniMeTokenClone.generateTokens(accounts[1], new BN(10), { from: controller, gas: 300000 });
    (await this.miniMeTokenClone.totalSupply()).should.be.bignumber.equal(new BN(17));
    (await this.miniMeTokenClone.balanceOf(accounts[1])).should.be.bignumber.equal(new BN(12));
    (await this.miniMeTokenClone.balanceOf(accounts[2])).should.be.bignumber.equal(new BN(5));
  });
});
