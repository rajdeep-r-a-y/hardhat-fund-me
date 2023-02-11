const { networkConfig, developmentChains } = require("../helper-hardhat-config");
// const { networkConfig } is same as ;
// const helperConfig = require("../helper-hardhat-config ");
// const networkConfig = helperConfig.networkConfig
// The syntax we are using is a simple way to extrapolate just networkConfig from helper-hardhat-config file
const { network, deployments } = require("hardhat");
const {verify} = require("../utils/verify");
require("dotenv").config();

module.exports = async ({ getNamedAccounts, depoyments }) => {        // module.exports changes the default function for hardhat deploy to look for
    const { deploy, log } = deployments;  // we are using deployments object to get two functions : deploy and log
    const { deployer } = await getNamedAccounts();  // we are getting deployer account from getNamedAccounts() function
    const chainId = network.config.chainId;

    // If chainId is A, use address Y
    // If chainId is Z, use address A
    // const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];

    let ethUsdPriceFeedAddress;
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator");
        ethUsdPriceFeedAddress = ethUsdAggregator.address;
    }
    else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    }

    log("----------------------------------------------------");
    log("Deploying FundMe and waiting for confirmations...");


    // when going for localhost or hardhat network we want to use a mock.
    // What is Mocking?    
    // Mocking is primarily used in unit testing. An object under test may have dependencies on other (complex) objects. To isolate the behaviour of the object you want to test you replace the other objects by mocks that simulate the behaviour of the real objects. This is useful if the real objects are impractical to incorporate into the unit test. In short, mocking is creating objects that simulate the behaviour of real objects.

    const args = [ethUsdPriceFeedAddress];
    const fundMe = await deploy("FundMe", {    // deploy("name of contract that we are deploying now", {list of overrides})
        from: deployer,    // who is deploying the contract    
        args: args,          // passing arguements to the costructor which will be the pricefeed address
        log: true,       // custom logging    
        waitConfirmations: network.config.blockConfirmations || 1, 
    })

    log(`FundMe deployed at ${fundMe.address}`);

    if(!developmentChains.includes(network.name) && process.env.ETHERCSAN_API_KEY){
        //verify
        await verify(fundMe.address,args);

    }

    log("-----------------------------------------");
}    

module.exports.tags = ["all","fundme"];