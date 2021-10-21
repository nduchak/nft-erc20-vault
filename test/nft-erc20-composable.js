const { ethers } = require("hardhat");
const { expect } = require("chai");


describe("RewardDistribution", function () {
    this.timeout(100000)
    const tokenId = 1

    before(async function () {
        this.ComposableNFT = await ethers.getContractFactory("MyComposableNFT")
        this.MyERC20 = await ethers.getContractFactory("MyERC20")

        this.signers = await ethers.getSigners()
        this.aliceSigner = this.signers[0]
        this.bobSigner = this.signers[1]
        this.alice = this.aliceSigner.address
        this.bob = this.bobSigner.address
    })

    beforeEach(async function () {
        this.composableNFT = await this.ComposableNFT.deploy()
        this.myERC20 = await this.MyERC20.deploy()

        await this.composableNFT.mint(this.alice, tokenId)
        await this.myERC20.mint(this.alice, 100000)
        await this.myERC20.mint(this.bob, 100000)

        expect(await this.myERC20.balanceOf(this.alice)).to.equal('100000')
        expect(await this.myERC20.balanceOf(this.bob)).to.equal('100000')
        expect(await this.composableNFT.ownerOf(tokenId)).to.equal(this.alice)
    })

    describe('Transfer ERC20 to NFT', function() {
        it('without allowance', async function() {
            await expect(this.composableNFT.getERC20(this.alice, tokenId, this.myERC20.address, '500'))
                .to.be.revertedWith('ERC20: transfer amount exceeds allowance')
        })

        it('_from === sender', async function() {
            await this.myERC20.approve(this.composableNFT.address, '500')
            await this.composableNFT.getERC20(this.alice, tokenId, this.myERC20.address, '500')
            expect(await this.composableNFT.balanceOfERC20(tokenId, this.myERC20.address)).to.equal('500')
            expect(await this.composableNFT.totalERC20Contracts(tokenId)).to.equal('1')
        })

        it('_from !== sender', async function() {
            await this.myERC20.connect(this.bobSigner).approve(this.composableNFT.address, '500')
            await this.myERC20.connect(this.bobSigner).approve(this.alice, '500')
            await this.composableNFT.getERC20(this.bob, tokenId, this.myERC20.address, '500')
            expect(await this.composableNFT.balanceOfERC20(tokenId, this.myERC20.address)).to.equal('500')
            expect(await this.composableNFT.totalERC20Contracts(tokenId)).to.equal('1')
        })

        it('_from !== sender: without allowance for sender', async function() {
            await this.myERC20.connect(this.bobSigner).approve(this.composableNFT.address, '500')
            await expect(this.composableNFT.getERC20(this.bob, tokenId, this.myERC20.address, '500'))
                .to.be.revertedWith('Value greater than remaining')
        })
    })

    it('Get balance of ERC20', async function() {
        await this.myERC20.approve(this.composableNFT.address, '500')
        await this.composableNFT.getERC20(this.alice, tokenId, this.myERC20.address, '500')

        expect(await this.composableNFT.totalERC20Contracts(tokenId)).to.equal('1')
        expect(await this.composableNFT.balanceOfERC20(tokenId, this.myERC20.address)).to.equal('500')
    })

    describe.only('Transfer ERC20 using NFT', function() {
        beforeEach(async function() {
            await this.myERC20.approve(this.composableNFT.address, '500')
            await this.composableNFT.getERC20(this.alice, tokenId, this.myERC20.address, '500')
        })
        it('Owner of NFT can transfer tokens', async function() {
            const bobBalance = await this.myERC20.balanceOf(this.bob)
            await this.composableNFT.transferERC20(tokenId, this.bob, this.myERC20.address, '500')
            expect(await this.myERC20.balanceOf(this.bob)).to.equal(bobBalance.add('500'))
            expect(await this.composableNFT.balanceOfERC20(tokenId, this.myERC20.address)).to.equal('0')
            expect(await this.composableNFT.totalERC20Contracts(tokenId)).to.equal('0')
        })
        it('Fail on not owner transfer', async function() {
            await expect(this.composableNFT.connect(this.bobSigner).transferERC20(tokenId, this.bob, this.myERC20.address, '500'))
                .to.be.revertedWith('Transaction reverted without a reason string')
        })
    })
})
