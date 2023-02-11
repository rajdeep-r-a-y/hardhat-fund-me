const { inputToConfig } = require("@ethereum-waffle/compiler");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config")

// We check that we are running on development chains
!developmentChains.includes(network.name)
    ? describe.skip
    :
describe("FundMe", async function () {   // larger scope is for entire FundMe contract
    let fundMe;
    let deployer;
    let mockV3Aggregator;
    const sendValue = ethers.utils.parseEther("1")  // 1 ETH : ethers.utils.parseEther() converts 1 ETH to  1000000000000000000

    beforeEach(async function () {
        // deploy FundMe contract using hardhat deploy
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);  // fixture() allows us to run our entire deploy folder with as many tags as we want
        fundMe = await ethers.getContract("FundMe", deployer);  // getContract() is going to get the most recent deployment of whatever contract we tell it,  deployer: whenever we call a function with fundMe, it will automatically be from the deployer account
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
    })

    describe("constructor", async function () {   // scope for constructor
        it("sets the aggregator addresses correctly", async function () {
            const response = await fundMe.getPriceFeed();
            assert.equal(response, mockV3Aggregator.address);
        })
    })

    describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
            await expect(fundMe.fund()).to.be.revertedWith("You need to spend more ETH!");
        })

        it("updated the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.getAddressToAmountFunded(deployer);  // response will be the big value version of the amount that has been funded by the account
            assert.equal(response.toString(), sendValue.toString());  // sendValue of 1 should be the exact same as the amount we funded
        })

        it("Adds funder to array of funders", async function () {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.getFunders(0);
            assert.equal(funder, deployer);
        })
    })

    describe("withdraw", async function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue });
        })
        it("Withdraw ETH from a single founder", async function () {
            // Arrange
            // We are going to find the starting balance of FundMe contract (after it has been funded with some ETH) and the deployer contract
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer);

            // Act
            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transactionReceipt;    // using the { } syntax we can pull out objects out of another object, here we are pulling out gasUsed and effectiveGasUsed objects out of transactionReceipt object
            const gasCost = gasUsed.mul(effectiveGasPrice);  // since they are bigNumber, we use function mul() to multiply them

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

            // Assert
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()    //add() adds bigNumber
            );
        })

        it("Allows us to withdraw with multiple funders", async function(){
            // Arrange
            const accounts = await ethers.getSigners();   // A Signer in Ethers.js is an object that represents an Ethereum account. It's used to send transactions to contracts and other accounts. Here we're getting a list of the accounts in the node we're connected to, which in this case is Hardhat Network, and only keeping the first and second ones.

            for(let i=1;i<6;i++){  // we are starting with i=1 because i=0 is deployer
                const fundMeConnectedContract = await fundMe.connect(accounts[i]);  // connect() is used to connect fundMe to different accounts
                await fundMeConnectedContract.fund({value:sendValue});  // we are funding the other accounts  
            }
                // Now we get the starting balances
                const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
                const startingDeployerBalance = await fundMe.provider.getBalance(deployer);

                //Act
                const transactionResponse= await fundMe.withdraw();
                const transactionReceipt = await transactionResponse.wait(1);
                const { gasUsed, effectiveGasPrice } = transactionReceipt;    
                const gasCost = gasUsed.mul(effectiveGasPrice);

                const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
                const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
                // Assert
                assert.equal(endingFundMeBalance, 0);
                assert.equal(
                    startingFundMeBalance.add(startingDeployerBalance).toString(),
                    endingDeployerBalance.add(gasCost).toString()    //add() adds bigNumber
                );

                // Make sure the funders are reset properly
                await expect(fundMe.getFunders(0)).to.be.reverted;

                // now we need to check that all the amounts to address funded are 0
                for(let i=0;i<6;i++){
                    assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address),0);
                }


            
        })

        it("Only allows the owner to withdraw", async function(){
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const attackerConnectedContract = await fundMe.connect(attacker);
            await expect(attackerConnectedContract.withdraw()).to.be.revertedWith("FundMe__NotOwner");

        })

    })


})

